# Prompt Implementasi Menu — Laporan

**File referensi wajib:** `REFERENSI_DESAIN/UI/07_Laporan.png`. **Route:** `/app/laporan`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Laporan`, dropdown bulan rentang aktual, tombol `Ekspor Laporan`; deretan 4 KPI Total Tugas Makan, Total Pembersihan Litter Box, Konsistensi Perawatan, Streak Bulanan; chart batang `Aktivitas Harian`, line `Tren Konsistensi`, bawah `Ringkasan Performa` tabel compare bulan, `Insight & Analisis` berdasarkan aturan deterministik, `Distribusi Aktivitas` donut. Matching width/spacing/shadow/colors dengan referensi.

## Behavior
- Semua series data dihitung dari Supabase queries/read-only RPC/view dengan RLS; tidak ada default bar seri 1-31 yang terisi, percentage contoh 96%, atau teks `Hari Tersibuk` tanpa actual logs.
- Pilih bulan valid dengan timezone; comparison previous month menghitung actual dates tanpa off-by-one; 0/0 -> `—` dengan empty message.
- Total tugas makan/pembersihan definisi: **count of completed target actions** untuk jenis feed/clean; konsistensi pembilang completed eligible, penyebut total eligible, tampil keterangan/tooltip, streak sequence hari valid. Jelaskan jika KPI menghitung group task di view yang berbeda.
- Chart daily bucket local_date, garis consistency daily metric, donut kategori real completed records, tooltip berbasis hasil; gunakan Recharts/shadcn Chart dan accessible legend.
- Insight only computed rules: busy day = max count jika ada data, overdue count dari pending scheduled_at<now, improvement = compare valid previous period; jika data tidak cukup tampil `Insight tersedia setelah aktivitas tercatat`.
- Ekspor report (CSV JSON atau PDF hanya jika user memilih) dari authorized server; minimal CSV data actual; jangan tombol fiktif.

## Data dan tests
2+ records chart, zero records all placeholders truthful, boundary month, prevent percentage divide-by-zero, timezone and screenshot QA.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
