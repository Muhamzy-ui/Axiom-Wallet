// Axiom Wallet Service Worker for PWA & Home Screen Support
const CACHE_NAME = 'axiom-wallet-v3';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/axiom-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Axiom SW] Precache non-fatal warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Axiom SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do not intercept or cache backend API, websocket, or external third-party calls
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || request.method !== 'GET') {
    return;
  }

  // HTML Navigation: Always fetch fresh HTML from network so new builds are immediately loaded
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Static assets: Network-first
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ─── Real-Time Web Push Notification Handler ───
self.addEventListener('push', (event) => {
  let data = {
    title: 'Axiom Wallet',
    body: 'You have a new notification on Axiom.',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    data: { url: '/#wallet' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.message || payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: { url: payload.link_url || payload.url || '/#wallet' },
        vibrate: [100, 50, 100],
        tag: payload.tag || 'axiom-alert',
        renotify: true
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    vibrate: [150, 80, 150],
    tag: data.tag || 'axiom-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click Handler ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/#wallet';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

