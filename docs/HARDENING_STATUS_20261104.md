# Meowku — Hardening Status 2026-11-04

Dokumen ini adalah catatan implementasi untuk hardening aplikasi sesuai `AGENTS.md`. Semua pekerjaan tetap local-only; tidak ada deploy internet dan tidak ada reset database remote.

## Status ringkas

| Fase | Status | Bukti / batasan |
| --- | --- | --- |
| Kontrak database hardening | PASS (local live) | Migration `20261104000100` berhasil diterapkan lewat `supabase db reset --local`; tidak diuji ke remote. |
| Onboarding atomic | PASS (local live) | `create_household(name, timezone)` menyimpan household + owner dalam satu RPC dan diverifikasi melalui Auth session nyata. |
| Settings/timezone atomic | PASS (local live) | `update_household_settings` mengubah nama/timezone, schedule, dan future incomplete occurrence dalam satu transaksi; perubahan offset diverifikasi. |
| Histori schedule | PASS (local live) | `delete_schedule` menolak hard-delete setelah occurrence ada; archive tetap mempertahankan occurrence dan export. |
| Ownership transfer | PASS (local live) | Owner-only RPC memindahkan role secara atomik dan menulis audit; owner lama menjadi admin dan target menjadi owner. |
| Export | PASS (local live) | Export mencakup domain care, inventory, schedule slots/targets/occurrences, rotation, invitation, notification, profil terkait, dan audit. Binary storage tidak disalin; manifest attachment tetap disertakan. |
| Role/navigation UX | PASS (source) | Histori admin-only; settings dapat dibuka member untuk preferensi pribadi; household mutation/export/ownership hanya owner/admin; form konfigurasi jadwal tersembunyi dari member. |
| Notifications UX | PASS (source) | Unread count household-scoped, polling 30 detik, timezone household, `action_url` dipetakan ke halaman aplikasi. |
| Inventory UX | PASS (source) | `minimum_stock` disimpan di database dan label stok rendah dihitung dari record nyata. |
| Local-only guard | PASS | Vite bind ke loopback, script deploy dihapus, CORS function dan template email tidak lagi memakai domain publik. |
| Automated checks | PASS | `npm run typecheck` exit 0; `npm run lint` exit 0 (80 file source); `npm test` 180/180 pass; `npm run test:local` PASS; `npm run build` exit 0 (1847 modules transformed). |
| Supabase local integration/RLS/E2E | PASS untuk Auth/RLS/domain; push delivery terbatas | `npm run test:local` PASS setelah `supabase db reset --local`. Runner menguji Auth session, invitation acceptance, isolasi household, role owner/admin/member, catalog, schedule, timezone, completion, archive/delete guard, export, transfer ownership, dan notification count. |
| Screenshot visual QA | PASS local authenticated smoke | Login owner dan member, dashboard, household switcher, settings owner/member, role-aware navigation, jadwal/checklist member, dan export Edge Function diuji lewat browser localhost. Tidak menggunakan data palsu di aplikasi umum. |

## File dan migration yang ditambahkan/diubah

- `supabase/migrations/20261104000100_household_hardening.sql`
  - onboarding `create_household(text, text)` dengan validasi timezone;
  - `update_household_settings` atomic;
  - `transfer_household_ownership` owner-only;
  - `minimum_stock` + constraint katalog;
  - permanent delete schedule yang menjaga histori;
  - export payload lengkap dan service-role-only helper.
- `src/features/onboarding/useOnboarding.ts`
  - tidak lagi melakukan create lalu update terpisah.
- `src/features/settings/SettingsPage.tsx`
  - role-aware settings, edit nama/timezone via RPC, transfer ownership.
- `src/features/schedules/SchedulesPage.tsx` dan `src/routes.tsx`
  - role-aware management controls dan admin-only histori.
- `src/components/AppShell.tsx`, `src/App.tsx`
  - nav role consistency dan remount saat household berganti.
- `src/features/notifications/useNotifications.ts`, `src/components/NotificationBell.tsx`
  - unread query scoped, polling, action route, timezone rendering.
- `src/features/catalog/useCatalog.ts`, `src/features/catalog/CatalogPage.tsx`
  - batas minimum stok dan indikator stok rendah.
- `src/features/reports/ReportsPage.tsx`
  - filter kucing dan retry.
- `src/components/ui/*`, `src/lib/utils.ts`
  - primitives bergaya shadcn/ui untuk fondasi komponen baru tanpa mengganti logo/layout referensi.
- `scripts/dispatch-notifications-local.mjs`
  - one-shot dispatcher lokal; tidak mengaktifkan scheduler internet secara diam-diam.
- `scripts/local-integration.mjs`
  - integration runner local-only dengan Auth session dan RLS nyata; fixture hanya dibuat setelah local reset.
- `vite.config.ts`, `package.json`, CORS/template email, dan test contract
  - local-only enforcement.

## Perintah validasi

```powershell
npm run typecheck
npm run lint
npm test
npm run test:local
npm run build
```

`npm run test:local` membutuhkan Supabase lokal aktif dan `SUPABASE_SECRET_KEY` sementara dari `supabase status -o env`. Runner menolak URL non-loopback dan tidak boleh diarahkan ke project hosted.

Untuk local Supabase setelah Docker/CLI siap:

```powershell
supabase start
supabase db reset
supabase functions serve dispatch-due-notifications --env-file supabase/.env.local
$env:NOTIFICATION_DISPATCH_SECRET = 'secret-lokal'
npm run notifications:dispatch
```

`supabase db reset` hanya boleh diarahkan ke project local. Jangan gunakan `db reset --linked` dan jangan deploy ke internet.

## Interpretasi dan batasan

- Export JSON sengaja tidak mengekspor isi binary storage. Record `cat_attachments` tetap ada sebagai manifest (`storage_path`, nama file, tipe, ukuran) sehingga restore/tooling dapat menentukan file mana yang perlu dipulihkan.
- `settings` dibuka member karena notifikasi adalah preferensi pribadi. Data rumah, export, transfer owner, dan konfigurasi schedule tetap mengikuti role database.
- Push notification belum “otomatis” hanya dengan adanya Edge Function. Scheduler harus dijalankan oleh Supabase local/cron yang memang tersedia; script lokal hanya menyediakan jalur verifikasi eksplisit.
- Edge Function `export-household` sudah dijalankan melalui `supabase functions serve` dan tombol export owner tidak lagi menampilkan error. Delivery push nyata sengaja tidak dipalsukan: local QA belum memasang VAPID key/subscription browser, sehingga yang PASS adalah filtering/insert/secret gate dan bukan pengiriman push ke perangkat.
- Tidak ada data contoh, mock repository, fake metrics, atau localStorage untuk domain business state.

## Bukti visual QA

- Login/local setup: PASS terbatas. Terlihat logo Meowku, komposisi warm cream + orange, heading “Rawat kucing jadi lebih gampang.”, form email/password, dan tombol aksi utama pada viewport browser lokal.
- Authenticated dashboard, member view, schedule, settings, export, reports: smoke test browser pending pada putaran QA final. Data yang dipakai berasal dari fixture Auth lokal dan tidak akan masuk ke database hosted.
- Authenticated dashboard, member view, schedule, settings, export, reports: dashboard owner/member, settings owner/member, checklist member, dan export sudah diverifikasi. Reports belum diberi record metrik tambahan karena fixture harus tetap minimal; query/state sudah tercakup automated test.
