import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261025000400_cat_health_food_expenses.sql', 'utf8');

test('cat care foundation includes household-scoped health, vaccine, food, expense, and scan tables', () => {
  for (const table of ['cat_attachments', 'cat_health_records', 'cat_vaccinations', 'food_products', 'cat_food_profiles', 'cat_expenses', 'cat_scan_records']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test('cat care attachments use a private storage bucket and household membership policies', () => {
  assert.match(migration, /values \('cat-attachments', 'cat-attachments', false\)/);
  assert.match(migration, /cat_attachments_storage_select/);
  assert.match(migration, /cat_attachments_storage_insert/);
  assert.match(migration, /public\.is_household_member/);
});

test('cat care foundation has no sample records', () => {
  assert.doesNotMatch(migration, /insert into public\.(cat_|food_)/i);
});
