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
  assert.match(source, /emailRedirectTo/);
  assert.match(source, /auth\.resend/);
  assert.match(source, /friendlyAuthError/);
  assert.match(source, /bukan nama profil/);
  assert.match(source, /Auth localhost dan Auth deploy/);
  assert.match(source, /Supabase tidak bisa dihubungi/);
  assert.match(source, /Buat akun di project ini/);
  assert.match(source, /Lupa password/);
  assert.match(source, /signInWithOtp/);
  assert.match(source, /shouldCreateUser: false/);
  assert.match(source, /Masuk dengan link email/);
  assert.match(source, /Supabase belum dikonfigurasi/);
});

test('invitation requires a permanent password before membership acceptance', () => {
  const page = read('src/features/invitations/InvitationPage.tsx');
  const setup = read('src/features/auth/SetInitialPasswordPage.tsx');
  const migration = read('supabase/migrations/20261029000300_explicit_household_invitation_acceptance.sql');
  assert.match(page, /SetInitialPasswordPage/);
  assert.match(page, /passwordReady/);
  assert.match(page, /if \(!passwordReady\)/);
  assert.match(setup, /auth\.updateUser\(\{ password \}\)/);
  assert.match(setup, /onComplete\(\)/);
  assert.match(setup, /Ulangi password/);
  const newUserTrigger = migration.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?create or replace function public\.get_household_invitation/)
    ?.at(0) ?? '';
  assert.doesNotMatch(newUserTrigger, /household_members|household_invitations/);
});

test('local Supabase sends confirmation email through the Meowku template', () => {
  const config = read('supabase/config.toml');
  assert.match(config, /enable_confirmations = true/);
  assert.match(config, /auth\.email\.template\.confirmation/);
  assert.match(config, /templates\/confirm-email\.html/);
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
