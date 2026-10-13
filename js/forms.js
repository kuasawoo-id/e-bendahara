/* E-Bendahara — form pencatatan: uang masuk/keluar, iuran, sumbangan, ubah & hapus */
(function () {
  'use strict';

  const S = EB.S, ik = UI.ikon, esc = UI.esc, rp = UI.rp;
  let f = null; // status form yang sedang diisi

  function saldoAwal(modul) { return (S.boot.saldoAwal || []).find(function (x) { return x.modul === modul; }); }
  function kartu(modul) { return S.boot.dashboard.modul.find(function (m) { return m.kode === modul; }); }

  // =========================================================
  // Langkah 1: pilih kas
  // =========================================================
  EB.bukaCatat = function () {
    f = { modul: '', jenis: '', id_kategori: '', jumlah: 0, tanggal: EB.hariIni(), keterangan: '' };
    langkahModul();
  };

  function langkahModul() {
    const h = '<p class="langkah">Langkah 1 dari 3</p><h3 class="tanya">Uang dari kas mana?</h3><div class="pilihan-besar">' +
      S.boot.dashboard.modul.map(function (m) {
        return '<button class="pilih-modul modul-' + m.kode + '" data-m="' + m.kode + '"><span class="km-ikon">' + ik(UI.MODUL_IKON[m.kode], 26) + '</span>' +
          '<span class="pm-teks"><b>' + esc(m.nama) + '</b><small>Saldo ' + rp(m.saldo) + '</small></span>' + ik('next') + '</button>';
      }).join('') + '</div>';
    const isi = UI.bukaSheet('Catat uang', h);
    isi.querySelectorAll('[data-m]').forEach(function (b) {
      b.onclick = function () {
        if (!saldoAwal(b.dataset.m)) return mintaSaldoAwal(b.dataset.m);
        f.modul = b.dataset.m; langkahJenis();
      };
    });
  }

  async function mintaSaldoAwal(modul) {
    const ya = await UI.konfirmasi({
      judul: 'Saldo awal belum diisi',
      isi: '<p>Sebelum mencatat di <b>' + esc(EB.namaModul(modul)) + '</b>, isi dulu jumlah uang yang sudah ada di tangan saat mulai memakai aplikasi. Tanpa itu, saldo di aplikasi tidak akan cocok dengan uang sebenarnya.</p>',
      ya: 'Isi saldo awal'
    });
    if (ya) { UI.tutupSheet(); setTimeout(function () { EB.pergi('saldo-awal'); }, 50); }
  }

  // =========================================================
  // Langkah 2: masuk / keluar
  // =========================================================
  function langkahJenis() {
    let h = '<p class="langkah">Langkah 2 dari 3 · ' + esc(EB.namaModul(f.modul)) + '</p><h3 class="tanya">Uang masuk atau keluar?</h3>' +
      '<div class="pilihan-dua"><button class="pilih-jenis jenis-masuk" data-j="MASUK">' + ik('masuk', 36) + '<b>Uang Masuk</b><small>Terima uang</small></button>' +
      '<button class="pilih-jenis jenis-keluar" data-j="KELUAR">' + ik('keluar', 36) + '<b>Uang Keluar</b><small>Bayar / belanja</small></button></div>';
    const isi = UI.bukaSheet('Catat uang', h, { onKembali: langkahModul });
    isi.querySelectorAll('[data-j]').forEach(function (b) {
      b.onclick = function () {
        f.jenis = b.dataset.j;
        if (f.modul === 'KBS' && f.jenis === 'MASUK') return langkahJenisKbs();
        langkahIsi();
      };
    });
  }

  function langkahJenisKbs() {
    const h = '<p class="langkah">Uang Kebersamaan · Masuk</p><h3 class="tanya">Uang apa yang diterima?</h3>' +
      '<div class="pilihan-besar">' +
      '<button class="pilih-modul" id="k-iuran"><span class="km-ikon">' + ik('calendar', 26) + '</span><span class="pm-teks"><b>Iuran bulanan</b><small>Iuran wajib per nama per bulan</small></span>' + ik('next') + '</button>' +
      '<button class="pilih-modul" id="k-sumbangan"><span class="km-ikon">' + ik('gift', 26) + '</span><span class="pm-teks"><b>Sumbangan sukarela</b><small>Tambahan di luar iuran wajib</small></span>' + ik('next') + '</button></div>';
    UI.bukaSheet('Catat uang', h, { onKembali: langkahJenis });
    document.getElementById('k-iuran').onclick = function () { EB.bukaIuran(null, null, langkahJenisKbs); };
    document.getElementById('k-sumbangan').onclick = function () { EB.bukaSumbangan(langkahJenisKbs); };
  }

  // =========================================================
  // Langkah 3: isi jumlah, kategori, tanggal, keterangan
  // =========================================================
  function daftarKategori(modul, jenis, idTetap) {
    return (S.boot.kategori || []).filter(function (k) {
      return (k.modul === modul || k.modul === 'SEMUA') && k.jenis === jenis && (k.aktif || k.id === idTetap);
    }).sort(function (a, b) {
      if (a.nama === 'Lain-lain') return 1;
      if (b.nama === 'Lain-lain') return -1;
      return a.nama.localeCompare(b.nama);
    });
  }

  function langkahIsi() {
    const sa = saldoAwal(f.modul);
    const ubah = !!f.id;
    const kats = daftarKategori(f.modul, f.jenis, f.id_kategori);
    const masuk = f.jenis === 'MASUK';
    let h = (ubah ? '' : '<p class="langkah">Langkah 3 dari 3</p>') +
      '<div class="ringkas-pilihan"><span class="tag-modul modul-' + f.modul + '">' + esc(EB.namaModul(f.modul)) + '</span>' +
      '<span class="tag-jenis ' + (masuk ? 'jenis-masuk' : 'jenis-keluar') + '">' + ik(masuk ? 'masuk' : 'keluar', 16) + (masuk ? 'Uang masuk' : 'Uang keluar') + '</span></div>' +
      (ubah ? '<div class="pilihan-dua kecil"><button class="pilih-jenis jenis-masuk' + (masuk ? ' aktif' : '') + '" data-j="MASUK"' + (f.modul === 'KBS' ? ' disabled' : '') + '>' + ik('masuk', 20) + 'Masuk</button>' +
        '<button class="pilih-jenis jenis-keluar' + (!masuk ? ' aktif' : '') + '" data-j="KELUAR">' + ik('keluar', 20) + 'Keluar</button></div>' : '') +
      '<label class="label" for="f-jumlah">Jumlah uang</label>' +
      '<div class="input-uang"><span>Rp</span><input id="f-jumlah" inputmode="numeric" autocomplete="off" placeholder="0" value="' + (f.jumlah ? UI.ribuan(f.jumlah) : '') + '"' + (ubah ? '' : ' autofocus') + '></div>' +
      '<p class="bantuan" id="f-terbilang"></p>' +
      '<label class="label">' + (masuk ? 'Uang ini dari apa?' : 'Uang ini untuk apa?') + '</label>' +
      '<div class="pilih-kategori" id="f-kategori">' +
      kats.map(function (k) { return '<button class="chip chip-besar' + (f.id_kategori === k.id ? ' aktif' : '') + '" data-k="' + k.id + '">' + esc(k.nama) + '</button>'; }).join('') +
      '<button class="chip chip-besar chip-tambah" id="f-kat-baru">' + ik('plus', 18) + ' Kategori baru</button></div>' +
      '<div id="f-kat-form" class="kat-form" hidden><input class="input" id="f-kat-nama" maxlength="40" placeholder="Nama kategori, mis. Fotokopi">' +
      '<button class="tombol tombol-utama" id="f-kat-simpan">Simpan</button></div>' +
      '<label class="label" for="f-tanggal">Tanggal</label>' +
      '<input class="input" type="date" id="f-tanggal" value="' + f.tanggal + '" max="' + EB.hariIni() + '"' + (sa ? ' min="' + sa.tanggal + '"' : '') + '>' +
      '<p class="bantuan" id="f-tgl-bantu"></p>' +
      '<label class="label" for="f-ket">Keterangan <span class="muted">(boleh dikosongkan)</span></label>' +
      '<textarea class="input" id="f-ket" rows="2" maxlength="300" placeholder="Misal: snack rapat minggon">' + esc(f.keterangan) + '</textarea>' +
      '<p class="pesan-galat" id="f-galat" role="alert"></p>' +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="f-lanjut">Lanjut ' + ik('next', 20) + '</button>';

    const isi = UI.bukaSheet(ubah ? 'Ubah transaksi' : 'Catat uang', h, {
      onKembali: ubah ? null : (f.modul === 'KBS' && f.jenis === 'MASUK' ? langkahJenisKbs : langkahJenis)
    });
    const inJ = document.getElementById('f-jumlah');
    UI.pasangInputUang(inJ, function (n) { f.jumlah = n; terbilangSingkat(n); });
    terbilangSingkat(f.jumlah);
    isi.querySelectorAll('#f-kategori [data-k]').forEach(function (b) {
      b.onclick = function () {
        f.id_kategori = b.dataset.k;
        isi.querySelectorAll('#f-kategori [data-k]').forEach(function (x) { x.classList.toggle('aktif', x === b); });
      };
    });
    isi.querySelectorAll('.pilihan-dua [data-j]').forEach(function (b) {
      b.onclick = function () { simpanIsian(); if (f.jenis !== b.dataset.j) { f.jenis = b.dataset.j; f.id_kategori = ''; langkahIsi(); } };
    });
    document.getElementById('f-kat-baru').onclick = function () {
      const fm = document.getElementById('f-kat-form'); fm.hidden = !fm.hidden;
      if (!fm.hidden) document.getElementById('f-kat-nama').focus();
    };
    document.getElementById('f-kat-simpan').onclick = tambahKategoriCepat;
    const tg = document.getElementById('f-tanggal');
    const bantuTgl = function () { document.getElementById('f-tgl-bantu').textContent = tg.value === EB.hariIni() ? 'Hari ini' : (tg.value ? UI.tglHari(tg.value) : ''); };
    tg.onchange = bantuTgl; bantuTgl();
    document.getElementById('f-lanjut').onclick = function () { simpanIsian(); konfirmasiTrx(); };
  }

  function simpanIsian() {
    const tg = document.getElementById('f-tanggal'), kt = document.getElementById('f-ket');
    if (tg) f.tanggal = tg.value;
    if (kt) f.keterangan = kt.value.trim();
  }

  function terbilangSingkat(n) {
    const el = document.getElementById('f-terbilang');
    if (el) el.textContent = n >= 1000 ? 'Terbaca: ' + terbilang(n) + ' rupiah' : '';
  }

  async function tambahKategoriCepat() {
    const nama = document.getElementById('f-kat-nama').value.trim();
    const tombol = document.getElementById('f-kat-simpan');
    if (!nama) return;
    tombol.disabled = true; tombol.textContent = 'Menyimpan…';
    try {
      const r = await API.panggil('simpanKategori', { aksi: 'tambah', modul: f.modul, jenis: f.jenis, nama: nama });
      S.boot.kategori = r.kategori; EB.simpanBoot();
      f.id_kategori = r.kategoriBaru.id_kategori;
      simpanIsian();
      langkahIsi();
      UI.toast('Kategori "' + nama + '" ditambahkan', 'ok');
    } catch (e) {
      UI.toast(e.message, 'error');
      tombol.disabled = false; tombol.textContent = 'Simpan';
    }
  }

  function validasiForm() {
    if (!f.jumlah) return 'Isi jumlah uang.';
    if (!f.id_kategori && !f.subjenis) return 'Pilih kategori.';
    if (!f.tanggal) return 'Isi tanggal.';
    if (f.tanggal > EB.hariIni()) return 'Tanggal tidak boleh melebihi hari ini.';
    const sa = saldoAwal(f.modul);
    if (sa && f.tanggal < sa.tanggal) return 'Tanggal tidak boleh sebelum tanggal saldo awal (' + UI.tgl(sa.tanggal) + ').';
    return '';
  }

  function konfirmasiTrx() {
    const g = validasiForm();
    if (g) { document.getElementById('f-galat').textContent = g; return; }
    const kat = (S.boot.kategori || []).find(function (k) { return k.id === f.id_kategori; });
    const katNama = f.subjenis === 'SUMBANGAN' ? 'Sumbangan sukarela' : f.subjenis === 'IURAN' ? 'Iuran bulanan' : (kat ? kat.nama : '');
    const masuk = f.jenis === 'MASUK';
    const k = kartu(f.modul);
    let selisih = (masuk ? 1 : -1) * f.jumlah;
    if (f.id && f.asli && f.asli.modul === f.modul) selisih -= (f.asli.jenis === 'MASUK' ? 1 : -1) * f.asli.jumlah;
    const saldoBaru = k ? k.saldo + selisih : null;
    let h = '<div class="konfirmasi-kalimat">' + (f.id ? 'Simpan perubahan menjadi ' : 'Catat ') +
      '<b class="' + (masuk ? 'teks-masuk' : 'teks-keluar') + '">uang ' + (masuk ? 'masuk' : 'keluar') + ' ' + rp(f.jumlah) + '</b> ' +
      (masuk ? 'dari' : 'untuk') + ' <b>' + esc(katNama) + '</b> ' + (masuk ? 'ke' : 'dari') + ' <b>' + esc(EB.namaModul(f.modul)) + '</b>?</div>' +
      '<div class="detail">' +
      '<div class="detail-baris"><span>Tanggal</span><b>' + UI.tglHari(f.tanggal) + '</b></div>' +
      (f.keterangan ? '<div class="detail-baris"><span>Keterangan</span><b>' + esc(f.keterangan) + '</b></div>' : '') +
      (saldoBaru !== null ? '<div class="detail-baris"><span>Saldo setelah ini</span><b class="' + (saldoBaru < 0 ? 'teks-keluar' : '') + '">' + rp(saldoBaru) + '</b></div>' : '') + '</div>' +
      (saldoBaru !== null && saldoBaru < 0 ? '<div class="kartu-peringatan kecil">' + ik('alert', 20) + '<span>Saldo akan <b>minus</b>. Pastikan jumlahnya benar, atau catat dulu uang masuknya.</span></div>' : '') +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="k-ya">' + ik('check', 22) + ' Ya, simpan</button>' +
      '<button class="tombol tombol-teks tombol-penuh" id="k-ubah">Ubah lagi</button>';
    UI.bukaSheet('Periksa sekali lagi', h, { onKembali: langkahIsi });
    document.getElementById('k-ubah').onclick = langkahIsi;
    document.getElementById('k-ya').onclick = function () {
      const data = { id: f.id, modul: f.modul, jenis: f.jenis, id_kategori: f.id_kategori, jumlah: f.jumlah, tanggal: f.tanggal, keterangan: f.keterangan, id_asn: f.id_asn };
      const fSimpan = Object.assign({}, f);
      simpanOptimis({
        aksi: 'simpanTransaksi', data: data,
        sementara: Object.assign(trxSementara(fSimpan, katNama), f.id ? { id: f.id } : {}),
        asli: f.asli,
        ulang: function () { f = fSimpan; langkahIsi(); }
      });
    };
  }

  function trxSementara(x, katNama) {
    return {
      id: 'TMP-' + Date.now(), tanggal: x.tanggal, modul: x.modul, jenis: x.jenis, subjenis: x.subjenis || '',
      idKategori: x.id_kategori, kategoriNama: katNama, idAsn: x.id_asn || '', asnNama: x.asnNama || '',
      jumlah: x.jumlah, keterangan: x.keterangan, dicatatOlehNama: S.sesi.user.nama, dicatatPada: '', status: 'AKTIF', _pending: true
    };
  }

  // =========================================================
  // Simpan "optimis": tampilan langsung berubah, server mengonfirmasi,
  // dibatalkan otomatis bila server menolak.
  // =========================================================
  async function simpanOptimis(o) {
    const cadangan = { dash: JSON.stringify(S.boot.dashboard), list: S.trx.list.slice() };
    UI.tutupSheet();
    const t = o.sementara;
    // 1. Perbarui tampilan seketika
    if (t) {
      const k = kartu(t.modul);
      const tanda = function (x) { return (x.jenis === 'MASUK' ? 1 : -1) * x.jumlah; };
      if (o.hapus) {
        if (k && 'saldo' in k) k.saldo -= tanda(t);
        if (S.trx.status === 'siap') S.trx.list = S.trx.list.filter(function (x) { return x.id !== t.id; });
      } else {
        if (o.asli) { const ka = kartu(o.asli.modul); if (ka && 'saldo' in ka) ka.saldo -= tanda(o.asli); }
        if (k && 'saldo' in k) k.saldo += tanda(t) + (o.tambahanSaldo || 0);
        if (S.trx.status === 'siap' && Number(t.tanggal.slice(0, 4)) === S.trx.tahun) {
          S.trx.list = S.trx.list.filter(function (x) { return x.id !== t.id; });
          S.trx.list.push(t);
          S.trx.list.sort(EB.urutTrx);
        }
      }
      if (S.boot.dashboard.total) S.boot.dashboard.total.saldo = S.boot.dashboard.modul.reduce(function (a, m) { return a + m.saldo; }, 0);
      EB.renderHalIni();
    }
    UI.toast(o.hapus ? 'Menghapus…' : 'Menyimpan…', 'info', 20000);
    // 2. Kirim ke server
    try {
      const r = await API.panggil(o.aksi, o.data);
      EB.terapkanHasil(r, { idSementara: t && !o.data.id ? t.id : null });
      const pesan = r.message + (r.saldoModul !== null && r.saldoModul !== undefined && r.transaksi ? ' Saldo ' + UI.MODUL_PENDEK[r.transaksi.modul] + ': ' + rp(r.saldoModul) : '');
      UI.toast(pesan, 'ok', 4500);
      if (o.selesai) o.selesai(r);
    } catch (e) {
      // 3. Gagal: kembalikan tampilan seperti semula
      S.boot.dashboard = JSON.parse(cadangan.dash);
      S.trx.list = cadangan.list;
      EB.renderHalIni();
      UI.toast(null);
      if (e.kode === 'SESI') return;
      const ulang = await UI.konfirmasi({
        judul: o.hapus ? 'Gagal menghapus' : 'Gagal menyimpan',
        isi: '<p>' + esc(e.message) + '</p><p class="muted">Tampilan sudah dikembalikan seperti semula. Tidak ada yang tersimpan.</p>',
        ya: o.ulang ? 'Perbaiki & coba lagi' : 'Tutup', tanpaBatal: !o.ulang, tidak: 'Batal'
      });
      if (ulang && o.ulang) o.ulang();
    }
  }
  EB.simpanOptimis = simpanOptimis;

  // =========================================================
  // Ubah & hapus
  // =========================================================
  EB.bukaUbah = function (t) {
    f = {
      id: t.id, asli: t, modul: t.modul, jenis: t.jenis, subjenis: t.subjenis, id_kategori: t.idKategori,
      jumlah: t.jumlah, tanggal: t.tanggal, keterangan: t.keterangan, id_asn: t.idAsn, asnNama: t.asnNama
    };
    if (t.subjenis === 'IURAN') return ubahIuranRingan(t);
    if (t.subjenis === 'SUMBANGAN') return EB.bukaSumbangan(null, t);
    langkahIsi();
  };

  function ubahIuranRingan(t) {
    const sa = saldoAwal('KBS');
    const h = '<div class="detail"><div class="detail-baris"><span>Iuran</span><b>' + esc(t.asnNama) + ' · ' + rp(t.jumlah) + '</b></div></div>' +
      '<p class="catatan">Untuk iuran, hanya tanggal dan keterangan yang bisa diubah. Salah nominal/bulan? Hapus lalu catat ulang.</p>' +
      '<label class="label" for="u-tgl">Tanggal</label><input class="input" type="date" id="u-tgl" value="' + t.tanggal + '" max="' + EB.hariIni() + '"' + (sa ? ' min="' + sa.tanggal + '"' : '') + '>' +
      '<label class="label" for="u-ket">Keterangan</label><textarea class="input" id="u-ket" rows="2" maxlength="300">' + esc(t.keterangan) + '</textarea>' +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="u-simpan">' + ik('check', 22) + ' Simpan perubahan</button>';
    UI.bukaSheet('Ubah iuran', h);
    document.getElementById('u-simpan').onclick = function () {
      const tgl = document.getElementById('u-tgl').value, ket = document.getElementById('u-ket').value.trim();
      simpanOptimis({
        aksi: 'simpanTransaksi', data: { id: t.id, tanggal: tgl, keterangan: ket },
        sementara: Object.assign({}, t, { tanggal: tgl, keterangan: ket, _pending: true }), asli: t
      });
    };
  }

  EB.hapusTrx = async function (t) {
    const ya = await UI.konfirmasi({
      judul: 'Hapus transaksi ini?',
      isi: '<p><b>' + (t.jenis === 'MASUK' ? 'Masuk ' : 'Keluar ') + rp(t.jumlah) + '</b> · ' + esc(t.kategoriNama) + (t.asnNama ? ' · ' + esc(t.asnNama) : '') + '<br>' + UI.tglHari(t.tanggal) + '</p>' +
        (t.subjenis === 'IURAN' ? '<p>Status bulan yang dibayar akan kembali menjadi <b>belum bayar</b>.</p>' : '') +
        '<p class="muted">Penghapusan tercatat di Riwayat dan bisa dilihat Kepala KUA.</p>',
      ya: 'Ya, hapus', bahaya: true
    });
    if (!ya) return;
    simpanOptimis({ aksi: 'hapusTransaksi', data: { id: t.id }, sementara: t, hapus: true });
  };

  // =========================================================
  // Iuran bulanan
  // =========================================================
  let iu = null;

  async function tabelTahun(th) {
    if (S.boot.dashboard.iuran.tahun === th) return S.boot.dashboard.iuran;
    if (S.iuranCache[th]) return S.iuranCache[th];
    const r = await API.panggil('tabelIuran', { tahun: th });
    S.iuranCache[th] = r.iuran;
    return r.iuran;
  }

  /** idAsn opsional; pra = {tahun, bulan} untuk memilih bulan otomatis. */
  EB.bukaIuran = async function (idAsn, pra, kembali) {
    if (!saldoAwal('KBS')) return mintaSaldoAwal('KBS');
    iu = { id_asn: idAsn || '', tahun: (pra && pra.tahun) || EB.tahunIni(), pilih: {}, sumbangan: 0, tanggal: EB.hariIni(), ket: '', kembali: kembali || null };
    if (!idAsn) return pilihNamaIuran();
    if (pra) await tambahPilihan(pra.tahun, pra.bulan);
    formIuran();
  };

  function pilihNamaIuran() {
    const tab = S.boot.dashboard.iuran;
    const ang = (S.boot.anggota || []).slice().sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    const h = '<h3 class="tanya">Siapa yang membayar?</h3>' +
      (ang.length ? '<div class="pilihan-besar">' + ang.map(function (a) {
        const baris = tab.anggota.find(function (x) { return x.id === a.id_asn; });
        const tung = baris ? baris.tunggakan : 0;
        return '<button class="tombol-nama" data-asn="' + esc(a.id_asn) + '"><span class="avatar">' + esc(EB.inisial(a.nama)) + '</span><span>' + esc(a.nama) +
          (tung ? '<small class="teks-keluar">Tunggakan ' + rp(tung) + '</small>' : '<small class="teks-masuk">Tidak ada tunggakan</small>') + '</span>' + ik('next', 20) + '</button>';
      }).join('') + '</div>' : '<p class="muted">Belum ada anggota iuran.</p>') +
      '<p class="catatan">Nama tidak ada? Kepala KUA mendaftarkannya di menu Pengguna.</p>';
    const isi = UI.bukaSheet('Catat iuran', h, { onKembali: iu.kembali });
    isi.querySelectorAll('[data-asn]').forEach(function (b) { b.onclick = function () { iu.id_asn = b.dataset.asn; formIuran(); }; });
  }

  async function tambahPilihan(th, b) {
    const tab = await tabelTahun(th);
    const a = tab.anggota.find(function (x) { return x.id === iu.id_asn; });
    if (!a) return;
    const s = a.bulan[b - 1];
    if (['BELUM', 'KURANG', 'NANTI'].indexOf(s.status) >= 0 && s.kurang) iu.pilih[th + '-' + b] = { tahun: th, bulan: b, nominal: s.kurang, sisa: s.kurang };
  }

  async function formIuran() {
    const ang = (S.boot.anggota || []).find(function (a) { return a.id_asn === iu.id_asn; });
    UI.bukaSheet('Iuran · ' + (ang ? ang.nama : ''), '<div class="kerangka kerangka-tinggi"></div>', { onKembali: pilihNamaIuran, tanpaFokus: true });
    let tab;
    try { tab = await tabelTahun(iu.tahun); }
    catch (e) { UI.toast(e.message, 'error'); return; }
    if (!UI.sheet.terbuka) return;
    const a = tab.anggota.find(function (x) { return x.id === iu.id_asn; });
    const thMulai = ang ? Number(ang.mulai.slice(0, 4)) : iu.tahun;
    const thAkhir = ang && ang.berhenti ? Number(ang.berhenti.slice(0, 4)) : EB.tahunIni() + 1;
    const total = Object.keys(iu.pilih).reduce(function (s, k) { return s + (iu.pilih[k].nominal || 0); }, 0);

    let h = '<div class="pilih-tahun"><button class="ikon-tombol" id="iu-th-kiri"' + (iu.tahun <= thMulai ? ' disabled' : '') + ' aria-label="Tahun sebelumnya">' + ik('back') + '</button>' +
      '<b>' + iu.tahun + '</b><button class="ikon-tombol" id="iu-th-kanan"' + (iu.tahun >= thAkhir ? ' disabled' : '') + ' aria-label="Tahun berikutnya">' + ik('next') + '</button></div>' +
      '<p class="bantuan tengah">Ketuk bulan yang dibayar. Boleh lebih dari satu.</p>' +
      '<div class="kisi-bulan">' + a.bulan.map(function (s) {
        const kunci = iu.tahun + '-' + s.b;
        const bisa = ['BELUM', 'KURANG', 'NANTI'].indexOf(s.status) >= 0 && s.kurang > 0;
        const dipilih = !!iu.pilih[kunci];
        return '<button class="kotak-bulan st-' + s.status + (dipilih ? ' dipilih' : '') + '" data-b="' + s.b + '"' + (bisa ? '' : ' disabled') + ' aria-pressed="' + dipilih + '">' +
          '<b>' + UI.BLN[s.b - 1] + '</b><small>' + (s.status === 'LUNAS' ? 'Lunas' : s.status === 'NA' ? '—' : s.status === 'KURANG' || (s.status === 'NANTI' && s.bayar) ? 'Kurang ' + UI.rpPendek(s.kurang) : UI.rpPendek(s.tarif)) + '</small>' +
          (dipilih ? '<i class="centang">' + ik('check', 14) + '</i>' : '') + '</button>';
      }).join('') + '</div>';

    const keys = Object.keys(iu.pilih).sort(function (x, y) { const p = iu.pilih[x], q = iu.pilih[y]; return p.tahun - q.tahun || p.bulan - q.bulan; });
    if (keys.length) {
      h += '<h3 class="judul-kecil">Rincian bayar</h3><div class="rincian-bayar">' + keys.map(function (k) {
        const p = iu.pilih[k];
        return '<div class="rb-baris"><span>' + UI.BULAN[p.bulan - 1] + ' ' + p.tahun + '<small>sisa ' + rp(p.sisa) + '</small></span>' +
          '<div class="input-uang kecil"><span>Rp</span><input inputmode="numeric" data-rb="' + k + '" value="' + UI.ribuan(p.nominal) + '" aria-label="Nominal ' + UI.BULAN[p.bulan - 1] + '"></div>' +
          '<button class="ikon-tombol" data-hapus-rb="' + k + '" aria-label="Batalkan bulan ini">' + ik('x', 20) + '</button></div>';
      }).join('') + '</div><p class="bantuan">Membayar sebagian (mencicil)? Ubah angkanya.</p>';
    }
    h += '<label class="label" for="iu-sumb">Sumbangan tambahan <span class="muted">(boleh kosong)</span></label>' +
      '<div class="input-uang"><span>Rp</span><input id="iu-sumb" inputmode="numeric" placeholder="0" value="' + (iu.sumbangan ? UI.ribuan(iu.sumbangan) : '') + '"></div>' +
      '<p class="bantuan">Uang lebih di luar iuran wajib. Tidak mengubah status bulan.</p>' +
      '<div class="grid-2"><label class="label">Tanggal terima<input class="input" type="date" id="iu-tgl" value="' + iu.tanggal + '" max="' + EB.hariIni() + '" min="' + saldoAwal('KBS').tanggal + '"></label>' +
      '<label class="label">Keterangan<input class="input" id="iu-ket" maxlength="300" value="' + esc(iu.ket) + '" placeholder="boleh kosong"></label></div>' +
      '<div class="total-bayar"><span>Total diterima</span><b id="iu-total">' + rp(total + iu.sumbangan) + '</b></div>' +
      '<p class="pesan-galat" id="iu-galat" role="alert"></p>' +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="iu-lanjut">Lanjut ' + ik('next', 20) + '</button>';

    const isi = UI.bukaSheet('Iuran · ' + (ang ? ang.nama : ''), h, { onKembali: pilihNamaIuran, tanpaFokus: true });
    const ambilIsian = function () {
      iu.tanggal = document.getElementById('iu-tgl').value;
      iu.ket = document.getElementById('iu-ket').value.trim();
    };
    const hitungTotal = function () {
      const t = Object.keys(iu.pilih).reduce(function (s, k) { return s + (iu.pilih[k].nominal || 0); }, 0);
      document.getElementById('iu-total').textContent = rp(t + iu.sumbangan);
    };
    document.getElementById('iu-th-kiri').onclick = function () { ambilIsian(); iu.tahun--; formIuran(); };
    document.getElementById('iu-th-kanan').onclick = function () { ambilIsian(); iu.tahun++; formIuran(); };
    isi.querySelectorAll('.kotak-bulan:not([disabled])').forEach(function (b) {
      b.onclick = async function () {
        ambilIsian();
        const k = iu.tahun + '-' + b.dataset.b;
        if (iu.pilih[k]) delete iu.pilih[k]; else await tambahPilihan(iu.tahun, Number(b.dataset.b));
        formIuran();
      };
    });
    isi.querySelectorAll('[data-rb]').forEach(function (inp) {
      UI.pasangInputUang(inp, function (n) { iu.pilih[inp.dataset.rb].nominal = n; hitungTotal(); });
    });
    isi.querySelectorAll('[data-hapus-rb]').forEach(function (b) { b.onclick = function () { ambilIsian(); delete iu.pilih[b.dataset.hapusRb]; formIuran(); }; });
    UI.pasangInputUang(document.getElementById('iu-sumb'), function (n) { iu.sumbangan = n; hitungTotal(); });
    document.getElementById('iu-lanjut').onclick = async function () { ambilIsian(); await konfirmasiIuran(ang); };
  }

  async function konfirmasiIuran(ang) {
    const gal = document.getElementById('iu-galat');
    const keys = Object.keys(iu.pilih);
    if (!keys.length) { gal.textContent = 'Pilih minimal satu bulan.'; return; }
    if (keys.some(function (k) { return !iu.pilih[k].nominal; })) { gal.textContent = 'Nominal setiap bulan harus diisi.'; return; }
    if (!iu.tanggal || iu.tanggal > EB.hariIni()) { gal.textContent = 'Tanggal tidak valid.'; return; }
    // Kelebihan per bulan → tawarkan jadi sumbangan (PRD §4.2)
    const lebih = keys.reduce(function (s, k) { const p = iu.pilih[k]; return s + Math.max(0, p.nominal - p.sisa); }, 0);
    if (lebih) {
      const ya = await UI.konfirmasi({
        judul: 'Ada kelebihan bayar',
        isi: '<p>Nominal yang diisi melebihi sisa iuran sebesar <b>' + rp(lebih) + '</b>.</p><p>Catat kelebihan ' + rp(lebih) + ' sebagai <b>sumbangan</b> atas nama ' + esc(ang.nama) + '?</p>',
        ya: 'Ya, jadikan sumbangan', tidak: 'Perbaiki angka'
      });
      if (!ya) return;
      keys.forEach(function (k) { const p = iu.pilih[k]; if (p.nominal > p.sisa) p.nominal = p.sisa; });
      iu.sumbangan += lebih;
    }
    const urut = keys.map(function (k) { return iu.pilih[k]; }).sort(function (a, b) { return a.tahun - b.tahun || a.bulan - b.bulan; });
    const totalIuran = urut.reduce(function (s, p) { return s + p.nominal; }, 0);
    const h = '<div class="konfirmasi-kalimat">Terima <b class="teks-masuk">iuran ' + rp(totalIuran) + '</b> dari <b>' + esc(ang.nama) + '</b>' +
      (iu.sumbangan ? ' dan <b class="teks-masuk">sumbangan ' + rp(iu.sumbangan) + '</b>' : '') + '?</div>' +
      '<div class="detail">' + urut.map(function (p) {
        return '<div class="detail-baris"><span>' + UI.BULAN[p.bulan - 1] + ' ' + p.tahun + '</span><b>' + rp(p.nominal) + (p.nominal < p.sisa ? ' <small class="teks-kurang">(cicil, sisa ' + rp(p.sisa - p.nominal) + ')</small>' : ' <small class="teks-masuk">lunas</small>') + '</b></div>';
      }).join('') +
      '<div class="detail-baris"><span>Tanggal</span><b>' + UI.tglHari(iu.tanggal) + '</b></div>' +
      '<div class="detail-baris total"><span>Total uang diterima</span><b>' + rp(totalIuran + iu.sumbangan) + '</b></div></div>' +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="ki-ya">' + ik('check', 22) + ' Ya, simpan</button>' +
      '<button class="tombol tombol-teks tombol-penuh" id="ki-ubah">Ubah lagi</button>';
    UI.bukaSheet('Periksa sekali lagi', h, { onKembali: formIuran });
    document.getElementById('ki-ubah').onclick = formIuran;
    document.getElementById('ki-ya').onclick = function () {
      const salin = JSON.parse(JSON.stringify(iu));
      simpanOptimis({
        aksi: 'simpanIuran',
        data: { id_asn: iu.id_asn, tanggal: iu.tanggal, keterangan: iu.ket, sumbangan: iu.sumbangan, alokasi: urut.map(function (p) { return { tahun: p.tahun, bulan: p.bulan, nominal: p.nominal }; }) },
        sementara: trxSementara({ tanggal: iu.tanggal, modul: 'KBS', jenis: 'MASUK', subjenis: 'IURAN', jumlah: totalIuran, keterangan: iu.ket, id_asn: iu.id_asn, asnNama: ang.nama }, 'Iuran bulanan'),
        tambahanSaldo: iu.sumbangan,
        ulang: function () { iu = salin; formIuran(); },
        selesai: function () { if (S.trx.status === 'siap') S.trx.status = 'basi'; }
      });
    };
  }

  // =========================================================
  // Sumbangan sukarela (baru atau ubah)
  // =========================================================
  EB.bukaSumbangan = function (kembali, lama) {
    if (!saldoAwal('KBS')) return mintaSaldoAwal('KBS');
    const s = lama ? { id: lama.id, id_asn: lama.idAsn, jumlah: lama.jumlah, tanggal: lama.tanggal, ket: lama.keterangan }
      : { id: '', id_asn: '', jumlah: 0, tanggal: EB.hariIni(), ket: '' };
    const ang = (S.boot.anggota || []).slice().sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    const h = '<label class="label" for="s-nama">Dari siapa?</label>' +
      '<select class="input" id="s-nama"><option value="">Tanpa nama / hamba Allah</option>' +
      ang.map(function (a) { return '<option value="' + esc(a.id_asn) + '"' + (s.id_asn === a.id_asn ? ' selected' : '') + '>' + esc(a.nama) + '</option>'; }).join('') + '</select>' +
      '<label class="label" for="s-jumlah">Jumlah sumbangan</label>' +
      '<div class="input-uang"><span>Rp</span><input id="s-jumlah" inputmode="numeric" placeholder="0" value="' + (s.jumlah ? UI.ribuan(s.jumlah) : '') + '"' + (lama ? '' : ' autofocus') + '></div>' +
      '<label class="label" for="s-tgl">Tanggal</label><input class="input" type="date" id="s-tgl" value="' + s.tanggal + '" max="' + EB.hariIni() + '" min="' + saldoAwal('KBS').tanggal + '">' +
      '<label class="label" for="s-ket">Keterangan <span class="muted">(boleh kosong)</span></label><textarea class="input" id="s-ket" rows="2" maxlength="300">' + esc(s.ket) + '</textarea>' +
      '<p class="pesan-galat" id="s-galat" role="alert"></p>' +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="s-simpan">' + ik('check', 22) + (lama ? ' Simpan perubahan' : ' Simpan sumbangan') + '</button>';
    UI.bukaSheet(lama ? 'Ubah sumbangan' : 'Sumbangan sukarela', h, { onKembali: kembali || null });
    UI.pasangInputUang(document.getElementById('s-jumlah'), function (n) { s.jumlah = n; });
    document.getElementById('s-simpan').onclick = async function () {
      s.id_asn = document.getElementById('s-nama').value;
      s.tanggal = document.getElementById('s-tgl').value;
      s.ket = document.getElementById('s-ket').value.trim();
      const gal = document.getElementById('s-galat');
      if (!s.jumlah) { gal.textContent = 'Isi jumlah sumbangan.'; return; }
      if (!s.tanggal || s.tanggal > EB.hariIni()) { gal.textContent = 'Tanggal tidak valid.'; return; }
      const nama = s.id_asn ? ang.find(function (a) { return a.id_asn === s.id_asn; }).nama : 'Tanpa nama';
      const ya = await UI.konfirmasi({ judul: 'Simpan sumbangan?', isi: '<p>Sumbangan <b class="teks-masuk">' + rp(s.jumlah) + '</b> dari <b>' + esc(nama) + '</b> ke Uang Kebersamaan, tanggal ' + UI.tglHari(s.tanggal) + '.</p>', ya: 'Ya, simpan' });
      if (!ya) return;
      const data = { id: s.id, id_asn: s.id_asn, jumlah: s.jumlah, tanggal: s.tanggal, keterangan: s.ket };
      simpanOptimis({
        aksi: lama ? 'simpanTransaksi' : 'simpanSumbangan', data: data,
        sementara: Object.assign(trxSementara({ tanggal: s.tanggal, modul: 'KBS', jenis: 'MASUK', subjenis: 'SUMBANGAN', jumlah: s.jumlah, keterangan: s.ket, id_asn: s.id_asn, asnNama: nama }, 'Sumbangan sukarela'), lama ? { id: lama.id } : {}),
        asli: lama,
        ulang: function () { EB.bukaSumbangan(kembali, lama ? Object.assign({}, lama, { idAsn: s.id_asn, jumlah: s.jumlah, tanggal: s.tanggal, keterangan: s.ket }) : null); }
      });
    };
  };

  // =========================================================
  // Terbilang sederhana (membantu cek nol yang kurang/lebih)
  // =========================================================
  function terbilang(n) {
    const sat = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    function t(x) {
      if (x < 12) return sat[x];
      if (x < 20) return t(x - 10) + ' belas';
      if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
      if (x < 200) return 'seratus' + (x - 100 ? ' ' + t(x - 100) : '');
      if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
      if (x < 2000) return 'seribu' + (x - 1000 ? ' ' + t(x - 1000) : '');
      if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta' + (x % 1e6 ? ' ' + t(x % 1e6) : '');
      return t(Math.floor(x / 1e9)) + ' miliar' + (x % 1e9 ? ' ' + t(x % 1e9) : '');
    }
    return t(n).replace(/\s+/g, ' ').trim();
  }
  EB.terbilang = terbilang;
})();
