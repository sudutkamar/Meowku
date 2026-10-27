# MEOWKU — PROMPT LENGKAP SATU FILE
**Semua bagian berikut harus diikuti bersama aset PNG pada `REFERENSI_DESAIN/`. Paket ini berisi prompt, bukan source project siap jalan.**


---

<!-- SOURCE: AGENTS.md -->
# AGENTS.md — Instruksi Tidak Bisa Ditawar

1. **Gunakan stack final React + Vite + TypeScript, TanStack Router + Query, Tailwind + shadcn/ui, Supabase Auth/Postgres/RLS/Edge.** Abaikan dan jangan menyalin project SvelteKit/.NET/Rust lama; aset UI/UX saja yang boleh dipakai dari paket terdahulu.
2. **Satu-satunya sumber data bisnis adalah Supabase PostgreSQL.** Tidak boleh mock repository, hardcoded metrics, sample cats/products/users, seed.sql yang memuat record fiktif, hardcoded hasil chart, fake API response, atau localStorage untuk domain state. Placeholder input, ilustrasi dekoratif, dan test fixtures dalam DB test terisolasi diperbolehkan, tidak boleh muncul di app umum.
3. Jika kredensial Supabase belum tersedia, tampilkan `SetupRequired` informatif atau gunakan Supabase CLI lokal. JANGAN diam-diam beralih ke mock data.
4. Ikuti 10 screenshot satu per satu; logo yang dipilih tidak boleh diganti. Screenshot bukan gambar latar halaman dan bukan source data.
5. Pertahankan istilah bahasa Indonesia, sidebar menu, struktur halaman, warm cream + orange, rounded cards, tipografi dan hierarki dari referensi.
6. Implementasikan seluruh alur sampai berjalan: Auth, onboarding, household, cats, litter boxes, catalog, jadwal, checklist selesai, histori audit, laporan hasil query, manajemen anggota, settings, export; tidak ada tombol hias.
7. Gunakan **RLS aktif di semua tabel aplikasi**; cek keamanan multi-household dan role owner/admin/member di database dan Edge Functions. Client guard hanyalah UX, bukan pengganti RLS.
8. Edge Functions harus memverifikasi identitas dari JWT dan otoritas berdasarkan database. Jangan menerima role/household arbitrary sebagai sumber otorisasi; jangan letakkan service-role di frontend.
9. Jadwal bulanan idempotent, timezone Asia/Jakarta default tetapi configurable, penyelesaian per target kucing/litter, audit immutable, tugas jadwal masa lalu tidak tertimpa regenerate.
10. Ketika menyelesaikan tiap fase, dokumentasikan file yang dibuat, migrasi, perintah, screenshot visual QA, bukti testing, bug, dan status PASS/FAIL/BLOCKED. Jangan klaim PASS jika belum dijalankan.
11. Jangan deploy ke internet; hanya localhost. Jangan melakukan `db reset --linked` atau operasi destruktif pada project remote.
12. Jika ada detail visual tidak terbaca, cocokkan komposisi screenshot dan dokumentasikan interpretasi; jangan mengorbankan fungsi atau keamanan untuk menyamai data palsu di gambar.



---

<!-- SOURCE: PROMPTS/00_MASTER_EXECUTION_PROMPT.md -->
# MASTER PROMPT — EKSEKUSI SELURUH PROJECT MEOWKU (COPY/PASTE KE AGENT)

Kamu adalah **Principal Full-Stack Engineer, React Architect, Supabase/PostgreSQL Security Engineer, dan Senior UI/UX Implementer**. BANGUN proyek website **Meowku** yang fungsional sampai dapat dijalankan di localhost dengan seluruh halaman mengikuti referensi desain di folder `REFERENSI_DESAIN`. Kerjakan kode, SQL migration, RLS, Edge Functions, automated tests, dokumentasi, dan pemeriksaan visual. **JANGAN hanya menghasilkan konsep/pseudocode. JANGAN berhenti pada skeleton atau UI statis.**

## A. BACA FILE SEBELUM MENULIS KODE
- Baca `AGENTS.md`, seluruh `DOKUMENTASI/*.md`, dan `PROMPTS/MENU/*.md` di paket ini.
- Cocokkan setiap menu dengan PNG pasangannya; lihat screenshot pada ukuran aslinya.
- Logo pilihan user adalah `REFERENSI_DESAIN/LOGO/Meowku_Logo_Kucing_Jam_Original.png` (siluet kucing hitam melingkar seperti jam, jarum oranye, telinga pink). Pakai file itu, JANGAN membuat logo alternatif.
- Referensi lama yang memakai SvelteKit/TypeScript/.NET/Rust HARUS DIABAIKAN untuk teknologi. **Stack pilihan user saat ini mengesampingkan seluruh stack lama.**

## B. STACK WAJIB
1. React (functional components + hooks) + Vite + TypeScript dengan strict type checking.
2. TanStack Router file-based routing via `@tanstack/router-plugin/vite` (router plugin mendahului React plugin) + typed router context & protected routes.
3. TanStack Query untuk async queries/mutations, scoped query keys, invalidation, retries aman, cache; optimistically update hanya dengan rollback yang benar.
4. Tailwind CSS + shadcn/ui, styling kustom mengikuti desain; lucide-react icons. Komponen shadcn harus distyling, jangan dibiarkan default abu-abu.
5. Supabase Auth (email/password, reset password, session, logout; email confirmation bila aktif).
6. Supabase PostgreSQL (semua data bisnis, timestamps, constraints, indeks, migrations).
7. Supabase Row Level Security (household isolation, role access, authorized storage policies).
8. Supabase Edge Functions untuk operasi istimewa/multi-step: undangan anggota, terima undangan, generate jadwal, export data, penghapusan akun/household dengan konfirmasi.
Boleh memakai Zod, React Hook Form, Recharts (shadcn Chart), date-fns/Intl, Vitest, React Testing Library dan Playwright. Hindari backend kedua, ORM berat yang tidak perlu, framework lain, Redis dan CMS.

## C. KONTRAK: TANPA DATA DUMMY
- **Tidak ada seed produk/kucing/pengguna atau data tiruan yang tampil di UI.** Semua angka Dashboard/Laporan dan seluruh kartu/Tabel/Chart harus berasal dari query Supabase yang terautentikasi.
- Jangan hardcode `Nala`, `Mochi`, `Oreo`, `Luna`, `Ariel`, `128 pengguna`, `96%`, `155 tugas`, `Royal Canin`, dll. Itu hanya isi contoh pada gambar referensi.
- Tidak boleh `mockData.ts`, `demo.ts`, `localStorage` business store, `faker`, `Math.random()` untuk data, `setTimeout` seolah request berhasil, mock fetch atau fake chart series di runtime.
- Jika database belum diisi: tampilkan empty state, 0 hanya kalau query valid yang benar-benar menghasilkan 0, opsi `Tambah Kucing`, `Tambah Litter Box`, `Tambah Item`, `Buat Jadwal` sesuai role.
- Jika Supabase down/ENV tidak ada: state error/setup; **jangan fallback ke demo**. Jika request gagal, tampilkan error dan sediakan retry. Jangan menandai berhasil sebelum server mengonfirmasi.
- Untuk automated tests, boleh membuat record sementara **di Supabase lokal TEST saja**, dihapus sesudahnya. Jangan mengaktifkan dev fixture untuk runtime umum.

