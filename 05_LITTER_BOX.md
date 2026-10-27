# Prompt Implementasi Menu — Litter Box

**File referensi wajib:** `REFERENSI_DESAIN/UI/05_Litter_Box.png`. **Route:** `/app/litter-box`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Litter Box`, tombol `Tambah Litter Box`, kartu picker beberapa litter dengan foto, nama, lokasi, cats assigned; selected box detail: image, name, lokasi, jenis/ukuran, cat avatars, kartu `Kondisi Saat Ini`, `Terakhir Dibersihkan`, CTA `Tandai Dibersihkan`; tabs `Jadwal`, `Riwayat`, `Catatan`; kiri `Jadwal Hari Ini`, kanan `Ringkasan Perawatan` dan `Catatan & Kondisi`.

## Behavior
- CRUD litter, lokasi/tipe, satu-ke-banyak cat relationship (must same household), photo upload, archive; no default litter records.
- Badge kondisi tidak boleh asal `Bersih` berdasarkan jam: jika tidak ada condition note, tampil `Belum diperiksa`, `Terakhir Dibersihkan` dari actual completed log saja, bila belum ada -> `Belum pernah dicatat`.
- `Tandai Dibersihkan` masuk ke target scheduled_task_targets jika ada yang pending; jika tidak ada schedule dan user mengklik quick action, pilih explicit `Catat pembersihan manual` dengan audit activity event schema yang nyata (agent tambahkan table+policy manual care events, jangan menyisipkan orphan task).
- Jadwal target litter (morning/afternoon/night sesuai admin actual), status per task, bukan selalu tiga slot.
- Riwayat disusun dari audit log terkait box dan aktor; notes user real. Ringkasan `Total Dibersihkan`, `Konsistensi`, `Pemakaian Pasir` hanya jika ada data tracking konsumsi; jangan mengarang 1.5 kg dari gambar. Jika belum ada kuantitas consumption, tampil `Belum ada data pemakaian`.

## Data dan tests
Target assignment per litter, cat-link validation, no mistaken food icon on cleaning, manual event secured, note and photo correct, no made-up status.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
