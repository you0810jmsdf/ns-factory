// 受け取り箱（js/inbox.js）の試験。ダミー値のみ。実行: node --test password-note/test/inbox.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

// vm の中で作られた配列・オブジェクトは prototype が別なので、JSON にして比べる
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

const SRC = fs.readFileSync(new URL('../js/inbox.js', import.meta.url), 'utf8');

// 偽の「中継」と偽の Sync で、アプリ側の動きを確かめる
function makeWorld({ clean = true, syncOk = true } = {}) {
  const relay = { pub: null, items: new Map(), dropped: [] };
  const calls = [];
  const world = {
    console, crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, URL, setInterval, clearInterval, setTimeout,
    vault: { entries: [], deleted: {}, lastModified: null },
    masterPassword: 'テスト用の合言葉',
    document: { getElementById: () => null, querySelector: () => null },
    uuid: (() => { let n = 0; return () => 'id' + (++n); })(),
    now: () => '2026-10-17T10:00:00.000Z',
    // app.js の getLatestCreds と同じ（初期設定・パスワード変更の行だけを数える。メモ・注意の行は数えない）
    getLatestCreds: e => [...(e.history || [])].filter(h => ['initial', 'change', 'create', 'update'].includes(h.type))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null,
    toasts: [],
    toast: (m, t) => world.toasts.push([m, t]),
    renderList: () => {},
    saves: 0,
    saveVaultLocal: async () => { world.saves++; },
    flushed: 0,
    Sync: {
      isConfigured: () => true,
      status: () => ({ ok: syncOk, clean, rev: 1 }),
      flushNow: async () => { world.flushed++; return clean; },
      run: fn => fn(),
      inboxApi: async (method, path, body) => {
        calls.push(method + ' ' + path);
        if (method === 'GET' && path === '/inbox/pubkey') return relay.pub ? { ok: true, status: 200, json: relay.pub } : { ok: false, status: 404, json: { error: 'x' } };
        if (method === 'PUT' && path === '/inbox/pubkey') {
          const raw = Buffer.from(body.pub, 'base64');
          const h = Buffer.from(await webcrypto.subtle.digest('SHA-256', raw)).subarray(0, 8).toString('base64url');
          relay.pub = { kid: h, pub: body.pub };
          return { ok: true, status: 200, json: { kid: h } };
        }
        if (method === 'GET' && path === '/inbox') return { ok: true, status: 200, json: { kid: relay.pub && relay.pub.kid, items: [...relay.items].map(([id, env]) => ({ id, ts: 't', env })) } };
        if (method === 'DELETE') { const id = decodeURIComponent(path.split('/')[2]); relay.items.delete(id); relay.dropped.push(id); return { ok: true, status: 200, json: { ok: true } }; }
        return null;
      },
    },
  };
  const ctx = vm.createContext(world);
  const Inbox = vm.runInContext(SRC + '\n;Inbox', ctx);
  return { world, relay, calls, Inbox };
}

const payload = (over = {}) => ({
  title: 'TEST_SERVICE', type: 'service', url: 'https://example.com', owner: '', description: '', src: 'claude-code', ts: '2026-10-17T09:00:00Z',
  history: [{ type: 'initial', username: 'u', password: 'DUMMY-NOT-A-SECRET-123', note: 'memo' }], ...over,
});

test('往復: 封をして開けると元に戻る／毎回別の封筒／別の鍵では開けない', async () => {
  const { Inbox } = makeWorld();
  const a = await Inbox.generateKeyPair();
  const b = await Inbox.generateKeyPair();
  const e1 = await Inbox.seal(a.pub, payload());
  const e2 = await Inbox.seal(a.pub, payload());
  same(JSON.parse(JSON.stringify(await Inbox.open(e1, a))), payload());
  assert.notEqual(e1.ct, e2.ct);
  assert.notEqual(e1.epk, e2.epk);
  assert.notEqual(e1.iv, e2.iv);
  assert.equal(e1.kid, a.kid);
  await assert.rejects(Inbox.open(e1, b));
});

