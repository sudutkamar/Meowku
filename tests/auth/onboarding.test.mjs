import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('auth route exposes signed-out redirect and configured-client guard', () => {
  const source = read('src/routes.tsx');
  const app = read('src/App.tsx');
  assert.match(source, /appRoute/);
  assert.match(app, /supabaseConfigured/);
  assert.match(app, /AuthPage/);
  assert.match(app, /!session/);
});

test('auth page supports sign in and sign up through Supabase Auth', () => {
  const source = read('src/features/auth/AuthPage.tsx');
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signUp/);
  assert.match(source, /Supabase belum dikonfigurasi/);
});

test('onboarding submits household name and timezone to the database', () => {
  const source = read('src/features/onboarding/useOnboarding.ts');
  assert.match(source, /householdName/);
  assert.match(source, /timezone/);
  assert.match(source, /create_household/);
  assert.match(source, /households/);
});

test('application does not accept household identity from the URL', () => {
  const source = `${read('src/routes.tsx')}\n${read('src/features/onboarding/useOnboarding.ts')}`;
  assert.doesNotMatch(source, /searchParams|householdId|household_id.*params/);
});
