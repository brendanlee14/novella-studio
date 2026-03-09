const CACHE = 'novella-studio-v10';
const ASSETS = [
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap'
];

// Install — cache support assets (NOT the HTML — that stays network-first)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - novella-mobile.html → NETWORK FIRST (always get latest, fall back to cache)
// - everything else → cache first, fall back to network
self.addEventListener('fetch', e => {
  if (e.request.url.includes('openrouter.ai')) return;

  const isHtml = e.request.url.includes('novella-mobile.html') || e.request.mode === 'navigate';

  if (isHtml) {
    // Network first for the app HTML — always fetch latest
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache first for fonts, manifest etc
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});
