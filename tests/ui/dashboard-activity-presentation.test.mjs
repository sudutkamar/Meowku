import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('dashboard activity uses Indonesian labels instead of raw audit tokens', () => {
  const source = read('src/features/dashboard/DashboardPage.tsx');
  assert.match(source, /activityActionLabel/);
  assert.match(source, /activityEntityLabel/);
  assert.match(source, /Tugas diselesaikan/);
  assert.doesNotMatch(source, /activityLabel\(event\.action, event\.entity_type\)/);
});

test('dashboard activity rows have a readable dark-mode presentation', () => {
  const styles = read('src/dashboard-checklist.css');
  assert.match(styles, /activity-row/);
  assert.match(styles, /activity-kind/);
  assert.match(styles, /data-theme="dark"[^}]*activity-row|activity-row[^}]*data-theme="dark"/);
});
