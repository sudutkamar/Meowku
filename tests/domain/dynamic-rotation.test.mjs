import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('future occurrences resolve against the active rotation, not frozen history', () => {
  const migration = read('supabase/migrations/20261106000100_today_completed_rotasi_assignee.sql');
  assert.match(migration, /local_date >= v_today/);
  assert.match(migration, /archived_at is not null or local_date < v_today/);
  assert.match(migration, /weekday = extract\(isodow from local_date\)::smallint/);
});

test('ad-hoc reassignment overrides rotation and supports uncomplete, all audited', () => {
  const migration = read('supabase/migrations/20261106000200_adhoc_reassign_uncomplete.sql');
  assert.match(migration, /manual_assignee_id/);
  assert.match(migration, /manual_assigned_by/);
  assert.match(migration, /reassign_occurrence/);
  assert.match(migration, /uncomplete_occurrence/);
  assert.match(migration, /audit_events/);
});

test('completion separately records who completed the task', () => {
  const migration = read('supabase/migrations/20261102000100_history_task_performance.sql');
  assert.match(migration, /completed_by = auth\.uid\(\)/);
  assert.match(migration, /'completed', 'schedule_occurrence'/);
});

test('scheduled target integrity is enforced by database triggers', () => {
  const migration = read('supabase/migrations/20261106000300_schedule_target_integrity.sql');
  assert.match(migration, /validate_schedule_target/);
  assert.match(migration, /schedule_target_not_accessible/);
  assert.match(migration, /archive_schedule_targets_for_entity/);
});

test('schedule history reads synthesized rows are not rendered client-side', () => {
  const page = read('src/features/schedule-history/ScheduleHistoryPage.tsx');
  assert.doesNotMatch(page, /fallbackTomorrowOccurrences/);
  assert.doesNotMatch(page, /mergeTomorrowOccurrences/);
  assert.match(page, /const tomorrowRows = tomorrowOccurrences\.data \?\? \[\];/);
});

test('web service worker does not cache API responses', () => {
  const worker = read('public/sw.js');
  assert.match(worker, /meowku-shell-v4/);
  assert.match(worker, /isStaticAsset/);
  assert.match(worker, /assets\/|icons|UI\//);
  assert.match(worker, /if \(!isStaticAsset\) return;/);
});
