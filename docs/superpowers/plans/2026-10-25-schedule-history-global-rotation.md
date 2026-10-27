# Schedule History and Global Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard-linked schedule history page and a database-backed global household weekday rotation that snapshots assignees on generated occurrences.

**Architecture:** Add normalized rotation tables and an `assigned_to` snapshot on `schedule_occurrences`. Extend the existing occurrence generation RPC to resolve the active rotation by ISO weekday at insert time, while preserving existing rows. Add a focused history page and a member-management rotation panel using typed Supabase queries/RPCs.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase PostgreSQL/RLS/RPC, existing CSS and Node contract tests.

## Global Constraints

- Supabase PostgreSQL is the only business-data source; no mock schedules or localStorage domain state.
- Existing schedule occurrence history is immutable; rotation changes never rewrite existing assignment snapshots.
- Only active members of the same household may be assigned.
- Owner/admin writes are enforced by database RPC authorization, not client guards alone.
- Preserve Indonesian labels, existing schedule recurrence, audit behavior, and responsive UI.

---

### Task 1: Add Rotation Schema and RPC Contracts

**Files:**
- Create: `supabase/migrations/20261025000100_global_schedule_rotation.sql`
- Modify: `src/lib/database.types.ts`
- Test: `tests/domain/global-rotation.test.mjs`

**Interfaces:**
- Produces tables `household_schedule_rotations`, `household_schedule_rotation_days`, occurrence column `assigned_to`, RPCs `get_household_schedule_rotation`, `save_household_schedule_rotation`, and generation behavior that snapshots assignment by `extract(isodow ...)`.

- [x] **Step 1: Write schema contract tests**

Assert the migration contains rotation tables, active-member validation, `assigned_to`, RLS, owner/admin authorization, weekday uniqueness, and RPC names. Assert generation uses `isodow` and `assigned_to` in insert without updating existing occurrences.

- [x] **Step 2: Run the new contract test and verify it fails**

Run: `node --test tests/domain/global-rotation.test.mjs`

Expected: FAIL because the migration and generated type contracts do not exist.

- [x] **Step 3: Implement the additive migration**

Create one active date-bounded rotation per household, weekday rows 1-7, active-member foreign validation trigger, select policies for household members, owner/admin RPC write checks, audit inserts, and `assigned_to uuid references auth.users(id)` on occurrences. Update `generate_schedule_occurrences` so new rows select the matching rotation day only when the occurrence date falls within the rotation range. Use `on conflict do nothing` and never update existing rows.

- [x] **Step 4: Extend generated database types**

Add the two tables and RPC argument/return contracts to `src/lib/database.types.ts`, including nullable `assigned_to` on occurrence rows.

- [x] **Step 5: Run the contract test and verify it passes**

Run: `node --test tests/domain/global-rotation.test.mjs`

Expected: PASS.

### Task 2: Add Rotation Data Hooks and Member Configuration UI

**Files:**
- Create: `src/features/members/useScheduleRotation.ts`
- Modify: `src/features/members/MembersPage.tsx`
- Modify: `src/features/members/members.css` or `src/management.css` using the existing stylesheet location
- Test: `tests/security/member-actions.test.mjs`

**Interfaces:**
- Consumes RPCs from Task 1 and active household members.
- Produces `useScheduleRotation(householdId)` and `useSaveScheduleRotation(householdId)` with `startDate`, `endDate`, and `days: Array<{ weekday: number; userId: string | null }>`.

- [x] **Step 1: Add failing UI/security assertions**

Assert MembersPage exposes a global rotation panel, Monday-Sunday selectors, date inputs, a save action, and mutation error handling. Assert the hook uses `get_household_schedule_rotation` and `save_household_schedule_rotation` rather than direct membership writes.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/security/member-actions.test.mjs`

Expected: FAIL on missing rotation panel and hook contracts.

- [x] **Step 3: Implement the typed rotation hook**

Query the household rotation and active members through Supabase. Save a normalized payload with `start_date`, `end_date`, and weekday assignments. Invalidate `household-rotation`, `schedule-occurrences`, `dashboard`, and `schedule-history` keys after success.

- [x] **Step 4: Add the owner/admin rotation panel**

Render a `ROTASI PETUGAS` panel in MembersPage for `canManage`. Provide start/end date fields and seven member selects. Use member `user_id` as the stable display fallback because current schema has no guaranteed profile join. Show `Belum ditugaskan` for empty days and prevent save when no active members exist.

- [x] **Step 5: Add responsive and dark-mode styles**

Keep selectors usable on mobile, preserve existing warm cream/orange tokens, and add readable dark-theme overrides.

- [x] **Step 6: Run focused tests**

Run: `node --test tests/security/member-actions.test.mjs`

Expected: PASS.

### Task 3: Add Dedicated Schedule History Page

**Files:**
- Create: `src/features/schedule-history/ScheduleHistoryPage.tsx`
- Modify: `src/features/schedules/useSchedules.ts`
- Modify: `src/App.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `tests/domain/schedule-history.test.mjs`

**Interfaces:**
- Consumes existing `useScheduleOccurrences`, target options, and occurrence assignment data.
- Produces a page state named `Riwayat Jadwal` reachable from the dashboard checklist `Lihat semua`, with filters `Today`, `This Week`, and `This Month`.

- [x] **Step 1: Add failing history contract tests**

Assert DashboardPage navigates to `Riwayat Jadwal`, App renders ScheduleHistoryPage for that page, history exposes all three filters, and rows contain assignment/completion labels.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/domain/schedule-history.test.mjs`

Expected: FAIL because the new page and navigation destination do not exist.

- [x] **Step 3: Extend occurrence query shape**

Select `assigned_to` and completion actor data needed by the page. Add a household member lookup query and map IDs to display labels without introducing sample names.

- [x] **Step 4: Implement ScheduleHistoryPage**

Reuse timezone-aware occurrence filters and timeline grouping. Display date, time, schedule title, target, assigned member, status, and completion actor. Keep completion actions available for pending/missed rows and preserve archive/history semantics.

- [x] **Step 5: Wire dashboard navigation and lazy page loading**

Change only the checklist card's `Lihat semua` handler to `onNavigate('Riwayat Jadwal')`. Add lazy import and page branch in App while leaving the separate audit `Histori` destination intact.

- [x] **Step 6: Add focused history styles and empty/loading/error states**

Follow existing panel/timeline components and support mobile stacking.

- [x] **Step 7: Run focused tests**

Run: `node --test tests/domain/schedule-history.test.mjs`

Expected: PASS.

### Task 4: Full Verification and Documentation

**Files:**
- Modify: `docs/QA_REPORT.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `src/lib/database.types.ts` if verification finds contract drift

- [x] **Step 1: Run the full offline verification**

Run: `npm test`, `npm run typecheck`, and `npm run build`.

Expected: all pass; record any existing chunk warning without treating it as a failure.

- [x] **Step 2: Run local Supabase verification when available**

Run: `supabase db push --local` and `supabase db lint --local`.

Expected: migration applies and lint passes. If Docker/Postgres is unavailable, mark live verification `BLOCKED` and do not claim RLS pass.

- [x] **Step 3: Document evidence and limitations**

Record files, tests, migration/lint result, visual screenshot QA status, and any blocker in both QA documents.

## Execution Status

Implementation completed. Offline tests, typecheck, build, local migration push, and local schema lint passed. Docker container status/reset inspection was unavailable; visual screenshot QA and live multi-user RLS behavior remain unverified.
