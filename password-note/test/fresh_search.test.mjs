// 最新かどうかの照合（sync.js の freshness・guardEdit）と、検索（app.js の normSearch・matchesQuery）の試験。ダミー値のみ。
// 実行: node --test password-note/test/fresh_search.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const read = f => fs.readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');

function loadSync({ fetchImpl, withKey = false } = {}) {
  const store = new Map();
  if (withKey) store.set('syncConfig', { key: 'A'.repeat(48), savedAt: '2026-11-04T00:00:00.000Z' });
  const toasts = [];
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
    masterPassword: '',
    now: () => '2026-11-04T10:00:00.000Z',
    saveVaultLocal: async () => {},
    renderList() {},
    toast(msg, type) { toasts.push({ msg, type }); },
    fetch: fetchImpl || (async () => { throw new Error('network'); }),
  };
  const ctx = vm.createContext(world);
  vm.runInContext(read('inbox.js'), ctx);
  const Sync = vm.runInContext(read('sync.js') + '\n;Sync', ctx);
  return { world, store, Sync, toasts };
}

const ctxOf = (o = {}) => ({ configured: true, uiFlag: true, unlocked: false, busy: false, pending: false, ...o });
const st = (o = {}) => ({ rev: 0, dirty: false, at: 0, ok: null, msg: '', ...o });
const rm = (o = {}) => ({ checked: true, fail: '', rev: 68, ...o });

test('照合: 問題なし・未確認・鍵なしの扱い', () => {
  const { Sync } = loadSync();
  assert.equal(Sync.freshness(st({ rev: 68 }), rm(), ctxOf()), null);                       // 中継と同じ
  assert.equal(Sync.freshness(st(), { checked: false, fail: '', rev: 0 }, ctxOf()), null);  // まだ照合していない
  assert.equal(Sync.freshness(st({ rev: 70 }), rm(), ctxOf()), null);                       // 手元のほうが新しい（編集は止めない）
  assert.equal(Sync.freshness(st(), rm(), ctxOf({ configured: false, uiFlag: false })), null);   // 同期を使わない端末は何も言わない
  assert.equal(Sync.freshness(st(), rm(), ctxOf({ configured: false, uiFlag: true })).level, 'nokey');
});

test('照合: 古い・食い違いは止める印（stale／diverged）、確認不能・未送信は警告だけ', () => {
  const { Sync } = loadSync();
  const stale = Sync.freshness(st({ rev: 0 }), rm(), ctxOf());
  assert.equal(stale.level, 'stale');
  assert.match(stale.text, /rev 68/);
  assert.match(stale.text, /合言葉で開くと合流/);                                            // 合言葉前の案内
  assert.match(Sync.freshness(st({ rev: 0 }), rm(), ctxOf({ unlocked: true })).text, /今すぐ同期/);   // 開いたあとの案内
  assert.equal(Sync.freshness(st({ rev: 60, dirty: true }), rm(), ctxOf()).level, 'diverged');
  const unknown = Sync.freshness(st({ rev: 68 }), rm({ fail: 'ネットにつながりません' }), ctxOf());
  assert.equal(unknown.level, 'unknown');
  assert.match(unknown.text, /ネットにつながりません/);
  assert.equal(Sync.freshness(st({ rev: 68, dirty: true }), rm(), ctxOf()).level, 'dirty');
  assert.equal(Sync.freshness(st({ rev: 68, dirty: true }), rm(), ctxOf({ busy: true })), null);      // 送信中は言わない
  assert.equal(Sync.freshness(st({ rev: 68, dirty: true }), rm(), ctxOf({ pending: true })), null);   // まとめ待ち中も言わない
  assert.equal(Sync.freshness(st({ rev: 68, ok: false, msg: '送れませんでした' }), rm(), ctxOf({ unlocked: true })).level, 'unknown');
});

