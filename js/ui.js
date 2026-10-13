/* E-Bendahara — utilitas tampilan (format, ikon, toast, lembar bawah, dialog) */
(function () {
  'use strict';

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const PATH = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    plus: 'M12 5v14M5 12h14',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M21 12h-4a2 2 0 0 0 0 4h4v-4zM3 7h16a2 2 0 0 1 2 2v3',
    rings: 'M9 16a5 5 0 1 0 0-10 5 5 0 0 0 0 10M15 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
    coins: 'M9 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12M18.1 10.4A6 6 0 1 1 10.4 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
    gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z',
    masuk: 'M12 5v14M5 12l7 7 7-7',
    keluar: 'M12 19V5M5 12l7-7 7 7',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    x: 'M6 6l12 12M18 6 6 18',
    back: 'M15 18l-6-6 6-6',
    next: 'M9 18l6-6-6-6',
    refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
    file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
    tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    calendar: 'M4 5h16v16H4zM16 3v4M8 3v4M4 10h16',
    chart: 'M3 3v18h18M7 15v2M11 11v6M15 7v10M19 12v5',
    alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    backspace: 'M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6',
    filter: 'M3 4h18l-7 8v7l-4 2v-9z',
    flag: 'M4 22V4M4 4h13l-2 4 2 4H4'
  };

  const MODUL_IKON = { OPS: 'wallet', BIMWIN: 'rings', PNBP: 'coins', KBS: 'heart' };
  const MODUL_PENDEK = { OPS: 'Operasional', BIMWIN: 'Bimwin', PNBP: 'PNBP', KBS: 'Kebersamaan' };

  function ikon(nama, ukuran) {
    const u = ukuran || 24;
    return '<svg class="ikon" width="' + u + '" height="' + u + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (PATH[nama] || '') + '"/></svg>';
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ribuan(n) { return String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { n = Number(n) || 0; return (n < 0 ? '−Rp' : 'Rp') + ribuan(n); }
  function rpPendek(n) {
    n = Number(n) || 0;
    const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + 'M';
    if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + 'jt';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'rb';
    return s + a;
  }
  function angka(s) { return Number(String(s || '').replace(/[^\d]/g, '')) || 0; }

  function tgl(s) { if (!s) return ''; return Number(s.slice(8, 10)) + ' ' + BLN[Number(s.slice(5, 7)) - 1] + ' ' + s.slice(0, 4); }
  function tglHari(s) {
    const d = new Date(s + 'T00:00:00');
    return HARI[d.getDay()] + ', ' + Number(s.slice(8, 10)) + ' ' + BULAN[Number(s.slice(5, 7)) - 1] + ' ' + s.slice(0, 4);
  }
  function waktu(iso) { if (!iso) return ''; return tgl(iso.slice(0, 10)) + ' · ' + iso.slice(11, 16); }
  function hariIniLokal() {
    const d = new Date(Date.now() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  }

  // ---- Toast ----
  let toastTimer;
  function toast(pesan, jenis, ms) {
    const el = document.getElementById('toast');
    if (pesan === null) { clearTimeout(toastTimer); el.classList.remove('tampil'); return; }
    el.className = 'toast tampil toast-' + (jenis || 'info');
    el.innerHTML = (jenis === 'error' ? ikon('alert', 20) : jenis === 'ok' ? ikon('check', 20) : '') + '<span>' + esc(pesan) + '</span>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('tampil'); }, ms || (jenis === 'error' ? 5000 : 3000));
  }

  // ---- Lembar bawah ----
  const sheet = { terbuka: false, onKembali: null, onTutup: null };
  function bukaSheet(judul, html, opsi) {
    opsi = opsi || {};
    const latar = document.getElementById('sheet-latar');
    document.getElementById('sheet-judul').textContent = judul;
    document.getElementById('sheet-isi').innerHTML = html;
    document.getElementById('sheet-isi').scrollTop = 0;
    const kembali = document.getElementById('sheet-kembali');
    sheet.onKembali = opsi.onKembali || null;
    sheet.onTutup = opsi.onTutup || null;
    kembali.hidden = !sheet.onKembali;
    if (!sheet.terbuka) {
      latar.hidden = false;
      requestAnimationFrame(function () { latar.classList.add('buka'); });
      document.body.classList.add('kunci-gulir');
      history.pushState({ eb: 'sheet' }, '');
      sheet.terbuka = true;
    }
    const f = document.querySelector('#sheet-isi [autofocus]');
    if (f && !opsi.tanpaFokus) setTimeout(function () { f.focus(); }, 280);
    return document.getElementById('sheet-isi');
  }
  function tutupSheet(dariHistori) {
    if (!sheet.terbuka) return;
    sheet.terbuka = false;
    const latar = document.getElementById('sheet-latar');
    latar.classList.remove('buka');
    document.body.classList.remove('kunci-gulir');
    setTimeout(function () { if (!sheet.terbuka) { latar.hidden = true; document.getElementById('sheet-isi').innerHTML = ''; } }, 250);
    const cb = sheet.onTutup; sheet.onTutup = null;
    if (cb) cb();
    if (!dariHistori && history.state && history.state.eb === 'sheet') { UI.abaikanPop = true; history.back(); }
  }

  // ---- Dialog konfirmasi ----
  function konfirmasi(o) {
    return new Promise(function (resolve) {
      const latar = document.getElementById('dialog-latar');
      document.getElementById('dialog-judul').textContent = o.judul || 'Yakin?';
      document.getElementById('dialog-isi').innerHTML = o.isi || '';
      const ya = document.getElementById('dialog-ya'), tidak = document.getElementById('dialog-tidak');
      ya.textContent = o.ya || 'Ya';
      tidak.textContent = o.tidak || 'Batal';
      tidak.hidden = o.tanpaBatal === true;
      ya.className = 'tombol ' + (o.bahaya ? 'tombol-bahaya' : 'tombol-utama');
      latar.hidden = false;
      requestAnimationFrame(function () { latar.classList.add('buka'); });
      setTimeout(function () { ya.focus(); }, 50);
      function selesai(v) {
        latar.classList.remove('buka');
        setTimeout(function () { latar.hidden = true; }, 180);
        ya.onclick = tidak.onclick = latar.onclick = null;
        resolve(v);
      }
      ya.onclick = function () { selesai(true); };
      tidak.onclick = function () { selesai(false); };
      latar.onclick = function (e) { if (e.target === latar) selesai(false); };
    });
  }
  function info(judul, isi) { return konfirmasi({ judul: judul, isi: isi, ya: 'Mengerti', tanpaBatal: true }); }

  // ---- Input uang: pemisah ribuan otomatis ----
  function pasangInputUang(el, onUbah) {
    el.addEventListener('input', function () {
      const n = angka(el.value);
      el.value = n ? ribuan(n) : '';
      if (onUbah) onUbah(n);
    });
  }

  function debounce(fn, ms) {
    let t;
    return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  function unduhBlob(blob, nama) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function muatSkrip(src) {
    return new Promise(function (ok, gagal) {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { gagal(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }

  function simpanLokal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh/diblokir */ } }
  function bacaLokal(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function hapusLokal(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }

  window.UI = {
    BULAN: BULAN, BLN: BLN, MODUL_IKON: MODUL_IKON, MODUL_PENDEK: MODUL_PENDEK,
    ikon: ikon, esc: esc, rp: rp, rpPendek: rpPendek, ribuan: ribuan, angka: angka,
    tgl: tgl, tglHari: tglHari, waktu: waktu, hariIniLokal: hariIniLokal,
    toast: toast, bukaSheet: bukaSheet, tutupSheet: tutupSheet, sheet: sheet,
    konfirmasi: konfirmasi, info: info, pasangInputUang: pasangInputUang, debounce: debounce,
    unduhBlob: unduhBlob, muatSkrip: muatSkrip, simpanLokal: simpanLokal, bacaLokal: bacaLokal, hapusLokal: hapusLokal,
    abaikanPop: false
  };
})();
