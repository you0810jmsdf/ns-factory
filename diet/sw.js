// 重要: ASSETSに含まれるファイルを1つでも変更したら、必ずCACHEのバージョン番号を上げること。
// 上げないとユーザーのブラウザに反映されない。

const CACHE = 'diet-v8';
const ASSETS = Object.freeze([
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './assets/style.css',
  './assets/db.js',
  './assets/calc.js',
  './assets/chart.js',
  './assets/quick-entry.js',
  './assets/photo.js',
  './photo.html',
  './assets/foods.js',
  './assets/exercises-db.js',
  './assets/app.js',
  './assets/views/home.js',
  './assets/views/weight.js',
  './assets/views/meal.js',
  './assets/views/exercise.js',
  './assets/views/water.js',
  './assets/views/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
]);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((asset) => cache.add(asset).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('diet-') && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }
    return fetch(event.request);
  })());
});
