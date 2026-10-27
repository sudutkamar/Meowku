import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('schedule lifecycle migration archives safely and preserves occurrence history', () => {
  const migration = read('supabase/migrations/20261024001300_schedule_lifecycle.sql');
  assert.match(migration, /archive_schedule/);
  assert.match(migration, /delete_schedule/);
  assert.match(migration, /completed_at is null/);
  assert.match(migration, /archived_at/);
  assert.match(migration, /audit_events/);
  assert.match(migration, /security definer/);
});

test('schedule creation generates its configured range using the schedule time', () => {
  const migration = read('supabase/migrations/20261024001300_schedule_lifecycle.sql');
  assert.match(migration, /generate_schedule_occurrences/);
  assert.match(migration, /scheduled_at at time zone/);
  assert.match(migration, /create_schedule/);
  assert.match(migration, /on conflict \(schedule_id, target_key, local_date\) do nothing/i);
});

test('schedule hooks expose timezone-aware filters and lifecycle mutations', () => {
  const source = read('src/features/schedules/useSchedules.ts');
  assert.match(source, /Today|This Week|This Month/);
  assert.match(source, /householdLocalDate/);
  assert.match(source, /archive_schedule/);
  assert.match(source, /delete_schedule/);
  assert.match(source, /archive_occurrence/);
  assert.match(source, /archived_at/);
  assert.match(source, /rpc\('complete_occurrence'/);
  assert.doesNotMatch(source, /functions\.invoke\('complete-occurrence'/);
});

test('schedule UI exposes filter tabs and confirmation before archive/delete actions', () => {
  const source = read('src/features/schedules/SchedulesPage.tsx');
  assert.match(source, /Hari ini/);
  assert.match(source, /Minggu ini/);
  assert.match(source, /Bulan ini/);
  assert.match(source, /confirm/);
  assert.match(source, /Arsipkan/);
  assert.match(source, /Hapus permanen/);
  assert.match(source, /respons/);
});

test('restoring a schedule reactivates its uncompleted archived occurrences', () => {
  const migration = read('supabase/migrations/20261024002300_restore_archived_occurrences.sql');
  assert.match(migration, /archived_at\s*=\s*null/);
  assert.match(migration, /completed_at\s+is\s+null/);
  assert.match(migration, /schedule_id\s*=\s*schedule_id_value/);
});

test('permanent schedule deletion does not silently downgrade to archive', () => {
  const hook = read('src/features/schedules/useSchedules.ts');
  const migration = read('supabase/migrations/20261026000400_true_permanent_schedule_delete.sql');
  assert.doesNotMatch(hook, /schedule_has_history_archive_instead/);
  assert.match(migration, /delete from public\.schedules/);
  assert.match(migration, /occurrence_count/);
  assert.match(migration, /permanent.*true/s);
  assert.match(migration, /security definer/);
});

test('Indonesia timezones expose WIB, WITA, and WIT labels', () => {
  const source = read('src/lib/timezone.ts');
  assert.match(source, /Asia\/Jakarta/);
  assert.match(source, /WIB/);
  assert.match(source, /Asia\/Makassar/);
  assert.match(source, /WITA/);
  assert.match(source, /Asia\/Jayapura/);
  assert.match(source, /WIT/);
});

test('history renders audit timestamps in the household timezone', () => {
  const source = read('src/features/history/HistoryPage.tsx');
  assert.match(source, /timeZone: timezone/);
});
