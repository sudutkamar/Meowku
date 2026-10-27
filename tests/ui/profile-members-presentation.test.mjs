import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('member list resolves profile names instead of rendering user ids', () => {
  const page = read('src/features/members/MembersPage.tsx');
  const migration = read('supabase/migrations/20261025000300_profile_self_update.sql');
  assert.match(page, /from\(['"]profiles['"]\)/);
  assert.match(page, /full_name/);
  assert.match(page, /avatar_url/);
  assert.doesNotMatch(page, /<b>\{member\.user_id\}<\/b>/);
  assert.match(migration, /profiles_self_update|profiles.*for update/i);
});

test('settings exposes editable personal profile fields backed by profiles', () => {
  const settings = read('src/features/settings/ProfileSettings.tsx');
  const types = read('src/lib/database.types.ts');
  assert.match(settings, /Edit profile|Profil saya/);
  assert.match(settings, /full_name/);
  assert.match(settings, /avatar_url/);
  assert.match(settings, /profiles/);
  assert.match(settings, /Simpan profile|Simpan profil/);
  assert.match(types, /profiles:/);
});