## D. FITUR END-TO-END
- Auth & guard per role.
- Onboarding user pertama, membuat household nyata; user pertama yang membuat household menjadi owner; onboarding tidak menambahkan kucing/item otomatis.
- Sidebar: Dashboard, Jadwal, Katalog, Kucing, Litter Box, Histori, Laporan; grup ADMIN: Pengaturan Jadwal, Pengguna; terakhir Pengaturan. Hanya role owner/admin yang melihat tautan admin.
- Multi-household membership dengan selector jika user menjadi anggota lebih dari satu household; setiap query pakai `household_id` dari membership aktif yang tervalidasi.
- CRUD Cats, Litter Box, Catalog dan saldo stok terjaga secara transaksional.
- Monthly schedule generator admin: date range hingga 1 bulan kalender ke depan; aktivitas Makan Pagi/Siang/Sore/Malam dan Bersihkan Litter Box; konfigurasi hari, jam, target all/specific; tampil preview; hanya submit saat valid.
- Jadwal grup dapat memiliki banyak target (contoh 4 kucing dan 2 litter box); status per-target, tidak boleh seluruh grup dianggap selesai jika baru satu target selesai.
- Activity log audit by authenticated user + actual time; status `pending`, `completed`, `skipped`; `overdue` dihitung dari waktu dan status, bukan disimpan sebagai status utama.
- Histori filter + paging + export dari server. Laporan hitung dari actual DB rows, tampil empty/no activity jika memang belum ada data.
- Users admin invite/edit role/deactivate di household dengan aturan mencegah menghapus owner terakhir; profil dan preferensi nyata.
- Upload foto private ke Supabase Storage dengan kebijakan household; jika belum ada foto tampil monogram/placeholder netral tanpa mengaku itu foto kucing asli.

## E. REFERENSI VISUAL TINGKAT TINGGI
- Screenshot referensi ada dalam `REFERENSI_DESAIN/UI/01_Dashboard.png` ... `10_Pengaturan.png`; jangan digabung menjadi satu tampilan.
- Tata letak desktop (sekitar 1672×941 untuk menu 2–10; dashboard 1536×1024), sidebar kiri tetap, topbar search + notifikasi + user dropdown, background hangat krem, kartu putih/cream dengan border tipis, bayangan lembut, accent oranye, navy/charcoal typography, ikon kucing/makanan/litter.
- Jangan mengganti warna, logo, tekstur, jarak, jumlah kolom, hirarki kartu, teks tombol/menu, dan ikon utama tanpa alasan.
- Responsive: desktop mendekati PNG; tablet grid menyesuaikan; mobile sidebar menjadi drawer, tidak menyebabkan horizontal overflow.
- Gunakan `shadcn/ui` (Button, Card, Dialog, Form, Input, Select, Table, Tabs, Calendar, Sheet, Badge, AlertDialog, Skeleton, Toast/Sonner, DropdownMenu). Gunakan Tooltip dan aria-label pada kontrol ikon.
- Cocokkan gambar di screenshot visual regresi. Data yang tampil harus nyata meskipun secara visual berbeda dari isi screenshot.

## F. ARSITEKTUR & BACKEND
- Implementasikan struktur dalam `DOKUMENTASI/01_ARSITEKTUR_DAN_STRUKTUR_FOLDER.md`; route `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/onboarding`, `/app`, `/app/jadwal`, `/app/katalog`, `/app/kucing`, `/app/litter-box`, `/app/histori`, `/app/laporan`, `/app/admin/pengaturan-jadwal`, `/app/admin/pengguna`, `/app/pengaturan`.
- Supabase client hanya di `src/lib/supabase/client.ts` memakai `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. Secret keys di edge-only environment dan tidak pernah dibundel Vite.
- Semua schema, enum/check constraints, FK, indeks, policies, grants, functions dan storage policies versi SQL migration; gunakan SQL agar bersifat transaksional dan idempotent.
- RLS aktif pada setiap tabel public; policy SELECT/INSERT/UPDATE/DELETE eksplisit. Edge Function pakai JWT user, validasi schema input dan role langsung dari DB. `SECURITY DEFINER` hanya jika benar-benar perlu, `SET search_path = ''` + fully-qualified table names + authorize caller.
- Selalu baca permissions real dari DB; jangan percaya role yg dikirim client. Race condition pada task completion, catalog stock, invitation dan schedule generation harus ditangani dengan transaksi/unique constraints.
- RLS menolak user lain/household lain walaupun ia mengetahui ID record. UI tidak cukup sebagai pengamanan.
- Zona waktu rumah default `Asia/Jakarta`; `scheduled_at` UTC `timestamptz`, `local_date` date, template local time, jadwal ditampilkan sesuai timezone rumah; format Indonesia.

## G. ALUR KERJA WAJIB — CHECKPOINT
**Kerjakan berurutan; tiap fase harus menghasilkan kode berjalan + bukti:**
1. Audit semua aset + token UI + kebutuhan halaman + daftar komponen.
2. Bootstrap React + Vite + TS, Tailwind + shadcn, router + query, lint/typecheck/test setup.
3. SQL schema dan RLS dengan test role; create first household onboarding.
4. Supabase Auth end-to-end dan protected routes.
5. Layout global + visual logo, sidebar/topbar, responsive.
6. Implementasi Dashboard + Jadwal + Katalog + Kucing + Litter Box + Histori + Laporan + Pengaturan Jadwal + Pengguna + Pengaturan sesuai masing-masing prompt.
7. Edge Functions lengkap dan dipanggil dari UI; privasi/permissions sesuai DB.
8. Error/empty/loading/toast, form validation, query invalidation, data synchronization.
9. Tests: unit, integration, policy RLS cross-tenant, E2E; lakukan visual comparison screenshot setiap route pada dimensi yang sama dengan referensi, laporkan perbedaan.
10. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev`, Supabase local migrations/functions, smoke test di browser. Simpan bukti dalam `docs/qa`.
11. Serahkan repo yang bisa diulang setup-nya, README, `.env.example`, `.gitignore`, migrations, functions, E2E, `docs/IMPLEMENTATION_STATUS.md`, `docs/QA_REPORT.md` dan screenshot QA.

