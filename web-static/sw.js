/* EcoGuardian Service Worker — network-first, sin caching agresivo */
const CACHE_NAME = "ecog-v1";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  /* Network-first: intenta la red; si falla, devuelve lo que haya en caché */
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request);
    })
  );
});
