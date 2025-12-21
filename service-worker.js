/**
 * Farm Production Tracker - Service Worker
 * Strategy: Stale-While-Revalidate
 */

const CACHE_NAME = "farm-tracker-v2.0.1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// --- INSTALL: Pre-cache the App Shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("SW: Pre-caching core assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// --- ACTIVATE: Cleanup Old Cache Versions ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("SW: Removing outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Ensure the new SW takes control of the page immediately
  self.clients.claim();
});

// --- FETCH: Stale-While-Revalidate Strategy ---
self.addEventListener("fetch", (event) => {
  // Only handle GET requests (don't cache form submissions)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        
        // Fetch from network to update the cache in background
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Truly offline: If network fails, the user already has the cached version
          return cachedResponse;
        });

        // Return the cached response immediately if available, or wait for network
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
