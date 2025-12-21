// service-worker.js
const CACHE = 'farmtrack-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './utils.js',
  './sample-data.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
