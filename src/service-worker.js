// Service Worker for Grocery List PWA
const CACHE_NAME = 'grocery-list-v2';
// Compute base URL within scope (works on GitHub Pages subpaths)
const BASE_URL = self.location.pathname.replace(/service-worker\.js$/i, '');
const urlsToCache = [
  './',
  './index.html',
  './favicon/site.webmanifest',
  './favicon/android-chrome-192x192.png',
  './favicon/android-chrome-512x512.png',
  './favicon/favicon-32x32.png',
  './favicon/favicon-16x16.png',
  './favicon/apple-touch-icon.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
});

// Fetch event - stale-while-revalidate for same-origin, with offline fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            // Cache successful basic responses
            if (networkRes && networkRes.status === 200 && (networkRes.type === 'basic' || networkRes.type === 'opaque')) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => undefined);

        // Return cached first, then update in background
        return cached || fetchPromise || (req.destination === 'document' ? cache.match('./index.html') : undefined);
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline data persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync for offline data
  console.log('Background sync triggered');
  return Promise.resolve();
}

// Push notification support (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New grocery list update!',
    icon: './favicon/android-chrome-192x192.png',
    badge: './favicon/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Grocery List', options)
  );
});
