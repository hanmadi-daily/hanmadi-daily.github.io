const CACHE = 'hanmadi-cg356b';
const PRECACHE = [
  './',
  './index.html',
  './manifest2.json',
  './favicon.ico',
  './apple-touch-icon2.png',
  './icon2-48.png',
  './icon2-96.png',
  './icon2-144.png',
  './icon2-192.png',
  './icon2-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function fromCurrentCache(cache, request) {
  const hit = await cache.match(request);
  if (hit) return hit;
  if (request.mode === 'navigate') {
    return (await cache.match('./index.html')) || (await cache.match('./')) || (await cache.match('index.html'));
  }
  return undefined;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (err) {
      const cached = await fromCurrentCache(cache, request);
      if (cached) return cached;
      throw err;
    }
  })());
});
