import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('dashboard exposes per-cat progress and real attention items', () => {
  const hook = read('src/features/dashboard/useDashboard.ts');
  const page = read('src/features/dashboard/DashboardPage.tsx');
  assert.match(hook, /perCatProgress/);
  assert.match(hook, /attentionItems/);
  assert.match(hook, /cat_vaccinations/);
  assert.match(hook, /eq\(['"]household_id['"], householdId\)/);
  assert.match(page, /PERLU PERHATIAN/);
  assert.match(page, /perCatProgress/);
});
