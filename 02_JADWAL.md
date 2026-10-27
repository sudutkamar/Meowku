# Prompt Implementasi Menu — Jadwal

**File referensi wajib:** `REFERENSI_DESAIN/UI/02_Jadwal.png`. **Route:** `/app/jadwal`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Judul `Jadwal`, subjudul kelola aktivitas. Toolbar `Bulan`, `Minggu`, `Hari`; navigasi prev/next, label bulan aktif, `Hari ini`; chips filter Makan Pagi, Makan Siang, Makan Sore, Makan Malam, Litter Box; tombol `Tambah Jadwal` hanya admin/owner. Grid kalender kiri tujuh kolom Minggu–Sabtu mengikuti referensi (locale dapat mulai Senin sesuai setting), penanda kecil aktivitas per tanggal; kanan panel `Kamis, 23 Oktober 2026` **hanya referensi** sehingga tanggal terpilih harus aktual/berubah ketika dipilih, progress tugas target, dan timeline 5 slot, tiap baris menampilkan jenis, jam, target kucing/litter, status.

## Behavior
- Bulan/Minggu/Hari masing-masing benar-benar mengganti granularity; tanggal aktif ditandai, navigasi sinkron ke querystring TanStack Router (search params type-safe). Jaga selection ketika reload.
- Indicator kalender dihitung dari DB, tidak hardcoded dots pada semua tanggal. `Hari ini` membaca timezone household. Filter chips menampilkan/menghilangkan jenis aktual dan mengubah hasil query.
- Klik jadwal membuka detail Sheet/Dialog: scheduled time, target list dengan checkbox per cat/litter, actor/time/status, skip reason jika dilewati, mark complete, reopen hanya jika role diizinkan; audit tidak boleh hilang.
- `Tambah Jadwal` membuka admin scheduling flow, bukan menciptakan entri tanpa database. Member dilarang direct access. `Terlambat` derived status pending + time overdue.
- Kelola konflik duplikasi berdasarkan template_id + local_date; timezone DST jika timezone lain; pergantian bulan navigasi tidak menciptakan jadwal baru dengan sendirinya.

## Data dan tests
Query tasks dalam visible period saja, pagination server jika banyak. Validate first day of week, selected date, filter, overdue, updates cross-user (refetch on focus/interval ringan jika tidak memakai realtime), pending vs completed per target. Empty calendar real.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
