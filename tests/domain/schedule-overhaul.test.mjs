import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migrationPath = 'supabase/migrations/20261024001800_schedule_slots_and_rules.sql';

test('schedule slots provide stable labels, local times, ordering, and active state', () => {
  const migration = read(migrationPath);
  assert.match(migration, /create table if not exists public\.schedule_slots/);
  assert.match(migration, /label text/);
  assert.match(migration, /local_time time/);
  assert.match(migration, /sort_order integer/);
  assert.match(migration, /is_active boolean/);
  assert.match(migration, /slot_id uuid/);
  assert.match(migration, /unique \(schedule_id, target_key, local_date, slot_id\)/i);
});

test('schedule generation covers daily slots, selected weekly days, and monthly last-day rules', () => {
  const migration = read(migrationPath);
  assert.match(migration, /repeat_unit = 'day'/);
  assert.match(migration, /days_of_week/);
  assert.match(migration, /day_of_month/);
  assert.match(migration, /last_day/);
  assert.match(migration, /make_date|date_trunc\('month'/);
  assert.match(migration, /on conflict \(schedule_id, target_key, local_date, slot_id\) do nothing/i);
});

test('one-month finite ranges are normalized to daily schedules', () => {
  const migration = read('supabase/migrations/20261029000200_normalize_month_range_schedules.sql');
  const page = read('src/features/schedules/SchedulesPage.tsx');
  assert.match(migration, /new\.repeat_unit := 'day'/);
  assert.match(migration, /new\.end_date <= \(new\.start_date \+ interval '1 month'\)::date/);
  assert.match(migration, /before insert or update/);
  assert.match(migration, /where repeat_unit = 'month'/);
  assert.match(page, /normalizeMonthRangeInput/);
  assert.match(page, /submittedForm/);
});

test('create schedule validates targets and writes slots and targets atomically', () => {
  const migration = read(migrationPath);
  assert.match(migration, /create or replace function public\.create_schedule\(/);
  assert.match(migration, /slots_value jsonb/);
  assert.match(migration, /targets_value jsonb/);
  assert.match(migration, /household_role\(household_id_value\).*owner.*admin/s);
  assert.match(migration, /schedule_targets/);
  assert.match(migration, /cats.*household_id|household_id.*cats/s);
  assert.match(migration, /litter_boxes.*household_id|household_id.*litter_boxes/s);
});

test('pause, resume, update, archive, and delete enforce lifecycle protections', () => {
  const migration = read(migrationPath);
  for (const functionName of ['pause_schedule', 'resume_schedule', 'update_schedule_definition', 'archive_schedule', 'delete_schedule']) {
    assert.match(migration, new RegExp(`function public\\.${functionName}`));
  }
  assert.match(migration, /status.*active.*paused.*archived/s);
  assert.match(migration, /schedule_has_history_archive_instead/);
});

test('dashboard excludes archived occurrences and inactive schedules', () => {
  const source = read('src/features/dashboard/useDashboard.ts');
  assert.match(source, /is\('archived_at', null\)/);
  assert.match(source, /schedules.*is_active|is_active.*schedules/s);
});

test('database types expose slots, rules, lifecycle RPCs, and slot identity', () => {
  const types = read('src/lib/database.types.ts');
  assert.match(types, /schedule_slots:/);
  assert.match(types, /slot_id: string/);
  assert.match(types, /status: 'active' \| 'paused' \| 'archived'/);
  assert.match(types, /pause_schedule:/);
  assert.match(types, /resume_schedule:/);
  assert.match(types, /update_schedule_definition:/);
});

test('schedule frontend hydrates real slots, targets, and lifecycle mutations', () => {
  const source = read('src/features/schedules/useSchedules.ts');
  assert.match(source, /from\(['"]schedule_slots['"]\)/);
  assert.match(source, /from\(['"]schedule_targets['"]\)/);
  assert.match(source, /from\(['"]cats['"]\)/);
  assert.match(source, /from\(['"]litter_boxes['"]\)/);
  assert.match(source, /pause_schedule/);
  assert.match(source, /resume_schedule/);
  assert.match(source, /update_schedule_definition/);
  assert.match(source, /status/);
});

test('schedule page exposes recurrence rules, editable slots and target selectors', () => {
  const source = read('src/features/schedules/SchedulesPage.tsx');
  for (const text of ['Hari', 'Minggu', 'Bulan', 'Hari dalam minggu', 'Hari terakhir', 'Tambah slot', 'Kucing', 'Litter box', 'Jeda', 'Lanjutkan', 'Edit']) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /timeline|groupBy|status-missed|Terlewat/);
});

test('schedule slots are normalized in local chronological order and use 24-hour picker hints', () => {
  const page = read('src/features/schedules/SchedulesPage.tsx');
  const hook = read('src/features/schedules/useSchedules.ts');
  const overrides = read('src/brief-overrides.css');
  assert.match(page, /sort.*local_time|local_time.*sort/);
  assert.match(page, /TimeField/);
  assert.doesNotMatch(page, /type=["']time["']/);
  assert.match(hook, /sort.*local_time|local_time.*sort/);
  assert.match(overrides, /data-theme=["']dark["'].*time-field/);
});

test('schedule slot editor supports drag reorder and keyboard fallback', () => {
  const page = read('src/features/schedules/SchedulesPage.tsx');
  assert.match(page, /draggable/);
  assert.match(page, /onDragStart/);
  assert.match(page, /onDrop/);
  assert.match(page, /Naik/);
  assert.match(page, /Turun/);
  assert.match(page, /sort_order/);
});
