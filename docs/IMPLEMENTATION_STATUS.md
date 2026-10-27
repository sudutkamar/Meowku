# Meowku — Status Implementasi

Tanggal audit: 24 Oktober 2026 (Asia/Jakarta)

## Push notification, profil, dan bahasa mobile — 27 Oktober 2026

- PASS — `src/lib/pwa.ts` sekarang mendiagnosis secure context, Notifications API, Service Worker, Push API, konfigurasi VAPID, dan kebutuhan PWA iOS secara terpisah; tidak ada fallback mock.
- PASS — Avatar profil header dan preview profil menggunakan ukuran tetap, `aspect-ratio: 1`, dan `border-radius: 50%`.
- PASS — Kontrol bahasa ID/EN tetap tersedia pada viewport HP hingga 480px, dengan label aksesibel dan tooltip.
- PASS — Offline verification: 150 test, typecheck, dan production build lulus.
- BLOCKED — Verifikasi push nyata membutuhkan HTTPS/deployed PWA dan perangkat/browser yang mendukung; localhost melalui IP LAN memang tidak memenuhi secure context.
- PASS — `ConfirmDialog` memperbaiki bug keyboard mobile pada konfirmasi hapus permanen: focus trap kini hanya diinisialisasi saat dialog dibuka, memakai ref untuk callback/pending terbaru, dan memprioritaskan input sebagai initial focus.
- PASS — Runtime bahasa ID/EN diterapkan di seluruh UI statis tanpa mengubah data bisnis pengguna; istilah Indonesia “household” pada tampilan diganti menjadi “rumah”, sementara kontrak database tetap memakai istilah teknis internal.
- PASS — Next Up tidak lagi menampilkan tanggal/filter dari cache setelah semua jadwal dihapus; occurrence besok dicocokkan dengan schedule definition aktif sebelum fallback preview digunakan.
- PASS — Filter Next Up di-reset ke “Semua kategori” ketika kategori aktif sudah tidak tersedia, termasuk setelah seluruh jadwal lama dihapus.

## Audit bahasa, layout mascot, dan instalasi PWA — 27 Oktober 2026

- PASS — Cakupan translasi runtime diperluas ke halaman autentikasi, onboarding, dashboard, perawatan, katalog, anggota, histori, laporan, jadwal, pengaturan, export, status, empty state, dan copy install.
- PASS — Gutter responsif pada page heading mencegah deskripsi bahasa Inggris menabrak ilustrasi kucing route.
- PASS — Manifest memakai ikon asli PNG 192×192 dan 512×512; service worker meng-cache aset ikon; tombol install menggunakan `beforeinstallprompt` dengan fallback instruksi manual.
- PASS — Automated evidence: 153 test, typecheck, build 1.839 modul, dan smoke request localhost untuk manifest/icon/service worker lulus.
- BLOCKED — Browser tidak mengizinkan PWA/push penuh dari HTTP alamat IP LAN; secure context HTTPS atau localhost tetap wajib dan tidak bisa dilewati oleh kode aplikasi.

## Checkpoint

