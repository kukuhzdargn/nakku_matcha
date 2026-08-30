// Service worker Nakku Matcha — cache app shell (HTML/CSS/JS/manifest/ikon)
// supaya aplikasi tetap bisa DIBUKA walau HP sama sekali tidak ada internet.
// Data transaksi tetap ditangani terpisah oleh Firestore offline persistence
// (lihat index.html), jadi request ke firestore/googleapis TIDAK di-cache di sini.

const CACHE_NAME = 'nakku-matcha-shell-v2';

// Tidak precache nama file spesifik di sini (supaya tidak error kalau nama file
// berbeda) — file akan otomatis ke-cache satu-per-satu saat pertama kali diminta
// browser (lihat fetch handler di bawah, pola stale-while-revalidate).
self.addEventListener('install', (event) => {
  self.skipWaiting();
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

  // Stale-while-revalidate: file apa pun yang diminta (HTML, manifest, ikon,
  // font CDN, dst) otomatis disimpan ke cache saat pertama kali sukses diambil,
  // lalu dipakai sebagai cadangan kalau nanti offline.
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