## H. ATURAN PENYERAHAN
Jangan menyebut "100% tuntas" sebelum: seluruh 10 menu render nyata, CRUD dan alur Auth berjalan, RLS diuji dari 2 akun/household, no dummy records, report hasil actual queries, schedule generator idempotent, no credential leaks, linter/types/build & tests lulus, halaman desktop dibandingkan dengan PNG dan mobile bebas overflow. Jika ada BLOCKED (contoh butuh SMTP/invite provider/service key), catat apa, kenapa, dan instruksi menyelesaikannya; jangan menyembunyikannya.

**SEKARANG LANGSUNG KERJAKAN FILE DAN IMPLEMENTASINYA, BUKAN MENULIS ULANG PROMPT ATAU HANYA MEMBUAT DESIGN CONCEPT. Mulai dari audit referensi visual, lanjut implementasi, uji, dan checkpoint sampai aplikasi siap di localhost.**



---

<!-- SOURCE: DOKUMENTASI/01_ARSITEKTUR_DAN_STRUKTUR_FOLDER.md -->
# 01 — Arsitektur dan Struktur Folder Proyek Yang Harus Dibuat Agent

## Prinsip
React + Vite adalah SPA, bukan Next/Svelte atau full-stack server. CRUD biasa di frontend melalui `supabase-js` yang diatur RLS. Operasi istimewa & multi-step melalui Supabase Edge Functions dan database RPC transaksi. Query TanStack menyimpan cache per user dan household, bukan sebagai sumber data permanen. Route memakai TanStack Router file-based, loader untuk session gating, logout harus clear sensitive cache.

## Struktur folder TARGET hasil implementasi (belum ada dalam kit)
```
meowku-web/
├── public/
│   ├── logo/meowku-clock-cat.png
│   └── illustrations/              # gambar dekoratif hak pakai jelas; bukan screenshot tempel
├── src/
│   ├── main.tsx
│   ├── index.css                    # @import "tailwindcss" + CSS design tokens
│   ├── routeTree.gen.ts             # file GENERATED, jangan di-edit manual
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── auth.callback.tsx
│   │   ├── onboarding.tsx
│   │   ├── app.tsx                  # LayoutRoute, auth guard
│   │   ├── app.index.tsx            # Dashboard
│   │   ├── app.jadwal.tsx
│   │   ├── app.katalog.tsx
│   │   ├── app.kucing.tsx
│   │   ├── app.litter-box.tsx
│   │   ├── app.histori.tsx
│   │   ├── app.laporan.tsx
│   │   ├── app.admin.pengaturan-jadwal.tsx
│   │   ├── app.admin.pengguna.tsx
│   │   └── app.pengaturan.tsx
│   ├── components/
│   │   ├── ui/                      # komponen shadcn/ui yang terpasang
│   │   ├── layout/                  # AppShell Sidebar Topbar Breadcrumb
│   │   ├── shared/                  # EmptyState/ErrorState/Loaders/ConfirmDialog...
│   │   ├── charts/                  # visualisasi berasal dari hasil query
│   │   └── forms/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── jadwal/
│   │   ├── katalog/
│   │   ├── kucing/
│   │   ├── litter-box/
│   │   ├── histori/
│   │   ├── laporan/
│   │   ├── pengaturan-jadwal/
│   │   ├── pengguna/
│   │   └── pengaturan/
│   │       └── ... tiap feature: components/, hooks/, api.ts, schema.ts, types.ts
│   ├── hooks/                      # auth, household, permissions, persistent user preference
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── supabase/database.types.ts  # GENERATED
│   │   ├── query-client.ts
│   │   ├── query-keys.ts
│   │   ├── dates.ts
│   │   ├── errors.ts
│   │   └── utils.ts
│   ├── providers/                  # Query, Auth, Household, Theme, Toaster
│   └── tests/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 202610240001_base.sql
│   │   ├── 202610240002_rls.sql
│   │   ├── 202610240003_functions.sql
│   │   └── 202610240004_storage.sql
│   └── functions/
│       ├── _shared/                # auth, db, errors, schema, CORS jika perlu
│       ├── generate-month-schedule/index.ts
│       ├── invite-member/index.ts
│       ├── accept-invitation/index.ts
│       ├── manage-member/index.ts
│       ├── export-activities/index.ts
│       └── delete-account/index.ts
├── tests/
│   ├── e2e/
│   └── security/
├── docs/
│   ├── IMPLEMENTATION_STATUS.md
│   ├── QA_REPORT.md
│   ├── screenshots/
│   └── decisions.md
├── vite.config.ts
├── components.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Commands — agent wajib menyesuaikan jika upstream terbaru berganti
```bash
npm create vite@latest meowku-web -- --template react-ts
cd meowku-web
npm install
npm install @tanstack/react-router @tanstack/react-query @supabase/supabase-js zod react-hook-form @hookform/resolvers lucide-react
npm install -D @tanstack/router-plugin supabase tailwindcss @tailwindcss/vite
npx shadcn@latest init
# Add komponen shadcn yg perlu sesuai tiap halaman melalui npx shadcn@latest add ...
# Atur @/* alias pada Vite dan kedua TS configs, serta @import 'tailwindcss' pada CSS
# Router plugin WAJIB diletakkan sebelum react() dalam vite.config.ts
npm run dev
```
`npx shadcn@latest init` dapat meminta konfigurasi; pilih mode project React + Vite. Ikuti dokumentasi resmi versi terpasang. Tambahkan `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` dan pastikan semuanya benar-benar berhasil.

## .env.example
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```
- `VITE_*` hanya untuk publishable/client key. Edge server secrets dideklarasikan pada Supabase secrets atau env lokal Edge Functions.
- Supabase CLI local: `npx supabase init`, `npx supabase start`, `npx supabase db reset` (LOCAL SAJA), `npx supabase functions serve`; untuk local env ambil nilai dari `npx supabase status`.
- Berikan penjelasan cara memilih Supabase lokal (butuh Docker) vs Supabase cloud kosong (frontend tetap `localhost:5173`).
- Jangan men-deploy.

## Query dan state
- Query keys selalu menyertakan `userId` + `householdId` + `filters` + `page` agar cache multi-household tidak tercampur.
- Data server tidak di-copy ke state lokal kecuali draft form dan optimistic cache state sementara; invalidate query setelah mutation yang sudah confirmed.
- Mutasi setiap operasi harus mempunyai pending/success/error; cegah double-click; error toast eksplisit.
- Theme preference boleh persistent local cache sementara, tetapi sumber pilihan profil yang sinkron tetap database.
- Lazy load route, komponen chart berat, resize observer bila perlu. Jangan query semua log sejarah pada satu halaman.