- C01 — PASS: 10 PNG UI dan logo original terdeteksi; ukuran dicatat di `docs/QA_REPORT.md`.
- C02 — PARTIAL: React/Vite/TypeScript, TanStack Query, Tailwind, dan build produksi berjalan; `@ts-nocheck` sudah dihapus, tetapi route tree masih perlu dipecah menjadi route typed per halaman.
- C03–C17 — BLOCKED for live validation: migrasi household/domain, RLS, schedule generation, immutable audit, and report RPCs are implemented, but local Postgres is unavailable at `127.0.0.1:54322`.
- Task 3 Auth/Onboarding — PARTIAL: auth session, sign-in/sign-up, household lookup, onboarding, dan route guard client sudah diimplementasikan; integrasi database belum diverifikasi karena Docker/Supabase lokal tidak tersedia.
- Task 4 Core CRUD — PASS (code-level): migration, household-scoped hooks, create/update/archive forms, empty/loading/error states, and route integration for cats, litter boxes, and catalog are implemented; live RLS/database validation is BLOCKED by unavailable local Postgres.
- Task 5 Schedule — PASS (code-level): recurrence definitions, target-level occurrences, Asia/Jakarta date generation, idempotent `on conflict do nothing`, authenticated generation/completion functions, and checklist UI are implemented; live transaction/RLS validation is BLOCKED by unavailable local Postgres.
- Task 6 History/Reports — PASS (code-level): append-only audit trigger, completion audit transaction, database report aggregate RPC, history page, and date-filtered report page are implemented; live aggregate/RLS validation is BLOCKED by unavailable local Postgres.
- C18 — PARTIAL: `npm run typecheck`, `npm test` (18 tests), and `npm run build` pass; build still reports Tailwind utility scan and chunk >500 kB warnings.
- Task 7 Member/Settings/Export — PASS (code-level): `20261024000900_members_settings_export.sql`, authenticated invite/export Edge Functions, RLS-scoped member actions, timezone persistence, and JSON export UI are implemented. Live RLS/function validation is BLOCKED by unavailable Docker/Postgres.
- Task 8 Responsive Shell — PASS (code-level): `AppShell`, `PageHeader`, `QueryState`, ten Indonesian navigation entries, mobile layout, focus styles, and reduced-motion handling are implemented; visual screenshot capture is NOT RUN in this CLI-only pass.
- Task 9 Verification — PASS for offline checks and BLOCKED for live checks: 25 Node tests, typecheck, and build pass; local Supabase status/lint and configured E2E flows are blocked by Docker Desktop.
- Batch 1 Production Hardening — PASS for offline contract checks: `src/lib/database.types.ts`, typed Supabase client, explicit DTO mutations, and `20261024001100_schedule_contract_hardening.sql` are implemented. `npm test` is 37/37, `npm run typecheck`, and `npm run build` pass. Live `supabase db push --linked` is BLOCKED and was not run because this checkout has no `supabase/config.toml` or linked project metadata; Docker Desktop is also unavailable. Detailed audit: `docs/SCHEMA_CONTRACT_AUDIT.md`.
- Dashboard redesign — PASS for offline implementation checks: dedicated `DashboardPage` and `useDashboard` use household-scoped Supabase queries for cats, litter boxes, active schedules, timezone-local today occurrences, completion rate, and audit activity; CTAs navigate through `AppShell`; loading, retry, error, and empty states are included. No migration was required. Visual screenshot QA and live Supabase/RLS validation remain BLOCKED in this CLI-only checkout because no browser session or local Postgres is available.
- Schedule lifecycle improvements — PASS: `20261024001300_schedule_lifecycle.sql` adds authenticated RPCs for automatic occurrence generation, schedule archive/delete safety, incomplete occurrence archive, immutable audit writes, and schedule-time-aware occurrence timestamps; `20261024001400_audit_write_hardening.sql` removes direct client audit inserts. `SchedulesPage` now filters Today/This Week/This Month using household timezone, confirms archive/destructive actions, preserves historical rows, and uses responsive action layouts. Added `tests/domain/schedule-lifecycle.test.mjs`; 50/50 tests, typecheck, build, `supabase db push --local`, `supabase db lint --local`, and `supabase db push --linked` pass. Visual screenshot QA was not run. Build retains the existing >500 kB chunk warning.
- UI preferences and responsive shell — PASS for offline checks: added `UIPreferencesProvider` for theme, Indonesian/English language, and desktop sidebar collapse persisted only under `meowku-ui-preferences`; `AppShell` now provides keyboard-accessible desktop collapse, mobile drawer/backdrop/Escape handling, theme and language controls, and preserves the original logo and navigation IDs. Added `tests/ui/preferences-shell.test.mjs`; `npm test` is 53/53, `npm run typecheck`, and `npm run build` pass. Visual screenshot QA was not run in this CLI-only pass. Build retains the existing >500 kB chunk warning.
- Members/admin capability hardening — PASS: `MembersPage` now has responsive member cards/table, server-derived capability state, member search, pending invitations, invite success/error states, role/removal confirmations, and an admin panel with audit navigation. Added `20261024001500_admin_capabilities.sql` for `household_access`, audited role/removal RPCs, admin-only entity/audit policies; `20261024001600_lock_member_writes.sql` removes direct membership mutation policies; `20261024001700_admin_entity_write_scope.sql` permits owner/admin household-wide updates while preserving server-owned insert identity. `npm test` is 54/54, `npm run typecheck`, `npm run build`, `supabase db push --local`, `supabase db lint --local`, and `supabase db push --linked` pass. Visual screenshot QA was not run; build retains the existing >500 kB chunk warning.
- Schedule backend overhaul — PASS: added `20261024001800_schedule_slots_and_rules.sql`, compatibility migration `20261024001900_schedule_target_household_compatibility.sql`, and lint cleanup `20261024002000_schedule_create_lint_cleanup.sql` with additive legacy backfill for `schedule_slots`, occurrence `slot_id` identity and uniqueness, ISO weekly weekdays, monthly `day_of_month`/`last_day`, active/paused/archived lifecycle, target household validation, atomic slot/target schedule creation, idempotent slot-aware generation, pause/resume/update RPCs, and archive/delete protections. Dashboard occurrences now exclude archived rows. Updated `src/lib/database.types.ts`, schedule mutation DTOs, and `tests/domain/schedule-overhaul.test.mjs` covering multi-slot daily rules, weekly/monthly rule contracts, target isolation, lifecycle, idempotency, and history preservation. Evidence: `npm test` 60/60, `npm run typecheck`, `npm run build`, `supabase db push --local`, `supabase db lint --local`, and `supabase db push --linked` pass. Visual screenshot QA was not run; build retains the existing >500 kB chunk warning.
- Dashboard checklist refresh — PASS for implementation and offline verification: checklist card now shows completion summary and progress, prioritizes incomplete occurrences, uses clearer completion actions, reduces completed-row emphasis, avoids grid stretch, and stacks safely on mobile. `npm test` 80/80, `npm run typecheck`, and `npm run build` pass. Visual screenshot QA remains NOT RUN; existing >500 kB build warning remains.
- Schedule history and global rotation — PASS for implementation and local schema validation: dashboard checklist now opens dedicated `Riwayat Jadwal` with Hari ini/Minggu ini/Bulan ini filters, assignment/completion actor labels, and completion actions. Owner/admin can configure one global household weekday rotation. New occurrences snapshot `assigned_to`; existing occurrences are not rewritten. Evidence: `npm test` 85/85, `npm run typecheck`, `npm run build`, `supabase db push --local`, and `supabase db lint --local` pass. Live multi-user auth/RLS behavioral testing and visual screenshot QA remain NOT RUN; existing >500 kB chunk warning remains.

