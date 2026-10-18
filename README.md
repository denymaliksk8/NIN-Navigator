# NIN Navigator — panduan singkat

## 1. Edit data lewat Google Sheets
1. Buat Google Sheet dengan dua tab dari `data/units.csv` dan `data/roads.csv` (File → Import).
   - **units**: `id, name, aliases, block, codes, lat, lng, photo, status, cat, vacant`
     (`aliases` dan `codes` dipisah titik koma; `status` = verified/estimated/unsurveyed; `cat` = showroom/workshop/detailing/hotel; `vacant` = 1 bila kosong)
   - **roads**: `road_id, seq, lat, lng, note` (satu jalan = beberapa baris berurutan `seq`)
2. File → Bagikan → **Publikasikan ke web** → pilih tab → format **CSV** → salin tautannya.
3. Tempel tautan ke `config.js` (`unitsCsv`, `roadsCsv`). Selesai; perubahan di Sheets muncul tanpa mengubah kode.
   Kolom lat/lng pakai format angka dengan minimal 6 desimal (Format → Angka → Teks biasa agar tidak dibulatkan).
- Bila Sheets tidak bisa dijangkau, aplikasi memakai salinan terakhir di perangkat, lalu `data/units.csv`.
- Baris yang salah (id kosong/ganda, koordinat bukan angka, tertukar, atau di luar kawasan) diabaikan; jalankan `validasi.html` untuk melihat daftarnya.
- Data baru selalu diambil lebih dulu; salinan lama hanya dipakai saat offline atau sinyal lambat (>4,5 dtk). **Tentang Aplikasi** menampilkan *Versi data* (`d-xxxxxxxx`, berubah otomatis bila isi Sheets berubah) agar tim bisa memastikan suntingan sudah masuk.

## 2. QR code
Buka `https://URL-APLIKASI/cetak-qr.html` → cek alamat aplikasi → **Cetak**.
- 3 poster A4: Pos Security (`?from=pos`), Pintu Masuk (`?from=gate`), Lobi Cabin Hotel (`?from=lobby`).
- Label per unit (`?unit=ID`) untuk papan blok; gunakan kolom filter untuk mencetak per blok.
- Agar rute dari QR berjalan, isi koordinat `pos` dan `gate` di `config.js` (`startPoints`). Lobi memakai posisi unit Cabin Hotel.

## 3. Mode security
Buka sekali `https://URL-APLIKASI/?mode=security` di ponsel tim (diingat di perangkat). Muncul tombol **🛡 Pos**:
pencarian cepat + tombol **📲 WA** per unit, dan tombol WhatsApp di kartu unit. Nomor tujuan boleh diisi (kosong = pilih kontak).
Matikan lewat “Keluar mode security” atau `?mode=public`.

## 4. Rute di dalam kawasan
Tombol utama **🧭 Arahkan ke sini** (rute di peta aplikasi) mengikuti jalur di `data/roads.csv`. Isi awalnya SEMENTARA: dibuat otomatis dari titik papan nama
(`python3 tools/build_roads.py`). Ganti dengan titik jalan hasil survei GPS/denah begitu koordinat akurat. Bila titik awal/tujuan
lebih dari 80 m dari jalur, aplikasi menampilkan garis lurus.

## 5. Pasang aset offline (SEKALI, wajib sebelum diunggah)
Leaflet dan petak peta tidak ikut dalam paket ini karena harus diunduh dari internet. Di komputer yang online:
```
python3 tools/setup_offline.py          # Leaflet 1.9.4 + Leaflet.markercluster 1.5.3 → vendor/leaflet/ , petak OSM zoom 17–19 → tiles/ (± 160 berkas)
```
Cek hasilnya: `python3 tools/setup_offline.py --verify` (tanpa internet). Tanpa Python? Jalankan workflow **Siapkan aset offline** di tab Actions GitHub (hasil otomatis di-commit).
Lalu unggah seluruh folder (termasuk `vendor/` dan `tiles/`). Sebelum langkah ini aplikasi memakai CDN unpkg sebagai cadangan darurat.
Tailwind sudah terkompilasi di `vendor/tailwind.css` (diratakan agar jalan di Chrome/Safari ± 2021 ke atas). Bila Anda mengubah kelas Tailwind di `index.html`: `npm i --no-save tailwindcss@4 && node tools/build_css.mjs`.
Setelah mengubah berkas aplikasi, naikkan `VERSION` di `sw.js` dan `APP_VERSION` di `index.html`.

