// SkyGuard Weather - Service Worker (DISABLED)
// This file is now a self-unregistering stub. The service worker was
// removed because its cache-first strategy served stale JS bundles even
// after code fixes, causing users to see old broken UI. This stub:
//   1. Unregisters itself immediately on activation
//   2. Deletes ALL existing caches so no stale assets remain
// Any previously-registered SW that updates to this version will clean
// itself up and stop intercepting requests.

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Purge every cache
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      ),
      // Unregister this service worker
      self.registration.unregister(),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Pass-through fetch — never cache anything
self.addEventListener('fetch', () => {});
