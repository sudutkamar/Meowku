import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('schedule migration defines recurrence, targets, and idempotent occurrence keys', () => {
  const migrationPath = 'supabase/migrations/20261024000700_schedules_and_occurrences.sql';
  assert.equal(existsSync(migrationPath), true);
  const migration = read(migrationPath);
  assert.match(migration, /alter table public\.schedules/);
  assert.match(migration, /repeat_unit.*day.*week.*month/s);
  assert.match(migration, /timezone text not null default 'Asia\/Jakarta'/);
  assert.match(migration, /create table if not exists public\.schedule_targets/);
  assert.match(migration, /unique \(schedule_id, target_key, local_date\)/);
  assert.match(migration, /on conflict \(schedule_id, target_key, local_date\) do nothing/i);
});

test('schedule generation uses local dates and preserves existing history', () => {
  const source = read('supabase/functions/generate-schedule-occurrences/index.ts');
  assert.match(source, /Authorization/);
  assert.match(source, /Asia\/Jakarta/);
  assert.match(source, /generate_schedule_occurrences/);
  const migration = read('supabase/migrations/20261024000700_schedules_and_occurrences.sql');
  assert.match(migration, /is_household_member/);
  assert.match(migration, /local_date/);
  assert.match(migration, /on conflict.*do nothing/i);
  assert.match(migration, /completed_at/);
});

test('completion validates membership and writes an audit event atomically', () => {
  const source = read('supabase/functions/complete-occurrence/index.ts');
  assert.match(source, /occurrenceId/);
  assert.match(source, /getUser|auth\.getUser/);
  assert.match(source, /completed_at/);
  assert.match(source, /rpc\(['"]complete_occurrence/);
  const migration = read('supabase/migrations/20261024000800_audit_and_reporting.sql');
  assert.match(migration, /schedule_occurrences/);
  assert.match(migration, /audit_events/);
});

test('schedule UI exposes definitions, today checklist, and completion feedback', () => {
  const source = read('src/features/schedules/SchedulesPage.tsx');
  assert.match(source, /useSchedules/);
  assert.match(source, /useCompleteOccurrence/);
  assert.match(source, /Hari ini/);
  assert.match(source, /Selesai|selesai/);
  assert.match(source, /isLoading/);
  assert.match(source, /role="alert"/);
});

test('schedule UI calculates an editable end date and validates recurrence input', () => {
  const source = read('src/features/schedules/SchedulesPage.tsx');
  const formLogic = read('src/features/schedules/scheduleForm.ts');
  assert.match(source, /Frekuensi pengulangan/);
  assert.match(source, /frekuensi.*rentang tanggal|rentang tanggal.*frekuensi/i);
  assert.match(source, /Tanggal berakhir/);
  assert.match(source, /Tanggal berakhir dapat diubah/);
  assert.match(source, /validateSchedule/);
  assert.match(formLogic, /addInterval/);
  assert.match(formLogic, /end_date.*start_date|start_date.*end_date/);
  assert.match(formLogic, /repeat_interval.*0/);
});

test('schedule duration is inclusive of the start date', () => {
  const formLogic = read('src/features/schedules/scheduleForm.ts');
  assert.match(formLogic, /date\.setUTCDate\(date\.getUTCDate\(\) - 1\)/);
});

test('schedule creation supplies scheduled_at through the typed RPC contract', () => {
  const source = read('src/features/schedules/useSchedules.ts');
  assert.match(source, /rpc\(['"]create_schedule/);
  assert.match(source, /scheduled_at_value:\s*scheduledAt\(input\)/);
  assert.doesNotMatch(source, /insert\(\{\s*\.\.\.input/);
});
