# SP System

Sistem pengontrolan mahasiswa untuk mengelola izin keluar masuk kampus dengan alur berbasis role:

- Admin
- Dosen
- Mahasiswa

## Fitur utama

- Login dan registrasi pengguna
- Pengajuan izin mahasiswa
- Review izin oleh dosen/admin
- Status izin: MENUNGGU, DISETUJUI, DITOLAK, SEDANG_KELUAR, SELESAI
- Dashboard khusus per role
- UI modern dan responsif

## Persyaratan

- Node.js 18+
- MySQL lokal

## Setup cepat

1. Masuk ke folder backend
2. Salin `.env.example` ke `.env`
3. Sesuaikan konfigurasi database MySQL Anda
4. Jalankan:

```bash
npm install
node init-db.js
npm start
```

Setelah itu buka:

- http://localhost:5001/

## Default akun

- Admin: admin@kampus.ac.id / admin123
- Dosen: budi.dosen@kampus.ac.id / dosen123
- Mahasiswa: ahmad.mhs@student.kampus.ac.id / mahasiswa123

## Catatan

Jika MySQL belum dibuat, Anda perlu membuat database dengan nama yang ada di `.env` sebelum menjalankan `init-db.js`.
