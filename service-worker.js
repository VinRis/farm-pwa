const CACHE_NAME = 'farmtrack-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './db.js',
    './utils.js',
    './sample-data.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// --- 1. Installation & Pre-caching ---
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Force the waiting service worker to become active
});

// --- 2. Clean up old caches ---
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    return self.clients.claim();
});

// --- 3. Optimized Fetch Strategy ---
self.addEventListener('fetch', (e) => {
    // Skip cross-origin requests like Firebase Auth/Firestore to prevent cache errors
    if (!e.request.url.startsWith(self.location.origin) && !e.request.url.includes('cdnjs')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(e.request).then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache the newly fetched resource
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });

                return response;
            });
        }).catch(() => {
            if (e.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});

// --- 4. Handle Notification Push Events ---
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Farm Reminder', body: 'Check your livestock schedule.' };
    
    const options = {
        body: data.body,
        icon: './icon-192x192.png',
        badge: './badge-icon.png', // Small icon for status bar
        vibrate: [100, 50, 100],
        data: {
            url: self.location.origin
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// --- 5. Handle Notification Click ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

