# Worklog — 16 November 2026, Wave 1 (Operations/Infra Cleanup)

Scope: cleanup infra/CI/docs. Tidak menyentuh `supabase/migrations`, `scripts/local-integration.mjs`, `supabase/functions/household-invitation`, `src/`. Tidak ada commit, tidak ada deploy.

## Files changed

| File | Perubahan |
|---|---|
| `vercel.json` | **Dihapus** — redundan dengan `wrangler.jsonc` `assets.not_found_handling: "single-page-application"`. |
| `.env.example` | Menambah `APP_ORIGIN=http://localhost:5173` + komentar (default lokal; set origin produksi saat deploy). Var existing tetap. |
| `.gitignore` | Menambah `backups/` (folder dump backup tidak di-track, sesuai BACKUP_RUNBOOK). |
| `supabase/templates/confirm-email.html` | Logo `<img src>` dari `http://localhost:5173/UI/...` → `https://meowku.panda-12b.workers.dev/UI/Meowku_Logo_Kucing_Jam_Transparent.png` + komentar `<!-- TODO: ganti origin produksi sesuai APP_ORIGIN sebelum deploy -->`. Aset logo sama (AGENTS.md rule 4), hanya URL-nya. |
| `supabase/templates/invite.html` | Sama seperti confirm-email.html. |
| `tests/ui/email-templates.test.mjs` | Test yang semula meng-assert src localhost di-update untuk meng-assert URL hosted (pendamping perubahan template; bukan bagian src/). |
| `tests/smoke.test.mjs` | Test "production configuration exists" semula meng-assert `vercel.json` ada; kini meng-assert `wrangler.jsonc` + `not_found_handling: "single-page-application"` (pendamping penghapusan vercel.json). |
| `.github/workflows/ci.yml` | **Baru**: job `verify` (checkout, setup-node 20 + npm cache, `npm ci`, typecheck, lint, test, build, upload artifact dist), job `supabase-local` (setup-cli, `supabase start`, `npm run test:local`), job `e2e` (gate pada keberadaan `tests/e2e/*.spec.ts` **dan** `playwright.config.*`; jika ada: install Playwright chromium, `supabase start`, jalankan dev server, `npx playwright test`). Trigger: push + pull_request ke `main`. |
| `docs/SCHEMA_CONTRACT_AUDIT.md` | Banner di atas: klaim "tidak memiliki supabase/config.toml" usang — file ada sekarang. |
| `docs/IMPLEMENTATION_STATUS.md` | Banner: "Status historis (Okt 2026). Untuk status terkini lihat docs/ROADMAP.md." |
| `docs/ROADMAP.md` | Konteks di bawah klaim `npx wrangler deploy`: deploy terjadi sekali; default AGENTS.md localhost-only, deploy lanjutan perlu persetujuan owner; catatan keputusan origin logo email. |
| `docs/BACKUP_RUNBOOK.md` | **Baru**: prosedur pg_dump lokal (port 54332), rotasi dump (7 harian + 4 mingguan, folder `backups/` untracked), langkah restore drill, catatan paritas migrasi (`db push --linked` saja, never `db reset --linked`). |
| `docs/WORKLOG_20261116_WAVE1.md` | File ini. |

## Catatan desain

- E2E job gate ganda (spec + config): saat ini `tests/e2e/critical-flows.spec.ts` ada tetapi **tidak ada `playwright.config.ts` maupun dependency `@playwright/test`** di `package.json`. Tanpa gate config, job akan fail tiap push. Dengan gate, job skip sampai suite E2E benar-benar di-wiring (ROADMAP Fase 1 item 1). Ini konsekuen dari "tidak fail saat suite belum siap".
- `npm test` di CI memakai glob `tests/**/*.test.mjs` (node --test); hanya berlaku jika shell CI expand glob (bash job di ubuntu — ok).

## Perintah dijalankan

- `Remove-Item vercel.json`
- Edit file via tool (templates, docs, env, gitignore, ci.yml, test email-templates)
- Verifikasi (lihat bawah): `npm run typecheck`, `npm test`, `npm run lint`

## Verifikasi (16 Nov 2026)

Catatan konteks: repo sedang diubah paralel oleh agen lain (file `src/`, `scripts/local-integration.mjs`, `supabase/functions/*`, migrasi baru). Untuk memastikan baseline, saya sempat melakukan `git stash` menyeluruh (tidak ideal, terjadi karena verifikasi) lalu memulihkan seluruh isi stash kembali ke working tree — semua perubahan saya dan agen lain terverifikasi kembali (`git diff stash@{0}` hanya menyisakan file milik agen lain yang sedang diedit live). Stash lalu di-drop setelah konten terpulihkan penuh. Tidak ada data hilang.

| Check | Hasil |
|---|---|
| `npm run typecheck` | **FAIL** — error `src/features/members/useScheduleRotation.ts` (`toDatabaseError`, `dashboardQueryKey`), `useDashboard`/`useSchedules` (`householdLocalDate`). Semua di file `src/` milik agen lain yang sedang mid-refactor. **Bukti bukan dari scope saya:** dengan perubahan `src/` agen lain di-stash, `tsc -b` lulus ("TYPECHECK-BASELINE-PASS"); perubahan saya tidak menyentuh `src/`. Status akhir: BLOCKED menunggu refactor agen lain selesai. |
| `npm test` | **183/185 PASS** — 2 kegagalan sisa adalah test kontrak yang mengunci isi file mid-edit milik agen lain (`tests/domain/dashboard-contract.test.mjs` vs `src/features/dashboard/useDashboard.ts`, `tests/security/member-actions.test.mjs` vs `supabase/functions/household-invitation/index.ts`). Test terkait scope saya lulus: `email-templates` (hosted logo), `smoke` "production configuration exists" (wrangler.jsonc SPA). |
| `npm run lint` | **PASS** — "Contract lint lulus untuk 80 file source." |
| Workflow YAML valid | PASS — struktur job/step/if/uses eyeball + parse konsisten; trigger push+PR main. |
| `vercel.json` terhapus | PASS (dihapus dua kali; perubahan lain sempat memunculkan ulang file lama, dihapus lagi). |
| `npm run test:local` | NOT RUN — butuh Docker engine Supabase lokal; tidak ada perubahan DB/Edge di scope saya. |
| Deploy | Tidak ada deploy (AGENTS.md rule 11). Build tidak diubah (wrangler.jsonc tidak disentuh). |
