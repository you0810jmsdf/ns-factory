// 計測の部品の検査: node shrine-note/tools/test_analytics.mjs
// 見るもの: 手元や別ホストでは送らない／「計測しない」設定を守る／送る項目が限られる／仮想ページのパスの形
import { createTracker } from '../map/analytics.js';
import assert from 'node:assert/strict';

function fakeEnv({ host = 'you0810jmsdf.github.io', protocol = 'https:', optout = null } = {}) {
  const sent = []; const scripts = [];
  const env = {
    location: { protocol, hostname: host },
    localStorage: { getItem: (k) => (k === 'nsf_ga_optout' ? optout : null) },
    document: { createElement: () => ({}), head: { appendChild: (s) => scripts.push(s.src) } },
    dataLayer: [], gtag: undefined,
  };
  env.gtag = function () { sent.push([...arguments]); };
  return { env, sent, scripts };
}
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('OK  ' + name); };

ok('手元（localhost）では何も送らない・読み込まない', () => {
  const { env, sent, scripts } = fakeEnv({ host: 'localhost', protocol: 'http:' }); const t = createTracker(env);
  t.pageview('en'); t.shrine('en', 'ise'); t.event('shrine_article', { shrine: 'ise', lang: 'en', kind: 'en' });
  assert.equal(sent.length, 0); assert.equal(scripts.length, 0);
});
ok('「計測しない」設定（nsf_ga_optout=1）では何も送らない', () => {
  const { env, sent, scripts } = fakeEnv({ optout: '1' }); const t = createTracker(env);
  t.pageview('ja'); t.deity('ja', 'amaterasu');
  assert.equal(sent.length, 0); assert.equal(scripts.length, 0);
});
ok('公開版では config（自動ページ閲覧なし・広告シグナルなし）と仮想ページを送る', () => {
  const { env, sent, scripts } = fakeEnv(); const t = createTracker(env);
  t.pageview('en'); t.shrine('en', 'ise'); t.deity('ja', 'amaterasu'); t.section('en', 'tree');
  assert.equal(scripts.length, 1); assert.match(scripts[0], /googletagmanager\.com\/gtag\/js\?id=G-ND1T7H067Y$/);
  const cfg = sent.find((a) => a[0] === 'config'); assert.equal(cfg[2].send_page_view, false); assert.equal(cfg[2].allow_google_signals, false); assert.equal(cfg[2].allow_ad_personalization_signals, false);
  const pv = sent.filter((a) => a[0] === 'event' && a[1] === 'page_view').map((a) => a[2].page_location.replace('https://you0810jmsdf.github.io/ns-factory/shrine-note/map/', ''));
  assert.deepEqual(pv, ['en', 'en/ise', 'ja/deity/amaterasu', 'en/tree']);
});
ok('不正な ID・言語・画面名は送らない／言語は en か ja のみ（それ以外は ja）', () => {
  const { env, sent } = fakeEnv(); const t = createTracker(env);
  t.shrine('en', '../etc/passwd'); t.deity('en', 'a b'); t.section('en', 'secret'); t.shrine('fr', 'ise');
  const pv = sent.filter((a) => a[1] === 'page_view').map((a) => a[2].page_location);
  assert.deepEqual(pv, ['https://you0810jmsdf.github.io/ns-factory/shrine-note/map/ja/ise']);
});
ok('イベントは shrine / lang / kind だけを通す（位置情報などは落ちる）', () => {
  const { env, sent } = fakeEnv(); const t = createTracker(env);
  t.event('shrine_article', { shrine: 'ise', lang: 'en', kind: 'en', lat: 35.1, lon: 136.7, text: '検索語', visited: 12 });
  t.event('bad name', { kind: 'x' }); t.event('other_event', { kind: 'x' });
  const ev = sent.filter((a) => a[0] === 'event' && a[1] !== 'page_view');
  assert.equal(ev.length, 1); assert.deepEqual(ev[0][2], { shrine: 'ise', lang: 'en', kind: 'en' });
});
ok('gtag が壊れても例外を外へ出さない', () => {
  const { env } = fakeEnv(); env.gtag = () => { throw new Error('x'); }; const t = createTracker(env);
  assert.doesNotThrow(() => { t.pageview('en'); t.event('shrine_lang', { kind: 'to_en' }); });
});
console.log(n + ' 件 合格');