## Catatan keamanan
- Guard route /app/admin dibarengi RLS/Edge authorization sebenarnya.
- Semua token/cookie auth dikelola SDK dengan praktik terbaru, waspadai script injection; tidak melakukan hardcode superadmin email.
- Tidak perlu `supabase.service_role` sama sekali untuk CRUD biasa; jika admin Auth API digunakan di Edge, batasi dengan pemeriksaan role + simpan key pada secret runtime saja.



---

<!-- SOURCE: DOKUMENTASI/02_DATABASE_RLS_EDGE.md -->
# 02 — Spesifikasi Supabase: PostgreSQL, RLS, Auth, Storage, Edge Functions

**Ini adalah kontrak implementasi SQL**, bukan skema yang sudah di-deploy. Agent harus menulis migration SQL yang executable, migrasi secara lokal, dan test negative/positive. Gunakan `uuid`, tipe data tepat, `created_at timestamptz DEFAULT now()`, foreign keys, CHECK/UNIQUE, `household_id` untuk isolasi, `updated_at`, trigger audit sebagai perlu. PENTING: tidak boleh menjadikan setiap `public.*` tabel terbuka secara default.

## Domain dan skema tabel minimal
1. `profiles`: `id uuid PK REFERENCES auth.users(id)`, `display_name`, `avatar_path`, `created_at`, `updated_at`. User boleh ubah profil sendiri. Baca profil member satu household hanya kolom yang aman via view/akses yang jelas (jangan expose email confidential ke tenant lain).
2. `households`: id, `name`, `timezone` (default `Asia/Jakarta`), `created_by` FK auth.users, timestamps. Owner/admin mengelola household.
3. `household_members`: id, household_id, user_id, `role` (`owner|admin|member`), `is_active`, joined_at; unique(household_id,user_id). Hanya member aktif boleh mengakses household.
4. `household_invitations`: id, household_id, email normalized, invited_role, token_hash **bukan raw token**, expires_at, consumed_at, invited_by. Tidak dapat dibaca member biasa. Penerimaan melalui Edge setelah identitas email cocok.
5. `cats`: id, household_id, name, sex nullable, breed/color/notes nullable, birth_date nullable, weight nullable tidak sebagai sumber histori, image_path nullable, archived_at nullable, timestamps. Semua record harus dibuat user asli.
6. `litter_boxes`: id, household_id, name, location, kind, size nullable, image_path nullable, archived_at nullable, timestamps.
7. `litter_box_cats`: `(litter_box_id, cat_id)` PK, jamin keduanya satu household di trigger/constraint DB; jangan izinkan relasi lintas household.
8. `catalog_items`: id, household_id, name, category (`food|litter|medicine|equipment|other`), brand nullable, unit, image_path, min_stock numeric nonnegative, current_stock numeric nonnegative **hanya berubah via RPC ledger**, description, archived_at. `catalog_item_movements`: id, item_id, household_id, quantity_delta, reason, actor_id, occurred_at; perubahan stok transaksional, unit konsisten. Pastikan UPDATE current_stock direct restricted terhadap client/member.
9. `cat_weight_entries`: id, household_id, cat_id, weight_kg > 0, measured_at, recorded_by; chart dari data ini saja.
10. `care_notes`: id, household_id, cat_id nullable, litter_box_id nullable, body, author_id, created_at; validate target set exactly one.
11. `schedule_templates`: id, household_id, name, activity_type (`feed|clean_litter`), feeding_slot (`pagi|siang|sore|malam`, nullable untuk clean), local_time TIME, days_of_week SMALLINT[] ISO 1..7, starts_on DATE, ends_on DATE NULL, target_mode (`all|selected`), catalog_item_id optional **sebagai referensi** (jangan otomatis potong stok tanpa konfirmasi consumption), `active`, created_by, created_at, updated_at. Validasi valid days/ranges/slot.
12. `schedule_template_targets`: id, template_id, `cat_id uuid NULL REFERENCES cats` atau `litter_box_id uuid NULL REFERENCES litter_boxes`, satu target tepat; hanya digunakan jika mode selected, DB enforce kind-target match dan household consistency.
13. `scheduled_tasks`: id, household_id, template_id, `local_date DATE`, `scheduled_at TIMESTAMPTZ`, activity_type, feeding_slot nullable, created_at; UNIQUE(template_id, local_date), snapshot nama/slot bila perlu untuk melindungi histori; jangan menyimpan status global yang bisa bohong terhadap target.
14. `scheduled_task_targets`: id, household_id, scheduled_task_id, cat_id nullable, litter_box_id nullable, status (`pending|completed|skipped`), completed_at nullable, completed_by nullable, notes nullable, updated_at; exactly one target, FK household coherence, UNIQUE task+target non-null (partial unique indexes). Tombol group menandai semua target hanya setelah explicit konfirmasi.
15. `activity_logs`: id, household_id, scheduled_task_target_id, actor_id, action (`completed|skipped|reopened`), happened_at, note nullable, created_at; **append-only** dan immutable bagi client. Mutasi status & append audit di DB transaction. Item editing salah jangan hapus audit.
16. `notification_preferences`: user_id + household_id unique, due_reminders, daily_summary, weekly_report, member_activity, updated_at. Jangan mengaku mengirim email/push kalau delivery belum dikonfigurasi. Bisa implement **in-app notifications** di tabel berikut.
17. `notifications`: id, household_id, user_id, type, title, body, seen_at, created_at. Akses hanya penerima. Scheduled notifications hanya dibuat dengan mekanisme background yang benar, atau gunakan reminder saat app terbuka dan jelaskan keterbatasannya.
18. `user_preferences`: user_id PK, theme (`light|dark|system`), locale (`id-ID`), font_scale; updated_at. Jika aplikasi hanya bahasa Indonesia, jangan tampilkan dropdown bahasa yang tidak punya implementasi.

## Semantik laporan tanpa inflasi
- **Kartu aktivitas** (schedule group) ≠ **jumlah tindakan per-target**. Pada satu hari: 4 slot makan + 1 slot kebersihan = 5 kartu/tugas grup. Bila ada 4 kucing + 2 litter box, target tindakan bisa 4×4 + 2 = 18 penyelesaian per hari. Dokumentasikan jenis agregasi pada setiap angka dan tooltip.
- `progress`: completed targets / semua targets terjadwal dalam periode, abaikan postponed/skipped sesuai definisi tertulis; `overdue` hanya target pending yang scheduled_at lewat now, banding UTC.
- `consistency`: persentase completed on-time atau completed overall? Pilih **completed/eligible targets** dengan definisi jelas; hindari bagi 0 (tampilkan `—` jika belum ada data).
- `streak`: jumlah hari berurutan terakhir dengan semua target due hari itu completed; jangan menghitung hari kosong sebagai sukses.
- Weight trend hanya dari weight entries, tidak boleh contoh grafik saat record kosong.
- Users list hanya household saat ini, bukan semua penguna Supabase.

