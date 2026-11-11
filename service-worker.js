const CACHE_NAME = 'sstpa-pwa-v6';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './about.html',
  './attendance.html',
  './bhajan-team.html',
  './calendar.html',
  './contact.html',
  './dashboard.html',
  './event-details.html',
  './event-notice.html',
  './events.html',
  './expenses.html',
  './gallery.html',
  './login.html',
  './members.html',
  './memo.html',
  './notifications.html',
  './reports.html',
  './resources.html',
  './settings.html',
  './sponsors.html',
  './offline.html',
  './css/app.css',
  './js/app.js',
  './js/translations.js',
  './js/location-dropdowns.js',
  './images/logo.png',
  './images/guru-header.png',
  './manifest.json'
];

// Install Event: Pre-cache all essential application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA Service Worker] Pre-caching offline shell and assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Do not intercept non-GET requests or backend API requests
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Navigation requests (HTML pages): Network first, falling back to cache, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to offline page or cached index
          const offlinePage = await caches.match('./offline.html');
          return offlinePage || caches.match('./index.html');
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Images, Fonts): Cache First with Background Network Revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Network failed silently, cached version is already returned if available
      });

      return cachedResponse || fetchPromise;
    })
  );
});
