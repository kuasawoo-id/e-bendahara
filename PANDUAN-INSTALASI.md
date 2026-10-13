# Panduan Instalasi E-Bendahara

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` + `appsscript.json` | Google Apps Script (akun Google **Kepala KUA**) |
| **Frontend** | `index.html`, folder `css/`, folder `js/` | GitHub Pages |

Urutannya wajib: **backend dulu**, karena frontend butuh alamat `/exec` dari backend.

---

## Bagian A — Backend (Google Apps Script)

> Gunakan akun Google **kantor/Kepala KUA**, bukan akun pribadi bendahara. Pemilik akun ini adalah satu-satunya yang bisa mengedit data langsung di Google Sheets.

### A1. Buat proyek
1. Buka **https://script.google.com** → **Proyek baru**.
2. Ganti nama proyek (kiri atas) menjadi `E-Bendahara`.
3. Hapus semua isi `Code.gs`, lalu tempel seluruh isi **`Kode.gs`**.
4. Di baris paling atas, ganti nama admin bila perlu:
   ```js
   const SETUP_ADMIN = { nama: 'Kepala KUA', pin: '123456' };
   ```
   PIN ini hanya sementara; aplikasi memaksa menggantinya saat login pertama.
5. Klik ⚙️ **Setelan proyek** → centang **Tampilkan file manifes "appsscript.json"**. Kembali ke **Editor**, buka `appsscript.json`, ganti seluruh isinya dengan berkas **`appsscript.json`** yang diberikan.
6. Tekan **Ctrl+S**.

### A2. Jalankan setup (SEKALI saja)
1. Di bilah atas, pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul permintaan izin → **Tinjau izin** → pilih akun → **Lanjutan** → **Buka E-Bendahara (tidak aman)** → **Izinkan**. (Peringatan "tidak aman" normal untuk skrip buatan sendiri.)
3. Buka **Log eksekusi**. Harus muncul `✅ Setup selesai.` beserta alamat Spreadsheet dan folder Drive.
4. Cek Google Drive: ada folder **📁 E-Bendahara** berisi **🗃️ Database — E-Bendahara** dan folder **📂 Cadangan**.

> ⚠️ **Jangan jalankan `setupAppEnvironment` dua kali.** Kode sudah menolak bila dijalankan ulang, tetapi jangan dicoba.

### A3. Deploy sebagai Web App
1. Klik **Terapkan → Deployment baru**.
2. ⚙️ Pilih jenis: **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai:** *Saya (email Kepala KUA)*
   - **Yang memiliki akses:** *Siapa saja*
4. **Terapkan** → salin **URL aplikasi web** yang berakhiran **`/exec`**.
5. Uji: tempel URL itu di browser. Harus tampil teks seperti:
   ```json
   {"success":true,"app":"E-Bendahara","versi":"1.0.0", ...}
   ```

### A4. Kalau suatu saat kode backend diubah
**Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
Dengan cara ini URL `/exec` **tetap sama**, jadi frontend tidak perlu diubah. Jangan membuat "Deployment baru" lagi, karena itu menghasilkan URL baru.

---

## Bagian B — Frontend (GitHub Pages)

### B1. Isi alamat backend
1. Ekstrak **`e-bendahara.zip`**. Hasilnya folder **`e-bendahara`** yang di dalamnya **langsung** ada `index.html`, `css/`, `js/`.
2. Buka **`js/config.js`** dengan Notepad, ganti alamatnya dengan URL `/exec` dari langkah A3:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
3. Simpan.

### B2. Buat repository di GitHub
Di github.com: **+ → New repository** → nama misalnya `e-bendahara` → **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

### B3. Kirim ke GitHub lewat terminal

> **Folder tempat `git init` dijalankan adalah folder `e-bendahara` hasil ekstraksi** — folder yang isinya langsung `index.html`. Jangan satu level di atasnya.

Buka folder `e-bendahara` di File Explorer, klik address bar, ketik `powershell`, Enter. Lalu periksa dulu:

```powershell
dir
```
Baris yang terlihat **harus** `css`, `js`, `index.html`, `PANDUAN-INSTALASI.md`, `README.md`. Kalau yang terlihat malah folder `e-bendahara` lagi, masuk dulu: `cd e-bendahara`.

Lalu jalankan satu per satu:
```powershell
git init
git add .
git commit -m "Rilis pertama E-Bendahara"
git branch -M main
git remote add origin https://github.com/USERNAME/e-bendahara.git
git push -u origin main
```
Saat diminta *password*, tempel **Personal Access Token** (bukan password akun). Layar memang tidak menampilkan apa pun saat token ditempel; itu normal.

### B4. Aktifkan GitHub Pages
Repo di GitHub → **Settings → Pages**:
- **Source:** Deploy from a branch
- **Branch:** `main` · `/ (root)` → **Save**
- Centang **Enforce HTTPS**

Tunggu 1–2 menit. Situs tampil di `https://USERNAME.github.io/e-bendahara/`.

