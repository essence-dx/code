const CACHE_NAME = 'dx-shader-cache-v1';

const PRECACHE_ASSETS = [
  '/',
  '/dx-shader/js/engine.js',
  '/dx-shader/js/main.js',
  '/dx-shader/js/shaders.js',
  '/dx-shader/js/ui.js',
  '/dx-shader/js/palettes.js',
  '/dx-shader/styles.css',
  '/dx-shader/assets/favicon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version but fetch network in background to update cache (Stale-while-revalidate)
        event.waitUntil(
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }
      
      // Fallback to network if not in cache
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});
