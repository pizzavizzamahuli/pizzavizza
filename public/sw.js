const CACHE_VERSION = 'pizzavizza-v2';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Bypass service worker for admin, API, account and critical dynamic routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/account/')) {
    return;
  }

  // Avoid using the navigation fallback for checkout/cart/dining pages
  const NAV_BYPASS_PREFIXES = ['/checkout', '/cart', '/dining', '/menu'];
  if (NAV_BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => {
            if (request.destination === 'image') {
              return caches.match('/icon-192.png');
            }
            return caches.match(OFFLINE_URL);
          });
      })
    );
    return;
  }

  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png' || url.pathname === '/icon-maskable.png') {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
