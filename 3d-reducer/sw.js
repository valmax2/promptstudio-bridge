// Service worker: cache dell'app shell + moduli CDN → funziona anche offline.
const CACHE = 'poly-reducer-v7';
const SHELL = [
  './', './index.html', './styles.css', './app.js',
  './manifest.webmanifest', './icon.svg',
  './vendor/three.module.js',
  './vendor/meshopt_simplifier.module.js',
  './vendor/addons/controls/OrbitControls.js',
  './vendor/addons/loaders/STLLoader.js',
  './vendor/addons/loaders/OBJLoader.js',
  './vendor/addons/exporters/STLExporter.js',
  './vendor/addons/exporters/OBJExporter.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/helpers/ViewHelper.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first per la shell, stale-while-revalidate per il resto (moduli CDN inclusi).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