test('改ざん検知: ct・iv・kid・一時鍵・版を変えると開けない', async () => {
  const { Inbox } = makeWorld();
  const a = await Inbox.generateKeyPair();
  const e = await Inbox.seal(a.pub, payload());
  const other = await Inbox.seal(a.pub, payload());
  const flip = s => { const u = Buffer.from(s, 'base64'); u[0] ^= 1; return u.toString('base64'); };
  await assert.rejects(Inbox.open({ ...e, ct: flip(e.ct) }, a));
  await assert.rejects(Inbox.open({ ...e, iv: flip(e.iv) }, a));
  await assert.rejects(Inbox.open({ ...e, kid: 'AAAAAAAAAAA' }, a));
  await assert.rejects(Inbox.open({ ...e, epk: other.epk }, a));
  await assert.rejects(Inbox.open({ ...e, v: 2 }, a));
});

test('暗号文の長さは 512 バイト刻み（値の長さを隠す）／kid は公開鍵の SHA-256 先頭8バイト', async () => {
  const { Inbox } = makeWorld();
  const a = await Inbox.generateKeyPair();
  const small = await Inbox.seal(a.pub, payload({ history: [{ password: 'x' }] }));
  const mid = await Inbox.seal(a.pub, payload({ history: [{ password: 'x'.repeat(200) }] }));
  assert.equal(Buffer.from(small.ct, 'base64').length, Buffer.from(mid.ct, 'base64').length);
  assert.equal((Buffer.from(small.ct, 'base64').length - 16) % 512, 0);
  assert.equal(await Inbox.kidOf(Buffer.from(a.pub, 'base64')), a.kid);
  same(Object.keys(a.priv).sort(), ['crv', 'd', 'kty', 'x', 'y']);
});

test('中身の検査: 使えない形は捨て、制御文字は取り除き、長さを切る', () => {
  const { Inbox } = makeWorld();
  const n = Inbox.normalizePayload;
  assert.equal(n(null), null);
  assert.equal(n({ title: '', history: [{ password: 'a' }] }), null);
  assert.equal(n({ title: 'a', history: [] }), null);
  assert.equal(n({ title: 'a', history: [{ password: '' }] }), null);
  assert.equal(n({ title: 'a', history: [{ password: 'x'.repeat(8001) }] }), null);
  assert.equal(n({ title: 'a', history: new Array(31).fill({ password: 'x' }) }), null);
  const ok = n({ title: 'a\u0000b\u0007' + 'z'.repeat(200), type: 'evil', url: ' https://e.com ', src: '', history: [{ password: 'p', username: 'u', note: 'n' }] });
  assert.equal(ok.title.length, 100);
  assert.ok(!/[\u0000-\u0008]/.test(ok.title));
  assert.equal(ok.type, 'service');
  assert.equal(ok.url, 'https://e.com');
  assert.equal(ok.src, '不明');
  assert.equal(n({ title: 'a', history: [{ password: 'a\nb\tc' }] }).history[0].password, 'a\nb\tc'); // 改行・タブは値として保つ
});

test('URL: ホストを出し、https 以外は印をつける', () => {
  const { Inbox } = makeWorld();
  same(Inbox._test.urlInfo('https://example.com/x'), { host: 'example.com', secure: true });
  assert.equal(Inbox._test.urlInfo('http://example.com').secure, false);
  assert.equal(Inbox._test.urlInfo('javascript:alert(1)').secure, false);
  assert.equal(Inbox._test.urlInfo(''), null);
});

test('mergeInbox: 鍵は kid ごとの和集合・何度合わせても同じ・順序に左右されない', async () => {
  const { Inbox } = makeWorld();
  const k1 = await Inbox.generateKeyPair();
  await new Promise(r => setTimeout(r, 5));
  const k2 = await Inbox.generateKeyPair();
  const A = { keys: [k1], seen: ['s1', 's2'] };
  const B = { keys: [k2, k1], seen: ['s2', 's3'] };
  const m = Inbox.mergeInbox(A, B);
  same(m.keys.map(k => k.kid), [k1.kid, k2.kid]);
  same([...m.seen].sort(), ['s1', 's2', 's3']);
  same(Inbox.canonInbox(Inbox.mergeInbox(A, B)), Inbox.canonInbox(Inbox.mergeInbox(B, A)));
  same(Inbox.canonInbox(Inbox.mergeInbox(m, m)), Inbox.canonInbox(m));
  assert.equal(Inbox.mergeInbox(undefined, undefined), undefined);
  same(Inbox.mergeInbox(A, undefined).keys.map(k => k.kid), [k1.kid]);
  assert.equal(Inbox.canonInbox({ keys: [], seen: [] }), null);
  assert.equal(Inbox.canonInbox(undefined), null);
  const many = { keys: [], seen: Array.from({ length: 400 }, (_, i) => 'id' + i) };
  assert.equal(Inbox.mergeInbox(many, undefined).seen.length, 300);
});

