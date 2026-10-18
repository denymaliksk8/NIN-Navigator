/* Service Worker — NIN Navigator
   Prinsip: aset berat & statis (pustaka, petak peta, foto) → cache-first agar cepat/offline.
            berkas yang sering berubah (HTML, JS, CSS, CSV data, config) → NETWORK-FIRST: versi baru selalu dicoba dulu,
            salinan lama hanya dipakai bila offline atau jaringan lebih lambat dari batas waktu. */
const VERSION = 'v1.10.0';              // samakan dengan APP_VERSION di index.html
const SHELL = `bos-shell-${VERSION}`;
const TILES = 'bos-tiles-v1';          // petak OSM yang diambil lewat internet (di luar paket)
const LOCAL_TILES = 'bos-localtiles-v1'; // petak kawasan yang dibundel di tiles/
const MAX_TILES = 600;
const NET_TIMEOUT = 4000;              // ms: lebih lambat dari ini → pakai salinan (bila ada)

const PRECACHE = [
  './', 'index.html', 'validasi.html', 'jalur.html', 'cetak-qr.html', 'manifest.json', 'config.js', 'validate.js', 'i18n.js', 'js/routing.js', 'js/map.js', 'js/geocode.js', 'js/graph.js','js/hybrid.js', 'js/pathmodel.js', 'js/rotate.js', 'js/voice.js', 'js/nav.js', 'js/traffic.js', 'js/reports.js', 'js/reports-ui.js', 'privacy.html',
  'data/units.csv', 'data/roads.csv',
  'vendor/tailwind.css', 'vendor/qrcode.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/leaflet/leaflet-rotate.js',
  'vendor/leaflet/markercluster/leaflet.markercluster.js', 'vendor/leaflet/markercluster/MarkerCluster.css', 'vendor/leaflet/markercluster/MarkerCluster.Default.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
  'logo-bos.png', 'logo-cabin.png', 'logo-nin.png', 'denah.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.allSettled(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' }))));
    // petak peta kawasan yang dibundel (daftar dari tiles/manifest.json, dibuat tools/setup_offline.py)
    try {
      const res = await fetch('tiles/manifest.json', { cache: 'no-cache' });
      if (res.ok) {
        const m = await res.json(), tc = await caches.open(LOCAL_TILES);
        await tc.put('tiles/manifest.json', new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } }));
        const have = new Set((await tc.keys()).map(r => new URL(r.url).pathname));
        const todo = (m.files || []).filter(f => !have.has(new URL(`tiles/${f}.png`, self.registration.scope).pathname));
        for (let i = 0; i < todo.length; i += 12)
          await Promise.allSettled(todo.slice(i, i + 12).map(f => tc.add(`tiles/${f}.png`)));
      }
    } catch (_) { /* tanpa petak bundel pun aplikasi tetap jalan */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, TILES, LOCAL_TILES].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName), keys = await c.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => c.delete(k)));
}

// Cache-first: untuk aset yang tidak berubah isinya (pustaka, petak, foto, ikon)
async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) c.put(req, res.clone());
  return res;
}

// Network-first: versi baru dulu; salinan lama hanya bila offline atau terlalu lambat
async function networkFirst(req, cacheName, key) {
  const c = await caches.open(cacheName);
  const k = key || req;
  const hit = await c.match(k, { ignoreSearch: !key });
  const net = fetch(new Request(req, { cache: 'no-cache' })).then(res => {
    if (res && res.ok) c.put(k, res.clone());
    else if (hit && res && res.status >= 500) return hit;   // server error → salinan lama lebih baik
    return res;
  });
  net.catch(() => {});
  if (!hit) return net;
  return Promise.race([
    net.catch(() => hit),
    new Promise(r => setTimeout(() => r(hit), NET_TIMEOUT))
  ]);
}

// Kunci cache halaman = nama berkasnya sendiri (sebelumnya jalur/privacy/dll. memakai kunci index.html → menimpa salinan offline halaman utama)
const navKey = url => { const m = url.pathname.match(/\/([^\/]+\.html)$/); return m ? m[1] : 'index.html'; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Peta OSM dari internet (di luar petak bundel): cache-first, dibatasi jumlahnya
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith((async () => {
      const c = await caches.open(TILES), hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) { c.put(req, res.clone()); trim(TILES, MAX_TILES); }
        return res;
      } catch (_) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  if (url.origin !== location.origin) return;   // Google Sheets dll.: ditangani aplikasi sendiri (salinan di perangkat)
  const path = url.pathname;

  // Petak peta bundel: cache-first. Daftar petak (manifest) selalu dicek ke jaringan dulu.
  if (/\/tiles\/manifest\.json$/.test(path)) { e.respondWith(networkFirst(req, LOCAL_TILES)); return; }
  if (/\/tiles\/\d+\/\d+\/\d+\.png$/.test(path)) { e.respondWith(cacheFirst(req, LOCAL_TILES)); return; }

  // Halaman: network-first, fallback salinan (offline)
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, navKey(url)).catch(() => caches.match(navKey(url)).then(r => r || caches.match('./'))));
    return;
  }

  // Aset statis berat
  if (/\/(vendor|img|icons)\//.test(path) || /\/(logo-[a-z]+|denah)\.png$/.test(path)) {
    e.respondWith(cacheFirst(req, SHELL).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Sisanya (data CSV, config.js, i18n.js, validate.js, manifest, …): network-first
  e.respondWith(networkFirst(req, SHELL).catch(() => caches.match(req, { ignoreSearch: true })));
});
