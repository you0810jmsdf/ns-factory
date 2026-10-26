// 見守り（js/guard.js）の「開き方」の試験。ダミー値のみ・通信は偽物。実行: node --test password-note/test/guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../js/guard.js', import.meta.url), 'utf8');

// 偽のブラウザで guard.js を読み込む。session は同じタブの sessionStorage（読み込みをまたいで共有できる）
function load({ flag = '1', navType = 'navigate', vis = 'visible', key = 'k'.repeat(24), session = new Map(), noPerf = false, sessionBroken = false } = {}) {
  const calls = [];
  const local = new Map(flag ? [['pwn_guard_on', flag]] : []);
  const w = {
    console, setTimeout, clearTimeout, AbortController, URL,
    localStorage: { getItem: k => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) },
    sessionStorage: sessionBroken
      ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
      : { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, v) => session.set(k, String(v)) },
    location: { hash: '', pathname: '/ns-factory/password-note/', search: '' },
    history: { replaceState() {} },
    document: { visibilityState: vis, querySelector: () => null, getElementById: () => null },
    performance: noPerf ? {} : { getEntriesByType: t => (t === 'navigation' ? [{ type: navType }] : []) },
    vault: { guard: { key } },
    fetch: async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, status: 200 }; },
  };
  w.now = () => '2026-10-26T12:00:00.000Z';
  w.saveVaultLocal = async () => {};
  vm.createContext(w);
  vm.runInContext(SRC + '\nthis.Guard = Guard;', w);
  return { Guard: w.Guard, calls, local, session };
}
const tick = () => new Promise(r => setTimeout(r, 5));

test('自動ログイン：初めて開いた（navigate・このタブで初めて）→ how=navigate / tab=new / vis', async () => {
  const { Guard, calls } = load({ navType: 'navigate', vis: 'visible' });
  Guard.ping('auto'); await tick();
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/ping$/);
  assert.deepEqual(calls[0].body, { type: 'auto', how: 'navigate', tab: 'new', vis: 'visible' });
  assert.equal(calls[0].init.headers['x-guard-key'], 'k'.repeat(24));
});

test('自動ログイン：再読み込み（reload）は how=reload。同じタブで読み込み直すと tab=again', async () => {
  const session = new Map();
  load({ navType: 'navigate', session });                       // 1回目の読み込み（印が付く）
  const second = load({ navType: 'reload', session, vis: 'hidden' });
  second.Guard.ping('auto'); await tick();
  assert.deepEqual(second.calls[0].body, { type: 'auto', how: 'reload', tab: 'again', vis: 'hidden' });
});

test('自動ログイン：戻る・進む・先読みもそのまま how に入る', async () => {
  for (const t of ['back_forward', 'prerender']) {
    const { Guard, calls } = load({ navType: t });
    Guard.ping('auto'); await tick();
    assert.equal(calls[0].body.how, t);
  }
});

test('自動ログイン以外（login/save/ai）には開き方を付けない', async () => {
  const { Guard, calls } = load({ navType: 'reload' });
  Guard.ping('login'); Guard.ping('save'); Guard.ping('ai'); await tick();
  assert.deepEqual(calls.map(c => c.body), [{ type: 'login' }, { type: 'save' }, { type: 'ai' }]);
});

test('取れない環境でも通知は止めない：performance が無い／sessionStorage が使えない', async () => {
  const a = load({ noPerf: true });
  a.Guard.ping('auto'); await tick();
  assert.deepEqual(a.calls[0].body, { type: 'auto', tab: 'new', vis: 'visible' });   // how だけ欠ける
  const b = load({ sessionBroken: true });
  b.Guard.ping('auto'); await tick();
  assert.deepEqual(b.calls[0].body, { type: 'auto', how: 'navigate', vis: 'visible' }); // tab だけ欠ける
});

test('見守りを設定していない端末は、何も通信せず、何も残さない（印も付けない）', async () => {
  const none = load({ flag: '', key: '' });
  none.Guard.ping('auto'); none.Guard.ping('login'); await tick();
  assert.equal(none.calls.length, 0);
  assert.equal(none.session.size, 0);                                                    // sessionStorage にも何も書かない
  // 設定の印はあるが、保管庫の鍵が（まだ）無い間は通信しない
  const nokey = load({ flag: '1', key: '' });
  nokey.Guard.ping('auto'); await tick();
  assert.equal(nokey.calls.length, 0);
});

test('送る中身に、合言葉・登録内容・端末の細かい情報は含まれない（決まった語だけ）', async () => {
  const { Guard, calls } = load({ navType: 'reload' });
  Guard.ping('auto'); await tick();
  const b = calls[0].body;
  assert.deepEqual(Object.keys(b).sort(), ['how', 'tab', 'type', 'vis']);
  assert.ok(['navigate', 'reload', 'back_forward', 'prerender'].includes(b.how));
  assert.ok(['new', 'again'].includes(b.tab));
  assert.ok(['visible', 'hidden'].includes(b.vis));
});
