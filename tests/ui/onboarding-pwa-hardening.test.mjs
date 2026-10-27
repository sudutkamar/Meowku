import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dashboard = fs.readFileSync('src/features/dashboard/DashboardPage.tsx', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const bell = fs.readFileSync('src/components/NotificationBell.tsx', 'utf8');

test('dashboard onboarding is derived from real household counts', () => {
  assert.match(dashboard, /Tambah kucing/);
  assert.match(dashboard, /data\.cats\.length/);
  assert.match(dashboard, /data\.activeSchedules/);
});

test('service worker caches the shell without pretending to cache business data', () => {
  assert.match(sw, /caches\.open/);
  assert.match(sw, /fetch\(event\.request\)/);
  assert.doesNotMatch(sw, /schedule_occurrences|cat_health_records|mock|sample/i);
});

test('notification actions use accessible app dialogs instead of native confirm/alert', () => {
  assert.match(bell, /ConfirmDialog/);
  assert.doesNotMatch(bell, /window\.(confirm|alert)/);
});