## 6. Validasi data
- Halaman **`validasi.html`**: periksa data Sheets/file/CSV tempelan, daftar masalah per baris, cek foto.
- Di Sheets: rumus peringatan & validasi input → `docs/sheets-peringatan.md`.

## 7. Pemantauan otomatis
`node tools/monitor.mjs` mengecek tautan Sheets, validasi isi, penurunan jumlah unit, dan perubahan data; gagal → exit 1 + notifikasi
(ntfy / Telegram / webhook; lihat komentar di berkas). `.github/workflows/monitor.yml` menjalankannya tiap 6 jam di GitHub (gratis);
isi secret `NTFY_TOPIC` atau `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID` atau `WEBHOOK_URL` untuk notifikasi (tanpa itu, GitHub tetap mengirim email saat job gagal).

## 8. Tampilan & bahasa
Tombol **Aa**: ukuran huruf (3 tingkat), tema Otomatis/Terang/Gelap (terang berkontras tinggi), Indonesia/English (otomatis mengikuti bahasa peramban). Teks ada di `i18n.js`. Mode security tetap berbahasa Indonesia.

## 9. Perilaku peta (v1.3.0)
- **Marker**: peta bersih secara bawaan. Marker muncul hanya saat (a) memilih filter kategori → ditampilkan berkelompok (cluster, diurai otomatis saat zoom ≥ 19), atau (b) mengetik pencarian → pratinjau maks 10 hasil; memilih hasil → hanya 1 marker + zoom. Filter **Semua** = tanpa marker. Menutup kartu unit hasil pencarian membersihkan marker.
- **Rute**: tombol utama **Arahkan ke sini** menggambar garis di peta aplikasi sendiri (jika tanpa GPS/di luar kawasan, mulai dari `startPoints.gate`/`pos` di config.js) di layer tersendiri; hilang total lewat **✕ Hapus rute** (bar di bawah header atau di kartu unit). Menutup kartu unit atau mengetuk peta tidak menghapus rute; memilih unit lain atau memulai rute baru membersihkan rute lama. Rute dari GPS ikut bergerak mengikuti posisi.
- **Google Maps / Waze**: hanya tautan kecil opsional di bawah tombol utama (untuk menuju kawasan dari luar); navigasi utama tetap di peta aplikasi.
- **PWA**: bisa dipasang (tombol di *Tentang* pada Android/Chrome; iPhone: Bagikan → Tambah ke Layar Utama) dan berjalan offline dasar.
- **Performa HP**: efek blur dimatikan di layar sentuh, rute digambar di canvas, tile tidak dimuat selama animasi zoom, marker dibuat malas + cluster.


## 10. Rute mengikuti jalan (v1.4.0)

Urutan yang dicoba tombol **Arahkan ke sini** (diatur di `config.js → routing`):
1. **Jaringan jalan OpenStreetMap, profil jalan kaki** (server routing kompatibel OSRM, bawaan `routing.openstreetmap.de/routed-foot`). Ditolak otomatis bila titik awal/tujuan > 60 m dari jalan terpetakan atau rutenya memutar > 4× garis lurus.
2. **Jalur internal** `data/roads.csv` (tab `roads`). Ruas kini dipotong di setiap persilangan; hasil yang memutar > 3× garis lurus dianggap tidak layak.
3. **Garis lurus putus-putus** dengan label jelas (bukan seolah-olah mengikuti jalan).

Garis putus-putus pendek di ujung rute = dari titik unit ke jalan terdekat. Hapus rute / ganti unit saat pencarian berjalan membatalkan pencarian itu (tidak ada garis tersisa).

**Solusi permanen untuk jalan di dalam kawasan:** gambar jalurnya sekali lewat **`jalur.html`** (peta + ketuk, atau tombol ◎ saat berjalan di lapangan), ekspor CSV → tempel ke tab `roads` / `data/roads.csv`, lalu set `routing.roadsVerified: true` agar jalur internal dipakai lebih dulu dan OSM jadi cadangan. Bila server routing publik terlalu ramai/lambat, pasang OSRM/GraphHopper sendiri dan isi `routing.url`.

