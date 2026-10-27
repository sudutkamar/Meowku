# Schedule History and Global Rotation

## Goal

Add a dedicated schedule-history page opened by the dashboard checklist and add a household-wide weekday assignment rotation for active household members.

## Scope

- Dashboard checklist `Lihat semua` opens `Riwayat Jadwal`.
- Riwayat Jadwal filters occurrences by hari ini, minggu ini, and bulan ini.
- Each occurrence displays its assigned member and completion actor when available.
- Owner/admin can configure one global weekday-to-member rotation for a household.
- Occurrences snapshot the assigned member when generated; changing rotation does not rewrite existing occurrences.
- Rotation configuration is date-bounded and only accepts active members of the same household.

## Data Design

Add `household_schedule_rotations` with one row per household and date-bounded configuration: `household_id`, `start_date`, `end_date`, `is_active`, timestamps, and audit ownership.

Add `household_schedule_rotation_days` with one row per configured ISO weekday: `rotation_id`, `weekday`, `user_id`. Enforce unique rotation/weekday and validate that `user_id` is an active member of the rotation household.

Add nullable `assigned_to` to `schedule_occurrences`, referencing `auth.users`. Existing rows remain null if no prior rotation existed. Generation selects the matching active rotation day and writes the member once at insert time. Existing rows are never rewritten by rotation changes.

Use security-definer RPCs for create/update rotation and generation. RPCs derive the household from authenticated membership and reject non-owner/admin writes. RLS allows household members to read configuration and occurrence assignments while writes remain server-authorized. Rotation mutations write audit events.

## UI Design

Add `ScheduleHistoryPage` as a separate dashboard destination. It reuses the existing occurrence query and date filters but does not show schedule-definition forms. Timeline rows show date, time, task, target, assigned member, completion state, and completion actor.

Add a global rotation panel to `MembersPage` for owner/admin users. It loads active members, allows start/end dates, and provides Monday-Sunday member selectors. Save uses the RPC and invalidates members, schedule occurrences, dashboard, and history queries.

## Error Handling

- Missing Supabase configuration uses the existing setup state.
- Empty member list disables rotation save with an Indonesian explanation.
- Invalid date range, inactive member, duplicate weekday, and unauthorized role are rejected by the database and displayed as mutation errors.
- Missing assignment is rendered as `Belum ditugaskan`.

## Verification

- Add domain tests for rotation schema, membership validation, occurrence snapshot behavior, and date filters.
- Add UI contract tests for dashboard navigation, history filters, assignment labels, and rotation controls.
- Run `npm test`, `npm run typecheck`, and `npm run build`.
- Run Supabase local migration/lint when Docker is available; otherwise document the blocker without claiming live validation.
