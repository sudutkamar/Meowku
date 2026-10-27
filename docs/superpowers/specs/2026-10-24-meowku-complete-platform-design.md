# Meowku Complete Platform Design

## Goal

Turn the current React prototype into a usable, secure household cat-care application without mock business data. The application must work against Supabase PostgreSQL, preserve the existing Indonesian product language, warm cream/orange visual direction, and original Meowku logo.

## Scope

- Authentication and onboarding.
- Household membership with owner, admin, and member roles.
- CRUD for cats, litter boxes, and catalog items.
- Timezone-aware recurring schedules with idempotent monthly generation.
- Per-target checklist completion and immutable audit history.
- Dashboard, reports, users, settings, and export.
- Responsive UI for desktop and mobile.
- RLS, Edge Functions, type safety, automated tests, and visual QA.

## Architecture

The browser uses React + Vite + TypeScript, TanStack Router, TanStack Query, Tailwind, shadcn/ui patterns, and Supabase Auth. PostgreSQL is the only business-data source. Route pages consume typed query hooks; mutations invalidate affected query keys. Sensitive multi-row operations run in Edge Functions that validate the JWT and derive household authorization from the database.

The monolithic `App.tsx` is replaced incrementally by an authenticated app shell, typed routes, feature modules, shared forms, and explicit loading/error/empty states. No localStorage or hardcoded domain records are used.

## Data And Security

Core tables cover profiles, households, memberships, cats, litter boxes, catalog items, schedules, schedule targets, schedule occurrences, checklist completions, and audit events. Every application table has RLS enabled. Policies derive access from `auth.uid()` and membership rows; client-supplied household IDs and roles are never trusted for authorization. Audit events are append-only.

Schedule generation uses a unique occurrence key per schedule, target, and local date. Existing past occurrences are never overwritten by regeneration. Default timezone is `Asia/Jakarta`, configurable per household.

## Delivery Checkpoints

1. Environment validation, schema, migrations, RLS, auth, onboarding.
2. Typed route shell and real CRUD for cats, litter boxes, and catalog.
3. Schedule generation, checklist completion, and audit history.
4. Dashboard, reports, member management, settings, and export.
5. Visual refinement, accessibility, responsive behavior, and performance.
6. Typecheck, unit/integration/E2E/security tests, build, and visual QA evidence.

## Verification

Completion requires passing commands and recorded evidence in `docs/IMPLEMENTATION_STATUS.md` and `docs/QA_REPORT.md`. If Supabase credentials or a local Supabase CLI environment are unavailable, the affected checkpoint remains BLOCKED and the UI must show `SetupRequired`; no fake records are introduced.
