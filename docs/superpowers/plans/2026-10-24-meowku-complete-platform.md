# Meowku Complete Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current prototype with a secure, database-backed Meowku household cat-care application and verify every supported flow.

**Architecture:** Keep React + Vite as the frontend and Supabase as the only business-data backend. Split the monolithic app into typed routes, feature modules, query hooks, forms, and shared states. Use database RLS for authorization and Edge Functions for privileged multi-row operations.

**Tech Stack:** React 18, Vite, TypeScript strict, TanStack Router, TanStack Query, Tailwind CSS, lucide-react, Supabase Auth/PostgreSQL/RLS/Edge Functions, Node test runner, Playwright where available.

## Global Constraints

- Preserve Indonesian terminology, warm cream + orange visual language, rounded cards, hierarchy, and original logo.
- PostgreSQL is the only business-data source; no mock repositories, fake metrics, fake records, or domain localStorage.
- If Supabase is unavailable, render `SetupRequired` and do not silently use fallback data.
- Enable RLS on every application table and derive authorization from JWT identity plus database membership.
- Default timezone is `Asia/Jakarta`, configurable per household.
- Monthly schedule generation is idempotent; historical occurrences are never overwritten.
- Do not place service-role credentials in frontend code or `VITE_*` variables.
- Do not claim a checkpoint passes without running its verification command and recording evidence.

---

### Task 1: Establish Environment And Type-Safe Boundaries

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/supabase.ts`
- Modify: `tsconfig.app.json`
- Modify: `package.json`
- Create: `src/lib/types.ts`
- Create: `src/lib/query-client.ts`
- Test: `tests/smoke.test.mjs`

**Interfaces:**
- Produces `Database`, `HouseholdRole`, `SetupRequired`, and configured Supabase client boundaries for later tasks.

- [ ] **Step 1: Add a failing source-boundary test** that rejects `@ts-nocheck`, literal domain records, and service-role strings in `src`.
- [ ] **Step 2: Run `npm test`** and confirm the new test fails against the current prototype.
- [ ] **Step 3: Remove `@ts-nocheck`**, add shared database-facing types, centralize the TanStack Query client, and make configuration detection explicit.
- [ ] **Step 4: Run `npm run typecheck`** and resolve every TypeScript error without disabling checks.
- [ ] **Step 5: Run `npm test`** and record the result in `docs/QA_REPORT.md`.

### Task 2: Build Household Schema, Membership, And RLS

**Files:**
- Create: `supabase/migrations/20261024000500_household_domain.sql`
- Modify: `supabase/migrations/20261024000300_households_rls.sql`
- Modify: `supabase/migrations/20261024000200_admin_policies.sql`
- Create: `tests/security/rls-contract.test.mjs`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Produces tables and policies for `profiles`, `households`, and `household_members` with roles `owner`, `admin`, and `member`.
- Produces membership helper functions that derive access from `auth.uid()`.

- [ ] **Step 1: Write migration contract assertions** for primary keys, foreign keys, role constraints, unique membership, RLS enabled state, and owner-only destructive operations.
- [ ] **Step 2: Run the contract test** and confirm it fails until the migration exists.
- [ ] **Step 3: Implement the migration** with indexes, `updated_at` triggers, RLS policies, and a profile/household bootstrap function callable after signup.
- [ ] **Step 4: Apply migrations to local Supabase** with `supabase db push` or document `BLOCKED` when the CLI is unavailable; never reset a linked remote database.
- [ ] **Step 5: Run the security contract test** and record the actual environment result.

### Task 3: Implement Auth And Onboarding

**Files:**
- Create: `src/features/auth/AuthPage.tsx`
- Create: `src/features/auth/auth.css`
- Create: `src/features/onboarding/OnboardingPage.tsx`
- Create: `src/features/onboarding/useOnboarding.ts`
- Create: `src/routes.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Test: `tests/auth/onboarding.test.mjs`

**Interfaces:**
- Produces `useCurrentSession()`, `useCurrentHousehold()`, and guarded authenticated routes.
- Onboarding mutation accepts `{ householdName: string; timezone: string }` and returns the created household.

- [ ] **Step 1: Add tests** for signed-out redirect, configured-client requirement, and onboarding submission payload.
- [ ] **Step 2: Run the tests** and confirm failure against the current single-page state.
- [ ] **Step 3: Implement auth state subscription, sign-in/sign-up/error states, onboarding, and route guards using Supabase Auth and Query.
- [ ] **Step 4: Verify no household or role is accepted from URL parameters or client-only state.
- [ ] **Step 5: Run typecheck and auth tests**, then record screenshots for configured and unconfigured states.

### Task 4: Add Core Cat, Litter Box, And Catalog CRUD

**Files:**
- Create: `supabase/migrations/20261024000600_care_entities.sql`
- Create: `src/features/cats/`
- Create: `src/features/litter-boxes/`
- Create: `src/features/catalog/`
- Create: `src/components/EntityForm.tsx`
- Create: `tests/domain/entities.test.mjs`

**Interfaces:**
- Query hooks are household-scoped and return typed rows.
- Mutations validate required fields before insert/update and invalidate the related collection query.

- [ ] **Step 1: Define tests** for household isolation, required names, archive behavior, and empty/loading/error states.
- [ ] **Step 2: Run tests** and confirm missing schema/hooks fail.
- [ ] **Step 3: Implement tables, indexes, RLS, typed query hooks, and forms for cats, litter boxes, and catalog items.
- [ ] **Step 4: Connect the three route pages to real Supabase queries; remove prototype placeholder cards and metrics.
- [ ] **Step 5: Run typecheck, domain tests, and a production build.