Google Maps / Waze tetap ada sebagai tautan sekunder (“↗ Buka di Google Maps / Waze”).

**Dari lokasi mana pun (v1.4.1):** bila lokasi pengguna aktif, rute selalu dimulai dari posisi pengguna — termasuk di luar kawasan; peta dilebarkan sementara agar seluruh rute terlihat. Dari beberapa alternatif OSM dipilih yang **waktu tempuhnya tersingkat**. Bila server routing tak terjangkau, rute jatuh ke garis putus-putus menuju pintu masuk (`startPoints.gate`) lalu jalur internal; untuk rute jauh gunakan tombol Google Maps/Waze.

**v1.4.2:** penyedia rute (OSRM foot, varian URL cadangan, Valhalla pedestrian) dicoba BERSAMAAN, yang pertama layak menang — tidak lagi menunggu satu per satu. Dari luar kawasan tanpa data jalan, garis lurus TIDAK digambar; aplikasi membuka pilihan Google Maps/Waze. Perbaikan: pembaruan GPS tidak lagi mengganti rute online menjadi garis lurus (dan jarang memanggil server → tidak lemot).

## 11. v1.5.0 — Fase 1: arah rute, rotasi peta, rute mengikuti jalan per moda

**Modul baru** (`js/`): `routing.js` (konversi koordinat tunggal `toOsrm/fromGeoJson/toLL`, penyedia OSRM + Valhalla per moda, terjemah langkah belok ID/EN, `ensureDirection`, `joinSegments`), `graph.js` (graf `roads.csv`: pemotongan di persilangan, snap ke RUAS, Dijkstra berbobot waktu, satu arah, moda), `rotate.js` (rotasi peta, kompas, mode ikuti arah).
**Rute:** pilih Jalan kaki / Sepeda / Motor / Mobil di bar rute (motor memakai profil mobil dan diberi label). Ada jarak, waktu, jam tiba, daftar langkah belok, marker **A** (asal, hijau) dan **B** (tujuan, merah). Tidak ada lagi garis lurus: bila semua sumber gagal, muncul pesan + tombol Google Maps/Waze.
**Kolom opsional `roads.csv`** (kompatibel mundur): `oneway` (0/1/-1, arah = urutan `seq`), `moda` (mobil | jalan_kaki | keduanya), `kecepatan_kmh`, `nama_jalan`.
**Rotasi peta:** memakai plugin `leaflet-rotate` (dipilih karena tetap Leaflet — marker cluster, tile bundel, dan seluruh kode lama tidak perlu ditulis ulang; MapLibre GL berarti menulis ulang peta). Pasang dengan `python3 tools/setup_offline.py --only rotate`. Dua jari = putar, tombol kompas = reset ke utara, tombol panah = ikuti arah (heading GPS bila > 2 m/s, selain itu sensor kompas; iOS meminta izin). Bila arah putar terbalik di perangkat Anda, set `rotate.sign: -1` di `config.js`. Tanpa plugin, tombol ini otomatis tersembunyi.
**Tes:** `node tests/routing.test.mjs` (7 tes: konversi koordinat, rute luar, rute dalam, satu arah/moda, hibrid, langkah ID/EN).

## 12. v1.6.0 — Fase 2: peta global

