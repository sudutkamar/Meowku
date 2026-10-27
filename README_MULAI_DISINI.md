# MEOWKU — EXECUTION KIT (React + Supabase)

**Jenis paket:** source project React + Supabase beserta 10 gambar UI/UX dan logo pilihan user. Jalankan dan uji program menurut perintah di bawah; jangan menganggap validasi database lulus ketika Docker/Supabase lokal belum tersedia.

## Stack FINAL — satu-satunya yang diizinkan
- React + Vite + TypeScript (strict)
- TanStack Router (`@tanstack/react-router`, file-based routing via `@tanstack/router-plugin`)
- TanStack Query (`@tanstack/react-query`)
- Tailwind CSS (integrasi Vite) + shadcn/ui + lucide-react
- Supabase Auth, Supabase PostgreSQL, Supabase RLS, Supabase Edge Functions
- Library pelengkap yang boleh digunakan secara terbatas: `@supabase/supabase-js`, Zod, React Hook Form, date-fns/Intl, Recharts via shadcn Chart, Playwright, Vitest, ESLint, Prettier.
- **Dilarang:** Svelte/SvelteKit, .NET, Rust, Next.js, Express/NestJS backend kedua, mock API, demo provider, data dummy, localStorage sebagai sumber data aplikasi.

## File yang harus dibaca agent (URUTAN)
1. `AGENTS.md` — peraturan permanen dalam workspace
2. `PROMPTS/00_MASTER_EXECUTION_PROMPT.md` — satu prompt utama untuk EKSEKUSI SEMUA
3. `DOKUMENTASI/01_ARSITEKTUR_DAN_STRUKTUR_FOLDER.md`
4. `DOKUMENTASI/02_DATABASE_RLS_EDGE.md`
5. `DOKUMENTASI/03_DESIGN_SYSTEM_DAN_TEXT_TAGS.md`
6. `PROMPTS/MENU/01_DASHBOARD.md` s.d. `10_PENGATURAN.md` — rincian setiap halaman
7. `DOKUMENTASI/04_QA_CHECKPOINTS.md` — kriteria selesai, validasi, bukti

## Referensi visual — bukan aset data
- `REFERENSI_DESAIN/UI/01_Dashboard.png` s.d. `10_Pengaturan.png`
- `REFERENSI_DESAIN/LOGO/Meowku_Logo_Kucing_Jam_Original.png`
- Semua gambar mockup adalah **visual target**; nilai, foto kucing, merek produk, grafik, dan nama pengguna yang terlihat adalah **contoh komposisi**, BUKAN data nyata dan DILARANG di-hardcode.

## Cara pakai
1. Ekstrak ZIP ini ke folder yang dapat dibaca agent (mis. `meowku-spec/`).
2. Tempel isi `PROMPTS/00_MASTER_EXECUTION_PROMPT.md` ke agent dan berikan akses file dalam paket.
3. Beri izin agent membuat source project baru `meowku-web/` **sejajar dengan folder prompt** (atau atur working directory lain jika perlu).
4. Jalankan di localhost. Pilih **Supabase CLI lokal (Docker)** atau hubungkan **Supabase cloud yang masih kosong** memakai `.env.local`.
5. Lengkapi entri nyata melalui onboarding setelah autentikasi, bukan dengan seed/fixture palsu.
6. Pastikan semua checkpoint dites sebelum menyebut project selesai.

## Variabel environment frontend
```
VITE_SUPABASE_URL=<URL project Supabase atau URL lokal dari supabase status>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key yang aman untuk browser>
```
`VITE_` dapat dilihat browser. **DILARANG** menaruh `service_role`, `sb_secret_...`, password DB, SMTP credential atau token admin pada variabel `VITE_*`.

## Catatan realistis
UI bisa meniru komposisi mockup seakurat mungkin, tetapi isi akan berbeda ketika database belum memiliki data. '100% tuntas' adalah hasil implementasi dan pengujian, bukan sesuatu yang bisa dijamin hanya oleh prompt.

## Verifikasi lokal
```bash
npm test
npm run typecheck
npm run build
supabase status
supabase db lint --local
```

`npm test`, typecheck, dan build dapat dijalankan tanpa database. `supabase status` dan `supabase db lint --local` membutuhkan Docker Desktop dengan engine Linux aktif. Jika engine tidak tersedia, catat sebagai `BLOCKED` di `docs/QA_REPORT.md`; jangan memakai data mock atau localStorage sebagai fallback.

Fungsi undangan dan export memeriksa JWT lalu membership household di database. Export tersedia dari halaman `Pengaturan`, sedangkan role owner/admin/member dan perubahan timezone tetap dibatasi oleh RLS.