## Edge Functions required (server-side TypeScript)
1. `generate-month-schedule`: signed-in admin/owner; Zod validation; input household ID, start-date, end-date, templates/rules; maximum 1 calendar month; preview dihitung di client tapi server revalidasi; jalankan Postgres transaction/RPC untuk insert tasks dan task targets atomik; UNIQUE membuat idempotent; return counts of new/existing/groups/targets. Hormati timezone rumah; mulai `23 Oct 2026` sampai `22 Nov 2026` = 31 hari contoh, jika template 5 maka 155 **group task**, jumlah target tergantung real cats/litter boxes.
2. `invite-member`: owner/admin mengundang email role admin/member; lakukan role authorization berbasis `household_members` + approved email, rate-limit/invitation expiry; jika email infrastructure tidak aktif berikan **secure invite link** yang dapat disalin admin, jangan menyatakan email terkirim.
3. `accept-invitation`: JWT signed-in user dengan email terverifikasi cocok invitation; token single-use; transaction adds membership, marks consumed, protects replay.
4. `manage-member`: admin/owner change role, deactivate/reactivate remove membership; **tidak bisa menurunkan/menghapus owner terakhir**; non-owner tidak boleh assign owner; no cross-household.
5. `export-activities`: signed-in member household yang berhak baca logs; server export CSV dengan date filters; batasi rentang dan size, paginate, escape CSV formula injection (`=`, `+`, `-`, `@`), jangan ekspor household lain.
6. `delete-account`: auth verified, explicit confirmation & optional fresh reauthentication; periksa apakah user last owner dan memerlukan transfer/household deletion; kalau belum diimplementasikan aman, blokir dengan penjelasan daripada tombol palsu. Gunakan admin API hanya Edge dengan secret server-only.

## RLS & privilege matrix
| Resource | Member aktif | Admin aktif | Owner |
|--|--|--|--|
| profiles | self, limited shared view | self + shared view | self + shared view |
| cats/litter/catalog | read + record care actions; edit sesuai kebijakan eksplisit | full CRUD | full CRUD |
| schedules/templates | read scheduled | create/edit future | create/edit future |
| task targets | complete/skip own household via authenticated RPC | same | same |
| activity_logs | read own household, insert via RPC only | read/export | read/export |
| reports | read own household | read/export | read/export |
| memberships/invites | read membership summary saja | invite/change member (bukan owner) | invite/change/transfer |
| household settings | read | edit | edit |
| own preferences/profile | read/write own | read/write own | read/write own |

Kunci perlu dibuat SQL RLS dan grants (bukan hanya matrix). Policy recursion untuk `household_members` harus diatasi dengan helper/function aman atau desain yang tidak self-reference. Helper membership boleh `security definer set search_path = ''` dengan pemeriksaan identitas `auth.uid()` dan fungsi hanya mengembalikan boolean akses; set `REVOKE/GRANT EXECUTE` eksplisit. Jangan broad SECURITY DEFINER yang mengembalikan seluruh tabel.

## Storage
- Buckets private `cat-images`, `litter-images`, `catalog-images`, `profile-avatars`.
- Key prefix household scoping `${household_id}/${entity_id}/${randomName}` dengan safe content type/size.
- Storage RLS policies for SELECT/INSERT/UPDATE/DELETE based on authenticated user and household membership; profile avatars only self. Signed URL expiring or `download` auth; jangan public bucket kecuali desain khusus disetujui.
- Jangan menerima path arbitrary yang mengakses tenant lain; hapus object lama saat penggantian melalui mekanisme tersupervisi.

## Testing keamanan dan data
- 2 akun household A dan B: token B SELECT/UPDATE/DELETE row A harus empty/403 sesuai policy; function dengan household A dari user B = 403.
- Member biasa direct invoke `generate-month-schedule`, `invite-member`, `manage-member` = 403; RLS tidak mengizinkan insert template.
- Unauthenticated users jangan bisa baca protected data, settings, storage file.
- Invited user email mismatch/reused/expired = denied.
- Double-click mark-complete tidak menciptakan duplicate logs; race update 2 devices safe.
- Schedule generate twice: 2nd run new=0, duplicate=0; stable history; DST/timezone validation.
- Stock cannot become negative; membership changes do not leak TanStack Query cache.

## RLS SQL reference pattern (adaptasi lengkap ke schema riil)
```sql
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
CREATE POLICY cats_member_read ON public.cats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members AS hm
    WHERE hm.household_id = cats.household_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.is_active = true
  )
);
```
Ini **hanya contoh pola**; `household_members` juga memerlukan kebijakan non-rekursif yang aman. Implementasikan full policy matrix (SELECT/INSERT/UPDATE/DELETE), indexes, tests dan gunakan `WITH CHECK` pada INSERT/UPDATE. Pertimbangkan schema/helper membership yang optimized. Jangan menganggap SQL contoh ini sebagai migrasi lengkap.

## Supabase authentication aktual
- Register/login/logout/password reset; signup confirmation email boleh enabled sesuai project.
- Jika membangun app localhost dengan Supabase cloud, whitelist redirect `http://localhost:5173/auth/callback` di Auth URL Configuration (atau callback route yang benar).
- First signed-in user dapat membuat household via authenticated atomic RPC/Edge yang mengisi `households + household_members owner`. Jangan membuat admin global hardcoded.
- Supabase Auth service role hanya di server saat benar-benar butuh tindakan admin; never in Vite bundle.



---

<!-- SOURCE: DOKUMENTASI/03_DESIGN_SYSTEM_DAN_TEXT_TAGS.md -->
# 03 — Design System + Text Tags yang Diimplementasi Sesuai Referensi

## Visual source of truth
`REFERENSI_DESAIN/UI/01_Dashboard.png` (1536×1024), `02_Jadwal.png` sampai `10_Pengaturan.png` (1672×941), logo original 1254×1254. Jangan memakai gambar screenshot sebagai page background; harus membuat komponen asli agar interaktif, bisa mobile, accessible, dan dynamic dari DB.

