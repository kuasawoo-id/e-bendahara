/* E-Bendahara — halaman Lainnya: Laporan, Riwayat, Pengguna, Kelola Iuran, Kategori, Saldo Awal, Visibilitas, Ganti PIN */
(function () {
  'use strict';

  const S = EB.S, ik = UI.ikon, esc = UI.esc, rp = UI.rp;
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  function el(id) { return document.getElementById(id); }
  async function kirim(tombol, label, fn) {
    const asli = tombol.innerHTML;
    tombol.disabled = true; tombol.textContent = label || 'Menyimpan…';
    try { return await fn(); }
    catch (e) { if (e.kode !== 'SESI') UI.toast(e.message, 'error'); return null; }
    finally { if (document.body.contains(tombol)) { tombol.disabled = false; tombol.innerHTML = asli; } }
  }

  // =========================================================
  // LAPORAN
  // =========================================================
  const lap = { modul: 'OPS', mode: 'bulan', bulan: '', dari: '', sampai: '', hasil: null };

  EB.renderLaporan = function () {
    const h = el('hal-laporan');
    if (!lap.bulan) lap.bulan = EB.hariIni().slice(0, 7);
    if (!lap.dari) { lap.dari = EB.hariIni().slice(0, 8) + '01'; lap.sampai = EB.hariIni(); }
    h.innerHTML = '<div class="kartu">' +
      '<label class="label">Kas</label><div class="pilihan-chip">' + ['OPS', 'BIMWIN', 'PNBP', 'KBS'].map(function (m) {
        return '<button class="chip chip-besar' + (lap.modul === m ? ' aktif' : '') + '" data-lm="' + m + '">' + UI.MODUL_PENDEK[m] + '</button>';
      }).join('') + '</div>' +
      '<label class="label">Periode</label><div class="segmen" id="lap-mode"><button data-v="bulan" class="' + (lap.mode === 'bulan' ? 'aktif' : '') + '">Per bulan</button><button data-v="rentang" class="' + (lap.mode === 'rentang' ? 'aktif' : '') + '">Rentang tanggal</button></div>' +
      (lap.mode === 'bulan'
        ? '<label class="label" for="lap-bulan">Bulan</label><input class="input" type="month" id="lap-bulan" value="' + lap.bulan + '" max="' + EB.hariIni().slice(0, 7) + '">'
        : '<div class="grid-2"><label class="label">Dari<input class="input" type="date" id="lap-dari" value="' + lap.dari + '"></label><label class="label">Sampai<input class="input" type="date" id="lap-sampai" value="' + lap.sampai + '"></label></div>') +
      '<button class="tombol tombol-garis tombol-penuh" id="lap-lihat">' + ik('eye', 20) + ' Lihat ringkasan</button>' +
      '<div class="aksi-ganda"><button class="tombol tombol-utama" id="lap-pdf">' + ik('download', 20) + ' PDF</button><button class="tombol tombol-utama" id="lap-xls">' + ik('download', 20) + ' Excel</button></div></div>' +
      '<div id="lap-hasil"></div>';
    h.querySelectorAll('[data-lm]').forEach(function (b) { b.onclick = function () { lap.modul = b.dataset.lm; lap.hasil = null; EB.renderLaporan(); }; });
    h.querySelectorAll('#lap-mode button').forEach(function (b) { b.onclick = function () { ambil(); lap.mode = b.dataset.v; lap.hasil = null; EB.renderLaporan(); }; });
    el('lap-lihat').onclick = function () { lihat(this); };
    el('lap-pdf').onclick = function () { pdf(this); };
    el('lap-xls').onclick = function () { excel(this); };
    if (lap.hasil) tampilRingkas(lap.hasil);
  };

  function ambil() {
    if (el('lap-bulan')) lap.bulan = el('lap-bulan').value;
    if (el('lap-dari')) { lap.dari = el('lap-dari').value; lap.sampai = el('lap-sampai').value; }
  }
  function periode() {
    ambil();
    if (lap.mode === 'bulan') {
      if (!lap.bulan) throw new Error('Pilih bulan.');
      const th = Number(lap.bulan.slice(0, 4)), bl = Number(lap.bulan.slice(5, 7));
      const akhir = new Date(Date.UTC(th, bl, 0)).getUTCDate();
      return { dari: lap.bulan + '-01', sampai: lap.bulan + '-' + String(akhir).padStart(2, '0') };
    }
    if (!lap.dari || !lap.sampai || lap.dari > lap.sampai) throw new Error('Periode tidak valid.');
    return { dari: lap.dari, sampai: lap.sampai };
  }
  async function ambilRekap(format) {
    let p;
    try { p = periode(); } catch (e) { UI.toast(e.message, 'error'); return null; }
    return API.panggil('rekap', { modul: lap.modul, dari: p.dari, sampai: p.sampai, format: format });
  }
  async function lihat(t) {
    const r = await kirim(t, 'Memuat…', function () { return ambilRekap('json'); });
    if (r) { lap.hasil = r.rekap; tampilRingkas(r.rekap); }
  }
  function tampilRingkas(r) {
    let h = '<div class="kartu"><h3>' + esc(r.modulNama) + '</h3><p class="muted">' + esc(r.judulPeriode) + '</p>' +
      (r.keterangan ? '<p class="catatan">' + esc(r.keterangan) + '</p>' : '') +
      '<div class="detail"><div class="detail-baris"><span>Saldo awal periode</span><b>' + rp(r.saldoAwalPeriode) + '</b></div>' +
      '<div class="detail-baris"><span>Total masuk</span><b class="teks-masuk">' + rp(r.totalMasuk) + '</b></div>' +
      '<div class="detail-baris"><span>Total keluar</span><b class="teks-keluar">' + rp(r.totalKeluar) + '</b></div>' +
      '<div class="detail-baris total"><span>Saldo akhir periode</span><b>' + rp(r.saldoAkhir) + '</b></div></div>' +
      '<p class="muted">' + r.baris.length + ' transaksi</p>';
    if (r.baris.length) {
      h += '<div class="tabel-gulir"><table class="tabel"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="angka">Masuk</th><th class="angka">Keluar</th><th class="angka">Saldo</th></tr></thead><tbody>' +
        r.baris.map(function (b) {
          return '<tr><td>' + UI.tgl(b.tanggal) + '</td><td>' + esc(b.kategori) + '</td><td>' + esc(b.keterangan) + '</td><td class="angka teks-masuk">' + (b.masuk ? rp(b.masuk) : '') +
            '</td><td class="angka teks-keluar">' + (b.keluar ? rp(b.keluar) : '') + '</td><td class="angka">' + rp(b.saldo) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    el('lap-hasil').innerHTML = h + '</div>';
  }
  async function pdf(t) {
    const r = await kirim(t, 'Membuat PDF…', function () { return ambilRekap('pdf'); });
    if (!r) return;
    const bin = atob(r.base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    UI.unduhBlob(new Blob([arr], { type: 'application/pdf' }), r.namaBerkas);
    UI.toast('PDF diunduh: ' + r.namaBerkas, 'ok');
  }
  async function excel(t) {
    const r = await kirim(t, 'Membuat Excel…', async function () {
      const res = await ambilRekap('json');
      if (!res) return null;
      await UI.muatSkrip(XLSX_URL);
      return res;
    });
    if (!r) return;
    const x = r.rekap;
    const aoa = [
      ['Rekap ' + x.modulNama], ['Periode: ' + x.judulPeriode]
    ];
    if (x.keterangan) aoa.push(['Keterangan: ' + x.keterangan]);
    aoa.push([], ['Saldo awal periode', x.saldoAwalPeriode], ['Total masuk', x.totalMasuk], ['Total keluar', x.totalKeluar], ['Saldo akhir periode', x.saldoAkhir], [],
      ['No', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo', 'Dicatat oleh']);
    x.baris.forEach(function (b, i) { aoa.push([i + 1, b.tanggal, b.jenis, b.kategori, b.keterangan, b.masuk || null, b.keluar || null, b.saldo, b.dicatatOleh]); });
    aoa.push(['', '', '', '', 'Jumlah', x.totalMasuk, x.totalKeluar, x.saldoAkhir]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    formatRupiah(ws);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
    if (x.iuran) {
      const lbl = { LUNAS: 'Lunas', KURANG: 'Kurang', BELUM: 'Belum', NANTI: '-', NA: '' };
      const iu = [['Nama'].concat(x.iuran.bulan.map(function (b) { return b.label; }))];
      x.iuran.anggota.forEach(function (a) {
        iu.push([a.nama].concat(a.sel.map(function (s) { return lbl[s.status] + (s.status === 'KURANG' ? ' (sisa ' + s.kurang + ')' : ''); })));
      });
      const ws2 = XLSX.utils.aoa_to_sheet(iu);
      ws2['!cols'] = [{ wch: 22 }].concat(x.iuran.bulan.map(function () { return { wch: 11 }; }));
      XLSX.utils.book_append_sheet(wb, ws2, 'Status Iuran');
    }
    XLSX.writeFile(wb, x.namaBerkas + '.xlsx');
    UI.toast('Excel diunduh: ' + x.namaBerkas + '.xlsx', 'ok');
  }
  function formatRupiah(ws) {
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!') return;
      const c = ws[k];
      if (c.t === 'n' && /^[B-H]/.test(k) && !/^A/.test(k)) c.z = '#,##0';
    });
  }

  // =========================================================
  // RIWAYAT (Admin)
  // =========================================================
  const rw = { filter: { aksi: '', id_user: '', modul: '', dari: '', sampai: '' }, data: null };
  const LABEL_AKSI = {
    TAMBAH: 'Tambah', UBAH: 'Ubah', HAPUS: 'Hapus', LOGIN_GAGAL: 'Salah PIN', AKUN_TERKUNCI: 'Akun terkunci',
    UBAH_SALDO_AWAL: 'Ubah saldo awal', UBAH_PENGATURAN: 'Ubah pengaturan', UBAH_TARIF: 'Ubah tarif iuran', KELOLA_AKUN: 'Kelola akun'
  };
  const LABEL_KOLOM = {
    tanggal: 'Tanggal', modul: 'Kas', jenis: 'Jenis', subjenis: 'Subjenis', id_kategori: 'Kategori', id_asn: 'Nama ASN', jumlah: 'Jumlah',
    keterangan: 'Keterangan', dicatat_oleh: 'Dicatat oleh', dicatat_pada: 'Dicatat pada', status: 'Status', diubah_oleh: 'Diubah oleh',
    diubah_pada: 'Diubah pada', nominal: 'Nominal', nama: 'Nama', aktif: 'Aktif', berlaku_mulai: 'Berlaku mulai', mulai: 'Mulai iuran',
    berhenti: 'Berhenti iuran', alokasi: 'Bulan dibayar', alasan: 'Alasan', alasan_hapus: 'Alasan hapus', peran: 'Peran', terkunci: 'Terkunci',
    perubahan: 'Perubahan', percobaan_ke: 'Percobaan ke', kunci_sampai: 'Terkunci sampai'
  };

  EB.renderRiwayat = async function () {
    const h = el('hal-riwayat');
    const f = rw.filter;
    h.innerHTML = '<details class="filter-lanjut"' + (f.aksi || f.id_user || f.modul || f.dari ? ' open' : '') + '><summary>' + ik('filter', 18) + ' Saring riwayat</summary><div class="grid-2">' +
      '<label class="label">Aksi<select class="input" id="rw-aksi"><option value="">Semua</option>' + Object.keys(LABEL_AKSI).map(function (k) { return '<option value="' + k + '"' + (f.aksi === k ? ' selected' : '') + '>' + LABEL_AKSI[k] + '</option>'; }).join('') + '</select></label>' +
      '<label class="label">Pelaku<select class="input" id="rw-user"><option value="">Semua</option></select></label>' +
      '<label class="label">Kas<select class="input" id="rw-modul"><option value="">Semua</option>' + ['OPS', 'BIMWIN', 'PNBP', 'KBS'].map(function (m) { return '<option value="' + m + '"' + (f.modul === m ? ' selected' : '') + '>' + UI.MODUL_PENDEK[m] + '</option>'; }).join('') + '</select></label>' +
      '<span></span><label class="label">Dari<input class="input" type="date" id="rw-dari" value="' + f.dari + '"></label><label class="label">Sampai<input class="input" type="date" id="rw-sampai" value="' + f.sampai + '"></label>' +
      '</div><button class="tombol tombol-utama tombol-penuh" id="rw-terap">Terapkan</button></details><div id="rw-daftar"><div class="kerangka"></div><div class="kerangka"></div></div>';
    el('rw-terap').onclick = function () {
      rw.filter = { aksi: el('rw-aksi').value, id_user: el('rw-user').value, modul: el('rw-modul').value, dari: el('rw-dari').value, sampai: el('rw-sampai').value };
      EB.renderRiwayat();
    };
    try {
      const r = await API.panggil('riwayat', Object.assign({ tandaiDibaca: true }, rw.filter));
      rw.data = r;
      if (S.boot.badgeRiwayat) { S.boot.badgeRiwayat = 0; EB.simpanBoot(); EB.renderNav(); }
      if (S.hal !== 'riwayat') return;
      el('rw-user').innerHTML = '<option value="">Semua</option>' + Object.keys(r.namaUser).map(function (id) {
        return '<option value="' + esc(id) + '"' + (f.id_user === id ? ' selected' : '') + '>' + esc(r.namaUser[id]) + '</option>';
      }).join('');
      tampilRiwayat(r);
    } catch (e) {
      if (e.kode !== 'SESI') el('rw-daftar').innerHTML = '<div class="kartu kartu-galat">' + ik('alert') + '<p>' + esc(e.message) + '</p></div>';
    }
  };

  function ringkasRiwayat(x, r) {
    const d = x.sesudah || x.sebelum || {};
    if (x.entitas === 'Transaksi') {
      const kat = d.subjenis === 'IURAN' ? 'Iuran' : d.subjenis === 'SUMBANGAN' ? 'Sumbangan' : (r.namaKategori[d.id_kategori] || '');
      return (d.jenis === 'MASUK' ? 'Masuk ' : 'Keluar ') + rp(d.jumlah) + ' · ' + kat + (d.id_asn ? ' · ' + (r.namaUser[d.id_asn] || '') : '') + ' · ' + UI.tgl(d.tanggal);
    }
    if (x.entitas === 'Saldo awal') return UI.MODUL_PENDEK[x.id] + ' · ' + rp(d.nominal) + ' per ' + UI.tgl(d.tanggal);
    if (x.entitas === 'Kategori') return d.nama || '';
    if (x.entitas === 'Tarif') return rp(d.nominal) + ' mulai ' + x.id;
    if (x.entitas === 'Anggota') return (d.nama || '') + ' · iuran ' + (d.mulai || '') + (d.berhenti ? ' s.d. ' + d.berhenti : '');
    if (x.entitas === 'Pengguna') return (d.perubahan ? d.perubahan + ' · ' : '') + (d.nama || r.namaUser[x.id] || '');
    if (x.entitas === 'Pengaturan') return 'Tampilan untuk ASN';
    return x.id;
  }

  function tampilRiwayat(r) {
    const w = el('rw-daftar');
    if (!r.riwayat.length) { w.innerHTML = '<div class="kartu kartu-kosong">' + ik('clock') + '<p>Tidak ada riwayat.</p></div>'; return; }
    w.innerHTML = '<p class="muted">' + r.total + ' catatan' + (r.total > r.riwayat.length ? ', ditampilkan ' + r.riwayat.length + ' terbaru' : '') + '</p>' +
      r.riwayat.map(function (x, i) {
        return '<button class="rw-item rw-' + x.aksi + '" data-rw="' + i + '"><span class="rw-aksi">' + (LABEL_AKSI[x.aksi] || x.aksi) + (x.baru ? ' <i class="lencana">baru</i>' : '') + '</span>' +
          '<span class="rw-isi"><b>' + esc(ringkasRiwayat(x, r)) + '</b><small>' + esc(x.nama) + ' · ' + UI.waktu(x.waktu) + (x.modul ? ' · ' + UI.MODUL_PENDEK[x.modul] : '') + '</small></span>' + ik('next', 18) + '</button>';
      }).join('');
    w.querySelectorAll('[data-rw]').forEach(function (b) { b.onclick = function () { detailRiwayat(r.riwayat[Number(b.dataset.rw)], r); }; });
  }

  function nilaiTampil(k, v, r) {
    if (v === null || v === undefined || v === '') return '<span class="muted">–</span>';
    if (k === 'id_kategori') return esc(r.namaKategori[v] || v);
    if (k === 'id_asn' || k === 'dicatat_oleh' || k === 'diubah_oleh' || k === 'diisi_oleh') return esc(r.namaUser[v] || v);
    if (k === 'jumlah' || k === 'nominal') return rp(v);
    if (k === 'modul') return esc(UI.MODUL_PENDEK[v] || v);
    if (k === 'tanggal') return UI.tgl(v);
    if (/_pada$|^kunci_sampai$/.test(k)) return UI.waktu(v);
    if (k === 'alokasi') return v.map(function (a) { return UI.BLN[a.bulan - 1] + ' ' + a.tahun + ': ' + rp(a.nominal); }).join('<br>');
    if (typeof v === 'object') return esc(JSON.stringify(v));
    return esc(String(v));
  }

  function detailRiwayat(x, r) {
    const a = x.sebelum || {}, b = x.sesudah || {};
    const kunci = Object.keys(Object.assign({}, a, b)).filter(function (k) { return k !== 'id_trx' && k !== 'hash' && k !== 'salt'; });
    let h = '<div class="rw-kepala rw-' + x.aksi + '"><b>' + (LABEL_AKSI[x.aksi] || x.aksi) + ' · ' + esc(x.entitas) + '</b><span>' + esc(x.nama) + ' · ' + UI.waktu(x.waktu) + '</span></div>';
    if (x.aksi === 'HAPUS' && x.entitas === 'Transaksi') {
      h += '<p class="catatan">Transaksi ini sudah dihapus dan tidak lagi dihitung dalam saldo, tetapi catatannya tetap disimpan.</p>';
    }
    h += '<div class="tabel-gulir"><table class="tabel tabel-diff"><thead><tr><th>Data</th>' + (x.sebelum ? '<th>Sebelum</th>' : '') + (x.sesudah ? '<th>Sesudah</th>' : '') + '</tr></thead><tbody>' +
      kunci.map(function (k) {
        const beda = x.sebelum && x.sesudah && JSON.stringify(a[k]) !== JSON.stringify(b[k]);
        return '<tr class="' + (beda ? 'beda' : '') + '"><th>' + esc(LABEL_KOLOM[k] || k) + '</th>' + (x.sebelum ? '<td>' + nilaiTampil(k, a[k], r) + '</td>' : '') + (x.sesudah ? '<td>' + nilaiTampil(k, b[k], r) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    UI.bukaSheet('Rincian riwayat', h);
  }

  // =========================================================
  // PENGGUNA (Admin)
  // =========================================================
  let daftarPengguna = null;

  EB.renderPengguna = async function () {
    const h = el('hal-pengguna');
    h.innerHTML = '<button class="tombol tombol-utama tombol-penuh" id="pg-tambah">' + ik('plus', 20) + ' Tambah pengguna</button><div id="pg-daftar"><div class="kerangka"></div><div class="kerangka"></div></div>';
    el('pg-tambah').onclick = function () { formPengguna(null); };
    try {
      const r = await API.panggil('daftarPengguna', {});
      daftarPengguna = r.pengguna;
      tampilPengguna();
    } catch (e) { if (e.kode !== 'SESI') UI.toast(e.message, 'error'); }
  };

  function tampilPengguna() {
    if (S.hal !== 'pengguna') return;
    const urut = { ADMIN: 0, BENDAHARA: 1, ASN: 2 };
    const list = daftarPengguna.slice().sort(function (a, b) { return (a.aktif === b.aktif ? 0 : a.aktif ? -1 : 1) || urut[a.peran] - urut[b.peran] || a.nama.localeCompare(b.nama); });
    el('pg-daftar').innerHTML = list.map(function (u) {
      const tanda = [];
      if (!u.aktif) tanda.push('<i class="tanda tanda-abu">Nonaktif</i>');
      if (u.terkunci) tanda.push('<i class="tanda tanda-merah">Terkunci</i>');
      if (u.harusGantiPin && u.aktif) tanda.push('<i class="tanda tanda-kuning">Belum ganti PIN</i>');
      return '<button class="menu-item' + (u.aktif ? '' : ' redup') + '" data-pg="' + esc(u.id) + '"><span class="avatar">' + esc(EB.inisial(u.nama)) + '</span>' +
        '<span class="menu-teks"><b>' + esc(u.nama) + '</b><small>' + EB.labelPeran(u.peran) + ' · ' + (u.iuran ? 'iuran sejak ' + bulanTampil(u.iuran.mulai) + (u.iuran.berhenti ? ' s.d. ' + bulanTampil(u.iuran.berhenti) : '') : 'tidak ikut iuran') + '</small>' + tanda.join('') + '</span>' + ik('next', 20) + '</button>';
    }).join('');
    el('pg-daftar').querySelectorAll('[data-pg]').forEach(function (b) {
      b.onclick = function () { formPengguna(daftarPengguna.find(function (u) { return u.id === b.dataset.pg; })); };
    });
  }

  function bulanTampil(ym) { return ym ? UI.BLN[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4) : ''; }
  function pinAcak() { let p; do { p = String(Math.floor(100000 + Math.random() * 900000)); } while (/^(\d)\1{5}$/.test(p)); return p; }

  function formPengguna(u) {
    const baru = !u;
    const saya = u && u.id === S.sesi.user.id;
    const pinAwal = pinAcak();
    let h = '<label class="label" for="pg-nama">Nama</label><input class="input" id="pg-nama" maxlength="40" value="' + esc(u ? u.nama : '') + '"' + (baru ? ' autofocus' : '') + '>' +
      '<label class="label">Peran</label><div class="segmen" id="pg-peran">' + [['ASN', 'ASN'], ['BENDAHARA', 'Bendahara'], ['ADMIN', 'Kepala KUA']].map(function (p) {
        return '<button data-v="' + p[0] + '" class="' + ((u ? u.peran : 'ASN') === p[0] ? 'aktif' : '') + '"' + (saya && p[0] !== 'ADMIN' ? ' disabled' : '') + '>' + p[1] + '</button>';
      }).join('') + '</div>';
    if (baru) {
      h += '<label class="label" for="pg-pin">PIN awal (6 angka)</label><input class="input input-pin" id="pg-pin" inputmode="numeric" maxlength="6" value="' + pinAwal + '">' +
        '<p class="bantuan">Berikan PIN ini ke yang bersangkutan. Ia wajib menggantinya saat masuk pertama kali.</p>' +
        '<label class="cek"><input type="checkbox" id="pg-iuran" checked> Ikut iuran kebersamaan</label>' +
        '<label class="label" for="pg-mulai">Mulai iuran bulan</label><input class="input" type="month" id="pg-mulai" value="' + EB.hariIni().slice(0, 4) + '-01">';
    }
    h += '<button class="tombol tombol-utama tombol-penuh" id="pg-simpan">' + ik('check', 20) + (baru ? ' Buat pengguna' : ' Simpan nama & peran') + '</button>';
    if (!baru) {
      h += '<hr class="pemisah"><h3 class="judul-kecil">Masa iuran kebersamaan</h3>' +
        '<div class="grid-2"><label class="label">Mulai<input class="input" type="month" id="pg-ang-mulai" value="' + (u.iuran ? u.iuran.mulai : EB.hariIni().slice(0, 7)) + '"></label>' +
        '<label class="label">Berhenti <span class="muted">(kosong = masih)</span><input class="input" type="month" id="pg-ang-henti" value="' + (u.iuran && u.iuran.berhenti ? u.iuran.berhenti : '') + '"></label></div>' +
        '<p class="bantuan">Isi "Berhenti" bila ASN pindah tugas. Bulan sesudahnya tidak dihitung sebagai tunggakan.</p>' +
        '<div class="aksi-ganda"><button class="tombol tombol-garis" id="pg-ang-simpan">' + (u.iuran ? 'Simpan masa iuran' : 'Ikutkan iuran') + '</button>' +
        (u.iuran ? '<button class="tombol tombol-bahaya-garis" id="pg-ang-hapus">Keluarkan dari iuran</button>' : '') + '</div>' +
        '<hr class="pemisah"><h3 class="judul-kecil">Keamanan akun</h3>' +
        '<label class="label" for="pg-pin-baru">PIN baru</label><div class="baris-input"><input class="input input-pin" id="pg-pin-baru" inputmode="numeric" maxlength="6" value="' + pinAcak() + '">' +
        '<button class="tombol tombol-garis" id="pg-reset">Reset PIN</button></div>' +
        '<p class="bantuan">Reset PIN mengeluarkan orang tersebut dari semua HP-nya.</p>' +
        (u.terkunci ? '<button class="tombol tombol-garis tombol-penuh" id="pg-buka">' + ik('lock', 20) + ' Buka kunci akun</button>' : '') +
        (saya ? '' : '<button class="tombol ' + (u.aktif ? 'tombol-bahaya-garis' : 'tombol-garis') + ' tombol-penuh" id="pg-aktif">' + (u.aktif ? 'Nonaktifkan akun' : 'Aktifkan kembali') + '</button>');
    }
    UI.bukaSheet(baru ? 'Pengguna baru' : u.nama, h);
    let peran = u ? u.peran : 'ASN';
    document.querySelectorAll('#pg-peran button').forEach(function (b) {
      b.onclick = function () { peran = b.dataset.v; document.querySelectorAll('#pg-peran button').forEach(function (x) { x.classList.toggle('aktif', x === b); }); };
    });
    const iuranCek = el('pg-iuran');
    if (iuranCek) iuranCek.onchange = function () { el('pg-mulai').disabled = !iuranCek.checked; };
    const selesai = function (r) {
      if (!r) return;
      UI.toast(r.message, 'ok');
      if (r.pengguna) daftarPengguna = r.pengguna;
      if (r.anggota) S.boot.anggota = r.anggota;
      UI.tutupSheet(); tampilPengguna();
      EB.segarkan({ diam: true });
    };
    el('pg-simpan').onclick = function () {
      const data = { id: u ? u.id : '', nama: el('pg-nama').value.trim(), peran: peran };
      if (baru) { data.pin = el('pg-pin').value; data.wajibIuran = el('pg-iuran').checked; data.mulai = el('pg-mulai').value; }
      if (!data.nama) return UI.toast('Isi nama.', 'error');
      kirim(this, null, function () { return API.panggil('simpanPengguna', data); }).then(function (r) {
        if (r && baru) UI.info('Pengguna dibuat', '<p><b>' + esc(data.nama) + '</b> bisa masuk dengan PIN awal:</p><p class="pin-tampil">' + esc(data.pin) + '</p><p class="muted">Catat dan berikan langsung ke yang bersangkutan.</p>');
        selesai(r);
      });
    };
    if (baru) return;
    el('pg-ang-simpan').onclick = function () {
      const d = { id_asn: u.id, mulai: el('pg-ang-mulai').value, berhenti: el('pg-ang-henti').value };
      kirim(this, null, function () { return API.panggil('simpanAnggota', d); }).then(selesai);
    };
    const ah = el('pg-ang-hapus');
    if (ah) ah.onclick = async function () {
      if (!(await UI.konfirmasi({ judul: 'Keluarkan dari iuran?', isi: '<p>' + esc(u.nama) + ' tidak akan muncul lagi di tabel iuran. Hanya bisa bila belum pernah membayar; bila sudah, isi bulan berhenti saja.</p>', ya: 'Keluarkan', bahaya: true }))) return;
      kirim(ah, null, function () { return API.panggil('hapusAnggota', { id_asn: u.id }); }).then(selesai);
    };
    el('pg-reset').onclick = async function () {
      const pin = el('pg-pin-baru').value;
      if (!/^\d{6}$/.test(pin)) return UI.toast('PIN harus 6 angka.', 'error');
      if (!(await UI.konfirmasi({ judul: 'Reset PIN ' + u.nama + '?', isi: '<p>PIN baru: <b class="pin-tampil">' + esc(pin) + '</b></p><p class="muted">Ia akan keluar dari semua HP dan wajib membuat PIN sendiri saat masuk.</p>', ya: 'Reset PIN' }))) return;
      kirim(el('pg-reset'), 'Mereset…', function () { return API.panggil('resetPin', { id: u.id, pin: pin }); }).then(selesai);
    };
    const bk = el('pg-buka');
    if (bk) bk.onclick = function () { kirim(bk, null, function () { return API.panggil('aturStatusPengguna', { id: u.id, aksi: 'bukaKunci' }); }).then(selesai); };
    const ak = el('pg-aktif');
    if (ak) ak.onclick = async function () {
      if (u.aktif && !(await UI.konfirmasi({ judul: 'Nonaktifkan ' + u.nama + '?', isi: '<p>Ia tidak bisa masuk lagi. Semua catatannya tetap tersimpan.</p>', ya: 'Nonaktifkan', bahaya: true }))) return;
      kirim(ak, null, function () { return API.panggil('aturStatusPengguna', { id: u.id, aksi: 'aktif', aktif: !u.aktif }); }).then(selesai);
    };
  }

  // =========================================================
  // KELOLA IURAN (Admin): nominal per bulan
  // =========================================================
  EB.renderKelolaIuran = function () {
    const h = el('hal-kelola-iuran');
    const tarif = (S.boot.tarif || []).slice().reverse();
    h.innerHTML = '<div class="kartu"><h3>Nominal iuran per bulan</h3>' +
      '<p class="muted">Nominal baru hanya berlaku mulai bulan yang dipilih. Bulan sebelumnya tetap memakai nominal lama.</p>' +
      '<div class="detail">' + (tarif.length ? tarif.map(function (t, i) {
        return '<div class="detail-baris"><span>Mulai ' + bulanTampil(t.berlaku_mulai) + (i === 0 ? ' <i class="tanda tanda-hijau">berlaku</i>' : '') + '</span><b>' + rp(t.nominal) + '</b></div>';
      }).join('') : '<p class="muted">Belum ada.</p>') + '</div>' +
      '<h3 class="judul-kecil">Ubah nominal</h3><div class="grid-2"><label class="label">Mulai bulan<input class="input" type="month" id="tf-bulan" value="' + EB.hariIni().slice(0, 7) + '"></label>' +
      '<label class="label">Nominal<div class="input-uang"><span>Rp</span><input id="tf-nominal" inputmode="numeric" value="' + (tarif[0] ? UI.ribuan(tarif[0].nominal) : '50.000') + '"></div></label></div>' +
      '<button class="tombol tombol-utama tombol-penuh" id="tf-simpan">' + ik('check', 20) + ' Simpan nominal</button></div>' +
      '<div class="kartu"><h3>Masa iuran per orang</h3><p class="muted">Diatur di menu <b>Pengguna</b>: ketuk nama, lalu isi bulan mulai dan berhenti.</p>' +
      '<button class="tombol tombol-garis tombol-penuh" onclick="EB.pergi(\'pengguna\')">' + ik('user', 20) + ' Buka Pengguna</button></div>';
    UI.pasangInputUang(el('tf-nominal'));
    el('tf-simpan').onclick = async function () {
      const d = { berlaku_mulai: el('tf-bulan').value, nominal: UI.angka(el('tf-nominal').value) };
      if (!d.berlaku_mulai || !d.nominal) return UI.toast('Isi bulan dan nominal.', 'error');
      if (!(await UI.konfirmasi({ judul: 'Ubah nominal iuran?', isi: '<p>Iuran menjadi <b>' + rp(d.nominal) + '</b> mulai <b>' + bulanTampil(d.berlaku_mulai) + '</b>. Status lunas bulan-bulan sesudahnya akan dihitung ulang.</p>', ya: 'Simpan' }))) return;
      const r = await kirim(this, null, function () { return API.panggil('simpanTarif', d); });
      if (r) { S.boot.tarif = r.tarif; UI.toast(r.message, 'ok'); EB.renderKelolaIuran(); EB.segarkan({ diam: true }); }
    };
  };

  // =========================================================
  // KATEGORI
  // =========================================================
  EB.renderKategori = function () {
    const h = el('hal-kategori');
    const kat = S.boot.kategori || [];
    const grup = function (jenis) {
      const list = kat.filter(function (k) { return k.jenis === jenis; }).sort(function (a, b) { return (a.modul === 'SEMUA' ? -1 : 0) - (b.modul === 'SEMUA' ? -1 : 0) || a.nama.localeCompare(b.nama); });
      return '<h2 class="judul-bagian">' + (jenis === 'MASUK' ? 'Uang masuk' : 'Uang keluar') + '</h2><div class="kartu daftar-kat">' + list.map(function (k) {
        return '<div class="kat-baris' + (k.aktif ? '' : ' redup') + '"><span><b>' + esc(k.nama) + '</b><small>' + (k.modul === 'SEMUA' ? 'Semua kas' : UI.MODUL_PENDEK[k.modul]) + (k.aktif ? '' : ' · nonaktif') + '</small></span>' +
          '<button class="ikon-tombol" data-kat-ubah="' + k.id + '" aria-label="Ubah ' + esc(k.nama) + '">' + ik('edit', 20) + '</button>' +
          (k.dipakai
            ? '<button class="tombol tombol-kecil ' + (k.aktif ? 'tombol-garis' : 'tombol-utama') + '" data-kat-aktif="' + k.id + '">' + (k.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>'
            : '<button class="ikon-tombol bahaya" data-kat-hapus="' + k.id + '" aria-label="Hapus ' + esc(k.nama) + '">' + ik('trash', 20) + '</button>') + '</div>';
      }).join('') + '</div>';
    };
    h.innerHTML = '<button class="tombol tombol-utama tombol-penuh" id="kat-tambah">' + ik('plus', 20) + ' Tambah kategori</button>' +
      '<p class="catatan">Kategori yang sudah dipakai tidak bisa dihapus agar laporan lama tetap benar; nonaktifkan saja.</p>' + grup('KELUAR') + grup('MASUK');
    el('kat-tambah').onclick = function () { formKategori(null); };
    h.querySelectorAll('[data-kat-ubah]').forEach(function (b) { b.onclick = function () { formKategori(kat.find(function (k) { return k.id === b.dataset.katUbah; })); }; });
    h.querySelectorAll('[data-kat-aktif]').forEach(function (b) {
      b.onclick = function () { const k = kat.find(function (x) { return x.id === b.dataset.katAktif; }); simpanKat(b, { aksi: 'aktif', id: k.id, aktif: !k.aktif }); };
    });
    h.querySelectorAll('[data-kat-hapus]').forEach(function (b) {
      b.onclick = async function () {
        const k = kat.find(function (x) { return x.id === b.dataset.katHapus; });
        if (await UI.konfirmasi({ judul: 'Hapus kategori "' + k.nama + '"?', ya: 'Hapus', bahaya: true })) simpanKat(b, { aksi: 'hapus', id: k.id });
      };
    });
  };

  async function simpanKat(tombol, d) {
    const r = await kirim(tombol, '…', function () { return API.panggil('simpanKategori', d); });
    if (r) { S.boot.kategori = r.kategori; EB.simpanBoot(); UI.toast(r.message, 'ok'); UI.tutupSheet(); EB.renderKategori(); }
  }

  function formKategori(k) {
    const dipakai = k && k.dipakai;
    const h = '<label class="label" for="kf-nama">Nama kategori</label><input class="input" id="kf-nama" maxlength="40" value="' + esc(k ? k.nama : '') + '" autofocus>' +
      '<label class="label">Jenis</label><div class="segmen" id="kf-jenis">' + [['KELUAR', 'Uang keluar'], ['MASUK', 'Uang masuk']].map(function (j) {
        return '<button data-v="' + j[0] + '" class="' + ((k ? k.jenis : 'KELUAR') === j[0] ? 'aktif' : '') + '"' + (dipakai ? ' disabled' : '') + '>' + j[1] + '</button>';
      }).join('') + '</div>' +
      '<label class="label" for="kf-modul">Untuk kas</label><select class="input" id="kf-modul"' + (dipakai ? ' disabled' : '') + '>' +
      [['SEMUA', 'Semua kas']].concat(['OPS', 'BIMWIN', 'PNBP', 'KBS'].map(function (m) { return [m, EB.namaModul(m)]; })).map(function (m) {
        return '<option value="' + m[0] + '"' + ((k ? k.modul : 'SEMUA') === m[0] ? ' selected' : '') + '>' + esc(m[1]) + '</option>';
      }).join('') + '</select>' +
      (dipakai ? '<p class="bantuan">Kategori sudah dipakai: hanya nama yang bisa diubah.</p>' : '') +
      '<button class="tombol tombol-utama tombol-penuh" id="kf-simpan">' + ik('check', 20) + ' Simpan</button>';
    UI.bukaSheet(k ? 'Ubah kategori' : 'Kategori baru', h);
    let jenis = k ? k.jenis : 'KELUAR';
    document.querySelectorAll('#kf-jenis button').forEach(function (b) {
      b.onclick = function () { jenis = b.dataset.v; document.querySelectorAll('#kf-jenis button').forEach(function (x) { x.classList.toggle('aktif', x === b); }); };
    });
    el('kf-simpan').onclick = function () {
      simpanKat(this, { aksi: k ? 'ubah' : 'tambah', id: k ? k.id : '', nama: el('kf-nama').value.trim(), jenis: jenis, modul: el('kf-modul').value });
    };
  }

  // =========================================================
  // SALDO AWAL
  // =========================================================
  EB.renderSaldoAwal = function () {
    const h = el('hal-saldo-awal');
    const sa = S.boot.saldoAwal || [];
    h.innerHTML = '<p class="catatan">Saldo awal = jumlah uang yang <b>sudah ada di tangan</b> saat mulai memakai aplikasi. Hitung uangnya dulu, lalu isi. Setelah disimpan, angka ini terkunci; hanya Kepala KUA yang bisa mengubahnya dengan alasan.</p>' +
      ['OPS', 'BIMWIN', 'PNBP', 'KBS'].map(function (m) {
        const x = sa.find(function (s) { return s.modul === m; });
        let isi = '<div class="kartu kartu-sa"><div class="km-kepala"><span class="km-ikon modul-' + m + '">' + ik(UI.MODUL_IKON[m], 22) + '</span><span class="km-nama">' + esc(EB.namaModul(m)) + '</span>' + (x ? ik('lock', 18) : '') + '</div>';
        if (x) {
          isi += '<div class="detail"><div class="detail-baris"><span>Per tanggal</span><b>' + UI.tglHari(x.tanggal) + '</b></div><div class="detail-baris"><span>Saldo awal</span><b>' + rp(x.nominal) + '</b></div></div>';
          if (EB.admin()) isi += '<button class="tombol tombol-garis tombol-penuh" data-sa-ubah="' + m + '">' + ik('edit', 20) + ' Ubah (Kepala KUA)</button>';
        } else {
          isi += '<div class="grid-2"><label class="label">Per tanggal<input class="input" type="date" id="sa-tgl-' + m + '" value="' + EB.hariIni() + '" max="' + EB.hariIni() + '"></label>' +
            '<label class="label">Jumlah uang<div class="input-uang"><span>Rp</span><input id="sa-nom-' + m + '" inputmode="numeric" placeholder="0"></div></label></div>' +
            '<button class="tombol tombol-utama tombol-penuh" data-sa-simpan="' + m + '">' + ik('check', 20) + ' Simpan & kunci</button>';
        }
        return isi + '</div>';
      }).join('');
    h.querySelectorAll('[id^="sa-nom-"]').forEach(function (i) { UI.pasangInputUang(i); });
    h.querySelectorAll('[data-sa-simpan]').forEach(function (b) {
      b.onclick = async function () {
        const m = b.dataset.saSimpan;
        const d = { modul: m, tanggal: el('sa-tgl-' + m).value, nominal: UI.angka(el('sa-nom-' + m).value) };
        if (!d.tanggal) return UI.toast('Isi tanggal.', 'error');
        if (!(await UI.konfirmasi({ judul: 'Simpan saldo awal?', isi: '<p><b>' + esc(EB.namaModul(m)) + '</b>: ' + rp(d.nominal) + ' per ' + UI.tglHari(d.tanggal) + '.</p><p class="muted">Setelah disimpan, angka ini terkunci. Transaksi sebelum tanggal ini tidak bisa dicatat.</p>', ya: 'Simpan & kunci' }))) return;
        simpanSa(b, d);
      };
    });
    h.querySelectorAll('[data-sa-ubah]').forEach(function (b) { b.onclick = function () { formUbahSa(sa.find(function (s) { return s.modul === b.dataset.saUbah; })); }; });
  };

  async function simpanSa(tombol, d) {
    const r = await kirim(tombol, null, function () { return API.panggil('setSaldoAwal', d); });
    if (r) { S.boot.saldoAwal = r.saldoAwal; UI.toast(r.message, 'ok'); UI.tutupSheet(); EB.renderSaldoAwal(); EB.segarkan({ diam: true }); }
  }

  function formUbahSa(x) {
    const h = '<p class="catatan">Mengubah saldo awal mengubah semua saldo sesudahnya. Perubahan ini tercatat di Riwayat beserta alasannya.</p>' +
      '<label class="label" for="usa-tgl">Per tanggal</label><input class="input" type="date" id="usa-tgl" value="' + x.tanggal + '" max="' + EB.hariIni() + '">' +
      '<label class="label" for="usa-nom">Jumlah uang</label><div class="input-uang"><span>Rp</span><input id="usa-nom" inputmode="numeric" value="' + UI.ribuan(x.nominal) + '"></div>' +
      '<label class="label" for="usa-alasan">Alasan perubahan <span class="teks-keluar">*</span></label><textarea class="input" id="usa-alasan" rows="2" maxlength="300" placeholder="Misal: salah hitung uang awal"></textarea>' +
      '<button class="tombol tombol-utama tombol-penuh" id="usa-simpan">' + ik('check', 20) + ' Simpan perubahan</button>';
    UI.bukaSheet('Ubah saldo awal · ' + UI.MODUL_PENDEK[x.modul], h);
    UI.pasangInputUang(el('usa-nom'));
    el('usa-simpan').onclick = function () {
      const d = { modul: x.modul, tanggal: el('usa-tgl').value, nominal: UI.angka(el('usa-nom').value), alasan: el('usa-alasan').value.trim() };
      if (!d.alasan) return UI.toast('Alasan wajib diisi.', 'error');
      simpanSa(this, d);
    };
  }

  // =========================================================
  // VISIBILITAS (Admin)
  // =========================================================
  EB.renderVisibilitas = function () {
    const h = el('hal-visibilitas');
    const v = JSON.parse(JSON.stringify(S.boot.vis || {}));
    const INFO = [['saldo', 'Saldo akhir'], ['total', 'Masuk & keluar bulan ini'], ['grafik', 'Grafik'], ['rincian', 'Daftar transaksi']];
    h.innerHTML = '<div class="kartu kartu-info">' + ik('eye') + '<p><b>Tabel status iuran selalu terlihat oleh semua ASN.</b> Pengaturan di bawah hanya untuk saldo dan rincian kas. Berlaku sama untuk semua ASN.</p></div>' +
      ['OPS', 'BIMWIN', 'PNBP', 'KBS'].map(function (m) {
        return '<div class="kartu"><div class="km-kepala"><span class="km-ikon modul-' + m + '">' + ik(UI.MODUL_IKON[m], 22) + '</span><span class="km-nama">' + esc(EB.namaModul(m)) + '</span></div>' +
          INFO.map(function (i) {
            return '<label class="saklar"><span>' + i[1] + '</span><input type="checkbox" data-vis="' + m + '|' + i[0] + '"' + (v[m] && v[m][i[0]] ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
          }).join('') + '</div>';
      }).join('') +
      '<button class="tombol tombol-utama tombol-penuh tombol-besar" id="vis-simpan">' + ik('check', 22) + ' Simpan pengaturan</button>';
    el('vis-simpan').onclick = async function () {
      const baru = {};
      h.querySelectorAll('[data-vis]').forEach(function (c) { const p = c.dataset.vis.split('|'); baru[p[0]] = baru[p[0]] || {}; baru[p[0]][p[1]] = c.checked; });
      const r = await kirim(this, null, function () { return API.panggil('setVisibilitas', { vis: baru }); });
      if (r) { S.boot.vis = r.vis; EB.simpanBoot(); UI.toast(r.message, 'ok'); }
    };
  };

  // =========================================================
  // GANTI PIN
  // =========================================================
  EB.renderGantiPin = function () {
    const h = el('hal-ganti-pin');
    h.innerHTML = '<div class="kartu"><label class="label" for="gp-lama">PIN sekarang</label><input class="input input-pin" id="gp-lama" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password">' +
      '<label class="label" for="gp-baru">PIN baru (6 angka)</label><input class="input input-pin" id="gp-baru" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<label class="label" for="gp-ulang">Ketik ulang PIN baru</label><input class="input input-pin" id="gp-ulang" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<p class="pesan-galat" id="gp-galat" role="alert"></p>' +
      '<button class="tombol tombol-utama tombol-penuh" id="gp-simpan">' + ik('check', 20) + ' Ganti PIN</button>' +
      '<p class="bantuan">Jangan beritahukan PIN ke siapa pun, termasuk sesama bendahara. Setiap catatan menyimpan nama pemilik PIN.</p></div>';
    el('gp-simpan').onclick = async function () {
      const a = el('gp-lama').value, b = el('gp-baru').value, c = el('gp-ulang').value, g = el('gp-galat');
      if (!/^\d{6}$/.test(b)) { g.textContent = 'PIN baru harus 6 angka.'; return; }
      if (b !== c) { g.textContent = 'Kedua PIN baru tidak sama.'; return; }
      g.textContent = '';
      const r = await kirim(this, null, function () { return API.panggil('gantiPin', { lama: a, baru: b }); });
      if (r) { UI.toast(r.message, 'ok'); EB.pergi('lainnya'); }
    };
  };
})();
