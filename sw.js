/* SERVICE WORKER - Yaute PWA
   Scope: /ofertasrapidasyautepec/
*/

const CACHE_NAME = 'yaute-v18';

const PRECACHE = [
  '/ofertasrapidasyautepec/',
  '/ofertasrapidasyautepec/index.html',
  '/ofertasrapidasyautepec/logo.png',
  '/ofertasrapidasyautepec/manifest.json'
];

const NETWORK_ONLY_DOMAINS = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'generativelanguage.googleapis.com',
  'googleapis.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE).catch(err => console.warn('Precache parcial:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase y Gemini: siempre red
  if (NETWORK_ONLY_DOMAINS.some(d => url.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CDN (Bootstrap, FontAwesome, etc.): Cache First
  if (url.includes('cdn.jsdelivr.net') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // Archivos propios: Network First con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

