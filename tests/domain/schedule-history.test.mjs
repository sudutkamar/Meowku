import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('dashboard checklist opens dedicated schedule history instead of schedule configuration', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx');
  const routes = read('src/routes.tsx');
  assert.match(dashboard, /onNavigate\(['"]Riwayat Jadwal['"]\)/);
  assert.match(routes, /ScheduleHistoryPage/);
  assert.match(routes, /path: ['"]\/riwayat-jadwal['"]/);
});

test('schedule history exposes today, tomorrow, week, month filters and assignment labels', () => {
  const page = read('src/features/schedule-history/ScheduleHistoryPage.tsx');
  const hook = read('src/features/schedules/useSchedules.ts');
  for (const label of ['Hari ini', 'Besok', 'Minggu ini', 'Bulan ini', 'Petugas:', 'Selesai oleh:', 'Belum ditugaskan']) assert.match(page, new RegExp(label));
  assert.match(page, /title="Jadwal saya"/);
  assert.match(page, /useScheduleOccurrences/);
  assert.match(page, /useScheduleMembers/);
  assert.match(hook, /assigned_to/);
  assert.match(hook, /completed_by/);
});

test('schedule history does not require a PostgREST embedded assignee relationship', () => {
  const hook = read('src/features/schedules/useSchedules.ts');
  assert.doesNotMatch(hook, /household_assignees\(display_name\)/);
  assert.match(hook, /from\('household_assignees'\)/);
});

test('schedule history exposes a timezone-aware next-day preview', () => {
  const page = read('src/features/schedule-history/ScheduleHistoryPage.tsx');
  const hook = read('src/features/schedules/useSchedules.ts');
  const styles = read('src/schedule-history.css');
  assert.match(hook, /OccurrenceFilter = 'Today' \| 'Tomorrow'/);
  assert.match(hook, /filter === 'Tomorrow'/);
  assert.match(page, /useScheduleOccurrences\(household\.id, timezone, 'Tomorrow'\)/);
  assert.match(page, /Jadwal besok/);
  assert.match(page, /tomorrow-schedule-panel/);
  assert.match(page, /tomorrowCategoryTone/);
  assert.match(page, /tomorrow-schedule-category/);
  assert.match(page, /tomorrow-schedule-time/);
  assert.match(page, /tomorrowCategoryOptions/);
  assert.match(page, /tomorrow-schedule-toggle/);
  assert.match(page, /aria-expanded=\{tomorrowOpen\}/);
  assert.match(page, /hasTomorrowTasks/);
  assert.match(page, /scheduleIsDueOn\(schedule, date\)/);
  assert.match(page, /tomorrowCategoryOptions\.some/);
  assert.match(styles, /\.tomorrow-schedule-item/);
  assert.match(styles, /\.tomorrow-tone-feeding/);
  assert.match(styles, /\.tomorrow-tone-custom/);
  assert.match(styles, /\.tomorrow-schedule-list::before/);
  assert.match(styles, /\.tomorrow-schedule-filter/);
  assert.match(styles, /\.tomorrow-schedule-collapsed/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});

test('schedule occurrence reads repair missing future rows idempotently', () => {
  const hook = read('src/features/schedules/useSchedules.ts');
  const migration = read('supabase/migrations/20261027000200_schedule_occurrence_repair.sql');
  assert.match(hook, /rpc\('generate_schedule_occurrences'/);
  assert.match(hook, /range_start: range\.from/);
  assert.match(hook, /range_end: range\.to/);
  assert.match(migration, /update_schedule_definition/);
  assert.match(migration, /generate_schedule_occurrences/);
  assert.match(migration, /on conflict|idempotent/i);
});

test('tomorrow preview derives missing rows from active Supabase schedule definitions', () => {
  const page = read('src/features/schedule-history/ScheduleHistoryPage.tsx');
  assert.match(page, /useSchedules\(household\.id\)/);
  assert.match(page, /scheduleIsDueOn/);
  assert.match(page, /fallbackTomorrowOccurrences/);
  assert.match(page, /mergeTomorrowOccurrences/);
  assert.match(page, /schedules\.isLoading/);
});

test('tomorrow preview keeps database occurrences and does not depend on client recurrence filtering', () => {
  const page = read('src/features/schedule-history/ScheduleHistoryPage.tsx');
  const hook = read('src/features/schedules/useSchedules.ts');
  assert.match(page, /const actual = tomorrowOccurrences\.data \?\? \[\];/);
  assert.doesNotMatch(page, /tomorrowOccurrences\.data \?\? \[\]\)\.filter/);
  assert.match(hook, /generate_schedule_occurrences/);
  assert.match(hook, /if \(generationError\) throw generationError/);
  assert.match(hook, /eq\('schedules\.status', 'active'\)/);
  assert.match(hook, /if \(occurrences\.error\) throw occurrences\.error/);
  assert.match(hook, /if \(assignees\.error\) throw assignees\.error/);
});

test('future occurrence repair updates only incomplete future rows and preserves history', () => {
  const migration = read('supabase/migrations/20261028000300_repair_future_schedule_occurrences.sql');
  const hook = read('src/features/schedules/useSchedules.ts');
  assert.match(migration, /on conflict \(schedule_id, target_key, local_date, slot_id\) do update/i);
  assert.match(migration, /occurrence\.completed_at is null/);
  assert.match(migration, /occurrence\.archived_at is null/);
  assert.match(migration, /occurrence\.local_date >=/);
  assert.match(hook, /occurrenceKey\(householdId, timezone, filter, anchorDate\)/);
});
