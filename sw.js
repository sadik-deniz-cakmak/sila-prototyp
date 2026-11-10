/* Sila – Service Worker: hält alle Dateien für den Offline-Betrieb vor. */
var CACHE = 'sila-v0.4.0';
var FLAGS = ['gb', 'us', 'de', 'at', 'ch', 'pk', 'in', 'bd', 'id', 'tr', 'ir', 'ng', 'ne', 'sn', 'ml', 'fr'];
var FILES = ['./', 'index.html', 'styles.css', 'drafts.js', 'content.js', 'app.js', 'vendor/qrcode.js', 'manifest.webmanifest', 'icon.svg']
  .concat(FLAGS.map(function (c) { return 'vendor/flags/' + c + '.svg'; }))
  .concat(['vendor/fonts/fonts.css'])
  .concat([300, 400, 600, 700].reduce(function (a, w) {
    return a.concat(['arabic', 'latin', 'latin-ext'].map(function (s) { return 'vendor/fonts/plex-arabic-' + w + '-' + s + '.woff2'; }));
  }, []));

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Mit Netz: immer die aktuelle Fassung laden und den Speicher auffrischen.
// Ohne Netz: aus dem Speicher. So zeigt der Prototyp nach Änderungen keine alte Version.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (resp) {
    if (resp && resp.ok) {
      var copy = resp.clone();
      var key = new URL(e.request.url);
      key.search = '';
      caches.open(CACHE).then(function (c) { c.put(key.toString(), copy); });
    }
    return resp;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true });
  }));
});
