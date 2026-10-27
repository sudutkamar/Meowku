import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('dashboard has a dedicated page and household-scoped query hook', () => {
  const page = read('src/features/dashboard/DashboardPage.tsx');
  const hook = read('src/features/dashboard/useDashboard.ts');

  assert.match(page, /DashboardPage/);
  assert.match(page, /useDashboard/);
  assert.match(hook, /from\(['"]cats['"]\)/);
  assert.match(hook, /from\(['"]litter_boxes['"]\)/);
  assert.match(hook, /from\(['"]schedules['"]\)/);
  assert.match(hook, /from\(['"]schedule_occurrences['"]\)/);
  assert.match(hook, /from\(['"]audit_events['"]\)/);
  assert.match(hook, /household_id/);
  assert.doesNotMatch(hook, /localStorage/);
});

test('dashboard derives today from household timezone and computes completion from rows', () => {
  const hook = read('src/features/dashboard/useDashboard.ts');
  assert.match(hook, /timeZone: timezone/);
  assert.match(hook, /completed_at/);
  assert.match(hook, /completedToday/);
  assert.match(hook, /totalToday/);
  assert.doesNotMatch(hook, /completionRate\s*[:=]\s*100/);
  assert.doesNotMatch(hook, /cats\s*:\s*\d+|litterBoxes\s*:\s*\d+|activeSchedules\s*:\s*\d+/);
  assert.match(hook, /slot_id/);
  assert.match(hook, /archived_at/);
  assert.match(hook, /missed|pending/);
});

test('dashboard actions navigate to real destinations and use the existing completion flow', () => {
  const page = read('src/features/dashboard/DashboardPage.tsx');
  assert.match(page, /onNavigate\(['"]Kucing['"]\)/);
  assert.match(page, /onNavigate\(['"]Litter Box['"]\)/);
  assert.match(page, /onNavigate\(['"]Jadwal['"]\)/);
  assert.match(page, /onNavigate\(['"]Histori['"]\)/);
  assert.match(page, /useCompleteOccurrence/);
  assert.match(page, /Coba lagi|Muat ulang/);
  assert.match(page, /slot|Slot/);
  assert.match(page, /target|Target/);
});

test('authenticated app renders DashboardPage instead of the generic fallback', () => {
  const routes = read('src/routes.tsx');
  assert.match(routes, /DashboardPage/);
  assert.doesNotMatch(routes, /empty-page/);
});

test('dashboard household entities define readable text in dark mode', () => {
  const styles = read('src/brief-overrides.css');
  assert.match(styles, /dashboard-entities/);
  assert.match(styles, /dashboard-entities[^}]*color:#/);
  assert.match(styles, /\[data-theme="dark"\][^}]*dashboard-entities/);
});