test('取り込み: 新規は初期登録・既存は履歴に「変更」を足す（出所を残す）・同じ値は same', async () => {
  const { world, Inbox } = makeWorld();
  const T = Inbox._test;
  const item = Inbox.normalizePayload(payload());
  assert.equal(T.classify(item).status, 'new');
  assert.equal(T.applyOne({ item }, '2026-10-17'), 'added');
  const e = world.vault.entries[0];
  assert.equal(e.title, 'TEST_SERVICE');
  assert.equal(e.history[0].type, 'initial');
  assert.equal(e.history[0].password, 'DUMMY-NOT-A-SECRET-123');
  assert.match(e.description, /受け取り箱から（出所：claude-code・2026-10-17）/);
  assert.equal(T.classify(item).status, 'same');
  const changed = Inbox.normalizePayload(payload({ history: [{ username: '', password: 'DUMMY-NEW-456', note: '再発行' }] }));
  assert.equal(T.classify(changed).status, 'changed');
  assert.equal(T.applyOne({ item: changed }, '2026-10-18'), 'changed');
  assert.equal(e.history.length, 2);
  assert.equal(e.history[1].type, 'change');
  assert.equal(e.history[1].username, 'u', '空の ID は前の ID を引き継ぐ');
  assert.match(e.history[1].note, /再発行／受け取り箱から/);
  assert.equal(world.vault.entries.length, 1);
});

test('onSynced: 初回だけ鍵を作って金庫に入れ、同期後に公開鍵を登録。2回目は作り直さない', async () => {
  const { world, relay, Inbox } = makeWorld();
  await Inbox.onSynced();
  assert.equal(world.vault.inbox.keys.length, 1);
  assert.ok(world.saves >= 1 && world.flushed >= 1);
  assert.equal(relay.pub.kid, world.vault.inbox.keys[0].kid);
  assert.equal(Inbox._test.state().pub, 'ok');
  const kid = world.vault.inbox.keys[0].kid;
  await Inbox.onSynced();
  assert.equal(world.vault.inbox.keys.length, 1);
  assert.equal(world.vault.inbox.keys[0].kid, kid);
});

test('onSynced: 同期が成功していない／まだ送れていないときは、鍵を作らない・公開鍵を登録しない', async () => {
  const bad = makeWorld({ syncOk: false });
  await bad.Inbox.onSynced();
  assert.equal(bad.world.vault.inbox, undefined);
  assert.equal(bad.relay.pub, null);
  const dirty = makeWorld({ clean: false });
  await dirty.Inbox.onSynced();
  assert.equal(dirty.world.vault.inbox.keys.length, 1);   // 鍵は作る（端末に保存）
  assert.equal(dirty.relay.pub, null, '鍵を含む金庫を中継へ送れるまで、公開鍵は登録しない');
  assert.equal(dirty.Inbox._test.state().pub, 'wait');
});

test('見覚えのない公開鍵が登録されていたら警告状態にし、上書きしない', async () => {
  const { world, relay, Inbox } = makeWorld();
  const stranger = await Inbox.generateKeyPair();
  relay.pub = { kid: stranger.kid, pub: stranger.pub };
  await Inbox.onSynced();
  assert.equal(Inbox._test.state().pub, 'foreign');
  assert.equal(relay.pub.kid, stranger.kid, '自動で上書きしない');
});

