const CACHE_NAME = 'smartpark-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo-icon-64.png',
  '/logo-icon-128.png',
  '/logo-icon-192.png',
  '/logo-icon-512.png'
];

// 1. Instalación del Service Worker: precacheo y activación inmediata sin esperar cierre de pestañas
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Activación: limpieza de cachés obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción de peticiones con estrategia híbrida
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o esquemas no soportados
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // CRÍTICO: No interceptar peticiones externas/cross-origin (Mapbox tiles, fuentes externas, CDNs, pasarelas de pago)
  // Las peticiones a api.mapbox.com, unpkg.com, openstreetmap, etc. deben ir directo a la red sin pasar por el Cache API
  if (url.origin !== self.location.origin) {
    return;
  }

  // A) Las APIs autenticadas nunca se guardan en Cache Storage.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(JSON.stringify({ offline: true, message: 'Sin conexión a internet.' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // B) Peticiones de navegación (HTML): Network-first con fallback seguro a /index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        try {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
        } catch (e) {}
        return new Response('<!DOCTYPE html><html><body><h1>Smart Park Offline</h1><p>Verifica tu conexión a internet.</p></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // C) Recursos estáticos (JS, CSS, imágenes, fuentes): Stale-While-Revalidate con fallback seguro
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        if (cachedResponse) return cachedResponse;
        return new Response('', { status: 404, statusText: 'Not Found' });
      }
    })
  );
});
