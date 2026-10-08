/**
 * AetherStudy Advanced Progressive Web App (PWA) Offline Engine
 * Provides 100% offline functionality, asset caching, and instant startup.
 */

const CACHE_NAME = 'aetherstudy-cache-v1';

// Core assets to pre-cache immediately during Service Worker installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event: Pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clear outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache strategies for offline capability
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST uploads cannot be cached by Service Worker)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (Opening the app, refreshing pages)
  // Strategy: Network First, Fallback to Cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html') || await cache.match('/');
          return cachedIndex || new Response('Offline - App Shell Cached', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 2. Static Assets (Scripts, CSS, Fonts, Images, Icons)
  // Strategy: Stale-While-Revalidate (Serve cached instantly, update in background)
  const isStaticAsset =
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff|woff2|ttf|json)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API Requests (/api/)
  // Strategy: Network First, Fallback to Cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Support instant update messaging
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
