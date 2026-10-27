# Meowku 100x Product Improvement Design

Date: 2026-10-25
Status: Approved direction, awaiting implementation plan

## Goal

Evolve Meowku from a functional household cat-care CRUD app into a reliable daily care operating system. The product must become substantially better across daily usefulness, UI/UX quality, security/reliability, and insight/collaboration without introducing mock business data or weakening Supabase/RLS boundaries.

## Constraints

- React + Vite + TypeScript remains the frontend stack.
- TanStack Router is the source of URL navigation and TanStack Query is the server-state cache.
- Supabase PostgreSQL is the only business-data source.
- RLS is mandatory for every application table and Storage access remains private and household-scoped.
- Edge Functions verify JWT identity and derive authorization from database membership.
- Existing Indonesian terminology, warm cream/orange visual language, rounded cards, and selected Meowku logo remain.
- Work stays local; no internet deployment and no destructive linked database reset.
- Existing unrelated worktree changes must not be reverted.

## Delivery Strategy

Use vertical slices in this order:

1. Product foundation and routing.
2. Daily Care Command Center.
3. Cat health, vaccination, food, expenses, and attachments.
4. Trust, security, reliability, insight, and collaboration hardening.
5. Premium visual finish and final cross-device QA.

Each phase must leave the application buildable, testable, and usable. A phase is not complete because its UI exists; the database contract, authorization, error states, tests, and QA evidence must be present.

## Phase 0: Product Foundation

### Navigation

`App.tsx` becomes session/configuration bootstrap only. TanStack Router owns route rendering and `AppShell` renders an `Outlet`.

Required routes:

- `/auth`
- `/onboarding`
- `/app`
- `/app/jadwal`
- `/app/kucing`
- `/app/kucing/$catId`
- `/app/litter-box`
- `/app/katalog`
- `/app/histori`
- `/app/laporan`
- `/app/pengguna`
- `/app/pengaturan`

Filters, tabs, and detail context that should survive refresh use URL search parameters or route parameters. Deep links, browser back/forward, and refresh must preserve the expected screen.

### State and data boundaries

- Supabase remains the only source of business state.
- React Query keys include the active household id and are cleared or invalidated on auth/session changes.
- UI-only state may remain local or use the existing UI preferences mechanism.
- No business state is stored in localStorage and no mock fallback is allowed.
- Loading, empty, error, retry, mutation pending, and success feedback use shared primitives.

### Reliability and accessibility

- Database errors are mapped to Indonesian messages.
- Authenticated route guards handle UX only; RLS and Edge Functions remain authoritative.
- Add a real not-found screen and safe session-expiry handling.
- Confirm destructive/archive/revoke actions through one accessible dialog pattern.
- Verify keyboard focus, Escape handling, labels, target sizes, and responsive overflow.
- Measure and reduce the current main bundle warning instead of merely raising the warning threshold.

### Phase 0 acceptance

- All menu screens support deep link, refresh, back, and forward.
- No query-cache data leaks between users or households.
- Mobile 375 px, tablet 768 px, and desktop layouts have no horizontal overflow.
- Typecheck, unit tests, build, and visual evidence run successfully.

## Phase 1: Daily Care Command Center

### Dashboard behavior

The dashboard answers what must be done now. It displays the household-local date, completed/waiting/overdue counts, per-cat progress, next tasks, and attention items. Recent activity is secondary to actions.

Empty states distinguish no cats, no litter boxes, no schedules, and no activity.

### Quick actions

Provide real flows for complete occurrence, add schedule, add health note, record weight, record expense, and open cat profile. Every action must navigate to an existing flow or perform a real mutation.

### Completion behavior

- Completion remains per occurrence and per cat/litter target.
- Prevent double submit while mutation is pending.
- Preserve missed and historical occurrences during regeneration.
- Show actor and local completion time after success.
- Derive progress from database rows, not hardcoded calculations or demo values.

### Notifications

Due reminders use active incomplete occurrences. Browser push is described as enabled only when subscription and dispatch are actually successful. Permission denial has an in-app alternative.

### Phase 1 acceptance

- A user can complete a task in at most two interactions after opening the dashboard.
- Household and per-cat progress refresh correctly.
- Two users cannot complete targets outside their household.
- Late tasks remain visible and auditable.

## Phase 2: Cat Health and Expense Workspace

### Cat workspace

The cat detail route is the workspace for summary, health, vaccinations, food, and expenses. Tabs are URL-addressable. Existing `cat_health_records`, `cat_vaccinations`, food, expense, attachment, and scan foundations are reused and hardened rather than replaced casually.

