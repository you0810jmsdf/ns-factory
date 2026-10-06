const CACHE = 'pw-manager-v53';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './js/crypto.js',
  './js/db.js',
  './js/remember.js',
  './js/gist.js',
  './js/print.js',
  './js/autobackup.js',
  './js/guard.js',
  './js/app.js',
  './js/envimport.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => { for (const c of clients) c.navigate(c.url); })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('github.com')) {
    e.respondWith(fetch(e.request));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
