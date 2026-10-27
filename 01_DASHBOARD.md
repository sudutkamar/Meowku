# Prompt Implementasi Menu — Dashboard

**File referensi wajib:** `REFERENSI_DESAIN/UI/01_Dashboard.png`. **Route:** `/app`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Sidebar kucing-jam hitam-oranye kiri, topbar pencarian, ikon notifikasi, avatar+role aktual. Content header `Selamat [pagi/siang/sore/malam], [nama profil]!` dengan tanggal aktual (timezone rumah). Baris kartu kucing berbentuk portrait kecil dengan Foto/Nama/umur dari real DB dan tile `Tambah Kucing` yang membuka dialog. Sampingnya kartu `Ringkasan Mingguan`: Total Makan, Litter Box, Konsistensi memakai perhitungan nyata.
Bawah: kartu utama `Jadwal Hari Ini` dengan progress bar dan list aktivitas dari scheduled_tasks+targets, jam, ikon, nama target, status serta `Tandai Selesai` atau `Belum`; kanan `Aktivitas Terbaru` bersumber dari activity_logs dan `Jadwal Mendatang` dari scheduled_tasks. Banner bawah dekoratif sesuai mockup; jangan perlakukan ilustrasi sebagai data cat.

## UX nyata
- Klik kartu kucing membuka `/app/kucing?catId=...`, tile tambah membuka modal sesuai role. Saat tidak ada kucing tampil CTA `Tambah Kucing` tanpa foto contoh.
- Summary date range 7 hari dihitung menurut timezone household. Untuk 0 eligible tasks tampil `—` pada konsistensi; jangan 100% palsu.
- Tombol `Tandai Selesai`: jika task multi-target, buka detail target; user boleh centang target tertentu. Aksi selesai memanggil RPC atomik dengan audit user dan timestamp server; toast+invalidate query.
- `Aktivitas Terbaru` pengurutan desc by server timestamp, actor join profile; `Lihat Semua` ke Histori. `Jadwal Mendatang` ke Jadwal dengan fokus tanggal.
- Pencarian global harus mengarah ke hasil real, atau batasi sesuai role dengan UI pencarian ringan; tidak boleh search dummy.
- No schedule -> empty state dengan pesan + `Buat Jadwal` hanya admin; member melihat informasi menghubungi admin.

## Data dan tests
Query namespaced userId-householdId. Dashboard metrics mengambil aggregation real atau SQL view yang mengikuti RLS; jangan menggunakan angka statis dari PNG. Test empty dashboard, single cat, partial group, full group, multi-household isolation, timezone greetings.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
