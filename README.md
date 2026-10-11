# Delta Workspace

Portal ruang kerja berbasis profesi sesuai PRD Role-Based AI Workspace System.

## Implementasi saat ini

- Dashboard responsif dan sembilan profil profesi.
- Registrasi dengan email dan kata sandi melalui Firebase Authentication.
- Pemilihan profesi saat pembuatan profil.
- Login, logout, dan routing ke dashboard berdasarkan profil.
- Dashboard hanya menampilkan profesi yang tersimpan pada profil akun.
- Firestore Rules awal yang membatasi pembacaan profil ke pemilik akun dan menutup koleksi lain secara default.
- Template environment Firebase untuk konfigurasi deployment.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi konfigurasi aplikasi web Firebase.
3. Aktifkan Email/Password pada Firebase Authentication.
4. Buat database Cloud Firestore.
5. Terapkan `firestore.rules` pada proyek Firebase.
6. Jalankan:

```bash
npm install
npm run dev
```

## Environment variables

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Nilai tersebut adalah konfigurasi aplikasi web Firebase, bukan service-account private key. Jangan pernah memasukkan private key server ke variabel `NEXT_PUBLIC_*`.

## Batasan yang belum selesai

Ini masih MVP fondasi. Modul profesi belum terhubung ke data operasional. Belum ada API AI, penyimpanan transaksi/tugas/CRM, unggah berkas, dashboard admin, atau pengujian end-to-end. Angka ringkasan pada dashboard masih contoh, bukan data nyata.

Pemeriksaan autentikasi pada halaman saat ini berjalan di client. Sebelum menambahkan data sensitif atau API operasional, setiap endpoint harus memverifikasi Firebase ID token di server dan memeriksa kepemilikan data. Firestore Rules perlu dikembangkan per koleksi sebelum fitur data diaktifkan. Jangan menggunakan angka contoh untuk keputusan keuangan, pajak, investasi, atau keputusan profesional.
