import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('audit migration is append-only and exposes report aggregates', () => {
  const migrationPath = 'supabase/migrations/20261024000800_audit_and_reporting.sql';
  assert.equal(existsSync(migrationPath), true);
  const migration = read(migrationPath);
  assert.match(migration, /prevent_audit_mutation/);
  assert.match(migration, /before update or delete/i);
  assert.match(migration, /create or replace function public\.household_report/);
  assert.match(migration, /completed_total/);
  assert.match(migration, /overdue_total/);
  assert.match(migration, /is_household_member/);
});

test('report queries return database aggregates with date filters and no literals', () => {
  const source = read('src/lib/report-queries.ts');
  assert.match(source, /household_report/);
  assert.match(source, /fromDate/);
  assert.match(source, /toDate/);
  assert.match(source, /supabase/);
  assert.doesNotMatch(source, /completed_total:\s*\d/);
  assert.doesNotMatch(source, /overdue_total:\s*\d/);
});

test('report expense range includes the complete end date', () => {
  const source = readFileSync('src/lib/report-queries.ts', 'utf8');
  assert.match(source, /\.gte\('spent_at', fromDate\)/);
  assert.match(source, /\.lte\('spent_at', toDate\)/);
  assert.match(source, /recorded_at.*\$\{fromDate\}T00:00:00/);
  assert.match(source, /recorded_at.*\$\{toDate\}T23:59:59/);
});

test('history and report pages expose query states and empty states', () => {
  const history = read('src/features/history/HistoryPage.tsx');
  const reports = read('src/features/reports/ReportsPage.tsx');
  for (const source of [history, reports]) {
    assert.match(source, /isLoading/);
    assert.match(source, /role="alert"/);
    assert.match(source, /Belum ada|Belum tersedia/);
  }
});
