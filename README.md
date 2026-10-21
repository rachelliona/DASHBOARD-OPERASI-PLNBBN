# Dashboard Operasi PLN Batubara Niaga
Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi — React + TypeScript + Vite + Tailwind + Recharts + TanStack Table + Leaflet.

## Menjalankan
`npm install` · `npm run dev` · `npm run build` · `npm test`

## Alur data
1. **Sumber Data dan Kualitas Data** → impor CSV lokal, petakan kolom ke field aplikasi (pemetaan disimpan di localStorage; data TIDAK disimpan, hanya di memori).
2. Tiga dataset terpetakan: PLTU (Laporan Harian), Shipment, Master Lokasi (koordinat). Sheet lain dimuat sebagai data mentah.
3. Registri 31 URL CSV ada di `src/config/sources.ts` (URL persis; dibangun dari ID spreadsheet + GID). Tombol "Ambil" hanya menandai "Terhubung" jika request benar-benar berhasil. Dari browser, request ke Google Sheets dapat gagal karena CORS/jaringan → perlu backend/proxy.
4. Tidak ada data contoh yang disertakan. Tanpa data, halaman menampilkan "Data Belum Tersedia".

## Aturan penting
- Istilah tahapan (Carry Over, Loading, Sailing, Tiba/Antri, Proses Bongkar, Unloading) mengikuti laporan harian; status tak dikenal tampil "Belum Dipetakan" (`src/domain/status.ts`).
- Persentase Pemenuhan = Unloading ÷ Target adalah **provisional** sampai definisi bisnis dikonfirmasi.
- Baris ditolak tidak dibuang diam-diam: jumlah dan alasan tampil di halaman Sumber Data.
- Koordinat divalidasi (rentang Indonesia). PLTU tanpa koordinat masuk daftar "belum memiliki koordinat". Rute bersifat indikatif; tidak ada posisi kapal.

## Keamanan
URL CSV `pub?output=csv` bersifat PUBLIK. Aplikasi ini tidak memiliki autentikasi. Jangan deploy data operasional ke hosting publik (mis. GitHub Pages) tanpa persetujuan; gunakan hosting internal/SSO dan layanan backend untuk pengambilan data.

## Belum diimplementasikan
Ambil otomatis berkala, backend/SSO, ekspor Excel, perbandingan snapshot laporan, KPI turunan untuk sheet realisasi/mitra/SI, kepatuhan mitra, ekspor PDF berbasis dokumen (saat ini cetak browser).
