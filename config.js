/* Konfigurasi NIN Navigator — ubah di sini, tanpa menyentuh index.html */
window.BOS_CONFIG = {
  // CSV publik Google Sheets (File → Bagikan → Publikasikan ke web → pilih tab → format CSV).
  // Kosong = pakai file lokal data/units.csv dan data/roads.csv.
  unitsCsv: '',   // contoh: 'https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv'
  roadsCsv: '',   // tab 'roads' (kolom: road_id, seq, lat, lng)

  // Batas kawasan untuk validasi data (opsional). Kosong = titik tengah dihitung otomatis dari median koordinat, radius 450 m.
  // Titik di luar batas ditandai salah & tidak dipakai (mencegah salah ketik koordinat meregangkan peta).
  // area: { center: [-6.148635, 106.887349], radiusM: 450 },

  // Rute jalan kaki di dalam kawasan.
  //  mode: 'auto'   = jaringan jalan OpenStreetMap (profil pejalan kaki) dulu, lalu jalur internal roads.csv, lalu garis lurus putus-putus
  //        'local'   = hanya jalur internal roads.csv (tanpa internet)   'online' = hanya OSM
  //  roadsVerified: true bila roads.csv sudah disurvei/digambar lewat jalur.html → jalur internal dipakai LEBIH DULU.
  //  url: server routing yang kompatibel OSRM (profil foot). Untuk pemakaian ramai, ganti dengan server sendiri / GraphHopper.
  routing: { mode: 'auto', roadsVerified: false /*, url: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot', timeout: 6000 */ },

  // Flag fitur — matikan tanpa mengubah kode.
  features: { GLOBAL_MAP: true, COMMUNITY_REPORTS: false, TRAFFIC_PROBES: false, TOMTOM_TRAFFIC: false, AUTO_REROUTE: true },

  // ===== NAVIGASI, REROUTE & LALU LINTAS (Fase 5) =====
  // Reroute: pengguna memilih mode di Pengaturan (Aa): 'auto' | 'ask' | 'off' (bawaan 'ask'). Fitur dimatikan total lewat features.AUTO_REROUTE.
  // Keluar jalur = menyimpang > offRouteM selama > offRouteSec → hitung ulang. Cek laporan tiap checkSec; pindah rute hanya bila hemat ≥ minSaveSec
  // (atau rute sekarang tertutup/banjir). Tawaran "Ikuti?" menghitung mundur countdownSec; habis waktu = tetap di rute (kecuali rute tertutup).
  // reroute: { mode: 'ask', offRouteM: 40, offRouteSec: 5, checkSec: 30, radiusM: 100, minSaveSec: 120, countdownSec: 10, cooldownSec: 90 },
  // Lalu lintas komunitas (butuh Firebase + features.TRAFFIC_PROBES: true; pengguna harus setuju/opt-in di Pengaturan). Warna hanya bila sampel ≥ minSamples.
  // traffic: { probeEverySec: 15, windowMin: 10, minSamples: 3, greenKmh: 30, redKmh: 12, refreshSec: 60, maxReadsPerDay: 4000, maxWritesPerDay: 1200 },
  // TomTom (OPSIONAL, default mati: features.TOMTOM_TRAFFIC): tile aliran lalu lintas, hanya tampilan. Kunci gratis tanpa kartu kredit di https://developer.tomtom.com
  // (kuota gratis saat ini 200 ribu tile raster lalu lintas/bulan — cek halaman harga TomTom terbaru). Kunci TERLIHAT publik di klien:
  // batasi ke domain/referrer aplikasi di dashboard TomTom bila tersedia, dan jangan memakai kunci yang terhubung ke tagihan. Atribusi © TomTom wajib tampil.
  tomtom: { key: '', style: 'relative0' /* relative0 | relative0-dark | absolute | relative-delay */ },

  // Firebase (Spark, gratis) untuk laporan komunitas. Kosong = mode lokal (tersimpan di perangkat). Cara mengisi: docs/FIREBASE.md
  // URUTAN: (1) isi 4 kolom di bawah → (2) buka cek-firebase.html, semua baris harus ✓ → (3) baru ubah features.COMMUNITY_REPORTS menjadi true.
  // Rules: tempel firestore.rules di Firebase Console → Rules → Publish. Uji otomatis: workflow GitHub 'Uji Firestore Rules'.
  // Kunci web Firebase bersifat PUBLIK; keamanan data dijaga firestore.rules. JANGAN menaruh kunci rahasia/service account di sini.
  firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' },

  // Server rute/geocoding. Kosongkan untuk memakai bawaan di js/routing.js. Ganti ke server sendiri bila pemakaian ramai.
  // services: {
  //   osrm: { car: ['https://routing.openstreetmap.de/routed-car/route/v1/driving', 'https://router.project-osrm.org/route/v1/driving'],
  //           bike: ['https://routing.openstreetmap.de/routed-bike/route/v1/driving'], foot: ['https://routing.openstreetmap.de/routed-foot/route/v1/foot'] },
  //   valhalla: { url: 'https://valhalla1.openstreetmap.de/route', enabled: true },
  //   nominatim: 'https://nominatim.openstreetmap.org/search', photon: 'https://photon.komoot.io/api/',
  //   tiles: { osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }, esri: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' } },
  //   timeout: 7000
  // },

  // Rotasi peta: sign = -1 bila di perangkat peta berputar terbalik saat mode "Ikuti arah".
  rotate: { sign: 1 },

  // ===== GERBANG & BATAS KAWASAN (hibrid: luar kawasan → GERBANG → dalam kawasan) =====
  // ISI KOORDINAT GERBANG: tandai di jalur.html (tombol "Gerbang") lalu salin hasilnya ke sini.
  // jenis: 'masuk' | 'keluar' | 'keduanya'. Gerbang yang lat/lng-nya masih null diabaikan.
  gates: [
    { id: 'gerbang-1', name: 'Gerbang BOS', lat: null, lng: null, jenis: 'masuk' }
    // { id: 'gerbang-2', name: 'Gerbang Utara', lat: -6.14xxx, lng: 106.88xxx, jenis: 'masuk' },
  ],
  // Batas kawasan sebagai poligon [[lat,lng], ...] (min. 3 titik). Kosong = kotak batas data + margin.
  // ISI POLIGON KAWASAN: gambar di jalur.html (tombol "Batas kawasan").
  areaPolygon: null,

  // Nomor WhatsApp tujuan bawaan untuk mode security (kosong = pilih kontak di WhatsApp). Format 628xxxxxxxxxx.
  waNumber: '',

  // Titik awal rute untuk tautan QR (?from=pos | gate | lobby), format [lat, lng].
  // Isi koordinat pos security & pintu masuk dari GPS di lapangan. Lobi memakai posisi unit 'cabin' jika null.
  startPoints: {
    pos:   null,
    gate:  null,
    lobby: null
  }
};
