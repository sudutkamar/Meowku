import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('member actions have authenticated Edge Functions and server-derived roles', () => {
  for (const path of [
    'supabase/functions/invite-household-member/index.ts',
    'supabase/functions/export-household/index.ts',
  ]) {
    assert.equal(existsSync(path), true, `${path} should exist`);
    const source = read(path);
    assert.match(source, /Authorization/);
    assert.match(source, /auth\.getUser/);
    assert.match(source, /household_members/);
    assert.doesNotMatch(source, /service_role|role.*from.*body/i);
  }
});

test('member invite is bound to the active household', () => {
  const page = readFileSync('src/features/members/MembersPage.tsx', 'utf8');
  const fn = readFileSync('supabase/functions/invite-household-member/index.ts', 'utf8');
  assert.match(page, /householdId:\s*household\.id/);
  assert.match(fn, /eq\('household_id', body\.householdId\)/);
  assert.doesNotMatch(fn, /limit\(1\)\.maybeSingle\(\)/);
});

test('member migration restricts roles and protects settings/export scope', () => {
  const source = read('supabase/migrations/20261024000900_members_settings_export.sql');
  assert.match(source, /household_invitations/);
  assert.match(source, /enable row level security/i);
  assert.match(source, /owner.*admin/);
  assert.match(source, /timezone/);
  assert.match(source, /export_household/);
  assert.match(source, /is_household_member/);
  assert.match(source, /members_update_admin/);
  assert.match(source, /role <> 'owner'/);
});

test('member UI exposes invite, role, removal, and error states', () => {
  const source = read('src/features/members/MembersPage.tsx');
  assert.match(source, /Undang anggota/);
  assert.match(source, /admin/);
  assert.match(source, /member/);
  assert.match(source, /Hapus/);
  assert.match(source, /role="alert"/);
  assert.match(source, /pending/i);
  assert.match(source, /Cari anggota/);
  assert.match(source, /ConfirmDialog/);
  assert.match(source, /household_access/);
  assert.match(source, /Admin/);
});

test('admin capability migration derives authorization and protects management surfaces', () => {
  const source = read('supabase/migrations/20261024001500_admin_capabilities.sql');
  assert.match(source, /create or replace function public\.household_access/);
  assert.match(source, /can_manage_entities/);
  assert.match(source, /can_view_audit/);
  assert.match(source, /manage_household_member/);
  assert.match(source, /auth\.uid\(\)/);
  assert.match(source, /security definer/);
  assert.match(source, /audit_events_admin_select/);
  const memberWriteLock = read('supabase/migrations/20261024001600_lock_member_writes.sql');
  assert.match(memberWriteLock, /drop policy if exists members_insert_admin/);
  assert.match(memberWriteLock, /drop policy if exists members_update_admin/);
  assert.match(source, /cats_admin_manage/);
  assert.match(source, /litter_boxes_admin_manage/);
  assert.match(source, /catalog_items_admin_manage/);
  assert.match(source, /schedules_admin_manage/);
  const entityScope = read('supabase/migrations/20261024001700_admin_entity_write_scope.sql');
  assert.match(entityScope, /cats_admin_update/);
  assert.match(entityScope, /catalog_items_admin_update/);
  assert.match(entityScope, /schedules_admin_update/);
});

test('settings and export use Supabase-backed actions', () => {
  const settings = read('src/features/settings/SettingsPage.tsx');
  const exportPage = read('src/features/export/ExportPage.tsx');
  assert.match(settings, /update/);
  assert.match(settings, /timezone/);
  assert.match(exportPage, /functions\.invoke/);
  assert.match(exportPage, /Unduh export/);
  assert.doesNotMatch(`${settings}${exportPage}`, /localStorage/);
});
