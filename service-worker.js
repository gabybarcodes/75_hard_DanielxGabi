const CACHE_NAME = '75hard-v1';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json'
];

// Install event - cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Try to cache files, but don't fail if they're not found
      return Promise.all(
        FILES_TO_CACHE.map(url => {
          return cache.add(url).catch(() => {
            console.log('Could not cache:', url);
          });
        })
      );
    }).catch(() => {
      console.log('Cache open failed');
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).catch(() => {
      console.log('Cleanup failed');
    })
  );
});

// Fetch event - handle requests carefully
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (like GitHub API) - let them go through normally
  if (event.request.url.includes('api.github.com')) {
    return event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => new Response('Network unavailable', { status: 503 }))
    );
  }

  // For everything else, try network first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful responses
        if (response && response.status === 200 && response.type !== 'error') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache as fallback
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // No cache either - return a simple error
            return new Response('Resource not available', { 
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