## Style target
- Brand: Meowku; logo siluet kucing hitam berbentuk jam dengan aksen oranye dan pink.
- Warna pendekatan awal dari mockup (**sampling screenshot boleh mengoreksi**): primary `#FF7417`–`#FF7A12`, primary-hover `#EC6200`, page cream `#FFF9F2`, card white `#FFFFFF`, muted peach `#FFF0E3`, title charcoal `#142039`/`#17233A`, text-muted slate `#63718C`, success green `#15B972`, info blue `#2BA8F5`, danger red `#EE4C4C`.
- Font: sans-serif modern yang dekat preview; gunakan font open-license seperti Inter/Plus Jakarta Sans bila tersedia. Prioritas screenshot: bobot judul bold, body 13–15px, numerals tabular, keterbacaan.
- Radius card 14–22px, tombol 9–14px; outline lembut, subtle shadow, vertical spacing ~16–24px, toolbar ~64–78px, sidebar desktop ~260–290px.
- Sidebar cream-putih, item active peach; logo pojok atas; kelompok ADMIN dibedakan heading; bottom cat illustration bersifat dekoratif.
- Topbar: pencarian (kucing, jadwal atau aktivitas) memfilter/menavigasi hasil real, shortcut Ctrl/Cmd+K jika benar-benar diterapkan, bell menampilkan in-app notifications, user menu/avatar dari auth profile (bukan nama contoh), action logout.
- Empty/loading/error: skeleton menjaga geometri kartu yang sama, empty state ramah tetapi tidak menipu, toast dan AlertDialog untuk aksi irreversible.
- Responsive: 1672px desktop dekat referensi; 1280px ukuran grid turun; 768px sidebar collapsible; 375px mobile satu kolom, tables scroll secara wajar, forms full width, touch area minimum 44px.

## Route menu & label persis
1. `Dashboard` — `/app`
2. `Jadwal` — `/app/jadwal`
3. `Katalog` — `/app/katalog`
4. `Kucing` — `/app/kucing`
5. `Litter Box` — `/app/litter-box`
6. `Histori` — `/app/histori`
7. `Laporan` — `/app/laporan`
8. `Pengaturan Jadwal` — `/app/admin/pengaturan-jadwal` (admin/owner only)
9. `Pengguna` — `/app/admin/pengguna` (admin/owner only)
10. `Pengaturan` — `/app/pengaturan`

## Text tags utama (jangan gunakan label bahasa Inggris untuk UI normal)
| Konteks | Label/action / keadaan |
|---|---|
| Global | `Cari kucing, jadwal, atau aktivitas...`, `Tambah`, `Simpan`, `Simpan Perubahan`, `Batal`, `Edit`, `Hapus`, `Lihat Semua`, `Muat Ulang`, `Belum Ada Data`, `Coba Lagi`, `Keluar` |
| Onboarding | `Selamat datang di Meowku`, `Buat Rumah Pertama`, `Nama Rumah`, `Mulai Kelola` |
| Dashboard | `Selamat pagi/siang/sore/malam`, `Jadwal Hari Ini`, `Ringkasan Mingguan`, `Aktivitas Terbaru`, `Jadwal Mendatang`, `Total Makan`, `Litter Box`, `Konsistensi`, `Tambah Kucing` |
| Jadwal | `Jadwal`, `Tambah Jadwal`, `Bulan`, `Minggu`, `Hari`, `Hari ini`, `Ubah Tanggal`, `Progress Hari Ini`, `Makan Pagi`, `Makan Siang`, `Makan Sore`, `Makan Malam`, `Bersihkan Litter Box`, `Tandai Selesai` |
| Katalog | `Katalog`, `Tambah Item`, `Semua`, `Makanan`, `Pasir`, `Obat`, `Perlengkapan`, `Template Perawatan`, `Stok Menipis`, `Stok`, `Cari item katalog...`, `Penyesuaian Stok`, `Tambah ke Jadwal` |
| Kucing | `Kucing`, `Tambah Kucing`, `Ringkasan`, `Jadwal`, `Riwayat Makan`, `Berat Badan`, `Catatan`, `Galeri`, `Catatan Kesehatan`, `Tambah Catatan`, `Ubah Foto` |
| Litter | `Litter Box`, `Tambah Litter Box`, `Kondisi Saat Ini`, `Terakhir Dibersihkan`, `Tandai Dibersihkan`, `Jadwal`, `Riwayat`, `Catatan`, `Ringkasan Perawatan`, `Lokasi` |
| Histori | `Histori Aktivitas`, `Tanggal`, `Kucing`, `Aktivitas`, `User`, `Status`, `Reset Filter`, `Export`, `Daftar Histori Aktivitas` |
| Laporan | `Laporan`, `Ekspor Laporan`, `Aktivitas Harian`, `Tren Konsistensi`, `Ringkasan Performa`, `Insight & Analisis`, `Distribusi Aktivitas`, `Total Tugas Makan`, `Total Pembersihan Litter Box` |
| Jadwal Admin | `Pengaturan Jadwal`, `Buat Jadwal Baru`, `Periode Jadwal`, `Tanggal Mulai`, `Tanggal Selesai`, `Pilih Aktivitas & Waktu`, `Target Kucing`, `Semua Kucing`, `Pilih Kucing Tertentu`, `Preview Jadwal`, `Generate Jadwal` |
| Pengguna | `Pengguna`, `Tambah Pengguna`, `Total Pengguna`, `Pengguna Aktif`, `Pengguna Nonaktif`, `Semua Role`, `Semua Status`, `Urutkan`, `Aktif`, `Nonaktif`, `Undang Pengguna` |
| Pengaturan | `Pengaturan`, `Profil & Akun`, `Notifikasi`, `Tampilan`, `Data & Privasi`, `Jadwal`, `Pengguna`, `Integrasi`, `Tentang`, `Terang`, `Gelap`, `Sistem`, `Ekspor Data`, `Hapus Akun`, `Pengingat Jadwal`, `Ringkasan Harian` |
| State | `Belum`, `Menunggu`, `Selesai`, `Dilewati`, `Terlambat`, `Gagal memuat data`, `Anda tidak memiliki akses`, `Tidak ada aktivitas pada periode ini`, `Data berhasil disimpan` |

## UX non-palsu
- Label `Hari ini` memakai jam saat itu dan timezone household, bukan hardcoded 23 Okt 2026.
- Greeting dari profil user sesungguhnya, nama kucing dari tabel cats, status dari task targets, aktivitas terbaru dari audit logs, chart dari aggregation query.
- `Tambah Pengguna` adalah undangan rumah, bukan membuat auth.user palsu.
- `Stok Menipis` hanya dihitung dari catalog_items ketika real stock <= min stock. `Template Perawatan` tab hanya muncul jika fitur template memiliki backend nyata; jika belum, jangan tombol dead-end.
- Upload gambar asli atau fallback ikon/monogram. Ilustrasi kucing hias boleh dalam layout tetapi bukan entitas cats.
- Diagram laporan tanpa DB rows: empty chart dengan ajakan mencatat aktivitas, bukan garis/column palsu.

