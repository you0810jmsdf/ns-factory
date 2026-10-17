// sync.js の受け取り箱まわり（鍵の合流・今すぐ送る・復元での足し戻し）の試験。ダミー値のみ。
// 実行: node --test password-note/test/sync_inbox.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const read = f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

function load({ fetchImpl } = {}) {
  const store = new Map();
  const world = {
    console, crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, URL, setInterval, clearInterval, setTimeout, clearTimeout, AbortController,
    location: { hash: '', hostname: 'example.test', pathname: '/', search: '' },
    history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'Node' },
    window: { addEventListener() {} },
    document: { addEventListener() {}, hidden: false, getElementById: () => null, querySelector: () => null },
    DB: {
      get: async k => store.get(k),
      set: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      del: async k => { store.delete(k); },
    },
    CryptoManager: { encrypt: async v => 'ENC', decrypt: async () => ({ entries: [] }) },
    vault: { entries: [], lastModified: null },
    masterPassword: 'x',
    now: () => '2026-10-17T10:00:00.000Z',
    saveVaultLocal: async () => {},
    renderList() {}, toast() {},
    fetch: fetchImpl || (async () => { throw new Error('network'); }),
  };
  const ctx = vm.createContext(world);
  vm.runInContext(read('inbox.js'), ctx);   // const Inbox = ... を global に置く
  const Sync = vm.runInContext(read('sync.js') + '\n;Sync', ctx);
  const Inbox = vm.runInContext('Inbox', ctx);
  return { world, store, Sync, Inbox };
}

const entry = (id, updatedAt, extra = {}) => ({ id, title: id, updatedAt, history: [], ...extra });

test('受け取り箱が無い金庫の合流は、これまでどおり（新しい更新が勝つ・墓標・inbox は付かない）', () => {
  const { Sync } = load();
  const a = { entries: [entry('x', '2026-10-02'), entry('only-a', '2026-10-01')], deleted: {}, lastModified: '2026-10-02' };
  const b = { entries: [entry('x', '2026-10-01'), entry('only-b', '2026-10-01')], deleted: { 'only-a': '2026-10-05' }, lastModified: '2026-10-01' };
  const m = Sync.merge(a, b);
  same(m.entries.map(e => e.id).sort(), ['only-b', 'x']);       // only-a は墓標のほうが新しいので消える
  assert.equal(m.entries.find(e => e.id === 'x').updatedAt, '2026-10-02');
  assert.equal('inbox' in m, false);
  assert.equal(Sync.canon(a).includes('"inbox":null'), true);
});

test('鍵が片方にしか無くても失わない（通常の合流・全体置き換えの側でも）', async () => {
  const { Sync, Inbox } = load();
  const k = await Inbox.generateKeyPair();
  const withKey = { entries: [], deleted: {}, inbox: { keys: [k], seen: ['s1'] } };
  const noKey = { entries: [], deleted: {} };
  assert.equal(Sync.merge(noKey, withKey).inbox.keys[0].kid, k.kid);
  assert.equal(Sync.merge(withKey, noKey).inbox.keys[0].kid, k.kid);
  // 全体置き換え（resetAt が違う）でも、勝つ側に鍵が無ければ負ける側の鍵を足す
  const reset = { entries: [], deleted: {}, resetAt: '2026-10-10' };
  const m1 = Sync.merge(reset, withKey);
  assert.equal(m1.resetAt, '2026-10-10');
  assert.equal(m1.inbox.keys[0].kid, k.kid);
  const m2 = Sync.merge(withKey, reset);
  assert.equal(m2.inbox.keys[0].kid, k.kid);
});

test('canon: 鍵が増えたら「違い」として検出する（取り込み損ねない）。順序や回数には左右されない', async () => {
  const { Sync, Inbox } = load();
  const k1 = await Inbox.generateKeyPair();
  const k2 = await Inbox.generateKeyPair();
  const base = { entries: [], deleted: {} };
  assert.notEqual(Sync.canon(base), Sync.canon({ ...base, inbox: { keys: [k1], seen: [] } }));
  assert.equal(Sync.canon({ ...base, inbox: { keys: [k1, k2], seen: ['a', 'b'] } }), Sync.canon({ ...base, inbox: { keys: [k2, k1], seen: ['b', 'a'] } }));
  assert.equal(Sync.canon({ ...base, inbox: { keys: [], seen: [] } }), Sync.canon(base));
  const m = Sync.merge({ ...base, inbox: { keys: [k1], seen: [] } }, { ...base, inbox: { keys: [k2], seen: [] } });
  assert.equal(Sync.canon(Sync.merge(m, m)), Sync.canon(m));
});

test('noteReplaced: 全体の置き換えのとき、受け取り箱の鍵を足し戻す処理を先に呼ぶ（同期の鍵が無ければ呼ばない）', async () => {
  const on = load();
  on.store.set('syncConfig', { key: 'k'.repeat(30) });
  await on.Sync.init();
  let got = null;
  on.Inbox.restoreInto = v => { got = v; };       // 呼ばれたかを見るための差し替え
  on.world.vault = { entries: [] };
  await on.Sync.noteReplaced();
  assert.equal(got, on.world.vault);
  assert.equal(on.world.vault.resetAt, '2026-10-17T10:00:00.000Z');

  const off = load();
  await off.Sync.init();
  let called = false;
  off.Inbox.restoreInto = () => { called = true; };
  await off.Sync.noteReplaced();
  assert.equal(called, false);
});

test('flushNow: 送れたら true・送れなければ false（まとめ待ちを待たずに送る）', async () => {
  let puts = 0;
  const ok = load({ fetchImpl: async (url, init) => {
    if (init.method === 'PUT') puts++;
    return { status: 200, ok: true, json: async () => ({ rev: 7, updatedAt: 't' }) };
  } });
  ok.store.set('syncConfig', { key: 'k'.repeat(30) });
  ok.store.set('vault', 'ENCDATA');
  await ok.Sync.init();
  assert.equal(await ok.Sync.flushNow(), true);
  assert.equal(puts, 1);
  assert.equal(ok.Sync.status().clean, true);

  const ng = load({ fetchImpl: async () => { throw new Error('offline'); } });
  ng.store.set('syncConfig', { key: 'k'.repeat(30) });
  ng.store.set('vault', 'ENCDATA');
  await ng.Sync.init();
  assert.equal(await ng.Sync.flushNow(), false);
  assert.equal(ng.Sync.status().ok, false);

  const off = load();           // 鍵が未設定
  await off.Sync.init();
  assert.equal(await off.Sync.flushNow(), false);
  assert.equal(off.Sync.isConfigured(), false);
});

test('同期の鍵が無い端末では、受け取り箱は何もしない（通信もしない）', async () => {
  let calls = 0;
  const { Sync, Inbox, world } = load({ fetchImpl: async () => { calls++; return { status: 200, ok: true, json: async () => ({}) }; } });
  await Sync.init();
  await Inbox.onSynced();
  assert.equal(calls, 0);
  assert.equal(world.vault.inbox, undefined);
});
