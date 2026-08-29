// Service worker Nakku Matcha — cache app shell (HTML/CSS/JS/font) supaya
// aplikasi tetap bisa DIBUKA walau HP sama sekali tidak ada internet.
// Data transaksi tetap ditangani terpisah oleh Firestore offline persistence
// (lihat nakku.html), jadi request ke firestore/googleapis TIDAK di-cache di sini.

const CACHE_NAME = 'nakku-matcha-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('./nakku.html'))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Biarkan semua trafik Firebase/Firestore lewat apa adanya —
  // itu sudah ditangani oleh persistentLocalCache Firestore sendiri.
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    return;
  }

  if (req.method !== 'GET') return;

  // Stale-while-revalidate untuk file aplikasi (HTML/CSS/JS/font icon) dan CDN lain
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
