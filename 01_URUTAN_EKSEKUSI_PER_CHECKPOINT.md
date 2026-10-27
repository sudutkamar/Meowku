# PROMPT BERTAHAP (untuk agent yang lebih cocok dikerjakan per sesi)

Jika agent sanggup melaksanakan satu master prompt: gunakan `00_MASTER_EXECUTION_PROMPT.md` lalu semua dokumen. Jika dibagi, tempel instruksi berikut satu per satu; jangan ulang stack lama.

**Sesi 1 — Bootstrap:** Baca AGENTS, master, docs; buat React Vite TS strict, TanStack Router Query, Tailwind shadcn; konfig router, layout dasar, database ENV/setup states, lint/typecheck/build. Tunjukkan output aktual.

**Sesi 2 — Supabase & Security:** Implementasikan migrations, RLS, Storage policies, Edge Functions, authenticated RPC, onboarding; test dengan user A dan B; jangan isi dummy data/seed runtime.

**Sesi 3 — Brand & Base UI:** Terapkan PNG logo persis, sidebar 10 menu, header, design tokens, responsiveness; screenshot compare.

**Sesi 4 — UI 01..05:** Jalankan masing-masing prompt 01–05, query/mutation nyata; test persistence dan RLS. Jangan lanjut jika CRUD sebelumnya mati.

**Sesi 5 — UI 06..10:** Jalankan prompt 06–10, laporan benar, admin permissions, scheduled generator idempotent, invites, settings; test cases.

**Sesi 6 — Hardening & QA:** Jalankan seluruh checkpoint; perbaiki hasil until verified. `npm run lint`, `typecheck`, `test`, `build`, local smoke; visual diffs dan security tests.

Setiap sesi harus mencatat `docs/IMPLEMENTATION_STATUS.md` dan `docs/QA_REPORT.md` dengan bukti nyata, bukan menandai semua selesai otomatis.
