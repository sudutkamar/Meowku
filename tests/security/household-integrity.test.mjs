import assert from 'node:assert/strict';
import fs, { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20261026000100_household_integrity_hardening.sql', 'utf8');

test('household integrity validates cat, product, and attachment relationships', () => {
  assert.match(migration, /validate_cat_care_household/);
  assert.match(migration, /cat_household_mismatch/);
  assert.match(migration, /food_product_household_mismatch/);
  assert.match(migration, /attachment_household_mismatch/);
  assert.match(migration, /cat_food_profiles_household_integrity/);
});

test('household export requires an explicit authorized household', () => {
  const fn = readFileSync('supabase/functions/export-household/index.ts', 'utf8');
  const migration = readFileSync('supabase/migrations/20261026000300_active_household_export.sql', 'utf8');
  assert.match(fn, /householdId/);
  assert.match(fn, /requested_household_id/);
  assert.match(migration, /is_household_member\(requested_household_id\)/);
});

test('legacy owner-only policies are retired', () => {
  assert.match(migration, /drop policy if exists "own cats"/);
  assert.match(migration, /drop policy if exists "own schedules"/);
  assert.match(migration, /drop policy if exists "admins read all cats"/);
});

test('completion timestamp is bounded and server-authorized', () => {
  assert.match(migration, /completed_at_out_of_range/);
  assert.match(migration, /security definer/);
  assert.match(migration, /for update/);
});
