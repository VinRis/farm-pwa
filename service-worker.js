const CACHE_NAME = "farm-pwa-v5"; // Version bumped for the update

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// --- INSTALL: Cache the core UI (App Shell) ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("SW: Pre-caching assets");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// --- ACTIVATE: Remove outdated caches ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("SW: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// --- FETCH STRATEGY: Stale-While-Revalidate ---
// 1. Serves instantly from cache.
// 2. Updates cache in the background if network is available.
self.addEventListener("fetch", event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Start the network request to update the cache
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, we are truly offline
          return null; 
        });

        // Return the cached version if we have it, otherwise wait for the network
        return cachedResponse || fetchPromise;
      });
    })
  );
});

