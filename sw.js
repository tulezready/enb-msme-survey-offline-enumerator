const CACHE_NAME = 'msme-survey-enum-v54';
// Core shell: same-origin, must succeed, or the offline survey app itself breaks.
const CORE_SHELL = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './logo.svg'
];
// External library for the optional "Upload to HQ" feature. Cached best-effort —
// if this one fetch fails (CDN hiccup, no signal on first install), the core
// app must still install and work fully offline; only Upload stays unavailable
// until a connection lets the library load.
const EXTERNAL_SHELL = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

async function fetchWithRetry(url, options, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (i < attempts) await new Promise(r => setTimeout(r, 800 * i)); // brief backoff before retrying
    }
  }
  throw lastErr;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Each core file is fetched with {cache:'reload'} to bypass the
      // browser's own HTTP cache, not just the service worker's cache -
      // otherwise a new service worker version can still get populated with
      // stale content the browser already had cached from an earlier visit.
      // Retries a few times before giving up, since on a marginal rural
      // connection a single transient failure on any one of these files
      // used to silently abandon the entire install with no visible sign
      // anything had gone wrong.
      await Promise.all(CORE_SHELL.map(async (url) => {
        const response = await fetchWithRetry(url, { cache: 'reload' });
        await cache.put(url, response);
      })); // must succeed
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
