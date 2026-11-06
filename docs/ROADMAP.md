# Roadmap & Status Meowku

## Sudah dikerjakan (status: PASS lokal)

- **Fix petugas rotasi:** occurrence hari ini/masa depan (termasuk yang sudah selesai hari ini) ikut rotasi aktif weekday. Histori masa lalu/archived tetap immutable.
- **Ad-hoc swap petugas** (`manual_assignee_id`) dan **undo selesai** (`uncomplete_occurrence`) dengan audit event.
- **Temukan & perbaiki data:** `repair_future_occurrence_assignments` tersedia untuk owner/admin (UI tombol "Perbaiki penugasan hari ini").
- **Single source of truth:** client tidak membuat occurrence sintetis; semua halaman membaca database/RPC.
- **Integritas target jadwal:** trigger database menolak target kucing/litter dari household lain, entity nonaktif, dan format key tidak valid; archive entity akan menonaktifkan target/occurrence masa depan terkait.
- **Keamanan (audit & bukti):** RLS ke-33 tabel app aktif; query apps memakai membership/role function di PostgreSQL; audit events immutable (trigger); Edge Functions memakai JWT client-side; dispatch push memakai `NOTIFICATION_DISPATCH_SECRET`; service-role tidak dikirim ke browser.
- **Performa/PWA:** Service Worker v4 hanya cache static asset, tidak cache API/Supabase; route sudah lazy-load; password tidak di-cache.
- **Aksesibilitas:** focus-visible global, dialog confirm punya focus trap + Escape; checkbox/radio/label konsisten; button action punya aria-label.

## Verifikasi lokal

- `npm run typecheck` ✅ PASS
- `npm run lint` ✅ PASS (80 file source)
- `npm run test` ✅ PASS — 185 tests
- `npm run build` ✅ PASS
- `node scripts/local-integration.mjs` (DB lokal fresh) ✅ PASS — 17 checks: RLS isolation, capabilities, dynamic rotation, ad-hoc override, uncomplete, cross-household rejection
- `npx wrangler deploy` ✅ PASS → https://meowku.panda-12b.workers.dev
- Migrasi DB di-push ke remote ✅ (`20261105000100`, `20261106000100`, `20261106000200`, `20261106000300`)

## Belum tuntas / roadmap fase berikutnya

### Fase 1 — Stabilisasi & keamanan (high)

1. **E2E test otomatis** untuk alur: Setup rumah → Buat jadwal → Occurrence muncul → Complete/Uncomplete → Ganti petugas ad-hoc → Histori & laporan cocok. *(integration `scripts/local-integration.mjs` lulus; skenario browser Playwright belum ditambahkan).*
2. **Security regression suite** berbasis pgTAP atau test lokal terisolasi: uji cross-household access denied untuk semua RPC inti (`generate_schedule_occurrences`, `reassign_occurrence`, `uncomplete_occurrence`, exports, members, audit).
3. **Rate limiting & observability** untuk Edge Functions (invite, complete, export, scan-food): log event penting tanpa menulis token/secret; monitor error 5xx.
4. **RLS review final oleh owner** sebelum lintas publik: beberapa policy masih `for all using/is_household_member` (aman, tapi perlu dibuktikan di test; belum ada test otomatis per policy).

### Fase 2 — Produk (medium)

1. **Swap petugas darurat dengan alasan** disimpan di audit (wajib isi catatan singkat).
2. **Notifikasi stok litter rendah** via existing notification system; trigger dari `catalog_stock_movements`.
3. **Reminder vaksinasi/grooming** via scheduled Edge Function harian.
4. **Export laporan PDF/CSV** sudah tersedia UI; tambahkan signed URL/short-lived token jika data sensitif.

### Fase 3 — Skala & UX (medium/low)

1. **Virtual scroll** untuk histori bulan besar.
2. **Kustom dashboard "petugas saya hari ini"** untuk member.
3. **PWA offline mode ringan** untuk checklist (read-only cache hari ini + sync saat online); tidak untuk penugasan/completion.
4. **Notifikasi rich** dengan tindakan Selesai/Kirim Pesan.

## Catatan desain yang tidak berubah

- Rotasi **hanya berdasarkan weekday** dalam rentang `start_date–end_date`; completion **tidak** menggeser turn.
- Petugas ad-hoc (manual override) menimpa rotasi; tombol "Ikuti rotasi otomatis" mengembalikan ke aturan weekday.
- Histori past & archived immutable; petugas hari ini tetap mengikuti rotasi aktif, bukan siapa yang menyelesaikan kemarin.
