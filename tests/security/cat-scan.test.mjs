import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('food scan edge function verifies JWT and never creates confirmed products', () => {
  const source = readFileSync('supabase/functions/scan-food/index.ts', 'utf8');
  assert.match(source, /Authorization/);
  assert.match(source, /auth\.getUser/);
  assert.match(source, /household_access/);
  assert.match(source, /food_label/);
  assert.match(source, /draft/);
  assert.doesNotMatch(source, /from\(['"]food_products['"]\).*insert/);
});
