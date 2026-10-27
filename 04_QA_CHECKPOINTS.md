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
