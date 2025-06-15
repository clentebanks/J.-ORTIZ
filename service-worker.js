const CACHE_NAME = 'cubiertas-y-mas-cache-v2';
const OFFLINE_PAGE = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',       // Adjust if your main HTML file has another name
  '/offline.html',
  '/LOGO.jpeg',
  '/J_Ortiz.vcf',
  '/favicon.png',
  // Add any other local assets you want to cache
];

// Install event - cache core assets + offline page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - advanced strategies + offline fallback
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle navigation requests (page loads) with Network First + offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If we got a valid response, update the cache and return it
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() =>
          caches.match(request).then(cachedResponse => {
            // Serve cached page if available, otherwise offline page
            return cachedResponse || caches.match(OFFLINE_PAGE);
          })
        )
    );
    return;
  }

  // Network First strategy for external CDN assets
  if (
    url.origin !== location.origin &&
    (url.href.startsWith('https://cdn.tailwindcss.com') ||
     url.href.startsWith('https://cdn.jsdelivr.net') ||
     url.href.startsWith('https://api.qrserver.com'))
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache First for other local assets (images, CSS, JS)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      return cachedResponse || fetch(request).then(networkResponse => {
        // Cache new resources as they are fetched
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // If request fails and not cached, you can optionally return offline fallback for images or other assets here
      if(request.destination === 'image') {
        // Optionally return a placeholder image
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" role="img" aria-label="Offline image placeholder"><rect width="400" height="300" fill="#ccc"/><text x="200" y="150" font-size="20" text-anchor="middle" fill="#666">Imagen no disponible</text></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      }
      return null; // fallback to browser default behavior
    })
  );
});
