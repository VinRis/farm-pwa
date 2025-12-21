const CACHE_NAME = "farm-pwa-v3"; // Incremented version

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// --- INSTALL: Pre-cache the shell ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Service Worker: Pre-caching offline assets");
      // Use {cache: 'reload'} to ensure we aren't caching a corrupted previous version
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// --- ACTIVATE: Clean old caches ---
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// --- FETCH STRATEGY: Stale-While-Revalidate ---
// This ensures the app loads instantly from cache, but updates the 
// background files if internet is available.
self.addEventListener("fetch", event => {
  // Only handle GET requests (don't cache form submissions)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchedResponse = fetch(event.request).then(networkResponse => {
          // Update the cache with the fresh version
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          // Silent catch - if network fails, we just don't update the cache
        });

        // Return the cached response immediately, or wait for the network if not in cache
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