test('check: 開けない封筒は箱に残す／同じ値は片付ける／取り込み済みは同期が済んでいるときだけ片付ける', async () => {
  for (const clean of [true, false]) {
    const { world, relay, Inbox } = makeWorld({ clean });
    await Inbox.onSynced();
    const mine = world.vault.inbox.keys[0];
    const foreign = await Inbox.generateKeyPair();
    relay.items.set('unreadable1', await Inbox.seal(foreign.pub, payload()));                 // 持っていない鍵宛て
    relay.items.set('good00001', await Inbox.seal(mine.pub, payload({ title: 'GOOD' })));
    Inbox._test.applyOne({ item: Inbox.normalizePayload(payload({ title: 'DUP' })) }, '2026-10-17');
    relay.items.set('same00001', await Inbox.seal(mine.pub, payload({ title: 'DUP' })));       // 金庫にすでにある
    world.vault.inbox.seen.push('seen00001');
    relay.items.set('seen00001', await Inbox.seal(mine.pub, payload({ title: 'DONE' })));      // 取り込み済みで削除し損ねた
    await Inbox.check({ show: false });
    assert.ok(relay.items.has('unreadable1'), '開けない封筒は残す');
    assert.ok(relay.items.has('good00001'), '確認待ちは残す');
    assert.ok(!relay.items.has('same00001'), '同じ値は片付ける');
    assert.equal(relay.items.has('seen00001'), !clean, '取り込み済みは同期が済んでいるときだけ片付ける');
    assert.equal(Inbox._test.state().pending, 1);
    assert.equal(Inbox._test.state().unreadable, 1);
  }
});

test('doImport: 取り込み→保存→同期が済んだら箱から削除。同期できなければ箱に残し、seen で二重登録を防ぐ', async () => {
  for (const clean of [true, false]) {
    const { world, relay, Inbox } = makeWorld({ clean });
    await Inbox.onSynced();
    const mine = world.vault.inbox.keys[0];
    relay.items.set('good00001', await Inbox.seal(mine.pub, payload({ title: 'GOOD' })));
    const item = Inbox.normalizePayload(payload({ title: 'GOOD' }));
    const savesBefore = world.saves;
    await Inbox._test.doImport([{ id: 'good00001', item, status: 'new' }], 2);
    assert.equal(world.vault.entries.some(e => e.title === 'GOOD'), true);
    assert.ok(world.vault.inbox.seen.includes('good00001'));
    assert.ok(world.saves > savesBefore);
    assert.equal(relay.items.has('good00001'), !clean);
    assert.match(world.toasts.at(-1)[0], /未チェックの 2件は箱に残しました/);
    assert.ok(!world.toasts.at(-1)[0].includes('DUMMY'), '値を toast に出さない');
    // もう一度確認しても、二重登録しない
    await Inbox.check({ show: false });
    assert.equal(world.vault.entries.filter(e => e.title === 'GOOD').length, 1);
  }
});

test('restoreInto: 復元で金庫が置き換わっても、控えの鍵を足し戻す', async () => {
  const { world, Inbox } = makeWorld();
  await Inbox.onSynced();
  const kid = world.vault.inbox.keys[0].kid;
  const restored = { entries: [], resetAt: 'x' };    // 古い予備コピー（鍵なし）
  Inbox.restoreInto(restored);
  same(restored.inbox.keys.map(k => k.kid), [kid]);
});

test('ログアウト（合言葉が消えた）後は、メモリ上の鍵の控えを捨てる', async () => {
  const { world, Inbox } = makeWorld();
  await Inbox.onSynced();
  assert.equal(Inbox._test.hasMem(), true);
  Inbox._test.wipeIfLocked();
  assert.equal(Inbox._test.hasMem(), true, '合言葉がある間は残す');
  world.masterPassword = '';
  Inbox._test.wipeIfLocked();
  assert.equal(Inbox._test.hasMem(), false);
  const restored = { entries: [], resetAt: 'x' };
  Inbox.restoreInto(restored);
  assert.equal(restored.inbox, undefined, '捨てたあとは足し戻さない');
});

