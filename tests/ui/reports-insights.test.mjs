import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('reports expose database-derived expense, weight, and vaccine insights', () => {
  const query = read('src/lib/report-queries.ts');
  const page = read('src/features/reports/ReportsPage.tsx');
  assert.match(query, /cat_expenses/);
  assert.match(query, /cat_health_records/);
  assert.match(query, /cat_vaccinations/);
  assert.match(page, /Pengeluaran|Biaya/);
  assert.match(page, /Berat badan|Berat/);
  assert.match(page, /Vaksin/);
});
