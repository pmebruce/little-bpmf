const CACHE = 'little-bpmf-v2.1.0';
const FILES = ['./', './index.html', './style.css', './app.js', './data.js', './curriculum.js', './learning.js', './gameplay.js', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE && (key.startsWith('little-bpmf-') || key.startsWith('xiao-xiao-bpmf-'))).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Keep the complete installed shell at one version until the new worker activates.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match('./index.html');
      throw error;
    }
  })());
});
