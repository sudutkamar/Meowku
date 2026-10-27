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