## Pixel QA
Agent harus mengambil screenshot masing-masing route setelah render pada viewport sesuai PNG. Tulis perbedaan visual yang perlu dibetulkan (posisi sidebar, ukuran cards, spacing, warna, typography, iconography). Jangan memanipulasi screenshot aplikasi dengan overlay PNG referensi, dan jangan mengklaim 100% pixel-identical jika isi data berubah/komponen dinamis.



---

<!-- SOURCE: DOKUMENTASI/04_QA_CHECKPOINTS.md -->
# 04 — QA & Acceptance Checkpoints (Agent wajib mengisi dan melampirkan bukti)

Semua status dimulai `NOT RUN`. Jangan centang berdasarkan asumsi. Buat `docs/QA_REPORT.md` dengan tanggal, environment, perintah, output ringkas, screenshot, pass/fail/blocker.

| ID | Checkpoint | Bukti yang diminta | Status awal |
|---|---|---|---|
| C01 | 10 referensi PNG dan logo dicek ukuran asli; visual token terambil | screenshot/notes | NOT RUN |
| C02 | React Vite TS strict, TanStack Router, Query, Tailwind, shadcn berjalan | package/console | NOT RUN |
| C03 | Auth signup/login/logout/reset session benar | E2E/video/console | NOT RUN |
| C04 | First user onboarding household owner, DB kosong | SQL query + UI | NOT RUN |
| C05 | All migrations & RLS policies valid; cross-household disallowed | script + hasil negatif | NOT RUN |
| C06 | 10 routes tampil, UI konsisten logo yang dipilih | 10 screenshot at native reference viewport | NOT RUN |
| C07 | Kucing CRUD dan cat weight/notes + storage benar | end-to-end | NOT RUN |
| C08 | Litter boxes CRUD/relationships + cleaning actual | end-to-end | NOT RUN |
| C09 | Catalog CRUD/stock movement transaction and negative stock blocked | test before/after | NOT RUN |
| C10 | Generate monthly schedule 1 month: timezone, weekdays, targets, idempotency | DB assertion + UI preview | NOT RUN |
| C11 | Complete per cat/litter target; logs immutable; race/double click | 2-client test | NOT RUN |
| C12 | History real query, filters/pagination/export secure | DB verification | NOT RUN |
| C13 | Report metrics/charts from DB only and true empty states | screenshots with empty and populated DB | NOT RUN |
| C14 | Member invites/role protections and last-owner prevention | 2-user test/403 evidence | NOT RUN |
| C15 | Settings persist and notification delivery matches claims | before-after DB + UX | NOT RUN |
| C16 | No dummy/hardcoded demo business records or silent mock fallback | code grep audit | NOT RUN |
| C17 | Auth/RLS/storage/Edge unauthorized positive/negative tests pass | logs/error codes | NOT RUN |
| C18 | `npm run lint`, `typecheck`, `test`, `build` green | command outputs | NOT RUN |
| C19 | Responsive mobile 375, tablet 768, desktop 1672; no overflow | screenshots | NOT RUN |
| C20 | Localhost functional with Supabase local or connected cloud; no deployment | instructions + smoke run | NOT RUN |

### Mandatory E2E flows
1. Clear DB (test local only) -> Signup -> Confirm if enabled -> Login -> Onboarding household -> Empty dashboard (no fake rows).
2. Create 2 actual cats and 1 actual litter box via UI -> schedule 4 feeds + 1 clean -> preview -> generate -> check table tasks + targets.
3. Mark 1 cat fed but not second -> group partially complete (not full), audit actor+time; finish second -> group completed.
4. Complete clean -> correct litter updated; filter by cat/litter/actor/date; export CSV and compare SQL.
5. Create catalog item and stock movement -> low stock status derived from real value, no implicit consumption.
6. Invite member via secured Edge -> accept token -> member sees group data but cannot admin route or direct Edge invoke.
7. Create separate household as different user -> cannot read first household even with UUID known.
8. Refresh / browser reopen: all server-created data persists in DB and reloads, query cache keys not leaking across auth sessions.
9. Disconnect Supabase: error/retry, no fake cards. Empty report after no activity: no fictional percentages/bars.
10. Delete/revoke flows use confirmation & session revalidation; don't leave dangerous open endpoint.

### Visual acceptance
- 10 side-by-side reference/application screenshots with notes and adjusted CSS. 
- All menu items and buttons functional (navigate, mutate, or intentionally disabled with explanation).
- Recreate layout, not pixel-exact fake content. Interactions accessible: keyboard, dialog focus, mobile nav.



---

<!-- SOURCE: DOKUMENTASI/05_OFFICIAL_DOCS.md -->
# Official Documentation (agent must use current APIs)

- TanStack Router, file-based Vite: https://tanstack.com/router/latest/docs/installation/with-vite
- TanStack Router file-based conventions: https://tanstack.com/router/latest/docs/routing/file-based-routing
- TanStack Query optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- shadcn/ui for Vite: https://ui.shadcn.com/docs/installation/vite
- Supabase Auth with React: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Function securing: https://supabase.com/docs/guides/functions/auth
- Supabase Edge Function CORS: https://supabase.com/docs/guides/functions/cors
- Supabase CLI local dev: https://supabase.com/docs/guides/local-development
- Supabase database functions & SECURITY INVOKER/DEFINER: https://supabase.com/docs/guides/database/functions

Use stable versions compatible at project generation time and commit exact lockfile. Example patterns change over time; don't copy an incompatible outdated API blindly.



---

<!-- SOURCE: PROMPTS/MENU/01_DASHBOARD.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/02_JADWAL.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/03_KATALOG.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/04_KUCING.md -->
# Prompt Implementasi Menu — Kucing

