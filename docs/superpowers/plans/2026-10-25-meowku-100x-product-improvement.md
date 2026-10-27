# Meowku 100x Product Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-grade Meowku cat-care operating system with URL navigation, fast daily care actions, trustworthy health and expense records, secure household collaboration, database-derived insights, and polished responsive UX.

**Architecture:** Keep Supabase PostgreSQL, Auth, RLS, Storage, and Edge Functions as the only business-data boundary. Refactor the current state-selected page shell into TanStack Router route layouts, keep feature queries/mutations household-scoped through TanStack Query, and implement each product phase as a buildable vertical slice with tests and QA evidence.

**Tech Stack:** React 18, Vite, TypeScript strict, TanStack Router, TanStack Query, Tailwind CSS/custom existing CSS, lucide-react, Supabase JS, Supabase PostgreSQL/RLS/Storage/Edge Functions, Node test runner, Playwright.

## Global Constraints

- Use React + Vite + TypeScript, TanStack Router + Query, Tailwind + shadcn-compatible primitives, and Supabase Auth/Postgres/RLS/Edge.
- Supabase PostgreSQL is the only source of business data; do not add mock repositories, hardcoded business records, fake metrics, or localStorage domain state.
- If Supabase configuration is unavailable, show `SetupRequired`; never silently use demo data.
- Preserve Indonesian terminology, the selected Meowku logo, warm cream/orange palette, rounded cards, typography hierarchy, and reference composition.
- RLS must be enabled for every application table; Edge Functions must derive identity and role from JWT plus database membership.
- Schedule generation is idempotent, timezone-aware, target-aware, and must preserve historical occurrences.
- Do not deploy or run destructive linked database reset commands.
- Do not revert unrelated user changes. This workspace is not a Git repository; do not add commit steps.
- Every phase must update `docs/QA_REPORT.md` with actual commands, evidence, bugs, and PASS/FAIL/BLOCKED status.

## Current Baseline

- `npm test`: 99 passing tests at planning time.
- `npm run typecheck`: passing at planning time.
- `npm run build`: passing with a main minified chunk warning around 535 kB.
- Existing feature areas: auth, onboarding, dashboard, schedules, schedule history, cats, cat care, litter boxes, catalog, history, reports, members, settings, notifications, export.
- Existing cat-care migration: `supabase/migrations/20261025000400_cat_health_food_expenses.sql`.
- Current navigation is selected by local `page` state in `src/App.tsx`; it is not URL-driven.

## File Map

### Navigation and shared UX

- Modify `src/App.tsx`: session/configuration bootstrap and router integration only.
- Modify `src/routes.tsx`: route tree, route params/search schemas, auth/household layout boundaries.
- Modify `src/components/AppShell.tsx`: render navigation links and route outlet; remove DOM `setTimeout` tab navigation.
- Modify `src/components/QueryState.tsx`, `src/components/ErrorBoundary.tsx`, and `src/components/PageHeader.tsx`: shared loading, error, retry, accessibility, breadcrumb, and action patterns.
- Create `src/components/ConfirmDialog.tsx`: reusable accessible destructive-action confirmation.
- Create `src/lib/query-keys.ts`: typed household-scoped query key factories.

### Daily care

- Modify `src/features/dashboard/DashboardPage.tsx` and `src/features/dashboard/useDashboard.ts`: command-center layout, attention items, per-cat progress, and quick actions.
- Modify `src/features/schedules/useSchedules.ts`: safe completion state and query invalidation contract.
- Modify `src/dashboard-checklist.css` and related shell styles: responsive checklist and action hierarchy.
- Add tests under `tests/domain/` and `tests/ui/` for dashboard behavior and empty states.

### Cat health and expenses

