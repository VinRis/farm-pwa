const CACHE_NAME = 'farmtrack-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './db.js',
    './utils.js',
    './sample-data.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            // Return cache if found, else network
            return res || fetch(e.request).then(response => {
                // Runtime caching for new files
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        }).catch(() => {
            // Fallback for purely offline
            if (e.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