- **Peta bebas dunia:** minZoom 2, maxZoom 19, `worldCopyJump`. Tampilan awal tetap kawasan BOS; tombol **Kembali ke BOS** (rumah) dan **Lokasi saya** (◎). Matikan lewat `features.GLOBAL_MAP: false` (kembali terkunci ke kawasan).
- **Pencarian tempat global** (`js/geocode.js`): unit kawasan tampil lebih dulu ("Di kawasan"), lalu "Peta umum" dari Nominatim; cadangan Photon. Debounce 600 ms, antrean ≥ 1 dtk, cache, retry mundur (1/2/4 dtk) untuk 429/timeout. Hasil → kartu tempat dengan **Rute ke sini**, **Mulai dari sini**, **Salin koordinat**.
- **Klik kanan / tekan-tahan 0,6 dtk** di peta: Rute dari sini, Rute ke sini, (Laporkan di sini — aktif di Fase 4), Salin koordinat.
- **Rute jarak jauh** (OSRM `routed-car/bike/foot` + Valhalla + `router.project-osrm.org` untuk mobil): 1–3 alternatif, pilih **Tercepat / Terpendek**, alternatif lain digambar tipis dan bisa diketuk; ringkasan jarak, waktu, jam tiba; peta memuat seluruh rute.
- **Layer:** standar OSM atau satelit Esri (tombol layer), pilihan disimpan; skala metrik; atribusi OpenStreetMap, OSRM/Valhalla, Esri tampil.
- **Tautan bagikan rute:** `?from=lat,lng&to=lat,lng&mode=car|motor|bike|foot` langsung menghitung rute (`from` kosong = lokasi pengguna). Tombol **Bagikan rute** tidak pernah menyertakan lokasi GPS pengguna.
- Semua URL layanan ada di `config.js → services` (bisa diganti server sendiri).
- Perbaikan: pilihan moda rute tidak lagi menimpa penanda Mode Security (`bos-mode`).
- **Tes:** `node tests/{routing,geocode,map}.test.mjs`.

## 13. v1.7.0 — Fase 3: rute hibrid (luar → GERBANG → dalam kawasan)

- **Alur:** asal di luar kawasan & tujuan unit → server rute jalan umum (segmen **biru solid**) ke gerbang terbaik → graf `roads.csv` (segmen **hijau putus-putus**). Gerbang dipilih dari 3 terdekat dengan **total waktu** (luar + dalam) terkecil, bukan jarak garis lurus. Penanda **GATE**, satu ringkasan gabungan, satu daftar langkah ("Tiba di Gerbang BOS, lanjut ke Unit E-20").
- **Konfigurasi (`config.js`):** `gates: [{id,name,lat,lng,jenis}]` (null = diabaikan; cari komentar `ISI KOORDINAT GERBANG`) dan `areaPolygon: [[lat,lng],…]` (batas kawasan; kosong = kotak data + margin). Keduanya bisa digambar di `jalur.html` lalu disalin dari hasil ekspor.
- **Graf terputus:** pesan ramah + peta terbang ke titik jalan terdekat + log `console.warn('[route] gagal …')`; gerbang yang tak tersambung ke graf dilewati dan dicatat. Setelah graf dibangun, unit yang tak terjangkau dari gerbang mana pun dilaporkan ke console (`[graf] N unit tidak terjangkau`). Tombol Google Maps/Waze tetap tersedia.
- **`jalur.html` (editor baru):** deteksi jaringan terputus (merah), sambung ujung ≤1,5 m, deteksi duplikat/nol-panjang, tombol satu arah dengan panah, atribut moda/kecepatan/nama jalan, tombol **GATE**, **Batas kawasan** (poligon), **Periksa** (semua unit harus terjangkau dari ≥1 gerbang), ekspor CSV format sama (kolom opsional hanya bila dipakai) + blok `gates/areaPolygon` untuk `config.js`, undo/redo.
- **Modul:** `js/hybrid.js`, `js/pathmodel.js`. **Tes:** `node tests/hybrid.test.mjs` (8), `node tests/pathmodel.test.mjs` (8).

## 14. v1.8.0 — Fase 4: laporan komunitas (Firebase Spark, tanpa Cloud Functions)

