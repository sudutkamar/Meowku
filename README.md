# Meowku

Meowku adalah aplikasi web untuk membantu perawatan kucing di rumah tetap rapi, terjadwal, dan mudah dikerjakan bersama.

## Sekilas

Meowku menyatukan jadwal perawatan, checklist harian, histori aktivitas, data kucing, kebutuhan litter box, katalog, laporan, anggota rumah, dan pengaturan dalam satu ruang kerja.

Fokusnya sederhana: setiap tugas punya jadwal yang jelas, bisa ditugaskan, diselesaikan, dan tetap terlacak tanpa membuat rutinitas perawatan terasa rumit.

## Fitur utama

- Dashboard checklist perawatan harian.
- Jadwal berulang dengan slot waktu, rentang tanggal, kategori, target, dan petugas.
- `Jadwal saya` untuk melihat tugas berdasarkan hari, minggu, bulan, dan kategori.
- Preview tugas berikutnya untuk persiapan hari berikutnya.
- Data kucing dan cat-care: kesehatan, vaksinasi, makanan, pengeluaran, dan catatan.
- Manajemen litter box, katalog, anggota rumah, histori, laporan, dan export.
- Tema terang/gelap, bahasa Indonesia/Inggris, layout responsif, dan dukungan PWA.
- Notifikasi web dengan status kesiapan yang jujur ketika HTTPS atau konfigurasi push belum tersedia.

## Teknologi

React, Vite, TypeScript, TanStack Router, TanStack Query, Tailwind/shadcn-style components, dan Supabase Auth/Postgres/RLS/Edge Functions.

Data bisnis aplikasi berasal dari Supabase. Tidak ada data contoh atau kredensial produksi di README ini.

## Menjalankan secara lokal

```bash
npm install
# terminal 1
supabase start
# terminal 2
supabase functions serve invite-household-member
# terminal 3 — memakai Auth/data hosted dari localhost
npm run dev
```

Perintah `npm run dev` memakai backend hosted dari `.env` agar akun Auth yang dipakai di deploy juga bisa dipakai dari `localhost`. Ini tetap hanya menjalankan aplikasi di localhost dan tidak melakukan deploy. Untuk development yang benar-benar terisolasi dengan Supabase CLI lokal, jalankan `npm run dev:local`; perintah itu membaca `.env.development.local`. Build production membaca `.env`, sehingga URL hosted tidak boleh tertimpa oleh `.env.local`. Jangan commit file environment, service-role key, password database, private VAPID key, atau secret Edge Function.

Supabase lokal menyimpan email signup dan undangan di Mailpit pada `http://127.0.0.1:54334`. Flow konfirmasi email lokal aktif melalui `supabase/config.toml`; untuk project hosted, aktifkan email confirmation dan SMTP di pengaturan Auth project tersebut.

Penting: Auth localhost dan Auth hosted adalah database yang berbeda. Akun yang ada di deploy hanya tersedia dari localhost ketika `npm run dev` (mode hosted) digunakan. Untuk menguji localhost secara terisolasi, jalankan `npm run dev:local`, buat akun dari tombol `Daftar sekarang`, lalu buka email konfirmasi di Mailpit. Jangan melakukan perubahan data berisiko dari mode hosted.

Untuk pemeriksaan lokal:

```bash
npm test
npm run typecheck
npm run build
```

## Deployment

Deployment internet tidak dilakukan dari workflow ini. Validasi perubahan dilakukan di localhost dengan build Vite dan Supabase lokal.

Instalasi PWA dan push notification pada HP membutuhkan alamat HTTPS yang dipercaya perangkat. `http://localhost` hanya menjadi pengecualian pada perangkat yang menjalankan server.

## Status

Konfigurasi backend, akun, data operasional, dan catatan audit internal sengaja tidak dipublikasikan di README.
