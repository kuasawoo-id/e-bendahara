# E-Bendahara

Pencatatan keuangan internal KUA: **Uang Operasional Kantor, Uang Bimwin, Uang PNBP, dan Uang Kebersamaan**, dengan saldo real-time, status iuran per nama per bulan, riwayat perubahan lengkap, dan rekap PDF/Excel.

- **Frontend:** HTML/CSS/JS murni (folder ini), di-host di GitHub Pages.
- **Backend:** Google Apps Script sebagai REST API (`Kode.gs`, tidak disertakan di repo ini), database Google Sheets.

Cara pasang: lihat **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**.

## Struktur
```
index.html          kerangka halaman
css/style.css       tampilan (mode terang & gelap)
js/config.js        ← isi GAS_URL di sini
js/ui.js            format rupiah, ikon, dialog, lembar bawah
js/api.js           komunikasi ke Apps Script (fetch POST text/plain)
js/app.js           login, navigasi, Beranda, Transaksi, Iuran, Lainnya
js/forms.js         catat masuk/keluar, iuran, sumbangan, ubah & hapus
js/kelola.js        Laporan, Riwayat, Pengguna, Kategori, Saldo Awal, Visibilitas
```

Ahzani Labs · 2026
