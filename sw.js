const CACHE_NAME = 'msme-survey-enum-v20';
// Core shell: same-origin, must succeed, or the offline survey app itself breaks.
const CORE_SHELL = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './logo.svg'
];
// External library for the optional "Upload to HQ" feature. Cached best-effort —
// if this one fetch fails (CDN hiccup, no signal on first install), the core
// app must still install and work fully offline; only Upload stays unavailable
// until a connection lets the library load.
const EXTERNAL_SHELL = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_SHELL); // must succeed
      try {
        await cache.addAll(EXTERNAL_SHELL); // best-effort, never blocks install
      } catch (err) {
        console.error('Could not pre-cache external library (will retry at runtime):', err);
      }
      self.skipWaiting();
    })().catch((err) => console.error('SW install failed to cache core app shell:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cachedExact = await caches.match(req);
        if (cachedExact) return cachedExact;
        const cachedShell = await caches.match('./index.html');
        try {
          const network = await fetch(req);
          return network;
        } catch (e) {
          return cachedShell || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, clone);
        }
        return response;
      } catch (e) {
        return cached;
      }
    })()
  );
});
