import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('production configuration exists', () => {
  assert.equal(existsSync('vercel.json'), true);
  assert.equal(existsSync('supabase/migrations/20261024000100_initial.sql'), true);
  assert.equal(existsSync('supabase/migrations/20261024000200_admin_policies.sql'), true);
});

test('application has no hardcoded Supabase credentials', () => {
  const source = readFileSync('src/lib/supabase.ts', 'utf8');
  assert.equal(source.includes('eyJhbGciOi'), false);
});

test('application source is not disabling TypeScript checks', () => {
  const source = readFileSync('src/App.tsx', 'utf8');
  assert.equal(source.includes('@ts-nocheck'), false);
});

test('household membership repair migration creates the missing schema', () => {
  const migration = readFileSync('supabase/migrations/20261024001000_household_members_repair.sql', 'utf8');
  assert.match(migration, /create table if not exists public\.households/i);
  assert.match(migration, /create table if not exists public\.household_members/i);
  assert.match(migration, /create or replace function public\.create_household/i);
  assert.match(migration, /alter table public\.household_members enable row level security/i);
});

test('application source does not use browser storage for domain state', () => {
  const source = readFileSync('src/App.tsx', 'utf8');
  assert.equal(source.includes('localStorage'), false);
});
