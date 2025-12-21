/* service-worker.js - simple cache-first PWA service worker */
const CACHE_NAME = 'farmtrack-shell-v1';
const RUNTIME_CACHE = 'farmtrack-runtime-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/db.js',
  '/utils.js',
  '/sample-data.js',
  '/manifest.json'
];

// CDN libraries to attempt caching for offline
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/idb@7/build/iife/index-min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([...PRECACHE_URLS, ...CDN_URLS])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For navigation requests, show cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(response => response || fetch(event.request))
    );
    return;
  }

  // Cache-first for app shell & static assets
  if (PRECACHE_URLS.includes(url.pathname) || CDN_URLS.includes(url.href)) {
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request).then(res => {
        return caches.open(RUNTIME_CACHE).then(cache => { cache.put(event.request, res.clone()); return res; });
      })).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  // For other requests, network-first then cache fallback (useful for online sync)
  event.respondWith(
    fetch(event.request).then(response => {
      // put in runtime cache
      return caches.open(RUNTIME_CACHE).then(cache => { cache.put(event.request, response.clone()); return response; });
    }).catch(() => caches.match(event.request))
  );
});

// basic message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
