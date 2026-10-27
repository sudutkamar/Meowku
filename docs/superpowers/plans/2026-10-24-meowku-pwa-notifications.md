# Meowku PWA Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable Meowku PWA with real in-app notification history, mobile Web Push support, idempotent due reminders, and clear-from-view behavior.

**Architecture:** Keep PostgreSQL as the source of truth. Store per-user preferences, push subscriptions, and recipient-scoped notifications under RLS. Use a service worker for display/click handling and a server-side dispatcher Edge Function for due occurrences, with database uniqueness preventing duplicates.

**Tech Stack:** React 18, Vite, TypeScript, TanStack Query, Supabase PostgreSQL/RLS, Supabase Edge Functions/Deno, Web Push/VAPID, Node test runner.

## Global Constraints

- Business data comes only from Supabase PostgreSQL; no mock notification records or localStorage domain state.
- All notification tables have RLS enabled and every Edge Function verifies JWT or its scheduler secret server-side.
- `audit_events` remains immutable; clear means hiding notifications from the current user’s view.
- Household timezone values are only `Asia/Jakarta`, `Asia/Makassar`, or `Asia/Jayapura` and display as WIB/WITA/WIT.
- Mobile push requires HTTPS, an installed PWA, browser permission, VAPID secrets, and a deployed scheduler; localhost must show setup state instead of fake success.
- Use the original Meowku logo and existing warm cream/orange visual language.

---

### Task 1: Notification Schema and Security

**Files:**
- Create: `supabase/migrations/20261024002400_notifications.sql`
- Modify: `src/lib/database.types.ts`
- Test: `tests/domain/notifications.test.mjs`

**Interfaces:**
- Produces tables `notification_preferences`, `push_subscriptions`, and `notifications`.
- Produces RPCs `mark_notification_read(notification_id_value uuid)`, `hide_notifications()`, and `notification_unread_count()`.
- Notification uniqueness is `(user_id, occurrence_id, type)` for due reminders.

- [ ] **Step 1: Write failing contract tests**
  - Assert the migration creates all three tables, enables RLS, defines recipient-scoped policies, creates the occurrence uniqueness constraint, and exposes mark/hide/unread RPCs.
  - Assert `database.types.ts` contains the tables and RPC names.

- [ ] **Step 2: Run the notification contract test and confirm it fails**

  Run: `npm test -- tests/domain/notifications.test.mjs`

- [ ] **Step 3: Implement the migration**
  - Add UUID primary keys and household/user foreign keys.
  - Add `read_at` and `hidden_at` to notifications.
  - Add subscription endpoint uniqueness, revocation fields, and JSON subscription payload.
  - Add RLS policies so users read only their own household notifications and mutate only their own read/hidden/subscription/preferences state.
  - Add `hide_notifications()` that updates `hidden_at` for the authenticated user only.
  - Add security-definer functions with `auth.uid()` checks and grants to `authenticated`.

- [ ] **Step 4: Add the generated TypeScript contract entries**

- [ ] **Step 5: Run local migration, lint, and contract tests**

  Run: `supabase db push --local`, `supabase db lint --local`, `npm test -- tests/domain/notifications.test.mjs`.

---