### B5. Update di kemudian hari
```powershell
git add .
git commit -m "Keterangan perubahan"
git push
```
Kalau di HP masih tampil versi lama, tutup lalu buka lagi aplikasinya, atau hapus data situs di browser.

---

## Bagian C — Mulai memakai

| Urutan | Siapa | Langkah |
|---|---|---|
| 1 | Kepala KUA | Buka situs → pilih **Kepala KUA** → PIN `123456` → **buat PIN pribadi**. |
| 2 | Kepala KUA | **Lainnya → Pengguna → Tambah pengguna**: 2 bendahara dan semua ASN. Centang *Ikut iuran* dan isi bulan mulai. Catat PIN awal yang muncul, berikan langsung ke orangnya. |
| 3 | Kepala KUA | **Lainnya → Kelola Iuran**: pastikan nominal Rp50.000 berlaku mulai Januari. |
| 4 | Kepala KUA | **Lainnya → Tampilan untuk ASN**: nyalakan informasi yang boleh dilihat ASN. Bawaannya semua mati; tabel iuran selalu tampil. |
| 5 | Bendahara | Masuk dengan PIN awal → buat PIN pribadi → **Lainnya → Saldo Awal**: hitung uang fisik di tangan, isi per kas. |
| 6 | Semua | Di Chrome HP: menu **⋮ → Tambahkan ke layar utama**, agar terbuka seperti aplikasi. |

**Uji coba 2 minggu:** tetap catat di buku seperti biasa. Setiap Jumat, cocokkan saldo tiap kas di aplikasi dengan uang fisik. Pakai penuh setelah dua minggu berturut-turut cocok.

---

## Pemeliharaan

| Kebutuhan | Caranya |
|---|---|
| Cadangan data | Otomatis tiap Minggu malam ke folder **📂 Cadangan** (8 salinan terakhir). |
| Bendahara lupa PIN | Kepala KUA → Pengguna → nama → **Reset PIN**. |
| Akun terkunci (5× salah PIN) | Tunggu 15 menit, atau Kepala KUA → Pengguna → **Buka kunci akun**. |
| ASN pindah tugas | Pengguna → nama → isi **bulan berhenti** iuran. Jangan dihapus. |
| Proteksi lembar Sheets hilang | Di editor Apps Script, jalankan fungsi **`pasangUlangProteksi`**. |
| Membagikan file Sheets | Boleh dibagikan, tetapi semua lembar terkunci: hanya akun pemilik yang bisa mengedit. Mengubah angka harus lewat aplikasi agar tercatat di Riwayat. |

---

## Mengatasi masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "Alamat server belum diisi" | `GAS_URL` di `js/config.js` belum diganti | Isi URL `/exec`, lalu `git add . && git commit -m "config" && git push` |
| "Jawaban server tidak terbaca" | URL salah, atau deployment belum "Siapa saja" | Ulangi A3; pastikan URL berakhiran `/exec` |
| "Tidak dapat terhubung" | Sinyal / internet | Coba lagi saat sinyal baik |
| Halaman GitHub 404 | `git init` dijalankan di folder yang salah | Buka repo di GitHub: `index.html` harus terlihat di daftar paling atas |
| Tampilan polos tanpa warna | Folder `css/`/`js/` tidak ikut | Jangan unggah lewat "Upload files" di web GitHub; gunakan perintah terminal di B3 |
| Perubahan kode backend tidak berefek | Belum membuat versi baru | Ikuti A4 |
| "Saldo awal belum diisi" saat mencatat | Kas itu belum punya saldo awal | Lainnya → Saldo Awal |
