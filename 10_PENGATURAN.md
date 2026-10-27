# Prompt Implementasi Menu — Pengaturan

**File referensi wajib:** `REFERENSI_DESAIN/UI/10_Pengaturan.png`. **Route:** `/app/pengaturan`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Pengaturan`; tab strip `Profil & Akun`, `Notifikasi`, `Tampilan`, `Data & Privasi`, `Jadwal`, `Pengguna`, `Integrasi`, `Tentang`; main cards `Profil & Akun` (avatar, nama, email), `Tampilan Aplikasi` (Terang/Gelap/Sistem, warna aksen jika tersedia), `Data & Privasi` (Ekspor Data, Kelola Data, Kebijakan Privasi, Hapus Akun), `Notifikasi` (pengingat jadwal, ringkasan harian, laporan mingguan, aktivitas pengguna), `Tentang Aplikasi` memakai logo asli. Dalam mobile tab strip scroll.

## Behavior
- Profil nama/avatar dari `auth.users`/`profiles`; update `profiles` melalui RLS; email update mengikuti Supabase Auth verification flow (`auth.updateUser`) dan feedback hasil; jangan update DB email saja seolah Auth berubah.
- Password reset/update memakai Supabase Auth API session/re-auth yang benar. Form and toast after actual success.
- Theme light/dark/system benar-benar mengubah CSS, persisted user_preferences; jangan bilang sistem tersedia jika tidak bekerja.
- Bahasa Indonesia sebagai language yang berfungsi; bila dropdown bahasa lain tidak diterjemahkan sepenuhnya, jangan tawarkan sebagai pilihan fiktif.
- Notifikasi toggles write `notification_preferences`. Jelaskan perbedaan **in-app reminders saat app online** vs email/push: hanya tampilkan jenis yang delivery-nya implemented. Jika background email/push belum ada, sembunyikan opsi atau tandai `Belum tersedia`, tidak pura-pura sukses mengirim.
- `Data & Privasi`: export authorized activity data/own profile nyata; `Hapus Akun` wajib confirmation, secure Edge, last-owner constraint, redact sensitive details, no irreversible action automatically without user.
- Tab Jadwal menampilkan default household timezone (Asia/Jakarta) dan date format; setting household hanya admin, profile settings pribadi tetap bisa diedit member.
- `Integrasi`: jika belum ada backend integrasi jangan menaruh tautan/toggle palsu, berikan empty state `Belum ada integrasi terhubung`.
- `Tentang`: hanya deskripsi app/version dari package atau build metadata nyata; bantuan/kebijakan perlu konten actual atau route jelas; jangan tautan placeholder `example.com`.

## Data dan tests
Change theme and reload, update real profile, password, email, notification DB state; delete confirmation and role enforcement; no fake avatar/email/version/hyperlink.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