### Task 2: PWA Shell and Push Subscription

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `src/lib/pwa.ts`
- Create: `src/components/NotificationBell.tsx`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/brief-overrides.css`
- Test: `tests/ui/pwa-notifications.test.mjs`

**Interfaces:**
- `registerMeowkuServiceWorker(): Promise<ServiceWorkerRegistration | null>`.
- `requestPushPermission(): Promise<NotificationPermission>`.
- `subscribeForPush(householdId: string): Promise<void>`.
- `NotificationBell` receives `householdId` and navigates to `Jadwal` when a notification action is selected.

- [ ] **Step 1: Write failing PWA/UI tests**
  - Assert manifest metadata uses the original logo, service worker registration exists, `AppShell` renders a bell, and the bell exposes unread state and clear/read labels.

- [ ] **Step 2: Run the tests and confirm failure**

  Run: `npm test -- tests/ui/pwa-notifications.test.mjs`

- [ ] **Step 3: Add the manifest and service worker**
  - Use `display: standalone`, warm cream theme colors, and the existing logo.
  - Service worker handles `push`, `notificationclick`, and `notificationclose` without caching business data.

- [ ] **Step 4: Register the service worker and implement subscription flow**
  - Read `VITE_WEB_PUSH_PUBLIC_KEY` only as a public key.
  - Save the subscription through the authenticated Supabase client.
  - Show a setup-required state when permission, HTTPS, or public key is unavailable.

- [ ] **Step 5: Add the header bell and notification panel**
  - Query only visible current-user notifications.
  - Mark individual notifications read.
  - Confirm before `Bersihkan tampilan`; call `hide_notifications()` instead of deleting rows.

- [ ] **Step 6: Run typecheck and UI tests**

  Run: `npm run typecheck`, `npm test -- tests/ui/pwa-notifications.test.mjs`.

---

### Task 3: Notification Query Hooks and Settings

**Files:**
- Create: `src/features/notifications/useNotifications.ts`
- Create: `src/features/notifications/NotificationSettings.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/lib/timezone.ts`
- Test: `tests/domain/notifications-ui.test.mjs`

**Interfaces:**
- `useNotifications(householdId)` returns visible notifications, unread count, loading, and error state.
- `useMarkNotificationRead(householdId)` marks one notification read and invalidates notification queries.
- `useHideNotifications(householdId)` clears only the current user’s visible inbox.
- `useNotificationPreferences(householdId)` reads and updates `due_reminders` and `sound_enabled`.

- [ ] **Step 1: Write failing tests**
  - Assert settings exposes reminder and sound controls, clear text explicitly says it only clears the view, and queries are household-scoped.

- [ ] **Step 2: Run tests and confirm failure**

  Run: `npm test -- tests/domain/notifications-ui.test.mjs`

- [ ] **Step 3: Implement hooks and settings UI**
  - Use TanStack Query keys scoped by user/household.
  - Keep sound best-effort and never claim custom audio delivery is guaranteed.
  - Reuse `INDONESIA_TIMEZONES` and labels for all settings copy.

- [ ] **Step 4: Run targeted tests and typecheck**

---

### Task 4: Server Dispatcher and Push Delivery

**Files:**
- Create: `supabase/functions/dispatch-due-notifications/index.ts`
- Create: `supabase/functions/register-push-subscription/index.ts`
- Create: `supabase/functions/revoke-push-subscription/index.ts`
- Create: `supabase/migrations/20261024002500_notification_dispatch.sql`
- Modify: `supabase/config.toml` if function configuration is required
- Test: `tests/security/notifications-dispatch.test.mjs`

**Interfaces:**
- Dispatcher accepts only an internal scheduler secret, derives due occurrences from the database, and returns counts without exposing subscription secrets.
- Registration accepts the authenticated session and subscription JSON; household membership is derived from the session.
- Revocation accepts only the authenticated user’s endpoint/subscription id.

- [ ] **Step 1: Write failing server contract tests**
  - Assert JWT/internal-secret checks, no client household authorization, due filtering, completed/archived exclusion, and idempotent occurrence key.

- [ ] **Step 2: Run the tests and confirm failure**

  Run: `npm test -- tests/security/notifications-dispatch.test.mjs`

- [ ] **Step 3: Add the server-side dispatcher RPC/function**
  - Select due occurrences by `scheduled_at <= now()`, active schedule, uncompleted, and non-archived state.
  - Insert notification rows using `ON CONFLICT DO NOTHING`.
  - Resolve recipients through active household membership and enabled preferences.
  - Send Web Push using VAPID secrets only on the server.
  - Revoke subscriptions on permanent push failure.

- [ ] **Step 4: Add registration and revocation functions**
  - Validate subscription endpoint and keys.
  - Derive `user_id` from JWT and verify household membership in the database.

- [ ] **Step 5: Document scheduler setup and configuration**
  - Required secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NOTIFICATION_DISPATCH_SECRET`.
  - Mark mobile push as `SetupRequired` until these are configured.

- [ ] **Step 6: Run local function tests and database lint**

---

### Task 5: Integration Verification and Documentation

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `README_MULAI_DISINI.md`
- Modify: `tests/e2e/critical-flows.spec.ts`

- [ ] **Step 1: Add an end-to-end notification flow**
  - Install/register PWA, request permission, create a schedule, generate due occurrence, verify notification inbox, mark read, clear display, and verify audit remains.

- [ ] **Step 2: Run all verification commands**

  Run: `npm test`, `npm run typecheck`, `npm run build`, `supabase db lint --local`, `supabase db push --local`.

- [ ] **Step 3: Run mobile/PWA manual QA**
  - Test localhost in desktop browser.
  - Test Android Chrome installed PWA with HTTPS preview.
  - Test iPhone Home Screen PWA with permission granted/denied.
  - Test WIB/WITA/WIT schedule boundaries and duplicate dispatcher runs.

- [ ] **Step 4: Document PASS/FAIL/BLOCKED honestly**
  - Record whether VAPID secrets and a deployed scheduler are configured.
  - Do not claim real mobile push delivery if only localhost UI was tested.