test('止める: 中継のほうが新しいときだけ guardEdit が true（理由を出す）。確認不能・同じ rev は止めない', async () => {
  const newer = loadSync({ withKey: true, fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ rev: 68 }) }) });
  await newer.Sync.init();
  await newer.Sync.checkFresh();
  assert.equal(newer.Sync.isBlocked(), true);
  assert.equal(newer.Sync.guardEdit(), true);
  assert.equal(newer.toasts.length, 1);
  assert.match(newer.toasts[0].msg, /止めています/);

  const same = loadSync({ withKey: true, fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ rev: 0 }) }) });
  await same.Sync.init();
  await same.Sync.checkFresh();
  assert.equal(same.Sync.guardEdit(), false);
  assert.equal(same.toasts.length, 0);

  const offline = loadSync({ withKey: true });   // fetch が失敗する
  await offline.Sync.init();
  await offline.Sync.checkFresh();
  assert.equal(offline.Sync.isBlocked(), false);  // 確認できないときは警告だけで、編集は止めない
  assert.equal(offline.Sync.guardEdit(), false);

  const noKey = loadSync();
  assert.equal(noKey.Sync.guardEdit(), false);    // 同期を使わない端末は何も止めない
});

// ---- 検索（app.js から該当の関数だけ取り出して試す。app.js 全体は画面を要するので読み込まない） ----
function loadSearch() {
  const src = read('app.js');
  const a = src.indexOf('// 検索用に文字をそろえる');
  const b = src.indexOf('function getFiltered()');
  assert.ok(a >= 0 && b > a, 'app.js に検索の関数が見つかりません');
  const ctx = vm.createContext({});
  vm.runInContext(src.slice(a, b) + '\n;({ normSearch, matchesQuery })', ctx);
  return vm.runInContext('({ normSearch, matchesQuery })', ctx);
}
const terms = (s, n) => n(s).split(/\s+/).filter(Boolean);

test('検索: 空白区切りの語は AND・全角空白も区切り', () => {
  const { normSearch, matchesQuery } = loadSearch();
  const e = { title: 'CALENDAR_ADMIN_PASSWORD', owner: '祐樹', url: '', description: "N's factory 管理画面 ログイン サイト GAS 共通" };
  assert.equal(matchesQuery(e, terms('管理画面 ログイン', normSearch)), true);
  assert.equal(matchesQuery(e, terms('管理画面　ログイン', normSearch)), true);   // 全角空白
  assert.equal(matchesQuery(e, terms('管理画面 存在しない語', normSearch)), false);
  assert.equal(matchesQuery(e, terms('calendar gas', normSearch)), true);         // 項目名と概要をまたいでも一致
});

test('検索: 全角半角・大文字小文字・ひらがなとカタカナをそろえる', () => {
  const { normSearch, matchesQuery } = loadSearch();
  const e = { title: 'サイト', owner: '', url: '', description: 'ＡＤＭＩＮ　カンリ ﾛｸﾞｲﾝ' };
  assert.equal(matchesQuery(e, terms('admin', normSearch)), true);       // 全角ＡＤＭＩＮ
  assert.equal(matchesQuery(e, terms('かんり', normSearch)), true);       // ひらがな→カタカナ
  assert.equal(matchesQuery(e, terms('ログイン', normSearch)), true);     // 半角カナ
  assert.equal(matchesQuery(e, terms('ＡＤＭＩＮ', normSearch)), true);   // 全角で入れても
});

test('検索: 履歴のメモは対象・ID とパスワードは対象外', () => {
  const { normSearch, matchesQuery } = loadSearch();
  const e = { title: 'X', owner: '', url: '', description: '', history: [{ username: 'zzuser01', password: 'zzpass99', note: '旧値は無効。管理ページで使う' }] };
  assert.equal(matchesQuery(e, terms('管理ページ', normSearch)), true);
  assert.equal(matchesQuery(e, terms('zzpass99', normSearch)), false);
  assert.equal(matchesQuery(e, terms('zzuser01', normSearch)), false);
});
