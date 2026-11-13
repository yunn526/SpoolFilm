/* Cache v3.4. Keep API and Google requests network-only. */
const CACHE = 'spoolfilm-v3.4';
const ASSETS = ['./', 'index.html', 'admin.html', 'privacy.html', 'terms.html', 'css/style.css', 'js/config.js', 'js/theme.js', 'js/auth.js', 'js/camera.js', 'js/admin.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response;
  }).catch(() => caches.match(request)));
});
