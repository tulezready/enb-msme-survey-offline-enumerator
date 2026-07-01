const CACHE_NAME = 'msme-survey-enum-v1';
const APP_SHELL = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg'
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
        return cached;
      }
    })()
  );
});