### Task 5: Implement Schedule Generation And Checklist Completion

**Files:**
- Create: `supabase/migrations/20261024000700_schedules_and_occurrences.sql`
- Create: `supabase/functions/generate-schedule-occurrences/index.ts`
- Create: `supabase/functions/complete-occurrence/index.ts`
- Create: `src/features/schedules/`
- Create: `tests/domain/schedules.test.mjs`

**Interfaces:**
- `generate-schedule-occurrences` accepts an authenticated household context and date range; it derives authorization from membership.
- `complete-occurrence` accepts `{ occurrenceId: string; completedAt?: string; note?: string }` and writes completion plus audit event atomically.

- [ ] **Step 1: Write tests** for daily/weekly/monthly recurrence, Asia/Jakarta date boundaries, duplicate generation, per-target completion, and historical preservation.
- [ ] **Step 2: Run tests** and confirm failure before implementation.
- [ ] **Step 3: Implement schedule definitions, target rows, occurrence unique keys, and database constraints.
- [ ] **Step 4: Implement authenticated Edge Functions with JWT validation, membership lookup, input validation, and transaction-safe writes.
- [ ] **Step 5: Implement schedule forms, today checklist, and completion feedback using Query invalidation.
- [ ] **Step 6: Run tests and verify duplicate calls produce no duplicate occurrences.

### Task 6: Add Immutable History And Reports

**Files:**
- Create: `supabase/migrations/20261024000800_audit_and_reporting.sql`
- Create: `src/features/history/`
- Create: `src/features/reports/`
- Create: `src/lib/report-queries.ts`
- Create: `tests/domain/report-queries.test.mjs`

**Interfaces:**
- Report queries accept household ID only through authenticated query context and return database aggregates, never hardcoded chart values.
- Audit events expose actor, action, entity, timestamp, and metadata without update/delete mutations.

- [ ] **Step 1: Write tests** for completion totals, overdue counts, date filters, household isolation, and immutable audit behavior.
- [ ] **Step 2: Run tests** and confirm failure.
- [ ] **Step 3: Add append-only audit schema and SQL views/functions for report aggregates.
- [ ] **Step 4: Implement history filters, report date range controls, and empty states.
- [ ] **Step 5: Run tests and verify all displayed numbers originate from query results.

### Task 7: Add Member Management, Settings, And Export

**Files:**
- Create: `supabase/functions/invite-household-member/index.ts`
- Create: `supabase/functions/export-household/index.ts`
- Create: `src/features/members/`
- Create: `src/features/settings/`
- Create: `src/features/export/`
- Create: `tests/security/member-actions.test.mjs`

**Interfaces:**
- Invite accepts `{ email: string; role: "admin" | "member" }`; owner/admin authorization is derived server-side.
- Export returns a generated JSON/CSV payload for the authorized household only.

- [ ] **Step 1: Write tests** for role restrictions, cross-household denial, invalid invites, timezone update, and export scope.
- [ ] **Step 2: Run tests** and confirm failure.
- [ ] **Step 3: Implement Edge Functions and RLS policies for invite, role changes, removal, settings, and export.
- [ ] **Step 4: Implement UI flows with confirmation, errors, and success states.
- [ ] **Step 5: Run security tests and inspect function logs for rejected unauthorized requests.

### Task 8: Replace Prototype Shell With Responsive Visual System

**Files:**
- Modify: `src/styles.css`
- Modify: `src/brief-overrides.css`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/PageHeader.tsx`
- Create: `src/components/QueryState.tsx`
- Modify: `src/features/*` route pages
- Test: `tests/ui/navigation.test.mjs`

**Interfaces:**
- `AppShell` accepts navigation items, active route, session summary, and sign-out handler.
- `QueryState` renders loading, empty, error, and content variants with accessible labels.

- [ ] **Step 1: Add navigation tests** for all ten menu entries, mobile navigation, sign-out, and no decorative dead buttons.
- [ ] **Step 2: Run tests** and confirm current shell fails the route expectations.
- [ ] **Step 3: Implement the typed shell, route-based active state, responsive sidebar/bottom navigation, and shared visual tokens while preserving the original logo.
- [ ] **Step 4: Add keyboard focus styles, semantic headings, labels, and reduced-motion-safe transitions.
- [ ] **Step 5: Run build and capture visual QA for all ten reference compositions.

### Task 9: Verification, Documentation, And Release Gate

**Files:**
- Modify: `tests/smoke.test.mjs`
- Create: `tests/e2e/critical-flows.spec.ts`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/QA_REPORT.md`
- Modify: `README_MULAI_DISINI.md`

**Interfaces:**
- Critical flow coverage includes auth, onboarding, entity CRUD, schedule completion, report filtering, member authorization, and export.

- [ ] **Step 1: Run `npm run typecheck` and fix all failures.
- [ ] **Step 2: Run `npm test` and fix all failures.
- [ ] **Step 3: Run `npm run build` and fix all failures or document environmental blockers.
- [ ] **Step 4: Run local Supabase RLS/security tests and E2E flows when credentials/CLI are available.
- [ ] **Step 5: Audit the source for mock data, `@ts-nocheck`, service-role exposure, and localStorage domain state.
- [ ] **Step 6: Update status documents with exact commands, evidence, bugs, and PASS/FAIL/BLOCKED per checkpoint.

## Self-Review

- Schema, RLS, auth, CRUD, schedules, audit, reports, members, settings, export, UI, and verification each have a dedicated task.
- No task relies on mock business data or client-provided authorization.
- Every task has explicit files, interfaces, tests, and verification steps.
- Remote destructive database reset is not part of the plan.