// ---- メモ専用（2026-10-21）: パスワードを持たず、同名の既存の項目に「メモ・注意」の履歴行を足す ----
const memoPayload = (over = {}) => ({
  mode: 'memo', title: 'イオン銀行', type: 'service', url: '', owner: '', description: '', src: 'claude-code', ts: '2026-10-21T03:00:00Z',
  history: [{ note: '【電話メモ】\n一括繰上返済の手順を確認する。' }], ...over,
});

test('メモ専用の検査: パスワードなしで受け、ID・パスワードが入っていれば受けない／秘密の形は変えない', () => {
  const { Inbox } = makeWorld();
  const n = Inbox.normalizePayload;
  const ok = n(memoPayload({ history: [{ note: '  1行目\r\n2行目  ' }] }));
  assert.equal(ok.mode, 'memo');
  same(ok.history, [{ username: '', password: '', note: '1行目\n2行目' }]);
  assert.equal(n(memoPayload({ history: [{ note: '' }] })), null, '空のメモは受けない');
  assert.equal(n(memoPayload({ history: [{ note: '   ' }] })), null);
  assert.equal(n(memoPayload({ history: [{ note: 'x', password: 'p' }] })), null, 'パスワードが入っていたら、秘密として扱うべき内容なので受けない');
  assert.equal(n(memoPayload({ history: [{ note: 'x', username: 'u' }] })), null);
  assert.equal(n(memoPayload({ history: new Array(6).fill({ note: 'x' }) })), null, '行数の上限は5');
  assert.equal(n(memoPayload({ mode: 'other' })), null, '知らない種類は開けない封筒として残す');
  assert.equal(n(memoPayload({ history: [{ note: 'あ'.repeat(2500) }] })).history[0].note.length, 2000, '1行は2,000字まで');
  assert.equal(n(payload()).mode, undefined, '秘密の返り値に mode は付かない（従来どおり）');
  assert.equal(n(payload({ history: [{ password: 'p', note: 'あ'.repeat(600) }] })).history[0].note.length, 500, '秘密のメモは500字のまま');
});

test('メモ専用の取り込み: 同名の既存の項目に「メモ・注意」を1行足す（既存の行・パスワード・説明は変えない）', () => {
  const { world, Inbox } = makeWorld();
  const T = Inbox._test;
  T.applyOne({ item: Inbox.normalizePayload(payload({ title: 'イオン銀行', description: '住宅ローン', history: [{ username: 'u1', password: 'DUMMY-PW-1', note: '初期' }] })) }, '2026-10-01');
  const e = world.vault.entries[0];
  const before = JSON.stringify(e.history);
  const desc = e.description;
  const item = Inbox.normalizePayload(memoPayload());
  const c = T.classify(item);
  assert.equal(c.status, 'memo-add');
  assert.equal(c.entryId, e.id);
  assert.equal(T.applyOne({ item }, '2026-10-21'), 'memo');
  assert.equal(world.vault.entries.length, 1, '新しい項目は作らない');
  assert.equal(JSON.stringify(e.history.slice(0, 1)), before, '既存の行は変えない');
  assert.equal(e.history.length, 2);
  const row = e.history[1];
  assert.equal(row.type, 'other');
  assert.equal(row.date, '2026-10-21');
  assert.equal(row.username, '');
  assert.equal(row.password, '');
  assert.equal(row.note, '【電話メモ】\n一括繰上返済の手順を確認する。\n受け取り箱から（出所：claude-code・2026-10-21）');
  assert.equal(e.description, desc, '説明は変えない');
  assert.equal(world.getLatestCreds(e).password, 'DUMMY-PW-1', '最新のIDとパスワードは変わらない');
  assert.equal(T.classify(item).status, 'same', '取り込んだあとは変更なし');
  assert.equal(T.classify(Inbox.normalizePayload(memoPayload({ history: [{ note: '別のメモ' }] }))).status, 'memo-add');
});

