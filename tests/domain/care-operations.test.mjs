import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');
const migration = read('supabase/migrations/20261030000100_litter_inventory_audit.sql');
const wellness = read('supabase/migrations/20261030000200_cat_wellness_nutrition.sql');

test('care operations are household-scoped, auditable, and protected by RPCs', () => {
  assert.match(migration, /create table if not exists public\.litter_box_cleanings/);
  assert.match(migration, /create or replace function public\.mark_litter_box_cleaned/);
  assert.match(migration, /create table if not exists public\.catalog_stock_movements/);
  assert.match(migration, /create or replace function public\.record_catalog_stock_movement/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /create trigger [a-z_]+_audit_change/);
  assert.match(migration, /prevent_catalog_stock_direct_update/);
});

test('wellness schema stores structured nutrition, medication, and body-condition inputs', () => {
  assert.match(wellness, /body_condition_score/);
  assert.match(wellness, /kcal_per_100g/);
  assert.match(wellness, /daily_kcal_target/);
  assert.match(wellness, /dose_amount/);
  assert.match(wellness, /cat_health_medication_dates_valid/);
});

test('care UI exposes the structured fields without inventing records', () => {
  const cats = read('src/features/cats/CatsPage.tsx');
  const health = read('src/features/cats/CatCarePanel.tsx');
  const catalog = read('src/features/catalog/CatalogPage.tsx');
  const history = read('src/features/history/HistoryPage.tsx');
  assert.match(cats, /body_condition_score/);
  assert.match(health, /RER \(estimasi\)/);
  assert.match(health, /dose_amount/);
  assert.match(catalog, /useRecordCatalogStockMovement/);
  assert.match(history, /Export CSV/);
  assert.doesNotMatch(`${cats}${health}${catalog}${history}`, /sample cats|fake API response/i);
});
