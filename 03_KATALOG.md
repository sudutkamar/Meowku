# Prompt Implementasi Menu — Katalog

**File referensi wajib:** `REFERENSI_DESAIN/UI/03_Katalog.png`. **Route:** `/app/katalog`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Katalog` + cards `Total Item`, `Stok Menipis`, `Kategori`; category tabs `Semua`, `Makanan`, `Pasir`, `Obat`, `Perlengkapan`, `Template Perawatan`; toolbar search, urutan, status, grid/list toggle; grid cards produk putih dengan foto dari Supabase Storage, nama, brand, deskripsi, kategori, stok, CTA `Edit`, `Tambah ke Jadwal`, kebab menu. Ikuti row/column density mockup pada desktop, responsif pada tablet/mobile.

## Behavior
- Initial DB kosong => empty grid + `Tambah Item` admin. Tidak boleh menaruh Royal Canin/Whiskas/Bento/Frontline sebagai default.
- Buat/edit item via Dialog form Zod: name required, category enum, brand optional, unit, min_stock, photo upload; stock awal melalui movement transaction (bukan `update current_stock` direct).
- Stock adjustment via dedicated RPC atomik, tulis `catalog_item_movements`: tambah, pakai, koreksi beralasan; prevent stock negative.
- `Stok Menipis` = count of item where stock <= threshold pada household. Filter/search/sort/pagination server-side; tombol `Edit` muncul untuk role yang berhak saja.
- `Tambah ke Jadwal`: buka modal jadwal dengan preselected catalog item; untuk makanan hubungkan ke feeding template, untuk pasir hubungkan ke cleaning template jika relevan; kategori incompatible menampilkan pesan, tidak membuat jadwal semu.
- `Template Perawatan`: kalau ingin tampak sesuai screenshot, implementasikan entitas template benar dengan backend nyata atau jadikan tab navigasi ke schedule_templates yang sudah ada; jangan tab dead.

## Data dan tests
Upload foto auth-scoped Storage, object path security, stock concurrent movements, empty state, archived item impact historic consumption references, threshold edge cases, no fake brands.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
