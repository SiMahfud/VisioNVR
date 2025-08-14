# Visionary NVR

Visionary NVR adalah Network Video Recorder (NVR) modern berbasis web yang dirancang untuk mengelola dan memantau kamera keamanan Anda. Ini menyediakan antarmuka yang bersih dan intuitif untuk melihat umpan langsung, memutar rekaman, dan mengonfigurasi analitik video.

## Fitur

- **Tampilan Multi-Kamera:** Lihat beberapa umpan kamera secara bersamaan dalam tata letak petak yang dapat disesuaikan.
- **Pemutaran Timeline:** Tinjau rekaman yang direkam dengan mudah menggunakan timeline interaktif yang menyoroti peristiwa gerakan.
- **Manajemen Kamera:** Temukan, tambah, dan kelola kamera Anda secara otomatis di jaringan Anda.
- **Analitik Video:** Siapkan zona deteksi intrusi dan deteksi persilangan garis untuk menerima peringatan cerdas (WIP).
- **Berbasis Web:** Akses NVR Anda dari browser apa pun di jaringan lokal Anda.
- **Basis Data Ringan:** Menggunakan SQLite untuk penyimpanan data yang mudah dan tanpa konfigurasi.

## Prasyarat

Sebelum Anda mulai, pastikan Anda telah menginstal yang berikut ini di sistem Anda:

- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)
- [npm](https://www.npmjs.com/) (biasanya disertakan dengan Node.js)

## Panduan Instalasi dan Penggunaan

Ikuti langkah-langkah ini untuk menjalankan dan menjalankan aplikasi Visionary NVR.

### 1. Unduh atau Kloning Kode

Pertama, dapatkan kode aplikasi. Jika Anda memiliki `git` yang terinstal, Anda dapat mengkloningnya. Jika tidak, Anda dapat mengunduhnya sebagai file ZIP dan mengekstraknya.

```bash
# Opsi 1: Kloning menggunakan git
git clone <URL_REPOSITORI_ANDA>
cd visionary-nvr
```

### 2. Instal Dependensi

Buka terminal atau command prompt Anda, navigasikan ke direktori proyek tempat Anda mengkloning atau mengekstrak file, dan jalankan perintah berikut. Perintah ini akan mengunduh dan menginstal semua paket yang diperlukan agar aplikasi dapat berjalan.

```bash
npm install
```

### 3. Jalankan Aplikasi

Setelah dependensi diinstal, Anda dapat memulai server pengembangan. Ini akan menginisialisasi database untuk Anda (jika ini adalah pertama kalinya) dan memulai aplikasi.

```bash
npm run dev
```

Anda akan melihat beberapa output di terminal. Setelah selesai, itu akan menunjukkan kepada Anda bahwa server sedang berjalan dan mendengarkan di alamat tertentu, biasanya `http://localhost:9002`.

### 4. Akses Aplikasi

Buka browser web Anda (seperti Chrome, Firefox, atau Edge) dan navigasikan ke [http://localhost:9002](http://localhost:9002).

### 5. Login

Anda akan disambut oleh halaman login. Aplikasi ini dilengkapi dengan pengguna admin default untuk Anda mulai. Gunakan kredensial berikut:

- **Nama Pengguna:** `admin`
- **Kata Sandi:** `admin`

Masukkan kredensial ini dan klik tombol "Login" untuk mengakses dasbor utama.

### 6. Jelajahi Aplikasi

Sekarang Anda sudah masuk! Anda dapat menavigasi melalui berbagai halaman menggunakan bilah sisi kiri:
- **Tampilan Multi-Kamera:** Lihat umpan langsung dari kamera Anda.
- **Pemutaran Timeline:** Tinjau rekaman video yang lalu.
- **Manajemen Kamera:** Tambah dan konfigurasikan kamera Anda.
- **Analitik Video:** Atur peringatan cerdas.

## Kredensial Admin Default

- **Nama Pengguna:** `admin`
- **Kata Sandi:** `admin`

Untuk alasan keamanan, disarankan untuk mengubah kata sandi default ini di versi aplikasi mendatang.
