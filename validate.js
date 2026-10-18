/* Validasi data unit & jalur — dipakai bersama oleh index.html, validasi.html dan tools/monitor.mjs.
   Satu sumber aturan supaya hasilnya selalu sama di aplikasi, halaman pemeriksa, dan pemantau otomatis. */
(function (root) {
  'use strict';

  var CATS = ['showroom', 'workshop', 'detailing', 'hotel'];
  var STATUSES = ['verified', 'estimated', 'unsurveyed'];
  var DEFAULT_RADIUS_M = 450;   // jarak maksimum dari titik tengah kawasan (kawasan ± 340 × 320 m)
  var MAX_ROAD_JUMP_M = 150;    // lompatan antar titik jalur yang dianggap mencurigakan

  var num = function (v) { return parseFloat(String(v == null ? '' : v).replace(',', '.')); };
  var decimals = function (v) { var m = String(v).replace(',', '.').match(/\.(\d+)/); return m ? m[1].length : 0; };

  function dist(a, b) { // meter
    var R = 6371000, rad = function (x) { return x * Math.PI / 180; };
    var dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

  // Hash pendek (FNV-1a 32-bit) → "nomor versi data" yang otomatis berubah bila isi CSV berubah.
  function hash(text) {
    var h = 0x811c9dc5, s = String(text).replace(/\r\n?/g, '\n').trim();
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  function parseCSV(t) {
    var rows = [], r = [], f = '', inQ = false; t = String(t).replace(/^﻿/, '');
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (inQ) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
      else if (c === '"') inQ = true;
      else if (c === ',') { r.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; if (r.length > 1 || r[0] !== '') rows.push(r); r = []; }
      else f += c;
    }
    if (f !== '' || r.length) { r.push(f); rows.push(r); }
    if (!rows.length) return [];
    var h = rows.shift().map(function (s) { return s.trim().toLowerCase(); });
    return rows.map(function (a, idx) {
      var o = { __line: idx + 2 };
      h.forEach(function (k, i) { o[k] = (a[i] || '').trim(); });
      return o;
    });
  }

  /* validate(unitRows, roadRows, opts) → { units:[...baris sah], roads:[[lat,lng]...], issues:[...], area:{center,radiusM} }
     issue = { sheet, line, id, level:'error'|'warn', code, msg }
     level 'error' = baris TIDAK dipakai aplikasi; 'warn' = baris tetap dipakai tapi perlu dicek. */
  function validate(unitRows, roadRows, opts) {
    opts = opts || {};
    var issues = [];
    var add = function (sheet, line, id, level, code, msg) { issues.push({ sheet: sheet, line: line, id: id || '', level: level, code: code, msg: msg }); };

    // 1. Titik tengah kawasan = median koordinat yang masuk akal (tahan terhadap beberapa salah ketik)
    var cfgArea = opts.area || {};
    var cand = unitRows.map(function (r) { return [num(r.lat), num(r.lng)]; }).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180; });
    var center = cfgArea.center || (cand.length ? [median(cand.map(function (p) { return p[0]; })), median(cand.map(function (p) { return p[1]; }))] : null);
    var radiusM = cfgArea.radiusM || DEFAULT_RADIUS_M;
    var inArea = function (p) { return !center || dist(p, center) <= radiusM; };

    // 2. Unit
    var units = [], seen = {}, seenPos = {};
    unitRows.forEach(function (r) {
      var line = r.__line, id = r.id, lat = num(r.lat), lng = num(r.lng), ok = true;
      if (!r.id) { add('units', line, id, 'error', 'id-kosong', 'Kolom id kosong.'); ok = false; }
      if (!r.name) { add('units', line, id, 'error', 'nama-kosong', 'Kolom name kosong.'); ok = false; }
      if (r.id && seen[r.id]) { add('units', line, id, 'error', 'id-ganda', 'id "' + r.id + '" sudah dipakai di baris ' + seen[r.id] + '.'); ok = false; }
      if (!isFinite(lat) || !isFinite(lng)) {
        add('units', line, id, 'error', 'koordinat-bukan-angka', 'lat/lng kosong atau bukan angka (' + (r.lat || '∅') + ', ' + (r.lng || '∅') + '). Pastikan sel berformat angka, bukan teks.'); ok = false;
      } else if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        if (Math.abs(lng) <= 90 && Math.abs(lat) <= 180 && inArea([lng, lat])) add('units', line, id, 'error', 'lat-lng-tertukar', 'lat dan lng tampaknya tertukar (' + lat + ', ' + lng + ' → seharusnya ' + lng + ', ' + lat + ').');
        else add('units', line, id, 'error', 'koordinat-di-luar-rentang', 'lat/lng di luar rentang bumi (' + lat + ', ' + lng + ').'); ok = false;
      } else if (!inArea([lat, lng])) {
        var d = Math.round(dist([lat, lng], center));
        if (inArea([lng, lat]) && Math.abs(lng) <= 90) add('units', line, id, 'error', 'lat-lng-tertukar', 'lat dan lng tampaknya tertukar (' + lat + ', ' + lng + ' → seharusnya ' + lng + ', ' + lat + ').');
        else if (inArea([-lat, lng])) add('units', line, id, 'error', 'tanda-lat', 'Tanda minus lat tampaknya hilang/berlebih (' + lat + ' → ' + (-lat) + ').');
        else if (inArea([lat, -lng])) add('units', line, id, 'error', 'tanda-lng', 'Tanda minus lng tampaknya berlebih (' + lng + ').');
        else add('units', line, id, 'error', 'di-luar-kawasan', 'Titik berjarak ±' + d + ' m dari pusat kawasan (batas ' + radiusM + ' m).');
        ok = false;
      } else {
        if (Math.min(decimals(r.lat), decimals(r.lng)) < 5) add('units', line, id, 'warn', 'koordinat-dibulatkan', 'Koordinat kurang dari 5 desimal (' + r.lat + ', ' + r.lng + ') — kemungkinan dibulatkan oleh Sheets, bisa meleset beberapa meter.');
        var pk = lat.toFixed(6) + ',' + lng.toFixed(6);
        if (seenPos[pk] && seenPos[pk] !== r.id) add('units', line, id, 'warn', 'koordinat-kembar', 'Koordinat sama persis dengan unit "' + seenPos[pk] + '".');
        else seenPos[pk] = r.id;
      }
      if (r.cat && CATS.indexOf(r.cat) < 0) add('units', line, id, 'warn', 'cat-tidak-dikenal', 'cat "' + r.cat + '" tidak dikenal (pakai: ' + CATS.join('/') + '); dianggap showroom.');
      if (!r.cat) add('units', line, id, 'warn', 'cat-kosong', 'cat kosong; dianggap showroom.');
      if (r.status && STATUSES.indexOf(r.status) < 0) add('units', line, id, 'warn', 'status-tidak-dikenal', 'status "' + r.status + '" tidak dikenal (pakai: ' + STATUSES.join('/') + '); dianggap unsurveyed.');
      if (r.vacant && !/^(1|0|true|false|ya|yes|tidak|no)$/i.test(r.vacant)) add('units', line, id, 'warn', 'vacant-aneh', 'vacant "' + r.vacant + '" tidak dikenal (isi 1 bila kosong).');
      if (r.id && !seen[r.id]) seen[r.id] = line;
      if (ok) units.push({ row: r, lat: lat, lng: lng });
    });

    // 3. Jalur
    var byRoad = {}, order = [];
    roadRows.forEach(function (r) {
      var line = r.__line, la = num(r.lat), lo = num(r.lng);
      if (!r.road_id) { add('roads', line, '', 'error', 'road-id-kosong', 'Kolom road_id kosong.'); return; }
      if (!isFinite(la) || !isFinite(lo)) { add('roads', line, r.road_id, 'error', 'koordinat-bukan-angka', 'lat/lng jalur kosong atau bukan angka.'); return; }
      if (!inArea([la, lo])) {
        add('roads', line, r.road_id, 'error', inArea([lo, la]) ? 'lat-lng-tertukar' : 'di-luar-kawasan',
          inArea([lo, la]) ? 'lat dan lng jalur tampaknya tertukar.' : 'Titik jalur berjarak ±' + Math.round(dist([la, lo], center)) + ' m dari pusat kawasan.'); return;
      }
      if (r.seq !== '' && !isFinite(num(r.seq))) add('roads', line, r.road_id, 'warn', 'seq-bukan-angka', 'seq "' + r.seq + '" bukan angka; dianggap 0.');
      if (!byRoad[r.road_id]) { byRoad[r.road_id] = []; order.push(r.road_id); }
      byRoad[r.road_id].push({ s: num(r.seq) || 0, p: [la, lo], line: line, r: r });
    });
    var roads = [], roadMeta = [];
    order.forEach(function (id) {
      var v = byRoad[id].sort(function (a, b) { return a.s - b.s; });
      if (v.length < 2) { add('roads', v[0].line, id, 'warn', 'jalur-satu-titik', 'Jalur ' + id + ' hanya punya 1 titik; tidak dipakai.'); return; }
      for (var i = 1; i < v.length; i++) {
        if (v[i].s === v[i - 1].s) add('roads', v[i].line, id, 'warn', 'seq-ganda', 'seq ' + v[i].s + ' dipakai dua kali di jalur ' + id + '.');
        var j = dist(v[i - 1].p, v[i].p);
        if (j > MAX_ROAD_JUMP_M) add('roads', v[i].line, id, 'warn', 'lompatan-jauh', 'Lompatan ' + Math.round(j) + ' m dari titik sebelumnya di jalur ' + id + ' — urutan seq atau koordinat mungkin salah.');
      }
      roads.push(v.map(function (x) { return x.p; }));
      // kolom OPSIONAL (kompatibel mundur): oneway (0/1/-1), moda (mobil|jalan_kaki|keduanya), kecepatan_kmh, nama_jalan — diambil dari baris pertama yang mengisinya
      var m = { id: id }, pickv = function (k) { for (var q = 0; q < v.length; q++) { var x = v[q].r[k]; if (x !== undefined && String(x).trim() !== '') return String(x).trim(); } return ''; };
      m.oneway = num(pickv('oneway')) || 0; if ([0, 1, -1].indexOf(m.oneway) < 0) { add('roads', v[0].line, id, 'warn', 'oneway-salah', 'oneway harus 0, 1, atau -1; dianggap 0.'); m.oneway = 0; }
      m.moda = pickv('moda').toLowerCase(); if (m.moda && ['mobil', 'jalan_kaki', 'keduanya'].indexOf(m.moda) < 0) { add('roads', v[0].line, id, 'warn', 'moda-salah', 'moda "' + m.moda + '" tidak dikenal (mobil | jalan_kaki | keduanya); dianggap semua moda.'); m.moda = ''; }
      m.kecepatan_kmh = num(pickv('kecepatan_kmh')) || 0; m.nama_jalan = pickv('nama_jalan');
      roadMeta.push(m);
    });

    if (!units.length) add('units', 0, '', 'error', 'kosong', 'Tidak ada unit yang valid.');
    return { units: units, roads: roads, roadMeta: roadMeta, issues: issues, area: { center: center, radiusM: radiusM } };
  }

  var api = { validate: validate, parseCSV: parseCSV, hash: hash, dist: dist, CATS: CATS, STATUSES: STATUSES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BOSValidate = api;
})(typeof self !== 'undefined' ? self : this);
