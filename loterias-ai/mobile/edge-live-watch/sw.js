// Minimal app-shell cache only - never caches the live GraphQL response,
// so START WATCH always reads real live data, never a stale cached poll.
const CACHE = 'edge-live-watch-shell-v1';
const SHELL = ['./', './index.html', './app.js', './core-v1.mjs', './storage.mjs', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept the cross-origin GraphQL call or anything not same-origin shell.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
