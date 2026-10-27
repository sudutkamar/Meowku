# Prompt Implementasi Menu — Histori Aktivitas

**File referensi wajib:** `REFERENSI_DESAIN/UI/06_Histori.png`. **Route:** `/app/histori`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Histori Aktivitas`, tombol `Export` dan filter bar: tanggal range, kucing, aktivitas, user, reset filter. Kartu `Daftar Histori Aktivitas` tabel desktop dengan kolom Tanggal & Waktu, Aktivitas, Target, User, Status, Aksi; pagination, sorting, avatar/inisial user nyata dan badge status.

## Behavior
- Table sumber dari `activity_logs` append-only join task target->cat/litter; jika manual cleaning events dibuat, unify read view `care_activity_history` dengan RLS aman; materialisasi hanya jika benar-benar diperlukan.
- Filter `Semua Kucing` tidak boleh menyembunyikan litter; label `Target` filter kucing/litter atau bentuk query yang sesuai. Date range timezone, actor household active/legacy, activity type, status.
- Pagination server range/count, sorting deterministic (`happened_at desc,id desc`), row detail dialog menampilkan scheduled time vs actual performed time, notes, actor. Untuk skip/reopen baca audit action bukan menghapus.
- Export CSV dari authenticated `export-activities` Edge Function dengan filter sama; `Export` memberi file benar/empty state, tidak sekedar toast. Jangan bocorkan email/PII tanpa kebutuhan.
- Tidak ada akses edit/delete logs bagi anggota (append-only audit). Hak koreksi dilakukan record pembalik `reopened` dalam transaksi authorized.

## Data dan tests
Count query valid, consistent exports, forged household id blocked, empty table, timezone, pagination, CSV injection safety, RLS joins.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