Catatan: prototype lama telah disederhanakan agar tidak lagi menampilkan data bisnis fiktif ketika Supabase tidak dikonfigurasi. Task 3 memakai Supabase Auth dan query household tanpa URL/localStorage sebagai sumber otorisasi. Export dan undangan selalu memakai JWT aktif plus membership database; tidak ada service-role di frontend.

## 100x Product Improvement — 25 Oktober 2026

- PASS — URL-driven route tree, household context, lazy route loading, shared query keys, route-aware cat detail/tabs, and session cache isolation implemented.
- PASS — Daily Care dashboard now includes database-derived overdue/vaccine attention items and per-cat progress.
- PASS — Cat health/vaccine attachment linkage and reviewed scan lifecycle hooks implemented; private Storage contract preserved.
- PASS — Reports now include database-derived expense totals/categories, weight series, and vaccine due totals.
- PASS — Shared confirmation dialog and retry state implemented; member destructive actions use accessible confirmation.
- PASS — Offline verification: `npm test` 108/108, `npm run typecheck`, and `npm run build` pass.
- PASS — Build chunk warning removed through route lazy loading and vendor chunking.
- BLOCKED — Live Supabase migration/RLS/Storage/Edge/auth verification because Docker Desktop Linux engine is unavailable.
- NOT RUN — Visual screenshot QA and configured Playwright flows require a browser session and live/local Supabase.

