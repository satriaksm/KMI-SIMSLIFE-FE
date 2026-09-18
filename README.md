# SUMILIR - Frontend (Vue 3 + Vite)

## Deskripsi Singkat 

Repository ini berisi kode sumber untuk sisi antarmuka pengguna (Frontend) dari platform **SUMILIR** (Sistem Informasi Manajemen Layanan Inovasi & Fleksibilitas Ekonomi UMKM). Aplikasi ini dibangun sebagai *Single Page Application* (SPA) modern yang cepat dan responsif menggunakan **Vue 3 (Composition API)** dan **Vite**, serta terhubung langsung dengan Backend API Laravel [SUMILIR-BE](https://github.com/satriaksm/KMI-SIMSLIFE-BE.git).

Frontend ini melayani tiga kategori peran pengguna: **Pelanggan**, **Pelaku UMKM (Merchant)**, dan **Administrator**.

---

## Model Transaksi & Pembayaran 

> Alur transaksi disesuaikan dengan kebutuhan pasar lokal kelurahan (*hyperlocal*) tanpa potongan fee transaksi:
> * **Cash on Delivery (COD):** Pembeli membayar saat pesanan tiba di tujuan.
> * **Ambil Sendiri (Self-Pickup):** Pembeli datang ke gerai UMKM dan melakukan pembayaran langsung.
> * **Transfer / Koordinasi WhatsApp:** Pembeli dapat langsung menghubungi merchant melalui WhatsApp untuk konfirmasi pesanan atau pembayaran manual.

---

## Fitur Utama di Frontend 

### 🛍️ 1. Untuk Pelanggan (Customer)
* **Jelajah & Pencarian:** Pencarian produk dan jasa UMKM lokal dengan filter kategori, harga, dan rating.
* **Peta Interaktif (Leaflet.js):** Menemukan lokasi gerai UMKM terdekat di wilayah kelurahan secara visual.
* **Pemesanan Hyperlocal:** Keranjang belanja berbasis merchant (*merchant-isolated cart*) dan klaim voucher diskon.
* **Forum Komunitas:** Berbagi informasi, posting topik, memberi komentar, dan berdiskusi dengan sesama warga.
* **Profil Pengguna:** Manajemen alamat pengiriman, kontak WhatsApp, dan kata sandi.

### 🏪 2. Untuk Pelaku UMKM (Merchant Owner)
* **Dashboard Merchant:** Ringkasan performa penjualan, total pendapatan, dan pesanan terbaru.
* **Manajemen Katalog:** Pengelolaan produk, varian harga, add-on pilihan, jasa layanan, portofolio, dan galeri foto.
* **Manajemen Pesanan:** Konfirmasi pesanan masuk dan riwayat pesanan pelanggan.
* **Pemasaran & Promosi:** Pembuatan voucher diskon UMKM dan pendaftaran ke event promosi kelurahan.
* **Pengaturan UMKM & Lokasi Peta:** Penentuan titik koordinat lokasi UMKM di peta, jam operasional.

### 🛡️ 3. Untuk Administrator
* **Dashboard Analitik:** Ringkasan pertumbuhan pengguna, transaksi, dan aktivitas UMKM.
* **Manajemen Pengguna & UMKM:** Verifikasi pendaftaran merchant UMKM baru dan kelola akun pengguna.
* **Manajemen Kategori & Event:** Pengaturan kategori produk/jasa dan publikasi event kelurahan.
* **Moderasi Konten:** Peninjauan dan tindakan atas laporan postingan komunitas atau review bermasalah.

---

## Tech Stack Utama 

* **Framework:** Vue 3 (Composition API & `<script setup>`)
* **Build Tool:** Vite 7
* **State Management:** Pinia (dengan persisted state plugin)
* **Routing:** Vue Router 4
* **HTTP Client:** Axios (mendukung cookie Sanctum SPA)
* **Styling & UI:** Tailwind CSS v4, PrimeVue, Lucide Icons, Flowbite
* **Peta:** Leaflet.js & OpenStreetMap
* **Real-time WebSockets:** Laravel Echo & Pusher-JS (terhubung ke Laravel Reverb)
* **Validasi Form:** Vee-Validate & Yup
* **PWA:** Vite Plugin PWA (Offline & Installable App)
* **Grafik & Analisis:** ApexCharts & Chart.js

---

## Panduan Instalasi & Menjalankan 

### 1. Prasyarat
* Node.js (versi 18.x atau 20.x ke atas direkomendasikan)
* NPM / PNPM / Yarn

### 2. Langkah Instalasi
1. **Clone repository:**
   ```bash
   git clone https://github.com/satriaksm/KMI-SIMSLIFE-FE.git
   cd KMI-SIMSLIFE-FE
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Salin file environment:**
   ```bash
   cp .env.example .env
   ```

4. **Konfigurasi `.env`:**
   Sesuaikan URL API backend dan host Reverb:
   ```env
   # App URL
   VITE_APP_NAME="SUMILIR"
   VITE_APP_URL=http://localhost:5173
   VITE_PUBLIC_BASE_PATH=/

   # API Backend Laravel
   VITE_API_BASE_URL=http://localhost:8000
   VITE_API_PREFIX=/api
   VITE_SANCTUM_ENDPOINT=/sanctum/csrf-cookie
   VITE_WITH_CREDENTIALS=true

   # Laravel Reverb (WebSocket)
   VITE_ECHO_DRIVER=pusher
   VITE_REVERB_APP_KEY=local
   VITE_REVERB_HOST=localhost
   VITE_REVERB_PORT=8081
   VITE_REVERB_SCHEME=http

   # Fitur Flag
   VITE_FEATURE_ECHO=true
   ```

5. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan aktif di [http://localhost:5173](http://localhost:5173).

---

## Build untuk Produksi 

Untuk mengompilasi dan mem-bundle aplikasi sebelum dideploy:

```bash
npm run build
```
Hasil build siap saji akan berada di folder `dist/`.
