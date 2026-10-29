// N's factory リフィル印刷ツールの Service Worker（2026-10-29）。
// 方針: ネットワーク優先。つながるときは常に最新を取り、取れたものを控えておく。つながらないときだけ控えを返す。
// ⛔ 古い画面が残らないよう、先に控えを返す（cache-first）方式にしない。対象はリフィルツールのページと assets のみ。
const CACHE = 'nsf-refill-v1';
const TARGET = /\/((a5|a5slim|a6|bible|micro5|mini6)-(daily|weekly|monthly)|bible-vertical|refill-maker|tools)\/|\/assets\//;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || !TARGET.test(u.pathname)) return;
  if (/feedback-replies\.json$/.test(u.pathname)) return; // 返信・状況は常に最新を見せる
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r).then(m => m || Response.error()))
  );
});
