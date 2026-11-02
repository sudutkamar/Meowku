import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('task performance derives missed work from occurrences and protects admin scope', () => {
  const migration = read('supabase/migrations/20261102000100_history_task_performance.sql');
  assert.match(migration, /create or replace function public\.household_task_performance/);
  assert.match(migration, /household_role\(requested_household_id\) not in \('owner', 'admin'\)/);
  assert.match(migration, /when o\.local_date < .* then 'missed'/s);
  assert.doesNotMatch(migration, /action.*'missed'/i);
  assert.match(migration, /assigned_label/);
  assert.match(migration, /completed_by_label/);
  assert.match(migration, /delay_minutes/);
});

test('audit history preserves actor snapshots and safe detail metadata', () => {
  const migration = read('supabase/migrations/20261102000100_history_task_performance.sql');
  const page = read('src/features/history/HistoryPage.tsx');
  assert.match(migration, /add column if not exists actor_name/);
  assert.match(migration, /audit_events_actor_snapshot/);
  assert.match(migration, /display_name/);
  assert.match(migration, /changed_fields/);
  assert.match(page, /actor_name/);
  assert.match(page, /changedFieldsDescription/);
  assert.match(page, /Detail/);
});

test('history separates immutable audit from operational task performance', () => {
  const page = read('src/features/history/HistoryPage.tsx');
  const panel = read('src/features/history/TaskPerformancePanel.tsx');
  assert.match(page, /Audit perubahan/);
  assert.match(page, /Kinerja tugas/);
  assert.match(page, /TaskPerformancePanel/);
  assert.match(panel, /household_task_performance/);
  assert.match(panel, /Tugas terlewat/);
  assert.match(panel, /Dikerjakan oleh/);
  assert.match(panel, /assigned_label/);
  assert.match(panel, /Supabase · occurrence/);
});