- **Aktifkan:** `features.COMMUNITY_REPORTS: true` + isi `firebase` di `config.js` (langkah lengkap & gratis: `docs/FIREBASE.md`). Tanpa config Firebase → **mode lokal** (tersimpan di perangkat, sinkron antar-tab) supaya UI bisa dicoba.
- **Jenis & TTL:** razia/pemeriksaan 2 j, kecelakaan 2 j, macet 45 mnt, jalan ditutup 6 j, berlubang 7 hr, banjir 3 j, penghalang 2 j, mogok 1 j, cuaca ekstrem 3 j. Konfirmasi memperpanjang ¼ TTL (maks. 2× TTL).
- **Anti-spam:** 1 laporan/30 dtk, maks. 20/hari (klien **dan** `firestore.rules`), dedupe 50 m (menawarkan konfirmasi), satu suara per pengguna per laporan, sembunyi otomatis bila “sudah tidak ada” ≥3 dan > konfirmasi, atau laporan penyalahgunaan ≥3.
- **Hemat kuota:** listener hanya untuk sel geohash yang terlihat (zoom ≥11) + koridor rute, ≤200 dok/sel, berhenti saat tab di latar belakang, cache lokal, filter kedaluwarsa di klien, indikator pemakaian di dialog Lapor, kuota habis → pesan + data cache.
- **UI:** tombol ⚠ Lapor / menu tekan-tahan “Laporkan di sini”, ikon per jenis, cluster, kartu laporan (umur, konfirmasi, Masih ada / Sudah tidak ada / Penyalahgunaan / Hapus milik sendiri), filter jenis, suara peringatan (id-ID/en) + banner pada **800/300/100 m**, sekali per laporan per tingkat (hanya laporan di depan/di rute ≤40 m).
- **Privasi:** dialog persetujuan sebelum kirim/menilai, `privacy.html` (ID/EN), “Hapus semua laporan saya”, catatan disanitasi (tag dibuang + di-escape saat tampil), disclaimer jangan dipakai saat berkendara. Kunci web Firebase publik; perlindungan = rules (+ saran App Check).
- **Modul:** `js/reports.js` (inti murni + backend Firebase/lokal), `js/reports-ui.js`, `js/voice.js`, `firestore.rules`, `firebase.json`. **Tes:** `node tests/reports.test.mjs` (14).
- **Uji Firebase (v1.8.1):** koneksi sungguhan tak bisa diuji dari lingkungan pengembangan, jadi ada tiga lapis uji yang Anda jalankan: (1) `cek-firebase.html` (config, Auth, rules, uji tulis/hapus di proyek Anda), (2) workflow GitHub **Uji Firestore Rules** / `tests/firestore.rules.emu.test.mjs` (20 skenario di emulator resmi), (3) `node tests/rules.static.test.mjs` (tabel TTL rules ≡ klien). Rules Playground TIDAK bisa menguji create/suara (memakai `getAfter` dalam satu batch) — lihat `docs/FIREBASE.md`. Aktifkan `COMMUNITY_REPORTS` hanya setelah semuanya hijau.
- **Perbaikan v1.8.1:** rules — kueri daftar wajib `limit ≤ 200`, perpanjangan ¼ TTL ditulis sebagai tabel bilangan bulat (hindari float), suara fiktif ditolak, suara bisa dihapus setelah laporan induk hilang; klien — batas prefiks `\uf8ff` ditulis eksplisit, margin jam 60 dtk; **sw.js** — kunci cache halaman kini per-berkas (sebelumnya membuka jalur/privacy menimpa salinan offline index.html).