## Phase 1–5 hardening and product improvement — 26 Oktober 2026

- PASS — Added `20261026000100_household_integrity_hardening.sql`: retires legacy owner-only policies, validates cat/food/attachment household relationships, and bounds client-supplied completion timestamps.
- PASS — Added `20261026000200_timezone_aware_reports.sql`: report overdue calculations now use the household timezone.
- PASS — Added multi-household session switching without URL identity or localStorage authorization; active selection remains in React state.
- PASS — Dashboard first-run checklist is derived from real household counts; no sample data was added.
- PASS — Cat care summary includes latest recorded weight and next vaccine due date using household timezone.
- PASS — Service worker caches only app shell/runtime same-origin assets; business data remains Supabase-only.
- PASS — Notification actions use `ConfirmDialog` and inline error state instead of native alert/confirm.
- PASS — Root `/` redirects to `/app`; PWA `start_url` is `/app`.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Petugas list and browser identity — 26 Oktober 2026

- PASS — Pengaturan Jadwal now renders the active database-backed petugas list immediately after adding a name.
- PASS — Petugas can be edited through `save_household_assignee` and removed through the existing safe archive RPC, preserving historical snapshots.
- PASS — Added responsive list actions, active-rotation status copy, dark-mode styling, and mobile-safe controls.
- PASS — Added Meowku favicon and Apple touch icon using the existing logo asset.
- PASS — `npm test`: 126 tests; `npm run typecheck`; `npm run build`.

## Bounded scrolling for long collections — 26 Oktober 2026

- PASS — Audited long collections across dashboard, entity pages, schedule timelines, history, members, petugas, notifications, search, and reports.
- PASS — Added shared `src/scroll-overflow.css` with internal max-height scrolling, scrollbar treatment, overscroll containment, mobile limits, dark mode, and reduced-motion behavior.
- PASS — Activity and checklist remain bounded like the requested dashboard activity pattern; other long lists now follow the same interaction model.
- PASS — Added coverage for the long-collection scroll contract.
- PASS — `npm test`: 127 tests; `npm run typecheck`; `npm run build`.

## Destructive-action confirmation and schedule edit UX — 26 Oktober 2026

- PASS — Added reusable `ConfirmActionButton` and applied it to schedule deletion/archive, task archive, cat deletion/archive, catalog archive, litter-box archive, slot removal, and notification clearing.
- PASS — Schedule Edit now scrolls the actual form into view with `scrollIntoView`, marks the form as edit mode, and keeps the long form inside a bounded scroll panel with sticky header/actions.
- PASS — History and schedule timelines retain bounded internal scrolling for dense data.
- PASS — `npm test`: 128 tests; `npm run typecheck`; `npm run build`.

## Schedule form visual repair — 26 Oktober 2026

- PASS — Removed decorative mascot artwork from the scrollable schedule form so it cannot cover target controls.
- PASS — Repaired sticky schedule header/footer backgrounds for dark mode; no light fallback panel remains inside the dark UI.
- PASS — Sticky positioning now keeps the schedule title, fields, and actions readable while the form content scrolls.
- PASS — Localhost smoke QA confirmed the Jadwal route renders its form structure without the previous white overlay/mascot collision.
- PASS — `npm run typecheck`; `npm run build`.

