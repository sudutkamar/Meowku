# Prompt Implementasi Menu — Pengaturan Jadwal (Admin)

**File referensi wajib:** `REFERENSI_DESAIN/UI/08_Pengaturan_Jadwal.png`. **Route:** `/app/admin/pengaturan-jadwal`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Replikasi dua kolom: kiri form `Buat Jadwal Baru` dengan periode mulai/akhir, `Pilih Aktivitas & Waktu` 5 baris checkbox + jam + hari Sen Sel Rab Kam Jum Sab Min, `Target Kucing` (Semua Kucing / Pilih Kucing Tertentu), target litter box untuk cleaning, link catalog item optional; kanan `Preview Jadwal` hari tab dan timeline, ringkasan tanggal + Total Aktivitas, tombol `Batal` dan primary `Generate Jadwal` oranye.

## Behavior wajib
- Access hanya active admin/owner. Date range satu bulan (gunakan semantics calendar-month, contoh 23 Okt 2026–22 Nov 2026 = 31 hari) atau lebih pendek; tidak boleh jadwal tanggal sebelum sekarang tanpa intent explicit dan confirmation.
- Set tiap aktivitas timezone-aware local_time, days_of_week independently (bukan satu global weekday jika per aktivitas berbeda). Default jam contoh 07:00/12:00/17:00/21:00/08:00 hanya **default kontrol konfigurasi**, bukan jadwal nyata sampai user simpan; display clearly as defaults. User harus bisa mengubah.
- Jika tidak ada kucing/litter di DB, validasi target dan tampil CTA tambah terlebih dahulu. All cats / selected cats only for feeding; all/selected litter boxes for cleaning; bila satu jadwal keduanya, internal template terpisah per kind, preview tetap 5 slot jika lima aktivitas.
- Dynamic preview berdasarkan input sebelum submit; list dates real computed; tanda grup per hari. Count `group tasks` per selected recurrence + range; preview juga menampilkan `total target actions` jelas. Contoh 5 group/day×31 = 155 group tasks **jika 5 aturan aktif semua hari** (jangan hardcode hasil untuk konfigurasi lain).
- `Generate Jadwal` -> signed Edge Function, server validates role, date, templates, targets, timezone dan inserts group tasks/targets dalam transaksi. Unique constraints prevent duplicates and idempotent. On re-submit tampil newly created/existing counts, tidak membuat double entries.
- Edit template di masa depan tidak merusak logs masa lalu; preview diff / confirmation regen only pending future tasks. Invalid target archived cat stop creating future occurrences, old logs retained.
- Tombol `Batal` reset form dengan confirm unsaved changes, redirect? minta UX konsisten; schedule management list existing templates below form atau another real tab, with edit/deactivate/re-generate future actions.

## Data dan tests
Check 5 types, weekdays, 1-31 days, Feb month length, timezone, duplicate generate twice, no targets, tampered JWT role, member denied, partial group completion semantics.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
