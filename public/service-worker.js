// Farm Manager PWA Service Worker
// Version: 2.0.0
const CACHE_NAME = 'farm-pwa-cache-v2.0';
const GHPATH = '/farm-pwa'; // GitHub Pages path
const OFFLINE_URL = `${GHPATH}/offline.html`;

// Core app files to cache immediately
const STATIC_ASSETS = [
    `${GHPATH}/`,
    `${GHPATH}/index.html`,
    `${GHPATH}/offline.html`,
    `${GHPATH}/manifest.json`,
    `${GHPATH}/favicon.ico`,
    `${GHPATH}/icon-192.png`,
    `${GHPATH}/icon-512.png`,
    
    // Core CSS
    `${GHPATH}/src/styles/colors.css`,
    `${GHPATH}/src/styles/mobile-first.css`,
    `${GHPATH}/src/styles/main.css`,
    
    // Core JS
    `${GHPATH}/src/js/app.js`,
    `${GHPATH}/src/js/pwa-handler.js`,
    
    // Components
    `${GHPATH}/src/components/livestock/LivestockSwitch.js`,
    `${GHPATH}/src/components/livestock/DairyDashboard.js`,
    `${GHPATH}/src/components/livestock/PoultryDashboard.js`,
    
    // Fonts
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500&display=swap',
    
    // Icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache core assets
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Skip waiting on install');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[ServiceWorker] Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, cache fallback strategy
self.addEventListener('fetch', event => {
    // Skip non-GET requests and chrome-extension requests
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    const requestUrl = new URL(event.request.url);
    
    // Handle API requests differently
    if (requestUrl.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache API responses for offline use
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request);
                })
        );
    } else {
        // For static assets: Cache First, Network Fallback
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // Update cache in background
                        fetch(event.request)
                            .then(response => {
                                if (response.ok) {
                                    caches.open(CACHE_NAME)
                                        .then(cache => cache.put(event.request, response));
                                }
                            })
                            .catch(() => {}); // Silently fail background update
                        return cachedResponse;
                    }
                    
                    // Not in cache, fetch from network
                    return fetch(event.request)
                        .then(response => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type === 'opaque') {
                                return response;
                            }
                            
                            // Clone the response
                            const responseToCache = response.clone();
                            
                            // Cache the new response
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(error => {
                            console.error('[ServiceWorker] Fetch failed:', error);
                            
                            // If offline and requesting HTML, show offline page
                            if (event.request.headers.get('accept').includes('text/html')) {
                                return caches.match(OFFLINE_URL);
                            }
                            
                            // Return offline response for API calls
                            if (event.request.url.includes('/api/')) {
                                return new Response(JSON.stringify({
                                    error: 'You are offline',
                                    timestamp: new Date().toISOString(),
                                    cached: true
                                }), {
                                    headers: { 'Content-Type': 'application/json' }
                                });
                            }
                        });
                })
        );
    }
});

// Background sync for farm data
self.addEventListener('sync', event => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-farm-data') {
        event.waitUntil(syncFarmData());
    }
});

// Periodic sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-farm-cache') {
        console.log('[ServiceWorker] Periodic sync triggered');
        event.waitUntil(updateFarmCache());
    }
});

// Sync farm data function
async function syncFarmData() {
    try {
        const pendingChanges = await getPendingChanges();
        console.log('[ServiceWorker] Syncing', pendingChanges.length, 'pending changes');
        
        for (const change of pendingChanges) {
            await sendToServer(change);
            await markAsSynced(change.id);
        }
        
        // Show notification when sync completes
        self.registration.showNotification('Farm Data Synced', {
            body: 'Your farm data has been synchronized with the server',
            icon: '/farm-pwa/icon-192.png',
            badge: '/farm-pwa/icon-192.png'
        });
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
    }
}

// Update farm cache function
async function updateFarmCache() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                await cache.put(request, networkResponse);
            }
        } catch (error) {
            // Silently fail for cache updates
        }
    }
}

// Helper functions
async function getPendingChanges() {
    // This would typically read from IndexedDB
    return [];
}

async function sendToServer(change) {
    // Simulate server sync
    return new Promise(resolve => setTimeout(resolve, 100));
}

async function markAsSynced(id) {
    // Mark change as synced in IndexedDB
}

// Push notifications
self.addEventListener('push', event => {
    console.log('[ServiceWorker] Push received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Farm Manager Notification';
    const options = {
        body: data.body || 'You have a new notification from Farm Manager',
        icon: '/farm-pwa/icon-192.png',
        badge: '/farm-pwa/icon-192.png',
        data: data.url || '/farm-pwa/',
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('[ServiceWorker] Notification click');
    
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Focus existing window or open new one
                for (const client of clientList) {
                    if (client.url === event.notification.data && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data);
                }
            })
    );
});