## Scroll placement refinement — 26 Oktober 2026

- PASS — Refined scrolling so only collection bodies scroll; section headings, filters, action areas, and member table headers remain visible.
- PASS — Petugas list now keeps its heading/count fixed while only the rows scroll.
- PASS — Added sticky member table header, scrollbar gutter reservation, overscroll containment, and subtle scroll affordance shadows.
- PASS — Kept contextual heights per collection instead of one indiscriminate page-wide scroll rule.
- PASS — `npm test`: 127 tests; `npm run typecheck`; `npm run build`.

## Safe petugas actions — 26 Oktober 2026

- PASS — Hapus petugas now opens the shared accessible confirmation dialog before calling the archive RPC.
- PASS — Edit petugas now opens a dedicated modal popup with separate Batal and Simpan perubahan actions.
- PASS — Existing rotation/history semantics remain safe: removing a name archives it from new choices and does not rewrite historical tasks.
- PASS — Localhost visual QA confirmed both popup flows and focusable dialog actions.
- PASS — `npm test`: 126 tests; `npm run typecheck`; `npm run build`.
- PASS — Localhost browser smoke QA: dashboard loaded with direct Kucing navigation, interactive MascotBuddy, mascot empty states, and the full visual layer.

## Whole-product cute UI/UX revamp — 26 Oktober 2026

- PASS — Added `src/whole-ui.css` to unify auth/onboarding, shell, page headings, forms, lists, timelines, reports, cat detail, notifications, and dashboard surfaces.
- PASS — Added route-wide cat visual language with original local illustrations, softer surfaces, stronger hierarchy, tactile controls, responsive behavior, and dark-mode parity.
- PASS — No business logic, Supabase source-of-truth, route contracts, or RLS behavior was replaced.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Global UI/UX revamp — 26 Oktober 2026

- PASS — Added `src/revamp.css` with a unified warm/playful visual system across shell, header, cards, forms, lists, dashboard, schedule rotation, and cat-care workspace.
- PASS — Strengthened hierarchy, rounded surfaces, tactile buttons, section accents, responsive spacing, and dark-mode parity.
- PASS — Preserved all existing database-backed logic and navigation contracts.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Stronger cute visual pass — 26 Oktober 2026

- PASS — Increased mascot buddy from a subtle strip to a prominent responsive hero card with speech-bubble treatment, paw accent, contextual state color, and larger illustration.
- PASS — Added stronger playful hierarchy to dashboard stats, focus cards, checklist/activity cards, household cards, and cat strip while preserving readable information density.
- PASS — Added light/dark variants and mobile adjustments for the stronger visual treatment.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Interactive mascot buddy V2 — 26 Oktober 2026

- PASS — Added `MascotBuddy` dashboard interaction with messages derived from real setup/completion state.
- PASS — Added responsive mascot card, hover reaction, expandable context copy, and dark-mode styling.
- PASS — No business data is fabricated; all displayed status comes from existing Supabase-backed dashboard queries.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Mascot motion layer — 26 Oktober 2026

- PASS — Added CSS mascot motion: gentle float, sparkle pulse, avatar pulse, and hover reaction.
- PASS — Animations respect `prefers-reduced-motion` and require no GIF runtime or external library.
- PASS — Motion remains theme-safe and uses the existing original local mascot assets.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Meowku mascot visual system expansion — 26 Oktober 2026

- PASS — Added a reusable mascot visual layer with original checklist and food cat illustrations.
- PASS — Added cat-themed dashboard accents, onboarding mascot treatment, empty-state sparkle details, hover motion, and responsive/reduced-motion behavior.
- PASS — Added dark-mode overrides for mascot-adjacent cards and care tabs so the visual language remains coherent across themes.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.
- PASS — Localhost browser QA: `/` redirected to `/app`; dashboard rendered with configured Supabase data and first-run checklist. No write action was performed.
- BLOCKED — Live application of new migrations and adversarial two-household RLS/Storage tests were not run because this checkout has no safe local Supabase runtime/configuration. No remote reset or deployment was performed.

