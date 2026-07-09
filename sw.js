const CACHE_NAME = 'msme-survey-hq-v14';
const APP_SHELL = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('SW install failed to cache app shell:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything, with a guaranteed fallback to the cached
// index.html for any page-navigation request. This is what makes a
// hard refresh with zero signal still load the app shell.
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
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, clone);
        }
        return response;
      } catch (e) {
        return cached; // undefined -> browser shows its own offline error for uncached, non-shell assets
      }
    })()
  );
});
