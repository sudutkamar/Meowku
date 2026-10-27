import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('global search queries all supported entities within the active household', () => {
  const source = read('src/features/search/useGlobalSearch.ts');
  for (const table of ['cats', 'schedules', 'litter_boxes', 'catalog_items']) {
    assert.match(source, new RegExp(`from\\('${table}'\\)`));
    assert.match(source, /eq\('household_id', householdId\)/);
  }
  assert.match(source, /setTimeout/);
  assert.match(source, /Promise\.all/);
});

test('global search presents grouped, keyboard-navigable, and stateful results', () => {
  const source = read('src/components/GlobalSearch.tsx');
  assert.match(source, /Kucing/);
  assert.match(source, /Jadwal/);
  assert.match(source, /Litter Box/);
  assert.match(source, /Katalog/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /Tidak ada hasil/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Memuat/);
});

test('shell search is database-backed and receives current household context', () => {
  const source = read('src/components/AppShell.tsx');
  assert.match(source, /householdId/);
  assert.match(source, /GlobalSearch/);
  assert.doesNotMatch(source, /filteredNavigation/);
});