**File referensi wajib:** `REFERENSI_DESAIN/UI/04_Kucing.png`. **Route:** `/app/kucing`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Kucing`, tombol `Tambah Kucing`, horizontal profile cards cat (foto/nama/umur dan ringkasan dari DB) + tile tambah. Content detail kucing terpilih dengan portrait besar, profil ringkas di sisi kiri, tab `Ringkasan`, `Jadwal`, `Riwayat Makan`, `Berat Badan`, `Catatan`, `Galeri`; konten utama chart Berat Badan, Jadwal Hari Ini, Ringkasan Aktivitas 7 hari, Catatan Kesehatan mengikuti referensi. Gunakan monogram/ikon jika foto belum ada, bukan foto Nala contoh.

## Behavior
- CRUD cat (name required, date/breed/sex optional, image upload), field validated; role admin edit/archive dan user yang diizinkan menambah care notes/weights sesuai policy.
- Selector cat via router search param typed; selected id tidak boleh dibaca jika bukan household; fallback ke cat pertama dari query (bukan fake cat).
- Umur dari birthdate jika ada; jika tidak tampil `Usia belum diisi`, jangan beri umur rekayasa.
- Weight chart mengambil `cat_weight_entries` ordered measured_at, handles 1 data point, no data -> CTA catat berat. Form catat berat >0 dan time actual.
- Cat health notes adalah teks yang dimasukkan user, tidak mengklaim status medis dari ketiadaan data; badge `Sehat` hanya bila ada state/penilaian user yang eksplisit disimpan, jika belum tampil `Belum dinilai`.
- Jadwal per-cat via join scheduled_task_targets; care history per-cat via logs; foto galeri dari Storage real; edit dan archive soft-delete dengan confirmation serta efek pada future schedules dijelaskan.

## Data dan tests
Multi cats filtering, notes and weight actual, upload replace/delete auth, no fabricated photos, archived cat historical reference preserved, chart never fake.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.



---

<!-- SOURCE: PROMPTS/MENU/05_LITTER_BOX.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/06_HISTORI.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/07_LAPORAN.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/08_PENGATURAN_JADWAL.md -->
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



---

<!-- SOURCE: PROMPTS/MENU/09_PENGGUNA.md -->
# Prompt Implementasi Menu — Pengguna (Admin)

**File referensi wajib:** `REFERENSI_DESAIN/UI/09_Pengguna.png`. **Route:** `/app/admin/pengguna`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Judul `Pengguna`, topcards `Total Pengguna`, `Pengguna Aktif`, `Pengguna Nonaktif`; toolbar search nama/email anggota household, filter Semua Role/Status, sort, `Tambah Pengguna`; table Pengguna, Email, Role, Status, Tanggal Bergabung, Aksi (kebab), selection/pagination. Ikuti spacing mockup.

## Behavior
- Di Vite frontend tidak dapat membuat pengguna autentikasi secara aman dengan admin API. `Tambah Pengguna` **harus berupa `Undang Pengguna`**, memanggil secured `invite-member` Edge yang membuat invitation real; kirim email hanya bila delivery service configured; kalau tidak ada, tampil link aman yang bisa disalin admin. Jangan membuat profile atau user palsu sebelum invite diterima.
- Table hanya current `household_members` yang benar-benar terdaftar; empty state jika hanya owner pertama (count actual 1, bukan 128 fake).
- Role owner/admin/member, disabled/inactive. Owner yang terakhir tidak boleh dikeluarkan/dinonaktifkan atau turun role. Admin tidak boleh menaikkan dirinya menjadi owner atau mengubah role owner; server enforced.
- Link invite expiry/single-use; accept only matching authenticated verified-email; resend and revoke invitation jika backend implemented. UI tab `Undangan Tertunda` boleh ditambah as long as backend real.
- Search/filter/pagination server-side; date join from membership `joined_at`, bukan salah hitung relatif.
- `Aksi` tersedia menurut permission: ubah role, nonaktifkan/aktifkan, keluarkan dari household, batalkan undangan; seluruhnya confirmation + Edge.

## Data dan tests
Current owner baseline, invite second account, member unauthorized 403 on routes and functions, last owner invariant, multi-household separate lists, changed role invalidates cache/session guard.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.



---

<!-- SOURCE: PROMPTS/MENU/10_PENGATURAN.md -->
# Prompt Implementasi Menu — Pengaturan

**File referensi wajib:** `REFERENSI_DESAIN/UI/10_Pengaturan.png`. **Route:** `/app/pengaturan`.

**Instruksi ke coding agent:** Implementasikan menu ini penuh menggunakan komponen React TypeScript + TanStack Router/Query + Tailwind/shadcn dan Supabase; cocokkan screenshot sedetail mungkin (grid, hierarchy, typography, icons, spacing, peach/orange colors), tetapi dilarang menyalin data contoh/angka/foto produk/avatar ke dataset runtime. Aset referensi screenshot untuk visual QA, bukan background. Kerjakan kode, RLS terkait, error/loading/empty state, tests dan bukti visual.

## Layout desktop
Heading `Pengaturan`; tab strip `Profil & Akun`, `Notifikasi`, `Tampilan`, `Data & Privasi`, `Jadwal`, `Pengguna`, `Integrasi`, `Tentang`; main cards `Profil & Akun` (avatar, nama, email), `Tampilan Aplikasi` (Terang/Gelap/Sistem, warna aksen jika tersedia), `Data & Privasi` (Ekspor Data, Kelola Data, Kebijakan Privasi, Hapus Akun), `Notifikasi` (pengingat jadwal, ringkasan harian, laporan mingguan, aktivitas pengguna), `Tentang Aplikasi` memakai logo asli. Dalam mobile tab strip scroll.

## Behavior
- Profil nama/avatar dari `auth.users`/`profiles`; update `profiles` melalui RLS; email update mengikuti Supabase Auth verification flow (`auth.updateUser`) dan feedback hasil; jangan update DB email saja seolah Auth berubah.
- Password reset/update memakai Supabase Auth API session/re-auth yang benar. Form and toast after actual success.
- Theme light/dark/system benar-benar mengubah CSS, persisted user_preferences; jangan bilang sistem tersedia jika tidak bekerja.
- Bahasa Indonesia sebagai language yang berfungsi; bila dropdown bahasa lain tidak diterjemahkan sepenuhnya, jangan tawarkan sebagai pilihan fiktif.
- Notifikasi toggles write `notification_preferences`. Jelaskan perbedaan **in-app reminders saat app online** vs email/push: hanya tampilkan jenis yang delivery-nya implemented. Jika background email/push belum ada, sembunyikan opsi atau tandai `Belum tersedia`, tidak pura-pura sukses mengirim.
- `Data & Privasi`: export authorized activity data/own profile nyata; `Hapus Akun` wajib confirmation, secure Edge, last-owner constraint, redact sensitive details, no irreversible action automatically without user.
- Tab Jadwal menampilkan default household timezone (Asia/Jakarta) dan date format; setting household hanya admin, profile settings pribadi tetap bisa diedit member.
- `Integrasi`: jika belum ada backend integrasi jangan menaruh tautan/toggle palsu, berikan empty state `Belum ada integrasi terhubung`.
- `Tentang`: hanya deskripsi app/version dari package atau build metadata nyata; bantuan/kebijakan perlu konten actual atau route jelas; jangan tautan placeholder `example.com`.

## Data dan tests
Change theme and reload, update real profile, password, email, notification DB state; delete confirmation and role enforcement; no fake avatar/email/version/hyperlink.

**Acceptance:** tidak ada tombol mati, tidak ada hardcoded data contoh, data bertahan setelah refresh, RLS/role aman, route deep-link benar, responsive, screenshot desktop dibandingkan gambar sumber, status QA tidak dipalsukan.