## 15. v1.9.0 — Fase 5: navigasi, reroute otomatis & lalu lintas komunitas
- **Sesi navigasi baru** (`js/nav.js`): tombol **▶ Mulai navigasi** di bar rute → banner belokan berikutnya (ikon, jarak, nama jalan), ETA/sisa jarak/waktu/kecepatan, suara belokan 400/150/40 m (bisa dimatikan), layar tetap menyala (Wake Lock / plugin KeepAwake Capacitor), peta mengikuti arah, pesan GPS lemah/hilang, tiba otomatis. Posisi diproses ±1 Hz (hemat baterai).
- **Keluar jalur:** menyimpang > 40 m selama > 5 dtk (fix GPS tak akurat diabaikan) → hitung ulang dari posisi sekarang; gagal → coba lagi dengan jeda bertambah + tombol Waze/Google Maps.
- **Reroute berbasis laporan:** tiap 30 dtk, bila ada laporan aktif ≤ 100 m dari sisa rute (atau lalu lintas memperlambat ≥ 2 mnt) → minta alternatif; skor = durasi + penalti per jenis (ditutup 60 mnt, banjir 30, kecelakaan 10, macet 4, hambatan 2,5, mogok 1,5, razia 1, cuaca 1, lubang 0,5 — dikali tingkat 1–3 kecuali ditutup/banjir). Jalan ditutup yang masih dilalui semua alternatif → titik penghindar tegak lurus rute (kiri/kanan 350 m) lalu divalidasi. Pindah hanya bila hemat ≥ 2 mnt atau rute sekarang tertutup/banjir (histeresis + jeda 90 dtk).
- **Pengaturan (Aa):** reroute *Otomatis / Tanya dulu (bawaan) / Mati*; mode *Tanya dulu* menampilkan “Rute lebih cepat, hemat X menit. Ikuti?” dengan hitung mundur 10 dtk — habis waktu = tetap di rute, kecuali rute sekarang tertutup/banjir (otomatis pindah). *Mati*: tanpa tawaran; keluar jalur hanya diberi peringatan + tombol Waze/GM.
- **Lalu lintas** (`js/traffic.js`, flag `TRAFFIC_PROBES`, default mati): probe kecepatan anonim opt-in per sel geohash-7 tiap 15 dtk (hanya mobil/motor, tanpa uid/koordinat/riwayat); jendela geser 10 mnt; warna hijau/kuning/merah (≥30/12–30/<12 km/j) hanya bila sampel ≥ 3, selain itu “data belum cukup”. Dipakai untuk mewarnai rute, mengoreksi ETA (tidak lebih cepat dari 80% waktu dasar) dan lapisan sel di peta (Pengaturan → Tampilkan lalu lintas). Opsional TomTom (`TOMTOM_TRAFFIC`, tampilan saja, kunci di config.js).
- **Rules:** koleksi `traffic` baru di `firestore.rules` (uji: emulator + `tests/rules.static.test.mjs`). **Tambahkan TTL policy `traffic.exp`** dan publikasikan ulang rules. Lihat `docs/FIREBASE.md`.
- **Tes:** `node tests/nav.test.mjs` (15), `tests/traffic.test.mjs` (10), `tests/rules.static.test.mjs` (13), emulator rules (25 skenario, GitHub Actions), `tests/e2e.playwright.mjs` (20 langkah browser dengan OSRM tiruan: rute → mulai → keluar jalur → jalan ditutup → tawaran → pengaturan).
- **Belum teruji di sini:** perangkat Android nyata (GPS, suara, layar menyala), Firestore sungguhan untuk probe, server OSRM publik sungguhan (diuji dengan tiruan). Uji di HP sebelum rilis.
- **Batasan:** reroute berbasis laporan memakai server rute publik (alternatif ≤ 3); titik penghindar hanya untuk rute online murni (bukan rute hibrid dalam kawasan). Navigasi saat layar mati butuh foreground service/plugin background geolocation (belum dipasang; default hanya foreground).
- **v1.9.1:** flag `AUTO_REROUTE: false` kini juga mematikan hitung ulang saat keluar jalur; ditambah `tests/e2e.reroute.playwright.mjs` (4 skenario: otomatis, tanya + hitung mundur habis, jalan ditutup → pindah otomatis, mati).

## 16. v1.10.0 — rute tidak mudah hilang, 360°, panduan APK
- **Rute persisten:** setiap rute berhasil disimpan di `localStorage` (`nin_last_route`); muat ulang halaman < 60 menit memulihkannya otomatis. Tombol **Rute terakhir** di panel peta memulihkannya manual. Tombol **✕ Hapus rute** juga membuang rute tersimpan.
- **Retry:** rute online dicoba maks 3× (jeda 1,5 dtk; berhenti bila offline) sebelum menampilkan galat.
- **Rute lama tidak dibuang:** bila perhitungan rute baru (ganti moda/tujuan) gagal, rute sebelumnya dipulihkan + pemberitahuan.
- **360°:** tombol *Lihat 360°* di kartu lokasi/sheet membuka Google Street View di koordinat itu. Di dalam kawasan BOS cakupan Street View kemungkinan tidak ada; alternatif jangka panjang: Mapillary atau foto 360° sendiri.
- **Panduan APK:** `docs/APK.md`. Tes: `tests/e2e.persist.playwright.mjs`.
- Tidak dikerjakan dari proposal: navigasi dalam kawasan via GeoJSON/Turf (sudah ada: `roads.csv` + routing hibrid + `jalur.html`), dan minify/gabung JS (risiko > manfaat; Leaflet ganda hanya fallback bila `vendor/leaflet` belum dipasang — jalankan `python3 tools/setup_offline.py`).