test('メモ専用: 手で貼った同じ文面（改行コードの違い）も「変更なし」。複数行は1回で全部足す', () => {
  const { world, Inbox } = makeWorld();
  const T = Inbox._test;
  world.vault.entries.push({ id: 'e1', title: 'イオン銀行', type: 'service', history: [
    { id: 'h1', date: '2026-10-01', type: 'initial', username: 'u', password: 'DUMMY-PW', note: '' },
    { id: 'h2', date: '2026-10-21', type: 'other', username: '', password: '', note: '【電話メモ】\r\n一括繰上返済の手順を確認する。' },
  ] });
  assert.equal(T.classify(Inbox.normalizePayload(memoPayload())).status, 'same');
  const two = Inbox.normalizePayload(memoPayload({ history: [{ note: 'メモA' }, { note: 'メモB' }] }));
  assert.equal(T.classify(two).status, 'memo-add');
  assert.equal(T.applyOne({ item: two }, '2026-10-22'), 'memo');
  assert.equal(world.vault.entries[0].history.length, 4);
  assert.equal(T.classify(two).status, 'same');
});

test('メモ専用: 全角半角・空白の違いは同名とみなす。秘密は従来どおり完全一致のまま', () => {
  const { world, Inbox } = makeWorld();
  const T = Inbox._test;
  world.vault.entries.push({ id: 'e1', title: 'イオン銀行', type: 'service', history: [{ id: 'h1', date: '2026-10-01', type: 'initial', username: 'u', password: 'DUMMY-PW', note: '' }] });
  const half = Inbox.normalizePayload(memoPayload({ title: 'ｲｵﾝ銀行 ' }));
  assert.equal(T.classify(half).status, 'memo-add');
  assert.equal(T.classify(half).entryId, 'e1');
  assert.equal(T.classify(Inbox.normalizePayload(payload({ title: 'ｲｵﾝ銀行', history: [{ username: 'u', password: 'DUMMY-PW', note: '' }] }))).status, 'new', '秘密は完全一致だけ');
});

test('メモ専用: 同名が無ければ新規にせず memo-new（近い名前を添える）。取り込むと「メモ・注意」だけの新しい項目', () => {
  const { world, Inbox } = makeWorld();
  const T = Inbox._test;
  world.vault.entries.push({ id: 'e1', title: 'イオン銀行（住宅ローン）', type: 'service', history: [] });
  world.vault.entries.push({ id: 'e2', title: 'GitHub', type: 'service', history: [] });
  const item = Inbox.normalizePayload(memoPayload());
  const c = T.classify(item);
  assert.equal(c.status, 'memo-new');
  assert.equal(c.entryId, null);
  same(c.similar, ['イオン銀行（住宅ローン）']);
  assert.equal(T.applyOne({ item }, '2026-10-21'), 'added');
  assert.equal(world.vault.entries.length, 3);
  const e = world.vault.entries[0];
  assert.equal(e.title, 'イオン銀行');
  assert.equal(e.history.length, 1);
  assert.equal(e.history[0].type, 'other');
  assert.equal(e.history[0].password, '');
  assert.match(e.description, /受け取り箱から（出所：claude-code・2026-10-21）/);
});

test('メモ専用の確認待ち・取り込み・片付け: check が memo-add を出し、doImport が「メモ追加」を数え、同じメモは片付ける', async () => {
  const { world, relay, Inbox } = makeWorld();
  await Inbox.onSynced();
  const mine = world.vault.inbox.keys[0];
  Inbox._test.applyOne({ item: Inbox.normalizePayload(payload({ title: 'イオン銀行' })) }, '2026-10-01');
  relay.items.set('memo00001', await Inbox.seal(mine.pub, memoPayload()));
  const ready = await Inbox.check({ show: false });
  assert.equal(ready.length, 1);
  assert.equal(ready[0].status, 'memo-add');
  await Inbox._test.doImport(ready.map(r => ({ id: r.id, item: r.item, status: r.status })), 0);
  assert.match(world.toasts.at(-1)[0], /新規 0件・更新 0件・メモ追加 1件/);
  assert.ok(!relay.items.has('memo00001'), '同期が済んだので箱から消える');
  assert.equal(world.vault.entries[0].history.length, 2);
  relay.items.set('memo00002', await Inbox.seal(mine.pub, memoPayload()));      // 同じメモの送り直し（別 id）
  const again = await Inbox.check({ show: false });
  assert.equal(again.length, 0);
  assert.ok(!relay.items.has('memo00002'), '同じメモは片付ける');
  assert.equal(world.vault.entries[0].history.length, 2, '二重に足さない');
});
