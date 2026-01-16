/**
 * RentMyCar Service Worker
 * Production-ready caching and offline support
 */

const CACHE_VERSION = 'v24';
const CACHE_NAME = `rentmycar-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/utils/sanitize.js',
  '/config.js',
  '/api.js',
  '/auth-new.js',
  '/app.js',
  '/styles.css',
  '/mobile.js'
];

// External resources to cache
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache static assets
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('rentmycar-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/.netlify/functions/') ||
      url.pathname.includes('/api/')) {
    return;
  }

  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          // Update cache in background for next time
          fetchAndCache(request);
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetchAndCache(request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Fetch and update cache
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);

    // Only cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Clone the response before caching
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return cached version if network fails
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'New notification',
    icon: '/images/icon-192.png',
    badge: '/images/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'RentMyCar', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline bookings
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

// Sync offline bookings when back online
async function syncBookings() {
  try {
    // Get pending bookings from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pendingBookings', 'readonly');
    const store = tx.objectStore('pendingBookings');
    const bookings = await store.getAll();

    for (const booking of bookings) {
      try {
        const response = await fetch('/.netlify/functions/bookings-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${booking.token}`
          },
          body: JSON.stringify(booking.data)
        });

        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pendingBookings', 'readwrite');
          await deleteTx.objectStore('pendingBookings').delete(booking.id);
        }
      } catch (e) {
        console.error('Failed to sync booking:', e);
      }
    }
  } catch (error) {
    console.error('Sync bookings failed:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rentmycar', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingBookings')) {
        db.createObjectStore('pendingBookings', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
