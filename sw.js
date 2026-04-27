/* ══════════════════════════════════════════════════════════════════
   SERVICE WORKER — Yaute PWA
   Estrategia:
   - Assets estáticos (CSS, JS de CDN): Cache First
   - Firebase / Gemini API: Network Only (siempre frescos)
   - index.html: Network First con fallback a caché
══════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'yaute-v1';

// Assets que se cachean al instalar
const PRECACHE = [
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// Dominios que NUNCA se cachean (siempre van a la red)
const NETWORK_ONLY = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'generativelanguage.googleapis.com',
  'firebase.googleapis.com',
  'googleapis.com'
];

// ── INSTALL: pre-cachear archivos propios ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(err => {
        console.warn('SW precache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejos ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: estrategia por tipo de recurso ────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Firebase y APIs externas → siempre red, nunca caché
  if (NETWORK_ONLY.some(domain => url.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. CDN de Bootstrap, FontAwesome, html2canvas → Cache First
  if (url.includes('cdn.jsdelivr.net') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Archivos propios (index.html, logo, manifest) → Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