### Health and vaccination

- Health records provide a timeline for checkups, symptoms, medication, weight, and notes.
- Weight records support trend queries and readable units.
- Vaccinations show safe, due-soon, and overdue status derived from `next_due_at` and household timezone.
- Attachments can be linked to health and vaccination records.
- Health and vaccine data is informational and must not claim medical diagnosis.

### Food, expense, and scan

- Food profiles support product assignment, serving amount/unit, frequency, and active period.
- Expenses support cat/category/amount/merchant/date/notes and private attachments.
- Receipt, food-label, and payment-proof scanning follows draft, review, confirm, reject, and failed states.
- Extracted scan values never silently become confirmed business data.
- Uploads validate type and size, use private Storage, and return signed access only to authorized members.

### Phase 2 acceptance

- Health, vaccine, weight, food, expense, and attachment records survive reload.
- All records are household-scoped in client queries, RLS, and Storage.
- Date and status labels respect household timezone.
- Attachment failures leave no misleading confirmed record.

## Phase 3: Trust, Security, and Reliability

### Authorization

Test owner/admin/member behavior against every management surface, every Edge Function, and Storage. The server derives membership and role from the authenticated JWT and database; clients never submit an arbitrary household or role as authority.

### Idempotency and audit

Add replay-safe identifiers for completion, schedule generation, invite, and notification dispatch where missing. Audit rows remain append-only and capture actor, timestamp, household, entity, action, and relevant change context.

### Session and cache safety

Auth changes clear or invalidate household-scoped query state. Role changes revalidate management permissions. Revoked invitations and removed members lose access without relying solely on client navigation.

### Phase 3 acceptance

- Cross-household reads and writes fail.
- Unauthorized member actions return the expected denial.
- Last-owner invariants remain protected.
- Replayed mutations do not duplicate business rows or audit effects.
- No service-role credential reaches the browser.

## Phase 4: Insight and Collaboration

### Reports

Reports are database aggregates for completion, overdue tasks, weight, vaccinations, expenses, categories, and date trends. They support household, cat, member, category, and period filters. Empty reports are genuinely empty and never display fictional percentages or charts.

### Collaboration

Retain role-aware member management and schedule rotation. Add a clear weekly digest only when the notification pipeline is configured and observable. Every collaboration mutation remains auditable.

### Recommendations

Recommendations are transparent rule-based reminders such as upcoming vaccine due dates, overdue tasks, or unusual expense changes. They are not medical diagnosis or hidden AI claims.

### Phase 4 acceptance

- Every metric can be traced to a database query.
- Filters produce correct household-scoped results.
- Digest and push states match actual delivery capability.
- Collaboration changes are visible in history with correct actor data.

## Phase 5: Premium Finish

- Consolidate design tokens for color, spacing, radius, typography, focus, and status.
- Preserve the selected logo and warm cream/orange visual language.
- Use consistent responsive list/table transformations.
- Add short feedback motion for completion, save, and navigation only where it improves comprehension.
- Make onboarding progressive: household, cat, litter box, schedule, reminder.
- Improve command palette/search with authorized records and real actions.
- Verify install and notification capability honestly in PWA UX.

## Testing and QA Evidence

Required commands and evidence:

- `npm test`
- `npm run typecheck`
- `npm run build`
- Supabase local status and migration lint where Docker is available
- RLS, Storage, Edge, multi-household, and role negative tests
- E2E auth, onboarding, daily care, health, expense, invite, export, and reload flows
- Visual screenshots at 375, 768, and desktop widths for the ten reference screens
- Updated `docs/QA_REPORT.md` with date, environment, commands, evidence, bugs, and PASS/FAIL/BLOCKED status

## Risks and Decisions

- Do not implement all features in one unreviewable change; each phase is independently verifiable.
- Do not add OCR or medical automation before the review/confirmation state exists.
- Do not add offline business writes because Supabase is the source of truth and conflict handling is not yet specified.
- Do not hide missing Supabase configuration behind demo content.
- Existing health/food/expense tables are a foundation; implementation must inspect current hooks and policies before extending them.

## Definition of Done

Meowku is complete only when all phases have implemented behavior, database/RLS/Edge contracts, responsive UI, tests, and QA evidence. Any unavailable Docker, Supabase credentials, browser capability, or external delivery service is explicitly marked BLOCKED rather than claimed as passing.