- Modify `src/features/cats/CatsPage.tsx` and `src/features/cats/CatCarePanel.tsx`: route-driven cat detail and URL tabs.
- Modify `src/features/cats/CatFoodExpensePanel.tsx` and `src/features/cats/useCatCare.ts`: validated mutations, attachment lifecycle, and localized labels.
- Modify `src/lib/types.ts` and `src/lib/database.types.ts` only when migration contracts change.
- Add migrations under `supabase/migrations/` only for missing constraints, indexes, RPCs, or scan confirmation behavior.
- Add tests under `tests/domain/` for records, attachments, and scan state transitions.

### Security, reports, and QA

- Modify relevant `supabase/functions/*/index.ts` only after inspecting existing JWT and membership checks.
- Modify `src/lib/report-queries.ts` and `src/features/reports/ReportsPage.tsx` for database-derived report filters and charts.
- Modify `tests/security/*.test.mjs`, `tests/e2e/critical-flows.spec.ts`, `tests/ui/*.test.mjs` for acceptance evidence.
- Update `docs/QA_REPORT.md` and `docs/IMPLEMENTATION_STATUS.md` after each phase.

---

### Task 1: Establish URL-Driven Router Layout

**Files:**
- Modify: `src/routes.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Create: `src/lib/query-keys.ts`
- Test: `tests/domain/routing-contract.test.mjs`

**Interfaces:**
- Produces route paths `/auth`, `/onboarding`, `/app`, `/app/jadwal`, `/app/kucing`, `/app/kucing/$catId`, `/app/litter-box`, `/app/katalog`, `/app/histori`, `/app/laporan`, `/app/pengguna`, and `/app/pengaturan`.
- Produces `queryKeys.household(id)` and feature-specific nested key helpers that include `householdId`.

- [ ] **Step 1: Write the failing route contract test.**

Add assertions that `src/routes.tsx` defines each required route, that cat detail has a `$catId` param, and that `src/App.tsx` no longer contains a page-name ternary switch.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('application exposes URL-driven product routes', () => {
  const routes = fs.readFileSync('src/routes.tsx', 'utf8');
  for (const path of ['/app', '/app/jadwal', '/app/kucing', '/app/kucing/$catId', '/app/laporan']) {
    assert.match(routes, new RegExp(path.replaceAll('/', '\\/')));
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `node --test tests/domain/routing-contract.test.mjs`

Expected: FAIL because the current route tree contains only `/$` and `App.tsx` chooses content from local state.

- [ ] **Step 3: Implement the route tree and layout boundary.**

Create route definitions with an authenticated app layout that renders `AppShell` and an `Outlet`. Keep `useCurrentSession` and `useCurrentHousehold` in the bootstrap/layout boundary. Replace `AppShell`'s `activePage`/`onNavigate` contract with route navigation links and a child outlet. Preserve the existing auth and onboarding behavior.

- [ ] **Step 4: Add household-scoped query key factories.**

Define explicit functions such as:

```ts
export const queryKeys = {
  household: (householdId: string) => ['household', householdId] as const,
  dashboard: (householdId: string, timezone: string) => ['household', householdId, 'dashboard', timezone] as const,
  cats: (householdId: string) => ['household', householdId, 'cats'] as const,
};
```

Update existing dashboard/cat hooks to use the factory where touched.

- [ ] **Step 5: Run focused and full verification.**

Run: `node --test tests/domain/routing-contract.test.mjs`, `npm run typecheck`, `npm test`

Expected: route contract and all existing tests pass. Any existing test that assumes state navigation must be updated to assert route navigation instead.

### Task 2: Add Shared Query, Confirmation, and Route Error UX

**Files:**
- Create: `src/components/ConfirmDialog.tsx`
- Modify: `src/components/QueryState.tsx`
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: `src/components/PageHeader.tsx`
- Modify: `src/styles.css`, `src/error-boundary.css`
- Test: `tests/ui/shared-states.test.mjs`

**Interfaces:**
- `ConfirmDialog` accepts `open`, `title`, `description`, `confirmLabel`, `destructive`, `pending`, `onCancel`, and `onConfirm`.
- `QueryState` exposes loading, error, empty, retry, and children states without hiding the original error.

- [ ] **Step 1: Write failing shared-state assertions.**

Assert that the dialog has `role="dialog"`, `aria-modal`, a cancel action, a pending-disabled confirm action, and that query errors expose a retry action.

- [ ] **Step 2: Run the focused test to verify failure.**

Run: `node --test tests/ui/shared-states.test.mjs`

Expected: FAIL because the dialog does not exist and current query-state contracts do not cover all required attributes.

- [ ] **Step 3: Implement the primitives.**

Use native React state and existing CSS conventions. Implement Escape close, backdrop close only when safe, focus the dialog on open, return focus to the trigger on close, and prevent confirm while `pending` is true. Keep copy Indonesian by default.

- [ ] **Step 4: Replace destructive browser confirms.**

Update cat, schedule, member, and settings flows to use `ConfirmDialog`, preserving server mutations and existing permissions.

- [ ] **Step 5: Verify.**

Run: `node --test tests/ui/shared-states.test.mjs`, `npm run typecheck`, `npm test`

### Task 3: Refactor Dashboard into Daily Care Command Center

**Files:**
- Modify: `src/features/dashboard/useDashboard.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/schedules/useSchedules.ts`
- Modify: `src/dashboard-checklist.css`
- Modify: `src/styles.css`
- Test: `tests/domain/dashboard-command-center.test.mjs`
- Test: `tests/ui/dashboard-command-center.test.mjs`

**Interfaces:**
- `useDashboard` returns database-derived `todayOccurrences`, `completionRate`, `perCatProgress`, and `attentionItems`.
- `DashboardPage` receives household and uses router navigation for all quick actions.

- [ ] **Step 1: Write failing domain assertions.**

Add tests that completion rate is derived from occurrences, per-cat progress never counts a partial target as complete, overdue occurrences remain visible, and attention items are empty when the database query is empty.

- [ ] **Step 2: Run the focused tests.**

Run: `node --test tests/domain/dashboard-command-center.test.mjs tests/ui/dashboard-command-center.test.mjs`

Expected: FAIL because the current dashboard has no per-cat progress or attention-item contract.

- [ ] **Step 3: Extend the dashboard query contract.**

Use existing household-scoped schedule/cat/vaccine queries or a typed database query/RPC. Do not add literal metrics. Normalize rows into typed view data and keep household timezone in the query key.

- [ ] **Step 4: Implement the dashboard hierarchy.**

Place today status, next task, overdue/attention section, per-cat progress, checklist, and activity in that order. Add quick actions that call `navigate` to existing routes or open an actual existing form. Keep empty states distinct for no cats, no litter boxes, no schedules, and no activity.

- [ ] **Step 5: Harden completion feedback.**

Disable the row action while pending, invalidate dashboard/history queries on success, show actor/time from the returned row or refreshed database data, and retain missed/history rows.

- [ ] **Step 6: Verify.**

Run: `node --test tests/domain/dashboard-command-center.test.mjs tests/ui/dashboard-command-center.test.mjs`, `npm run typecheck`, `npm test`, `npm run build`

### Task 4: Make Cat Detail and Care Tabs Route-Addressable

**Files:**
- Modify: `src/features/cats/CatsPage.tsx`
- Modify: `src/features/cats/CatCarePanel.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/cat-care-tabs.css`
- Test: `tests/domain/cat-care-routing.test.mjs`
- Test: `tests/ui/profile-members-presentation.test.mjs`

**Interfaces:**
- Cat detail route uses `$catId`.
- Care tabs use `?tab=summary|health|food|expense`.
- Navigation opens `/app/kucing/$catId?tab=health` directly and does not dispatch DOM events or use `setTimeout`.

- [ ] **Step 1: Write the failing route/tab tests.**

Assert that the shell points health/food/expense actions to URL destinations and that `CatCarePanel` reads/writes the tab search parameter.

- [ ] **Step 2: Run focused tests.**

Run: `node --test tests/domain/cat-care-routing.test.mjs tests/ui/profile-members-presentation.test.mjs`

Expected: FAIL because the current shell dispatches `meowku:cat-care-tab` after a timed click.

- [ ] **Step 3: Implement route-driven cat detail.**

Load the selected cat by route param through the existing household-scoped hook. Preserve the list route for `/app/kucing` and use a back link from detail to list.

- [ ] **Step 4: Replace event-driven tabs.**

Use TanStack Router search params as controlled tab state. Keep tab labels Indonesian and preserve summary/health/food/expense separation.

- [ ] **Step 5: Verify reload/deep links.**

Run: `node --test tests/domain/cat-care-routing.test.mjs tests/ui/profile-members-presentation.test.mjs`, `npm run typecheck`, `npm run build`

### Task 5: Harden Health, Vaccination, Food, Expense, and Attachment Flows

**Files:**
- Modify: `src/features/cats/useCatCare.ts`
- Modify: `src/features/cats/CatCarePanel.tsx`
- Modify: `src/features/cats/CatFoodExpensePanel.tsx`
- Modify: `supabase/migrations/20261025000400_cat_health_food_expenses.sql` only for verified contract gaps
- Modify: `src/lib/database.types.ts` if migration changes schema
- Test: `tests/domain/cat-care-foundation.test.mjs`
- Test: `tests/domain/cat-care-lifecycle.test.mjs`

**Interfaces:**
- Health and vaccine create mutations accept optional `attachment_id` only after the attachment is successfully uploaded.
- Scan records use `draft`, `confirmed`, `rejected`, and `failed` states; confirmation is an explicit mutation.
- Attachment upload returns a typed attachment record and failure prevents the parent record from being falsely confirmed.

- [ ] **Step 1: Extend failing contract tests.**

Assert that health/vaccine forms expose attachment support, date/status labels are localized, scan confirmation is explicit, private storage policy remains enabled, and parent creation does not occur after upload failure.

- [ ] **Step 2: Run the focused tests.**

Run: `node --test tests/domain/cat-care-foundation.test.mjs tests/domain/cat-care-lifecycle.test.mjs`

Expected: FAIL on missing attachment linkage/scan lifecycle assertions.

- [ ] **Step 3: Inspect and minimally extend the database contract.**

Before changing SQL, check whether existing columns, policies, and hooks already satisfy the test. Add only missing indexes, policies, validation, or RPC behavior. Preserve RLS and private Storage. Never add sample records.

- [ ] **Step 4: Implement upload/parent mutation sequencing.**

Upload first, create the parent row with the returned attachment id second, and surface upload errors without claiming success. If a parent mutation fails after an upload, preserve an auditable orphan attachment state or delete only the just-created upload through an authorized cleanup path; do not delete unrelated files.

- [ ] **Step 5: Add health/vaccine attention derivation.**

Derive due-soon and overdue state from `next_due_at` and household-local date. Keep health information non-diagnostic and label extracted scan values as unconfirmed until reviewed.

- [ ] **Step 6: Verify.**

Run: `node --test tests/domain/cat-care-foundation.test.mjs tests/domain/cat-care-lifecycle.test.mjs`, `npm run typecheck`, `npm test`

### Task 6: Expand Database-Derived Reports and Insights

**Files:**
- Modify: `src/lib/report-queries.ts`
- Modify: `src/features/reports/ReportsPage.tsx`
- Modify: `src/report.css`
- Modify: relevant report migration or add a new timestamped migration only if aggregate SQL/RPC is missing
- Test: `tests/domain/report-queries.test.mjs`
- Test: `tests/ui/reports-insights.test.mjs`

**Interfaces:**
- `fetchHouseholdReport` accepts household id plus date/cat/member/category filters and returns only database aggregates.
- Report result exposes explicit empty/non-empty state and typed series for completion, overdue, weight, vaccination, and expense trends.

- [ ] **Step 1: Write failing report filter and empty-state tests.**

Assert that filters are passed to the query, no literals are embedded as metrics, empty ranges render no fictional chart, and IDR formatting is localized.

- [ ] **Step 2: Run focused tests.**

Run: `node --test tests/domain/report-queries.test.mjs tests/ui/reports-insights.test.mjs`

Expected: FAIL for the missing filter/series contract.

- [ ] **Step 3: Implement typed report queries.**

Use existing RPC/query patterns and database aggregates. Keep all parameters household-scoped. Add indexes only when query plans or existing schema show the need.

- [ ] **Step 4: Implement report controls and visuals.**

Add date range, cat, member, category, and metric controls. Use existing project styling and a chart library only if already allowed by package constraints; otherwise use accessible CSS/SVG primitives with values from query results.

- [ ] **Step 5: Add transparent attention rules.**

Display upcoming vaccine, overdue schedule, and unusual expense reminders only when the corresponding rows meet explicit database-derived conditions. Do not call these diagnoses or AI predictions.

- [ ] **Step 6: Verify.**

Run: `node --test tests/domain/report-queries.test.mjs tests/ui/reports-insights.test.mjs`, `npm run typecheck`, `npm run build`

### Task 7: Security, Idempotency, and Session-Cache Hardening

**Files:**
- Modify: `supabase/functions/complete-occurrence/index.ts`
- Modify: `supabase/functions/generate-schedule-occurrences/index.ts`
- Modify: `supabase/functions/invite-household-member/index.ts`
- Modify: `supabase/functions/dispatch-due-notifications/index.ts`
- Modify: relevant migrations for idempotency/audit constraints after inspection
- Modify: `src/features/auth/useCurrentSession.ts`
- Modify: `src/App.tsx`
- Modify: `tests/security/member-actions.test.mjs`
- Modify: `tests/security/notifications-dispatch.test.mjs`
- Create: `tests/security/session-cache-isolation.test.mjs`

**Interfaces:**
- Edge Functions derive `auth.uid()` from the verified JWT and query membership/role server-side.
- Replay-safe operations return the existing result or a deterministic conflict, never duplicate rows.
- Session transition clears household-scoped React Query cache before loading another user.

- [ ] **Step 1: Add failing security assertions.**

Cover cross-household UUID access, member denial on admin actions, last-owner protection, replayed completion/generation/invite, invalid notification scheduler secret, and cache isolation after user change.

- [ ] **Step 2: Run security tests to verify gaps.**

Run: `node --test tests/security/member-actions.test.mjs tests/security/notifications-dispatch.test.mjs tests/security/session-cache-isolation.test.mjs`

Expected: any uncovered behavior fails with a specific contract assertion.

- [ ] **Step 3: Implement server-derived authorization and idempotency.**

Reuse existing membership helpers. Add unique keys and transaction-safe upserts only where missing. Preserve immutable audit behavior and do not accept arbitrary household or role values as authorization input.

- [ ] **Step 4: Implement client cache/session cleanup.**

Subscribe to auth changes, cancel/remove household queries on sign-out or user change, and ensure current household is reloaded after role/session changes.

- [ ] **Step 5: Verify negative and replay tests.**

Run: `node --test tests/security/*.test.mjs`, `npm run typecheck`, `npm test`

### Task 8: Premium Responsive UX, PWA, and Bundle Optimization

**Files:**
- Modify: `src/styles.css`, `src/cat-care.css`, `src/management.css`, `src/report.css`, `src/history.css`, `src/schedule-history.css`
- Modify: `src/components/AppShell.tsx`, `src/components/Skeleton.tsx`
- Modify: `vite.config.ts`
- Modify: `src/lib/pwa.ts`
- Test: `tests/ui/responsive-shell.test.mjs`
- Test: `tests/ui/pwa-notifications.test.mjs`

**Interfaces:**
- Existing logo and palette remain unchanged.
- Main route chunks are split by route where possible without changing data behavior.
- PWA capability messages reflect actual browser support and permission state.

- [ ] **Step 1: Write failing responsive/accessibility assertions.**

Assert stable navigation labels, no emoji decoration, mobile drawer semantics, collapsed sidebar labels, focus-visible controls, and capability-aware notification copy.

- [ ] **Step 2: Run focused tests.**

Run: `node --test tests/ui/responsive-shell.test.mjs tests/ui/pwa-notifications.test.mjs`

Expected: FAIL on any missing new contract.

- [ ] **Step 3: Consolidate tokens and responsive layouts.**

Create or reuse CSS custom properties for palette, spacing, radius, typography, focus, and status colors. Preserve existing reference composition while converting dense desktop tables to readable mobile cards.

- [ ] **Step 4: Add restrained motion and onboarding polish.**

Use CSS transitions for completion/save/navigation feedback, respect `prefers-reduced-motion`, and make onboarding steps progressive without inserting fake records.

- [ ] **Step 5: Optimize route chunks.**

Inspect build output, configure manual chunks only for stable vendor/feature boundaries, and rerun the build. Do not raise `chunkSizeWarningLimit` as the only change.

- [ ] **Step 6: Verify cross-device and PWA behavior.**

Run: `node --test tests/ui/*.test.mjs`, `npm run typecheck`, `npm run build`, and Playwright at 375x812, 768x1024, and desktop reference width. Record screenshots and findings in `docs/QA_REPORT.md`.

### Task 9: Full End-to-End QA and Documentation

**Files:**
- Modify: `tests/e2e/critical-flows.spec.ts`
- Modify: `docs/QA_REPORT.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Create: `docs/visual-qa/` screenshot evidence files only when the test environment supports capture

**Interfaces:**
- E2E flows use real Supabase local or an explicitly configured empty test project.
- No test depends on runtime demo data in the public app.

- [ ] **Step 1: Add or update critical E2E flows.**

Cover signup/onboarding, create cats/litter/schedules, partial and full target completion, health/vaccine/weight, expense attachment, reports, invite/role denial, separate household isolation, reload persistence, and export.

- [ ] **Step 2: Run frontend verification.**

Run: `npm test`, `npm run typecheck`, `npm run build`

Record exact output and current bundle warning status.

- [ ] **Step 3: Run Supabase verification when available.**

Run: `supabase status` and `supabase db lint --local` only when Docker is available. If unavailable, record `BLOCKED` with the reason; do not substitute mocks.

- [ ] **Step 4: Run Playwright visual QA.**

Capture the ten reference screens at required viewports, compare composition and interaction states, and record any intentional differences caused by real empty database state.

- [ ] **Step 5: Update status documents.**

Write dates, environment, commands, evidence paths, bugs, and PASS/FAIL/BLOCKED status into `docs/QA_REPORT.md`. Update `docs/IMPLEMENTATION_STATUS.md` with completed phases and unresolved risks.

- [ ] **Step 6: Final verification.**

Run the complete suite one final time:

```bash
npm test
npm run typecheck
npm run build
```

Only claim completion for checks with captured output and evidence.

## Execution Order and Checkpoints

Execute Tasks 1–2 first and verify route/deep-link foundations. Execute Tasks 3–5 as the first product-value slice. Execute Task 6 after the underlying records and filters are stable. Execute Task 7 before declaring any multi-user feature complete. Execute Task 8 after behavior stabilizes. Execute Task 9 last and update it after every phase.

At each checkpoint, stop if a test reveals a data or authorization contradiction; inspect the existing migration and hook contract before adding a compatibility layer or changing persisted behavior.

## Self-Review

- Spec coverage: all five phases, URL navigation, daily care, health/expense/scan, RLS/Edge/Storage, reports, PWA, responsive UI, bundle warning, and QA evidence map to explicit tasks.
- Placeholder scan: no unfinished markers or vague implementation instructions are present.
- Type consistency: route paths, query-key example, cat tab values, scan statuses, and report function contract are named consistently across tasks.
- Scope: each task produces a testable deliverable; database changes are explicitly conditional on inspecting the existing contract.