## Schedule assignment and cat-care workspace refinement — 26 Oktober 2026

- PASS — Schedule rotation UI now has responsive weekday cards, timezone-safe date defaults, explicit synchronization semantics, and dark/light theme controls.
- PASS — Schedule creation shows the current database-backed weekly assignment snapshot, so schedule setup and rotation settings are visibly synchronized.
- PASS — Cat detail no longer renders a redundant cat dropdown when the route already identifies one cat.
- PASS — Added route-aware `Pengeluaran` care tab backed by the existing household-scoped `cat_expenses` flow.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.
- PASS — Localhost browser smoke QA rendered Pengaturan Jadwal with the new weekday/date layout and sync explanation.

## Original cat illustration system — 26 Oktober 2026

- PASS — Generated original transparent mascot artwork for Meowku without external references or borrowed assets.
- PASS — Added `public/illustrations/meowku-checklist-cat.png` for dashboard/query empty states.
- PASS — Added `public/illustrations/meowku-food-cat.png` for cat-care empty states.
- PASS — Kept the existing logo unchanged and avoided using illustrations as full-page backgrounds.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Dashboard layout density fix — 26 Oktober 2026

- PASS — Dashboard activity preview reduced to four latest audit events; full history remains available from Histori.
- PASS — Dashboard grid cards are content-led and no longer stretch the checklist card to the activity panel height.
- PASS — Activity panel has a bounded scroll area as a safety net for unusually dense audit data.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.
- PASS — Localhost browser smoke QA: dashboard rendered with four activity rows and the existing Supabase-backed household data.

## Whole-product UI/UX revamp — 26 Oktober 2026

- PASS — Added a shared per-route visual treatment for auth/onboarding, jadwal, histori, laporan, export, settings, anggota, dan entity pages.
- PASS — Added contextual original mascot placement, section accents, panel hierarchy, hover states, mobile sizing, and reduced-motion safeguards.
- PASS — Preserved database-backed behavior and introduced no mock business data or fake metrics.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.
- BLOCKED — Live Supabase migration/RLS execution remains blocked by unavailable Docker Desktop Linux engine; no remote reset/deployment was performed.

## Report compatibility and overlap polish — 26 Oktober 2026

- PASS — Laporan now prefers the timezone-aware `household_report` RPC and safely falls back to the previous three-argument signature when an older local schema reports `PGRST202`.
- PASS — Fixed RPC method binding so the compatibility path uses the active Supabase client correctly.
- PASS — Reserved mascot space in admin capability panels so illustration artwork cannot cover action buttons; mobile hides the decorative mascot in that compact panel.
- PASS — Added smoother sidebar, tab, modal-close, and row interaction transitions with reduced-motion compatibility.
- PASS — Localhost visual QA: Laporan rendered real database-derived metrics; profile modal no longer overlaps its controls.
- PASS — `npm test`: 125 tests; `npm run typecheck`; `npm run build`.

## Global responsive layout system — 27 Oktober 2026

