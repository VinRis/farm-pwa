const CACHE_NAME = "farm-pwa-v6"; // Bumped version to force refresh

const FILES_TO_CACHE = [
  "/",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// --- INSTALL: Pre-cache assets ---
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("SW: Pre-caching assets");
      // Use array mapping to catch individual file errors during install
      return Promise.all(
        FILES_TO_CACHE.map(url => {
          return cache.add(url).catch(err => console.error(`Fetch failed for: ${url}`, err));
        })
      );
    })
  );
  self.skipWaiting();
});

// --- ACTIVATE: Cleanup old caches ---
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
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Only cache valid, successful responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network fails and there's no cache, we might return a fallback here
          return cachedResponse; 
        });

        // Return cached response if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
