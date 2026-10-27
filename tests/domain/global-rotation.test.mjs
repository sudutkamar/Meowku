import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('global rotation schema snapshots weekday assignment on occurrence generation', () => {
  const migration = read('supabase/migrations/20261025000100_global_schedule_rotation.sql');
  assert.match(migration, /household_schedule_rotations/);
  assert.match(migration, /household_schedule_rotation_days/);
  assert.match(migration, /assigned_to uuid/);
  assert.match(migration, /weekday between 1 and 7/);
  assert.match(migration, /rotation_member_not_active/);
  assert.match(migration, /extract\(isodow/);
  assert.match(migration, /scheduled_at, assigned_to/);
  assert.match(migration, /on conflict \(schedule_id, target_key, local_date, slot_id\) do nothing/i);
  assert.match(migration, /assigned_to is null/);
  assert.match(migration, /completed_at is null/);
  assert.match(migration, /archived_at is null/);
  assert.match(migration, /household_role\(requested_household_id\).*owner.*admin/s);
  assert.match(migration, /enable row level security/i);
});

test('rotation RPC validates range, active membership, and audit writes', () => {
  const migration = read('supabase/migrations/20261025000100_global_schedule_rotation.sql');
  assert.match(migration, /invalid_rotation_range/);
  assert.match(migration, /save_household_schedule_rotation/);
  assert.match(migration, /is_active/);
  assert.match(migration, /audit_events/);
  assert.match(migration, /duplicate_rotation_day/);
});

test('rotation UI exposes global weekday controls and member-backed save', () => {
  const page = read('src/features/members/ScheduleRotationPanel.tsx');
  const hook = read('src/features/members/useScheduleRotation.ts');
  assert.match(page, /ROTASI PETUGAS/);
  assert.match(page, /Senin/);
  assert.match(page, /Minggu/);
  assert.match(page, /Simpan rotasi/);
  assert.match(page, /Belum ditugaskan/);
  assert.match(hook, /save_household_schedule_rotation/);
  assert.match(hook, /household_assignees/);
  assert.doesNotMatch(`${page}${hook}`, /localStorage/);
});

test('rotation supports named assignees without login accounts', () => {
  const migration = read('supabase/migrations/20261025000500_custom_schedule_assignees.sql');
  const repair = read('supabase/migrations/20261027000400_fix_rotation_assignee_validation.sql');
  const page = read('src/features/members/ScheduleRotationPanel.tsx');
  const hook = read('src/features/members/useScheduleRotation.ts');
  assert.match(migration, /household_assignees/);
  assert.match(migration, /display_name/);
  assert.match(migration, /assignee_id/);
  assert.match(migration, /assignee_not_active/);
  assert.match(repair, /new\.assignee_id is not null/);
  assert.match(repair, /assignee_id is authoritative/);
  assert.match(repair, /return new/);
  assert.match(repair, /rotation_member_not_active/);
  assert.match(page, /Tambah petugas/);
  assert.match(page, /assignee_id/);
  assert.match(hook, /household_assignees/);
});
