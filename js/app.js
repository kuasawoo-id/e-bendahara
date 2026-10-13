/* E-Bendahara — inti aplikasi: login, navigasi SPA, Beranda, Transaksi, Iuran, Lainnya */
(function () {
  'use strict';

  const EB = window.EB = {};
  const S = EB.S = {
    sesi: null, boot: null,
    trx: { tahun: null, list: [], status: 'kosong' },
    filter: { q: '', modul: '', jenis: '', kategori: '', dari: '', sampai: '' },
    tampil: 30, grafikModul: null, iuranTahun: null, iuranCache: {},
    hal: 'beranda', memuat: false, terakhirSegar: 0
  };
  const ik = UI.ikon, esc = UI.esc, rp = UI.rp;

  EB.pencatat = function () { return S.sesi && (S.sesi.user.peran === 'ADMIN' || S.sesi.user.peran === 'BENDAHARA'); };
  EB.admin = function () { return S.sesi && S.sesi.user.peran === 'ADMIN'; };
  EB.namaModul = function (k) { const m = (S.boot.modul || []).find(function (x) { return x.kode === k; }); return m ? m.nama : k; };
  EB.hariIni = function () { return (S.boot && S.boot.hariIni) || UI.hariIniLokal(); };
  EB.tahunIni = function () { return Number(EB.hariIni().slice(0, 4)); };

  // =========================================================
  // Layar & awal
  // =========================================================
  function tampilLayar(nama) {
    ['splash', 'layar-config', 'layar-login', 'app'].forEach(function (id) {
      document.getElementById(id).hidden = id !== nama;
    });
  }

  document.addEventListener('DOMContentLoaded', mulai);

  async function mulai() {
    document.getElementById('tombol-segarkan').innerHTML = ik('refresh');
    document.getElementById('tombol-kembali').innerHTML = ik('back');
    document.getElementById('sheet-tutup').innerHTML = ik('x');
    document.getElementById('sheet-kembali').innerHTML = ik('back');
    document.getElementById('sheet-tutup').onclick = function () { UI.tutupSheet(); };
    document.getElementById('sheet-kembali').onclick = function () { if (UI.sheet.onKembali) UI.sheet.onKembali(); };
    document.getElementById('sheet-latar').addEventListener('click', function (e) { if (e.target.id === 'sheet-latar') UI.tutupSheet(); });
    document.getElementById('tombol-segarkan').onclick = function () { segarkan({ tombol: true }); };
    document.getElementById('tombol-kembali').onclick = function () {
      if (history.state && history.state.eb === 'hal') history.back(); else EB.pergi('lainnya');
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && S.boot && Date.now() - S.terakhirSegar > 60000) segarkan({ diam: true });
    });
    pasangTarikSegarkan();
    terapkanTema();

    if (!API.urlValid()) return tampilLayar('layar-config');
    const s = API.sesi();
    if (!s) return EB.keLogin();
    S.sesi = s;
    if (s.user.harusGantiPin) return EB.keLogin();
    const cache = UI.bacaLokal('eb_boot_' + s.user.id);
    if (cache) {
      // Tampilkan data terakhir seketika, lalu perbarui di latar.
      S.boot = cache;
      masukApp();
      segarkan({ diam: true });
    } else {
      document.getElementById('splash-pesan').textContent = 'Memuat data…';
      try { await segarkan({ awal: true }); masukApp(); }
      catch (e) { if (e.kode !== 'SESI') tampilGagalAwal(e); }
    }
  }

  function tampilGagalAwal(e) {
    tampilLayar('splash');
    document.getElementById('splash-pesan').innerHTML = esc(e.message) +
      '<br><button class="tombol tombol-utama" style="margin-top:16px" onclick="location.reload()">Coba lagi</button>';
    document.querySelector('#splash .pemutar').hidden = true;
  }

  function masukApp() {
    tampilLayar('app');
    renderNav();
    route();
  }

  // =========================================================
  // Login
  // =========================================================
  let login = { daftar: [], pilih: null, pin: '', sibuk: false };

  EB.keLogin = async function (pesan) {
    const lama = API.sesi();
    if (S.sesi && !lama) UI.hapusLokal('eb_boot_' + S.sesi.user.id);
    UI.tutupSheet(true);
    if (lama && lama.user.harusGantiPin && S.loginPin) return renderGantiPinWajib();
    S.sesi = null; S.boot = null; S.trx = { tahun: null, list: [], status: 'kosong' }; S.iuranCache = {};
    API.setSesi(null);
    tampilLayar('layar-login');
    const isi = document.getElementById('login-isi');
    isi.innerHTML = '<p class="muted tengah">Memuat daftar nama…</p>';
    if (pesan) UI.toast(pesan, 'error');
    try {
      const r = await API.panggil('daftarNama', {}, { tanpaKeluar: true });
      login.daftar = r.nama;
      renderPilihNama();
    } catch (e) {
      isi.innerHTML = '<div class="kartu kartu-galat">' + ik('alert') + '<p>' + esc(e.message) + '</p>' +
        '<button class="tombol tombol-utama" onclick="EB.keLogin()">Coba lagi</button></div>';
    }
  };

  function renderPilihNama() {
    const isi = document.getElementById('login-isi');
    if (!login.daftar.length) { isi.innerHTML = '<p class="muted tengah">Belum ada pengguna.</p>'; return; }
    isi.innerHTML = '<h2 class="login-tanya">Siapa nama Anda?</h2><div class="daftar-nama">' +
      login.daftar.map(function (u) {
        return '<button class="tombol-nama" data-id="' + esc(u.id) + '"><span class="avatar">' + esc(inisial(u.nama)) + '</span>' +
          '<span>' + esc(u.nama) + '</span>' + ik('next', 20) + '</button>';
      }).join('') + '</div>';
    isi.querySelectorAll('.tombol-nama').forEach(function (b) {
      b.onclick = function () { login.pilih = login.daftar.find(function (u) { return u.id === b.dataset.id; }); login.pin = ''; renderPin(); };
    });
  }

  function renderPin(pesan) {
    const isi = document.getElementById('login-isi');
    isi.innerHTML =
      '<button class="tautan-kembali" id="pin-kembali">' + ik('back', 20) + ' Ganti nama</button>' +
      '<div class="pin-nama"><span class="avatar avatar-besar">' + esc(inisial(login.pilih.nama)) + '</span><b>' + esc(login.pilih.nama) + '</b></div>' +
      '<p class="tengah">Masukkan PIN 6 angka</p>' +
      '<div class="pin-titik" id="pin-titik" aria-live="polite">' + [0, 1, 2, 3, 4, 5].map(function () { return '<i></i>'; }).join('') + '</div>' +
      '<p class="pin-pesan" id="pin-pesan">' + esc(pesan || '') + '</p>' +
      '<div class="papan-angka" id="papan">' +
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(function (k) {
        if (!k) return '<span></span>';
        if (k === 'del') return '<button data-k="del" aria-label="Hapus angka">' + ik('backspace', 28) + '</button>';
        return '<button data-k="' + k + '">' + k + '</button>';
      }).join('') + '</div>';
    document.getElementById('pin-kembali').onclick = function () { login.pilih = null; renderPilihNama(); };
    document.querySelectorAll('#papan button').forEach(function (b) { b.onclick = function () { tekanPin(b.dataset.k); }; });
    perbaruiTitik();
  }

  function perbaruiTitik() {
    document.querySelectorAll('#pin-titik i').forEach(function (t, i) { t.classList.toggle('isi', i < login.pin.length); });
  }

  async function tekanPin(k) {
    if (login.sibuk || !login.pilih) return;
    if (k === 'del') login.pin = login.pin.slice(0, -1);
    else if (login.pin.length < 6) login.pin += k;
    perbaruiTitik();
    if (login.pin.length < 6) return;
    login.sibuk = true;
    document.getElementById('pin-pesan').textContent = 'Memeriksa…';
    try {
      const r = await API.panggil('login', { idUser: login.pilih.id, pin: login.pin }, { tanpaKeluar: true });
      S.loginPin = login.pin;
      API.setSesi({ token: r.token, user: r.user });
      S.sesi = { token: r.token, user: r.user };
      login.pin = '';
      if (r.user.harusGantiPin) { login.sibuk = false; return renderGantiPinWajib(); }
      await setelahLogin();
    } catch (e) {
      login.pin = '';
      renderPin(e.message);
      const t = document.getElementById('pin-titik');
      t.classList.add('goyang'); setTimeout(function () { t.classList.remove('goyang'); }, 450);
    } finally { login.sibuk = false; }
  }

  document.addEventListener('keydown', function (e) {
    if (document.getElementById('layar-login').hidden || !document.getElementById('papan')) return;
    if (/^\d$/.test(e.key)) tekanPin(e.key);
    else if (e.key === 'Backspace') tekanPin('del');
  });

  async function setelahLogin() {
    document.getElementById('login-isi').innerHTML = '<div class="tengah"><div class="pemutar"></div><p class="muted">Memuat data…</p></div>';
    try { await segarkan({ awal: true }); masukApp(); UI.toast('Selamat datang, ' + S.sesi.user.nama, 'ok'); }
    catch (e) { if (e.kode !== 'SESI') { renderPilihNama(); UI.toast(e.message, 'error'); } }
  }

  function renderGantiPinWajib() {
    tampilLayar('layar-login');
    const isi = document.getElementById('login-isi');
    isi.innerHTML = '<div class="kartu">' +
      '<h2>' + ik('lock') + ' Buat PIN pribadi</h2>' +
      '<p class="muted">PIN Anda masih PIN awal dari Kepala KUA. Buat PIN baru yang hanya Anda ketahui, supaya catatan atas nama Anda tidak bisa dibuat orang lain.</p>' +
      '<label class="label" for="pin-baru">PIN baru (6 angka)</label>' +
      '<input class="input input-pin" id="pin-baru" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<label class="label" for="pin-ulang">Ketik ulang PIN baru</label>' +
      '<input class="input input-pin" id="pin-ulang" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<p class="pin-pesan" id="ganti-pesan"></p>' +
      '<button class="tombol tombol-utama tombol-penuh" id="ganti-simpan">Simpan PIN</button>' +
      '<button class="tombol tombol-teks tombol-penuh" id="ganti-batal">Keluar</button></div>';
    const simpan = document.getElementById('ganti-simpan');
    document.getElementById('ganti-batal').onclick = function () { S.loginPin = null; API.setSesi(null); EB.keLogin(); };
    simpan.onclick = async function () {
      const a = document.getElementById('pin-baru').value, b = document.getElementById('pin-ulang').value;
      const p = document.getElementById('ganti-pesan');
      if (!/^\d{6}$/.test(a)) { p.textContent = 'PIN harus 6 angka.'; return; }
      if (a !== b) { p.textContent = 'Kedua PIN tidak sama.'; return; }
      simpan.disabled = true; simpan.textContent = 'Menyimpan…';
      try {
        const r = await API.panggil('gantiPin', { lama: S.loginPin, baru: a });
        S.loginPin = null;
        S.sesi.user = r.user; API.setSesi(S.sesi);
        await setelahLogin();
      } catch (e) { p.textContent = e.message; simpan.disabled = false; simpan.textContent = 'Simpan PIN'; }
    };
  }

  EB.keluar = async function () {
    const ya = await UI.konfirmasi({ judul: 'Keluar dari aplikasi?', isi: '<p>Anda perlu memasukkan PIN lagi untuk masuk.</p>', ya: 'Keluar' });
    if (!ya) return;
    API.panggil('logout', {}, { tanpaKeluar: true }).catch(function () { /* tetap keluar */ });
    UI.hapusLokal('eb_boot_' + S.sesi.user.id);
    API.setSesi(null);
    EB.keLogin();
  };

  function inisial(n) { return n.split(' ').filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
  EB.inisial = inisial;

  // =========================================================
  // Data: bootstrap & cache lokal
  // =========================================================
  async function segarkan(o) {
    o = o || {};
    if (S.memuat) return;
    S.memuat = true;
    const tombol = document.getElementById('tombol-segarkan');
    tombol.classList.add('berputar');
    try {
      const r = await API.panggil('bootstrap', {});
      S.boot = r;
      S.sesi.user = r.me; API.setSesi(S.sesi);
      S.terakhirSegar = Date.now();
      simpanBoot();
      S.iuranCache = {};
      if (S.trx.status === 'siap' && (S.hal === 'transaksi' || o.tombol)) await EB.muatTrx(S.trx.tahun, true);
      else if (S.trx.status === 'siap') S.trx.status = 'basi';
      if (!o.awal) { renderNav(); renderHalIni(); }
      if (o.tombol) UI.toast('Data sudah terbaru', 'ok', 1800);
    } catch (e) {
      if (o.awal) throw e;
      if (e.kode !== 'SESI') UI.toast(e.message, 'error');
    } finally {
      S.memuat = false;
      tombol.classList.remove('berputar');
    }
  }
  EB.segarkan = segarkan;

  function simpanBoot() { if (S.sesi && S.boot) UI.simpanLokal('eb_boot_' + S.sesi.user.id, S.boot); }
  EB.simpanBoot = simpanBoot;

  EB.muatTrx = async function (tahun, diam) {
    S.trx.status = 'memuat';
    if (!diam && S.hal === 'transaksi') renderDaftarTrx();
    try {
      const r = await API.panggil('listTransaksi', { tahun: tahun });
      S.trx = { tahun: r.tahun, list: r.transaksi, status: 'siap' };
    } catch (e) {
      S.trx.status = 'galat'; S.trx.galat = e.message;
    }
    if (S.hal === 'transaksi') renderDaftarTrx();
  };

  /** Terapkan jawaban server setelah tulis: dashboard + daftar transaksi diperbarui tanpa panggilan kedua. */
  EB.terapkanHasil = function (r, opsi) {
    opsi = opsi || {};
    if (r.dashboard) { S.boot.dashboard = r.dashboard; S.iuranCache = {}; }
    if (r.transaksi && S.trx.status === 'siap' && Number(r.transaksi.tanggal.slice(0, 4)) === S.trx.tahun) {
      S.trx.list = S.trx.list.filter(function (t) { return t.id !== r.transaksi.id && t.id !== opsi.idSementara; });
      if (r.transaksi.status === 'AKTIF') S.trx.list.push(r.transaksi);
      S.trx.list.sort(urutTrx);
    } else if (r.transaksi && S.trx.status === 'siap') {
      S.trx.list = S.trx.list.filter(function (t) { return t.id !== r.transaksi.id && t.id !== opsi.idSementara; });
    }
    simpanBoot();
    renderNav();
    renderHalIni();
  };

  function urutTrx(a, b) {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
    return (a.dicatatPada || '9') < (b.dicatatPada || '9') ? 1 : -1;
  }
  EB.urutTrx = urutTrx;

  // =========================================================
  // Navigasi SPA (hash) + tombol kembali Android
  // =========================================================
  const PENCATAT = ['ADMIN', 'BENDAHARA'];
  const HAL = {
    beranda: { judul: 'Beranda', render: renderBeranda },
    transaksi: { judul: 'Transaksi', render: renderTransaksi, syarat: bolehLihatTrx },
    iuran: { judul: 'Iuran Kebersamaan', render: renderIuran },
    lainnya: { judul: 'Lainnya', render: renderLainnya },
    laporan: { judul: 'Laporan', sub: true, peran: PENCATAT, render: function () { EB.renderLaporan(); } },
    riwayat: { judul: 'Riwayat', sub: true, peran: ['ADMIN'], render: function () { EB.renderRiwayat(); } },
    pengguna: { judul: 'Pengguna', sub: true, peran: ['ADMIN'], render: function () { EB.renderPengguna(); } },
    'kelola-iuran': { judul: 'Kelola Iuran', sub: true, peran: ['ADMIN'], render: function () { EB.renderKelolaIuran(); } },
    kategori: { judul: 'Kategori', sub: true, peran: PENCATAT, render: function () { EB.renderKategori(); } },
    'saldo-awal': { judul: 'Saldo Awal', sub: true, peran: PENCATAT, render: function () { EB.renderSaldoAwal(); } },
    visibilitas: { judul: 'Tampilan untuk ASN', sub: true, peran: ['ADMIN'], render: function () { EB.renderVisibilitas(); } },
    'ganti-pin': { judul: 'Ganti PIN', sub: true, render: function () { EB.renderGantiPin(); } }
  };

  function bolehLihatTrx() {
    return EB.pencatat() || (S.boot && S.boot.dashboard.modul.some(function (m) { return m.izin && m.izin.rincian; }));
  }
  function boleh(h) {
    const d = HAL[h];
    if (!d) return false;
    if (d.peran && d.peran.indexOf(S.sesi.user.peran) < 0) return false;
    if (d.syarat && !d.syarat()) return false;
    return true;
  }

  EB.pergi = function (hal) {
    if (('#/' + hal) === location.hash) return route();
    history.pushState({ eb: 'hal' }, '', '#/' + hal);
    route();
  };

  function onPop() {
    if (UI.abaikanPop) { UI.abaikanPop = false; return; }
    if (!document.getElementById('dialog-latar').hidden) document.getElementById('dialog-tidak').click();
    if (UI.sheet.terbuka) { UI.tutupSheet(true); return; }
    if (!document.getElementById('app').hidden) route();
  }

  function route() {
    let h = (location.hash || '').replace(/^#\/?/, '') || 'beranda';
    if (!boleh(h)) h = 'beranda';
    const pindah = S.hal !== h;
    S.hal = h;
    document.querySelectorAll('.hal').forEach(function (s) { s.classList.toggle('aktif', s.id === 'hal-' + h); });
    document.getElementById('judul-hal').textContent = HAL[h].judul;
    document.getElementById('sub-hal').textContent = h === 'beranda' ? UI.tglHari(EB.hariIni()) : '';
    document.getElementById('tombol-kembali').hidden = !HAL[h].sub;
    document.querySelectorAll('.nav-bawah [data-hal]').forEach(function (b) {
      const aktif = b.dataset.hal === h || (!!HAL[h].sub && b.dataset.hal === 'lainnya');
      b.classList.toggle('aktif', aktif);
      if (aktif) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    HAL[h].render();
    if (pindah) window.scrollTo(0, 0);
  }
  EB.route = route;

  function renderHalIni() {
    if (!S.boot || document.getElementById('app').hidden) return;
    if (UI.sheet.terbuka && S.hal === 'transaksi') { renderDaftarTrx(); return; }
    route();
  }
  EB.renderHalIni = renderHalIni;

  function renderNav() {
    const nav = document.getElementById('nav-bawah');
    const item = function (h, ikon, label, badge) {
      return '<button data-hal="' + h + '">' + ik(ikon) + '<span>' + label + '</span>' +
        (badge ? '<i class="lencana">' + (badge > 99 ? '99+' : badge) + '</i>' : '') + '</button>';
    };
    const badge = EB.admin() ? (S.boot.badgeRiwayat || 0) : 0;
    let h = item('beranda', 'home', 'Beranda');
    if (bolehLihatTrx()) h += item('transaksi', 'list', 'Transaksi');
    if (EB.pencatat()) h += '<button class="tombol-catat" id="nav-catat" aria-label="Catat uang">' + ik('plus', 30) + '<span>Catat</span></button>';
    h += item('iuran', 'users', 'Iuran');
    h += item('lainnya', 'grid', 'Lainnya', badge);
    nav.innerHTML = h;
    nav.className = 'nav-bawah' + (EB.pencatat() ? '' : ' nav-asn');
    nav.querySelectorAll('[data-hal]').forEach(function (b) { b.onclick = function () { EB.pergi(b.dataset.hal); }; });
    const c = document.getElementById('nav-catat');
    if (c) c.onclick = function () { EB.bukaCatat(); };
    document.querySelectorAll('.nav-bawah [data-hal]').forEach(function (b) {
      b.classList.toggle('aktif', b.dataset.hal === S.hal || (!!(HAL[S.hal] && HAL[S.hal].sub) && b.dataset.hal === 'lainnya'));
    });
  }
  EB.renderNav = renderNav;

  // Tarik ke bawah untuk memperbarui
  function pasangTarikSegarkan() {
    let y0 = null, jarak = 0;
    const ind = document.getElementById('indikator-tarik');
    ind.innerHTML = ik('refresh');
    window.addEventListener('touchstart', function (e) {
      if (window.scrollY > 0 || UI.sheet.terbuka || document.getElementById('app').hidden) { y0 = null; return; }
      y0 = e.touches[0].clientY; jarak = 0;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      jarak = Math.max(0, Math.min(110, e.touches[0].clientY - y0));
      ind.style.transform = 'translate(-50%,' + (jarak - 50) + 'px) rotate(' + jarak * 3 + 'deg)';
      ind.style.opacity = Math.min(1, jarak / 70);
    }, { passive: true });
    window.addEventListener('touchend', function () {
      if (y0 !== null && jarak > 80) segarkan({ tombol: true });
      y0 = null; ind.style.transform = ''; ind.style.opacity = 0;
    });
  }

  // =========================================================
  // BERANDA
  // =========================================================
  function renderBeranda() {
    const el = document.getElementById('hal-beranda');
    const d = S.boot.dashboard;
    const me = S.sesi.user;
    let h = '<div class="sapaan">Halo, <b>' + esc(me.nama) + '</b> <span class="lencana-peran">' + labelPeran(me.peran) + '</span></div>';

    if (EB.pencatat()) {
      const kosong = d.modul.filter(function (m) { return !m.saldoAwalAda; });
      if (kosong.length) {
        h += '<button class="kartu kartu-peringatan" onclick="EB.pergi(\'saldo-awal\')">' + ik('flag') +
          '<span><b>Saldo awal belum diisi</b><br>' + esc(kosong.map(function (m) { return UI.MODUL_PENDEK[m.kode]; }).join(', ')) +
          '. Isi dulu agar saldo cocok dengan uang di tangan.</span>' + ik('next') + '</button>';
      }
    }

    if (d.total) {
      h += '<div class="kartu-total"><div class="kt-label">' + ik('wallet', 20) + ' Total uang semua kas</div>' +
        '<div class="kt-angka">' + rp(d.total.saldo) + '</div>' +
        '<div class="kt-baris"><span>' + ik('masuk', 18) + ' Masuk bulan ini <b>' + rp(d.total.masukBulanIni) + '</b></span>' +
        '<span>' + ik('keluar', 18) + ' Keluar bulan ini <b>' + rp(d.total.keluarBulanIni) + '</b></span></div></div>';
    }

    if (d.modul.length) {
      h += '<h2 class="judul-bagian">Saldo per kas</h2><div class="geser-kartu" role="list">' + d.modul.map(kartuModul).join('') + '</div>';
    } else {
      h += '<div class="kartu kartu-kosong">' + ik('eye') + '<p>Kepala KUA belum membuka ringkasan keuangan untuk Anda. Status iuran tetap bisa dilihat di bawah.</p></div>';
    }

    const adaGrafik = d.modul.filter(function (m) { return m.tren; });
    if (adaGrafik.length) {
      if (!S.grafikModul || !adaGrafik.some(function (m) { return m.kode === S.grafikModul; })) S.grafikModul = adaGrafik[0].kode;
      const m = adaGrafik.find(function (x) { return x.kode === S.grafikModul; });
      h += '<h2 class="judul-bagian">Grafik</h2><div class="kartu">' +
        '<div class="pilihan-chip" role="tablist">' + adaGrafik.map(function (x) {
          return '<button role="tab" class="chip' + (x.kode === m.kode ? ' aktif' : '') + '" data-grafik="' + x.kode + '" aria-selected="' + (x.kode === m.kode) + '">' + UI.MODUL_PENDEK[x.kode] + '</button>';
        }).join('') + '</div>' +
        '<h3 class="judul-kecil">Uang masuk & keluar, 12 bulan terakhir</h3>' + grafikTren(d.labelTren, m.tren) +
        '<div class="legenda"><span><i class="titik titik-masuk"></i>Masuk</span><span><i class="titik titik-keluar"></i>Keluar</span></div>' +
        '<h3 class="judul-kecil">Pengeluaran per kategori, tahun ' + d.tahun + '</h3>' + grafikKategori(m.perKategori) + '</div>';
    }

    h += ringkasIuran(d.iuran);
    el.innerHTML = h;
    el.querySelectorAll('[data-grafik]').forEach(function (b) { b.onclick = function () { S.grafikModul = b.dataset.grafik; renderBeranda(); }; });
    el.querySelectorAll('[data-modul-kartu]').forEach(function (b) {
      b.onclick = function () {
        if (!bolehLihatTrx() || !(EB.pencatat() || (b.dataset.rincian === '1'))) return;
        S.filter = { q: '', modul: b.dataset.modulKartu, jenis: '', kategori: '', dari: '', sampai: '' };
        EB.pergi('transaksi');
      };
    });
    const info = el.querySelector('[data-info-pnbp]');
    if (info) info.onclick = function (e) { e.stopPropagation(); UI.info('Tentang Uang PNBP', '<p>' + esc(S.boot.ketPnbp) + '</p>'); };
  }

  function kartuModul(m) {
    const bisaKlik = EB.pencatat() || (m.izin && m.izin.rincian);
    let h = '<' + (bisaKlik ? 'button' : 'div') + ' role="listitem" class="kartu-modul modul-' + m.kode + '" data-modul-kartu="' + m.kode + '" data-rincian="' + (m.izin && m.izin.rincian ? 1 : 0) + '">' +
      '<div class="km-kepala"><span class="km-ikon">' + ik(UI.MODUL_IKON[m.kode], 22) + '</span><span class="km-nama">' + esc(m.nama) + '</span></div>';
    if (m.kode === 'PNBP') h += '<span class="km-ket" data-info-pnbp>Iuran penghulu untuk kantor ' + ik('alert', 14) + '</span>';
    if ('saldo' in m) {
      h += '<div class="km-saldo' + (m.saldo < 0 ? ' minus' : '') + '">' + rp(m.saldo) + '</div>';
      if (m.saldoAwalAda === false) h += '<div class="km-catatan">Saldo awal belum diisi</div>';
    }
    if ('masukBulanIni' in m) {
      h += '<div class="km-baris"><span class="teks-masuk">' + ik('masuk', 16) + ' ' + rp(m.masukBulanIni) + '</span>' +
        '<span class="teks-keluar">' + ik('keluar', 16) + ' ' + rp(m.keluarBulanIni) + '</span></div><div class="km-catatan">bulan ini</div>';
    }
    return h + '</' + (bisaKlik ? 'button' : 'div') + '>';
  }

  /** Grafik batang SVG sederhana (tanpa pustaka luar → ringan di 4G). */
  function grafikTren(label, tren) {
    const W = 360, H = 190, kiri = 40, bawah = 24, atas = 10;
    const maks = Math.max.apply(null, tren.masuk.concat(tren.keluar).concat([1]));
    const skala = niceMax(maks);
    const lebarGrup = (W - kiri) / label.length;
    const bw = Math.max(3, lebarGrup * 0.32);
    const y = function (v) { return atas + (H - atas - bawah) * (1 - v / skala); };
    let s = '<svg class="grafik" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik uang masuk dan keluar 12 bulan">';
    [0, 0.5, 1].forEach(function (f) {
      const yy = y(skala * f);
      s += '<line x1="' + kiri + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="garis-bantu"/>' +
        '<text x="' + (kiri - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="teks-sumbu">' + UI.rpPendek(skala * f) + '</text>';
    });
    label.forEach(function (l, i) {
      const x0 = kiri + i * lebarGrup + (lebarGrup - bw * 2 - 2) / 2;
      const hm = H - bawah - y(tren.masuk[i]), hk = H - bawah - y(tren.keluar[i]);
      s += '<rect x="' + x0 + '" y="' + y(tren.masuk[i]) + '" width="' + bw + '" height="' + Math.max(0, hm) + '" rx="2" class="batang-masuk"><title>' + l + ' masuk ' + rp(tren.masuk[i]) + '</title></rect>';
      s += '<rect x="' + (x0 + bw + 2) + '" y="' + y(tren.keluar[i]) + '" width="' + bw + '" height="' + Math.max(0, hk) + '" rx="2" class="batang-keluar"><title>' + l + ' keluar ' + rp(tren.keluar[i]) + '</title></rect>';
      if (i % 2 === 1 || label.length <= 6) s += '<text x="' + (kiri + i * lebarGrup + lebarGrup / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="teks-sumbu">' + l.split(' ')[0] + '</text>';
    });
    return s + '</svg>';
  }
  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  function grafikKategori(list) {
    if (!list || !list.length) return '<p class="muted">Belum ada pengeluaran tahun ini.</p>';
    const total = list.reduce(function (a, k) { return a + k.jumlah; }, 0);
    return '<div class="batang-kategori">' + list.slice(0, 8).map(function (k) {
      const p = Math.round(k.jumlah / total * 100);
      return '<div class="bk-baris"><div class="bk-atas"><span>' + esc(k.nama) + '</span><b>' + rp(k.jumlah) + ' <small>(' + p + '%)</small></b></div>' +
        '<div class="bk-rel"><i style="width:' + Math.max(2, p) + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  function ringkasIuran(iu) {
    let h = '<h2 class="judul-bagian">Iuran kebersamaan</h2><div class="kartu">';
    if (!iu.anggota.length) return h + '<p class="muted">Belum ada anggota iuran.</p></div>';
    if (iu.bulanIni) {
      const nunggak = iu.anggota.filter(function (a) { const s = a.bulan[iu.bulanIni - 1]; return s.status === 'BELUM' || s.status === 'KURANG'; });
      const namaBln = UI.BULAN[iu.bulanIni - 1];
      if (!nunggak.length) {
        h += '<div class="iuran-lunas">' + ik('check', 28) + '<div><b>Semua sudah lunas</b><br>untuk bulan ' + namaBln + '.</div></div>';
      } else {
        h += '<div class="iuran-angka"><b>' + nunggak.length + '</b> orang belum lunas bulan ' + namaBln + '</div><ul class="daftar-nunggak">' +
          nunggak.map(function (a) {
            const s = a.bulan[iu.bulanIni - 1];
            return '<li><span>' + esc(a.nama) + '</span><b class="' + (s.status === 'KURANG' ? 'teks-kurang' : 'teks-keluar') + '">' +
              (s.status === 'KURANG' ? 'kurang ' + rp(s.kurang) : 'belum bayar') + '</b></li>';
          }).join('') + '</ul>';
      }
    }
    h += '<button class="tombol tombol-garis tombol-penuh" onclick="EB.pergi(\'iuran\')">' + ik('users', 20) + ' Lihat tabel iuran semua bulan</button></div>';
    return h;
  }

  function labelPeran(p) { return { ADMIN: 'Kepala KUA', BENDAHARA: 'Bendahara', ASN: 'ASN' }[p] || p; }
  EB.labelPeran = labelPeran;

  // =========================================================
  // TRANSAKSI
  // =========================================================
  function renderTransaksi() {
    const el = document.getElementById('hal-transaksi');
    const thn = S.boot.tahunTersedia || [EB.tahunIni()];
    if (!S.trx.tahun) S.trx.tahun = EB.tahunIni();
    const modulTampil = S.boot.dashboard.modul.filter(function (m) { return EB.pencatat() || (m.izin && m.izin.rincian); });
    if (S.filter.modul && !modulTampil.some(function (m) { return m.kode === S.filter.modul; })) S.filter.modul = '';
    const katOpsi = EB.pencatat() ? (S.boot.kategori || []) : [];
    const lanjutan = S.filter.kategori || S.filter.dari || S.filter.sampai;

    el.innerHTML =
      '<div class="cari">' + ik('search', 20) + '<input class="input" id="cari-trx" type="search" placeholder="Cari keterangan, kategori, nama…" value="' + esc(S.filter.q) + '" aria-label="Cari transaksi"></div>' +
      '<div class="pilihan-chip gulir-x" id="f-modul">' +
      '<button class="chip' + (!S.filter.modul ? ' aktif' : '') + '" data-v="">Semua kas</button>' +
      modulTampil.map(function (m) { return '<button class="chip' + (S.filter.modul === m.kode ? ' aktif' : '') + '" data-v="' + m.kode + '">' + UI.MODUL_PENDEK[m.kode] + '</button>'; }).join('') + '</div>' +
      '<div class="segmen" id="f-jenis">' +
      [['', 'Semua'], ['MASUK', 'Masuk'], ['KELUAR', 'Keluar']].map(function (j) {
        return '<button class="' + (S.filter.jenis === j[0] ? 'aktif' : '') + '" data-v="' + j[0] + '">' + j[1] + '</button>';
      }).join('') + '</div>' +
      '<details class="filter-lanjut"' + (lanjutan ? ' open' : '') + '><summary>' + ik('filter', 18) + ' Filter lainnya</summary>' +
      '<div class="grid-2">' +
      '<label class="label">Tahun<select class="input" id="f-tahun">' + thn.map(function (t) { return '<option' + (t === S.trx.tahun ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      (katOpsi.length ? '<label class="label">Kategori<select class="input" id="f-kategori"><option value="">Semua</option>' +
        katOpsi.map(function (k) { return '<option value="' + k.id + '"' + (S.filter.kategori === k.id ? ' selected' : '') + '>' + esc(k.nama) + ' (' + (k.jenis === 'MASUK' ? 'masuk' : 'keluar') + (k.modul !== 'SEMUA' ? ', ' + UI.MODUL_PENDEK[k.modul] : '') + ')</option>'; }).join('') +
        '</select></label>' : '') +
      '<label class="label">Dari tanggal<input class="input" type="date" id="f-dari" value="' + S.filter.dari + '"></label>' +
      '<label class="label">Sampai tanggal<input class="input" type="date" id="f-sampai" value="' + S.filter.sampai + '"></label>' +
      '</div><button class="tombol tombol-teks" id="f-reset">Hapus semua filter</button></details>' +
      '<div id="ringkas-trx"></div><div id="daftar-trx"></div>';

    const cari = document.getElementById('cari-trx');
    cari.addEventListener('input', UI.debounce(function () { S.filter.q = cari.value.trim(); S.tampil = 30; renderDaftarTrx(); }, 250));
    el.querySelectorAll('#f-modul .chip').forEach(function (b) {
      b.onclick = function () { S.filter.modul = b.dataset.v; S.tampil = 30; el.querySelectorAll('#f-modul .chip').forEach(function (x) { x.classList.toggle('aktif', x === b); }); renderDaftarTrx(); };
    });
    el.querySelectorAll('#f-jenis button').forEach(function (b) {
      b.onclick = function () { S.filter.jenis = b.dataset.v; S.tampil = 30; el.querySelectorAll('#f-jenis button').forEach(function (x) { x.classList.toggle('aktif', x === b); }); renderDaftarTrx(); };
    });
    document.getElementById('f-tahun').onchange = function () { S.trx.tahun = Number(this.value); S.tampil = 30; EB.muatTrx(S.trx.tahun); };
    const fk = document.getElementById('f-kategori');
    if (fk) fk.onchange = function () { S.filter.kategori = this.value; renderDaftarTrx(); };
    document.getElementById('f-dari').onchange = function () { S.filter.dari = this.value; renderDaftarTrx(); };
    document.getElementById('f-sampai').onchange = function () { S.filter.sampai = this.value; renderDaftarTrx(); };
    document.getElementById('f-reset').onclick = function () { S.filter = { q: '', modul: '', jenis: '', kategori: '', dari: '', sampai: '' }; renderTransaksi(); };

    if (S.trx.status === 'kosong' || S.trx.status === 'basi') EB.muatTrx(S.trx.tahun);
    else renderDaftarTrx();
  }

  function trxTersaring() {
    const f = S.filter, q = f.q.toLowerCase();
    return S.trx.list.filter(function (t) {
      if (f.modul && t.modul !== f.modul) return false;
      if (f.jenis && t.jenis !== f.jenis) return false;
      if (f.kategori && t.idKategori !== f.kategori) return false;
      if (f.dari && t.tanggal < f.dari) return false;
      if (f.sampai && t.tanggal > f.sampai) return false;
      if (q && (t.keterangan + ' ' + t.kategoriNama + ' ' + t.asnNama + ' ' + t.dicatatOlehNama + ' ' + t.jumlah).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderDaftarTrx() {
    const wadah = document.getElementById('daftar-trx');
    const ringkas = document.getElementById('ringkas-trx');
    if (!wadah) return;
    if (S.trx.status === 'memuat' || S.trx.status === 'kosong') {
      ringkas.innerHTML = '';
      wadah.innerHTML = '<div class="kerangka"></div><div class="kerangka"></div><div class="kerangka"></div>';
      return;
    }
    if (S.trx.status === 'galat') {
      wadah.innerHTML = '<div class="kartu kartu-galat">' + ik('alert') + '<p>' + esc(S.trx.galat) + '</p><button class="tombol tombol-utama" onclick="EB.muatTrx(EB.S.trx.tahun)">Coba lagi</button></div>';
      return;
    }
    const list = trxTersaring();
    let masuk = 0, keluar = 0;
    list.forEach(function (t) { if (t.jenis === 'MASUK') masuk += t.jumlah; else keluar += t.jumlah; });
    ringkas.innerHTML = '<div class="ringkas-trx"><span>' + list.length + ' transaksi</span><span class="teks-masuk">+' + rp(masuk) + '</span><span class="teks-keluar">−' + rp(keluar) + '</span></div>';
    if (!list.length) {
      wadah.innerHTML = '<div class="kartu kartu-kosong">' + ik('list') + '<p>Tidak ada transaksi' + (S.filter.q || S.filter.modul || S.filter.jenis ? ' yang cocok dengan pencarian.' : ' di tahun ' + S.trx.tahun + '.') + '</p>' +
        (EB.pencatat() ? '<button class="tombol tombol-utama" onclick="EB.bukaCatat()">' + ik('plus', 20) + ' Catat uang</button>' : '') + '</div>';
      return;
    }
    let h = '', tglTerakhir = '';
    list.slice(0, S.tampil).forEach(function (t) {
      if (t.tanggal !== tglTerakhir) { h += '<h3 class="tgl-grup">' + UI.tglHari(t.tanggal) + '</h3>'; tglTerakhir = t.tanggal; }
      h += itemTrx(t);
    });
    if (list.length > S.tampil) h += '<button class="tombol tombol-garis tombol-penuh" id="muat-lagi">Tampilkan ' + Math.min(30, list.length - S.tampil) + ' lagi (dari ' + (list.length - S.tampil) + ')</button>';
    wadah.innerHTML = h;
    wadah.querySelectorAll('[data-trx]').forEach(function (b) {
      b.onclick = function () { const t = S.trx.list.find(function (x) { return x.id === b.dataset.trx; }); if (t && !t._pending) EB.detailTrx(t); };
    });
    const ml = document.getElementById('muat-lagi');
    if (ml) ml.onclick = function () { S.tampil += 30; renderDaftarTrx(); };
  }
  EB.renderDaftarTrx = renderDaftarTrx;

  function itemTrx(t) {
    const masuk = t.jenis === 'MASUK';
    const judul = t.subjenis ? t.kategoriNama + (t.asnNama ? ' · ' + t.asnNama : '') : t.kategoriNama;
    return '<button class="trx' + (t._pending ? ' pending' : '') + '" data-trx="' + esc(t.id) + '">' +
      '<span class="trx-ikon ' + (masuk ? 'masuk' : 'keluar') + '">' + ik(masuk ? 'masuk' : 'keluar', 20) + '</span>' +
      '<span class="trx-isi"><b>' + esc(judul) + '</b><small>' + (t._pending ? '<em>Menyimpan…</em> · ' : '') +
      '<span class="tag-modul modul-' + t.modul + '">' + UI.MODUL_PENDEK[t.modul] + '</span>' + (t.keterangan ? ' ' + esc(t.keterangan) : '') + '</small></span>' +
      '<span class="trx-jml ' + (masuk ? 'teks-masuk' : 'teks-keluar') + '">' + (masuk ? '+' : '−') + rp(t.jumlah) + '</span></button>';
  }

  EB.detailTrx = function (t) {
    const baris = function (l, v) { return v ? '<div class="detail-baris"><span>' + l + '</span><b>' + v + '</b></div>' : ''; };
    let h = '<div class="detail-jumlah ' + (t.jenis === 'MASUK' ? 'teks-masuk' : 'teks-keluar') + '">' + (t.jenis === 'MASUK' ? '+' : '−') + rp(t.jumlah) + '</div>' +
      '<div class="detail">' +
      baris('Tanggal', UI.tglHari(t.tanggal)) +
      baris('Kas', esc(EB.namaModul(t.modul))) +
      baris('Jenis', t.jenis === 'MASUK' ? 'Uang masuk' : 'Uang keluar') +
      baris('Kategori', esc(t.kategoriNama)) +
      baris('Nama', esc(t.asnNama)) +
      baris('Keterangan', esc(t.keterangan)) +
      baris('Dicatat oleh', esc(t.dicatatOlehNama) + '<small>' + UI.waktu(t.dicatatPada) + '</small>') +
      baris('Terakhir diubah', t.diubahPada ? UI.waktu(t.diubahPada) : '') + '</div>';
    if (EB.pencatat()) {
      h += '<div class="aksi-ganda"><button class="tombol tombol-garis" id="d-ubah">' + ik('edit', 20) + ' Ubah</button>' +
        '<button class="tombol tombol-bahaya-garis" id="d-hapus">' + ik('trash', 20) + ' Hapus</button></div>';
      if (t.subjenis === 'IURAN') h += '<p class="catatan">Nominal iuran terikat ke bulan yang dibayar. Untuk mengubah nominal atau bulan, hapus lalu catat ulang.</p>';
    }
    UI.bukaSheet('Rincian transaksi', h);
    const u = document.getElementById('d-ubah'), x = document.getElementById('d-hapus');
    if (u) u.onclick = function () { EB.bukaUbah(t); };
    if (x) x.onclick = function () { EB.hapusTrx(t); };
  };

  // =========================================================
  // IURAN
  // =========================================================
  async function renderIuran() {
    const el = document.getElementById('hal-iuran');
    const tIni = EB.tahunIni();
    if (!S.iuranTahun) S.iuranTahun = tIni;
    let iu = S.iuranTahun === S.boot.dashboard.iuran.tahun ? S.boot.dashboard.iuran : S.iuranCache[S.iuranTahun];
    const thn = (S.boot.tahunTersedia || [tIni]).slice();
    if (thn.indexOf(tIni + 1) < 0 && new Date().getMonth() >= 9) thn.unshift(tIni + 1);

    let h = '<div class="baris-atas"><label class="label label-baris">Tahun <select class="input input-kecil" id="iu-tahun">' +
      thn.map(function (t) { return '<option' + (t === S.iuranTahun ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      (EB.pencatat() ? '<button class="tombol tombol-utama" id="iu-catat">' + ik('plus', 20) + ' Catat iuran</button>' : '') + '</div>';
    if (!iu) {
      el.innerHTML = h + '<div class="kerangka kerangka-tinggi"></div>';
      pasangIuranAtas(el);
      try {
        const r = await API.panggil('tabelIuran', { tahun: S.iuranTahun });
        S.iuranCache[S.iuranTahun] = r.iuran;
        if (S.hal === 'iuran') renderIuran();
      } catch (e) { UI.toast(e.message, 'error'); }
      return;
    }
    const tarif = iu.anggota.length ? iu.anggota[0].bulan : [];
    h += '<div class="legenda legenda-iuran">' +
      '<span><i class="sel sel-LUNAS">' + ik('check', 14) + '</i>Lunas</span><span><i class="sel sel-KURANG">−</i>Kurang</span>' +
      '<span><i class="sel sel-BELUM">' + ik('x', 14) + '</i>Belum</span><span><i class="sel sel-NANTI">·</i>Belum jatuh tempo</span><span><i class="sel sel-NA">—</i>Bukan masa iuran</span></div>';
    if (iu.belumLunasBulanIni !== null) {
      h += '<p class="ringkas-iuran">' + (iu.belumLunasBulanIni ? '<b>' + iu.belumLunasBulanIni + ' orang</b> belum lunas bulan ' + UI.BULAN[iu.bulanIni - 1] + '.' : ik('check', 18) + ' Semua lunas bulan ' + UI.BULAN[iu.bulanIni - 1] + '.') + '</p>';
    }
    if (!iu.anggota.length) {
      h += '<div class="kartu kartu-kosong">' + ik('users') + '<p>Belum ada anggota iuran.' + (EB.admin() ? ' Tambahkan di menu Pengguna.' : '') + '</p></div>';
    } else {
      h += '<div class="tabel-iuran-wadah"><table class="tabel-iuran"><thead><tr><th class="kol-nama">Nama</th>' +
        UI.BLN.map(function (b, i) { return '<th' + (iu.bulanIni === i + 1 ? ' class="kol-ini"' : '') + '>' + b + '</th>'; }).join('') +
        '<th class="kol-tunggak">Tunggakan</th></tr></thead><tbody>' +
        iu.anggota.map(function (a) {
          return '<tr><th class="kol-nama">' + (EB.pencatat() ? '<button class="tautan" data-iu-nama="' + esc(a.id) + '">' + esc(a.nama) + '</button>' : esc(a.nama)) + '</th>' +
            a.bulan.map(function (s, i) {
              return '<td class="' + (iu.bulanIni === i + 1 ? 'kol-ini' : '') + '"><button class="sel sel-' + s.status + '" data-iu="' + esc(a.id) + '|' + s.b + '" aria-label="' + esc(a.nama) + ' ' + UI.BULAN[i] + ': ' + labelStatus(s) + '">' + isiSel(s) + '</button></td>';
            }).join('') +
            '<td class="kol-tunggak' + (a.tunggakan ? ' teks-keluar' : '') + '">' + (a.tunggakan ? rp(a.tunggakan) : '–') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      const tarifUnik = {};
      tarif.forEach(function (s) { if (s.tarif) tarifUnik[s.tarif] = (tarifUnik[s.tarif] || []).concat(s.b); });
      h += '<p class="catatan">Iuran per bulan: ' + Object.keys(tarifUnik).map(function (t) {
        const b = tarifUnik[t];
        return rp(Number(t)) + ' (' + UI.BLN[b[0] - 1] + (b.length > 1 ? '–' + UI.BLN[b[b.length - 1] - 1] : '') + ')';
      }).join(', ') + '. Ketuk kotak untuk melihat rinciannya' + (EB.pencatat() ? ', ketuk nama untuk mencatat pembayaran.' : '.') + '</p>';
    }
    el.innerHTML = h;
    pasangIuranAtas(el);
    el.querySelectorAll('[data-iu]').forEach(function (b) {
      b.onclick = function () {
        const p = b.dataset.iu.split('|');
        const a = iu.anggota.find(function (x) { return x.id === p[0]; });
        const s = a.bulan[Number(p[1]) - 1];
        const isi = '<p>' + labelStatus(s, true) + '</p>' + (s.tarif ? '<div class="detail"><div class="detail-baris"><span>Iuran bulan ini</span><b>' + rp(s.tarif) + '</b></div><div class="detail-baris"><span>Sudah dibayar</span><b>' + rp(s.bayar) + '</b></div>' + (s.kurang && s.status !== 'NA' ? '<div class="detail-baris"><span>Sisa</span><b class="teks-keluar">' + rp(s.kurang) + '</b></div>' : '') + '</div>' : '');
        if (EB.pencatat() && ['BELUM', 'KURANG', 'NANTI'].indexOf(s.status) >= 0) {
          UI.konfirmasi({ judul: a.nama + ' · ' + UI.BULAN[s.b - 1] + ' ' + iu.tahun, isi: isi, ya: 'Catat pembayaran', tidak: 'Tutup' })
            .then(function (ya) { if (ya) EB.bukaIuran(a.id, { tahun: iu.tahun, bulan: s.b }); });
        } else UI.info(a.nama + ' · ' + UI.BULAN[s.b - 1] + ' ' + iu.tahun, isi);
      };
    });
    el.querySelectorAll('[data-iu-nama]').forEach(function (b) { b.onclick = function () { EB.bukaIuran(b.dataset.iuNama); }; });
    // Gulir tabel ke bulan berjalan
    const w = el.querySelector('.tabel-iuran-wadah'), ini = el.querySelector('th.kol-ini');
    if (w && ini) w.scrollLeft = Math.max(0, ini.offsetLeft - w.clientWidth / 2);
  }

  function pasangIuranAtas(el) {
    el.querySelector('#iu-tahun').onchange = function () { S.iuranTahun = Number(this.value); renderIuran(); };
    const c = el.querySelector('#iu-catat');
    if (c) c.onclick = function () { EB.bukaIuran(); };
  }

  function isiSel(s) {
    if (s.status === 'LUNAS') return ik('check', 16);
    if (s.status === 'KURANG') return '−' + UI.rpPendek(s.kurang);
    if (s.status === 'BELUM') return ik('x', 16);
    if (s.status === 'NANTI') return s.bayar ? '−' + UI.rpPendek(s.kurang) : '·';
    return '—';
  }
  function labelStatus(s, panjang) {
    return { LUNAS: 'Lunas', KURANG: 'Kurang ' + rp(s.kurang), BELUM: 'Belum bayar', NANTI: panjang ? 'Belum jatuh tempo' + (s.bayar ? ', sudah dibayar sebagian' : '') : 'Belum jatuh tempo', NA: 'Di luar masa iuran' }[s.status];
  }
  EB.isiSel = isiSel; EB.labelStatus = labelStatus;

  // =========================================================
  // LAINNYA
  // =========================================================
  function renderLainnya() {
    const el = document.getElementById('hal-lainnya');
    const me = S.sesi.user;
    const item = function (hal, ikon, judul, ket, badge) {
      return '<button class="menu-item" data-ke="' + hal + '"><span class="menu-ikon">' + ik(ikon) + '</span><span class="menu-teks"><b>' + judul + '</b><small>' + ket + '</small></span>' +
        (badge ? '<i class="lencana">' + badge + '</i>' : '') + ik('next', 20) + '</button>';
    };
    let h = '<div class="kartu profil"><span class="avatar avatar-besar">' + esc(inisial(me.nama)) + '</span><div><b>' + esc(me.nama) + '</b><br><span class="muted">' + labelPeran(me.peran) + '</span></div></div>';
    h += '<div class="menu">';
    if (EB.pencatat()) h += item('laporan', 'file', 'Laporan', 'Unduh rekap PDF atau Excel per kas');
    if (EB.admin()) h += item('riwayat', 'clock', 'Riwayat', 'Semua catatan, perubahan & penghapusan', S.boot.badgeRiwayat ? S.boot.badgeRiwayat + ' hapus baru' : '');
    if (EB.admin()) h += item('pengguna', 'user', 'Pengguna', 'Tambah akun, reset PIN, masa iuran');
    if (EB.admin()) h += item('kelola-iuran', 'calendar', 'Kelola Iuran', 'Nominal iuran per bulan');
    if (EB.pencatat()) h += item('kategori', 'tag', 'Kategori', 'Daftar pilihan untuk uang masuk/keluar');
    if (EB.pencatat()) h += item('saldo-awal', 'flag', 'Saldo Awal', 'Uang yang sudah ada saat mulai memakai aplikasi');
    if (EB.admin()) h += item('visibilitas', 'eye', 'Tampilan untuk ASN', 'Atur apa saja yang boleh dilihat ASN');
    h += item('ganti-pin', 'lock', 'Ganti PIN', 'Ubah PIN masuk Anda');
    h += '</div>';
    const tema = UI.bacaLokal('eb_tema_pilih') || 'auto';
    h += '<h2 class="judul-bagian">Tampilan</h2><div class="segmen segmen-besar" id="pilih-tema">' +
      [['auto', 'Ikuti HP'], ['light', 'Terang'], ['dark', 'Gelap']].map(function (t) {
        return '<button data-tema="' + t[0] + '" class="' + (tema === t[0] ? 'aktif' : '') + '">' + ik(t[0] === 'dark' ? 'moon' : t[0] === 'light' ? 'sun' : 'eye', 18) + ' ' + t[1] + '</button>';
      }).join('') + '</div>';
    h += '<button class="tombol tombol-bahaya-garis tombol-penuh tombol-keluar" id="tombol-keluar">' + ik('logout', 20) + ' Keluar</button>';
    h += '<p class="merek-bawah">E-Bendahara v1.0 · Ahzani Labs</p>';
    el.innerHTML = h;
    el.querySelectorAll('[data-ke]').forEach(function (b) { b.onclick = function () { EB.pergi(b.dataset.ke); }; });
    el.querySelectorAll('[data-tema]').forEach(function (b) {
      b.onclick = function () { UI.simpanLokal('eb_tema_pilih', b.dataset.tema); terapkanTema(); renderLainnya(); };
    });
    document.getElementById('tombol-keluar').onclick = EB.keluar;
  }

  function terapkanTema() {
    const t = UI.bacaLokal('eb_tema_pilih') || 'auto';
    try { if (t === 'auto') localStorage.removeItem('eb_tema'); else localStorage.setItem('eb_tema', t); } catch (e) { /* abaikan */ }
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const gelap = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', gelap ? '#0E1412' : '#0F6B4F');
  }
})();