- PASS — Added `src/layout-system.css` as the final responsive layout layer for the authenticated shell, desktop/sidebar canvas, sticky header, CRUD workspaces, dashboard, schedule, members, history, reports, settings, and cat-care screens.
- PASS — Added tablet/mobile layout transitions, safe-area support, touch targets, content wrapping, overflow containment, dark-theme parity, and reduced-motion handling.
- PASS — Added fixed mobile quick navigation for Dashboard, Jadwal, Kucing, Litter Box, and Lainnya so primary flows stay reachable without repeatedly opening the drawer.
- PASS — Reworked the schedule slot editor into one responsive composition: label stays readable, time and row actions wrap together, and the form uses the page scroll instead of a cramped nested scrollbar.
- PASS — On the desktop sidebar, the visible Jadwal label now reads `Tambah jadwal`; the mobile quick-nav schedule action intentionally opens `Riwayat Jadwal` for operational use.
- PASS — Mobile `Semua jadwal` is now a card stack with a two-column action grid, wrapping long labels instead of creating a vertical button rail.
- PASS — Riwayat jadwal now includes a database-backed `Jadwal besok` preview using the household timezone, active occurrences, target names, categories, times, and assigned petugas.
- PASS — The next-day preview has an explicit empty state, retry state, dark-mode styles, and responsive card layout for HP/tablet/desktop.
- PASS — Occurrence reads now call the idempotent generation RPC for the exact requested date range before selecting rows, so schedules without a pre-generated tomorrow row are repaired on read.
- PASS — Added `20261027000200_schedule_occurrence_repair.sql` so schedule edits also regenerate missing rows for the updated date/slot/target definition without overwriting completed history. The version avoids the existing `20261027000100_custom_schedule_categories.sql` migration.
- PASS — `supabase db push --yes` berhasil menerapkan `20261027000200_schedule_occurrence_repair.sql` ke database remote setelah konflik nomor migration diperbaiki.
- PASS — Jika occurrence besok masih kosong, panel sekarang menghitung ulang preview dari definisi jadwal aktif Supabase (harian, mingguan, atau bulanan), termasuk fallback slot lama yang belum memiliki baris `schedule_slots` dan fallback `start_date` dari `scheduled_at`; occurrence nyata tetap diprioritaskan dan tidak digandakan.
- PASS — Diagnosis read-only remote menemukan jadwal `Makan` tersimpan sebagai `repeat_unit = month` meski rentangnya 27 Oktober–26 November; record tersebut diperbaiki menjadi `repeat_unit = day`, interval 1, dengan rentang tetap, lalu 90 occurrence future di-backfill idempoten (3 slot × 30 tanggal yang belum ada). Verifikasi tanggal 28 dan 26 November masing-masing menghasilkan 3 tugas.
- PASS — Added regression coverage for the layout contract in `tests/ui/scroll-overflow.test.mjs`.
- PASS — Redesigned `Next Up / Jadwal besok` as a separate timeline composition with dominant times, next-item emphasis, slot/target metadata, responsive mobile columns, dark-mode parity, and flexible category badges for built-in and custom categories.
- PASS — Added an accessible collapse dropdown, category filter built from actual tomorrow rows (including custom categories), and bounded internal scrolling so a large next-day list does not extend the page indefinitely.
- PASS — `npm test`: 150/150; `npm run typecheck`; `npm run build`.
- PASS — Localhost signed-out visual screenshot QA completed after stylesheet load.
- BLOCKED — Full authenticated mobile click-through visual QA remains blocked until an approved Supabase test session is available; no business data was created or modified.

## PWA install diagnosis and guardrail — 27 Oktober 2026

- PASS — PWA favicon, Apple touch icon, manifest icons, and notification icon/badge use valid PNG assets.
- PASS — Install UI explains that `http://<IP-LAN>:5173` is not installable on HP because non-localhost PWA and Web Push require HTTPS.
- PASS — iPhone/iPad install guidance now uses the native Share → Add to Home Screen flow.
- PASS — `npm test`: 153/153; `npm run typecheck`; `npm run build`.
- BLOCKED — Local LAN phone installation remains dependent on an HTTPS certificate trusted by the phone; this is an environment/network requirement, not a missing manifest field.

## Sidebar jadwal hierarchy — 27 Oktober 2026

- PASS — Sidebar now presents `Jadwal` as the main menu with `Tambah jadwal` and `Jadwal saya` as dropdown children.
- PASS — Active route state, keyboard semantics, desktop collapsed mode, mobile drawer, and English labels are covered by the navigation implementation.
- PASS — `npm test`: 153/153; `npm run typecheck`; `npm run build`.
