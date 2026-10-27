# Meowku PWA Notifications

## Goal

Menambahkan PWA installable, push notification ke HP, inbox notifikasi di dalam aplikasi, ikon lonceng dengan unread badge, dan clear-from-view tanpa menghapus audit database.

## Scope

- PWA manifest, service worker, install metadata, dan runtime registration.
- Web Push subscription berbasis user dan household.
- Notification preferences untuk reminder dan suara.
- Notification inbox dengan read/unread state.
- Clear tampilan dengan soft-hide per user, bukan hard delete.
- Background dispatcher yang idempotent berdasarkan occurrence.
- Waktu mengikuti timezone household: `Asia/Jakarta` (WIB), `Asia/Makassar` (WITA), atau `Asia/Jayapura` (WIT).

## Data Model

- `notification_preferences`: `user_id`, `household_id`, `due_reminders`, `sound_enabled`, `updated_at`; unique per user-household.
- `push_subscriptions`: `user_id`, `household_id`, endpoint, encrypted/public subscription JSON, user-agent, last_seen_at, revoked_at; RLS hanya pemilik dan server dispatcher.
- `notifications`: `id`, `household_id`, `user_id`, `occurrence_id`, `type`, `title`, `body`, `action_url`, `read_at`, `hidden_at`, `created_at`; unique notification key per user-occurrence-type.
- Existing `audit_events` remains append-only and is never cleared by the UI.

## Runtime Flow

1. Authenticated user opens the app and grants browser notification permission.
2. The app registers the service worker and stores the push subscription for the active household.
3. A scheduled dispatcher finds due, active, uncompleted, non-archived occurrences using `scheduled_at <= now()`.
4. The dispatcher inserts one notification per household recipient according to membership and preferences.
5. The dispatcher sends Web Push to active subscriptions and revokes invalid subscriptions.
6. The service worker displays the notification and opens the relevant schedule on click.
7. The bell inbox queries only visible notifications for the authenticated user.
8. Read marks `read_at`; clear marks `hidden_at` and leaves the source notification and audit trail intact.

## Security

- All notification tables have RLS enabled.
- Client writes are limited to the authenticated user’s subscription/preferences and read/hidden state.
- Dispatcher authorization is server-side and does not trust household/user IDs supplied by the client.
- VAPID private key and dispatcher secret stay in Supabase secrets, never in frontend code.
- Push payload contains only the minimum schedule title/time/target needed by the recipient.

## Timezone

- Database occurrence generation remains the source of truth for local date and scheduled instant.
- UI labels use `WIB (UTC+7)`, `WITA (UTC+8)`, and `WIT (UTC+9)`.
- All notification due checks use the stored `scheduled_at` instant, avoiding browser/device timezone drift.

## UX

- Header bell shows unread count and opens a dropdown/panel.
- Empty state explains how to enable notifications.
- Settings exposes enable/disable reminders, sound preference, and install/permission status.
- Sound is best-effort because browser autoplay rules can block custom audio; OS notification sound/vibration remains available.
- Clear action is labeled `Bersihkan tampilan`, requires confirmation, and does not claim to delete audit history.

## Local and Deployment Constraints

- UI, service worker registration, inbox, permission flow, and in-app reminder behavior work on localhost.
- Real mobile push requires HTTPS, installed PWA, VAPID keys, and a deployed scheduler/Edge Function.
- Missing VAPID or scheduler configuration must show `SetupRequired`, never silently fall back to fake notifications.

## Testing

- Contract tests for manifest/service worker registration and notification UI.
- Database tests for RLS, unique idempotency, recipient scoping, and soft-hide behavior.
- Dispatcher tests for due/not-due, completed/archived, duplicate, timezone, and invalid subscription cases.
- Typecheck, build, database lint, and local migration verification.
- Manual QA for desktop, Android PWA, iPhone Home Screen PWA, permission denied, offline, and clear/read flows.
