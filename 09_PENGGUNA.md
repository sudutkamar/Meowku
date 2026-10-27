# Prompt Implementasi Menu — Pengguna (Admin)

**File referensi wajib:** `REFERENSI_DESAIN/UI/09_Pengguna.png`. **Route:** `/app/admin/pengguna`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Judul `Pengguna`, topcards `Total Pengguna`, `Pengguna Aktif`, `Pengguna Nonaktif`; toolbar search nama/email anggota household, filter Semua Role/Status, sort, `Tambah Pengguna`; table Pengguna, Email, Role, Status, Tanggal Bergabung, Aksi (kebab), selection/pagination. Ikuti spacing mockup.

## Behavior
- Di Vite frontend tidak dapat membuat pengguna autentikasi secara aman dengan admin API. `Tambah Pengguna` **harus berupa `Undang Pengguna`**, memanggil secured `invite-member` Edge yang membuat invitation real; kirim email hanya bila delivery service configured; kalau tidak ada, tampil link aman yang bisa disalin admin. Jangan membuat profile atau user palsu sebelum invite diterima.
- Table hanya current `household_members` yang benar-benar terdaftar; empty state jika hanya owner pertama (count actual 1, bukan 128 fake).
- Role owner/admin/member, disabled/inactive. Owner yang terakhir tidak boleh dikeluarkan/dinonaktifkan atau turun role. Admin tidak boleh menaikkan dirinya menjadi owner atau mengubah role owner; server enforced.
- Link invite expiry/single-use; accept only matching authenticated verified-email; resend and revoke invitation jika backend implemented. UI tab `Undangan Tertunda` boleh ditambah as long as backend real.
- Search/filter/pagination server-side; date join from membership `joined_at`, bukan salah hitung relatif.
- `Aksi` tersedia menurut permission: ubah role, nonaktifkan/aktifkan, keluarkan dari household, batalkan undangan; seluruhnya confirmation + Edge.

## Data dan tests
Current owner baseline, invite second account, member unauthorized 403 on routes and functions, last owner invariant, multi-household separate lists, changed role invalidates cache/session guard.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
