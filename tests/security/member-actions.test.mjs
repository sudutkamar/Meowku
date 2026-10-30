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
    assert.doesNotMatch(source, /role.*from.*body/i);
  }
});

test('member invite is bound to the active household', () => {
  const page = readFileSync('src/features/members/MembersPage.tsx', 'utf8');
  const fn = readFileSync('supabase/functions/invite-household-member/index.ts', 'utf8');
  assert.match(page, /householdId:\s*household\.id/);
  assert.match(fn, /eq\('household_id', body\.householdId\)/);
  assert.doesNotMatch(fn, /limit\(1\)\.maybeSingle\(\)/);
});

test('member invite does not report success without an email delivery result', () => {
  const page = readFileSync('src/features/members/MembersPage.tsx', 'utf8');
  const fn = readFileSync('supabase/functions/invite-household-member/index.ts', 'utf8');
  assert.match(page, /functions\.invoke\('invite-household-member'/);
  assert.match(page, /email_sent !== true/);
  assert.match(page, /Periksa konfigurasi SMTP Supabase/);
  assert.match(fn, /Access-Control-Allow-Origin/);
  assert.match(fn, /meowku\.panda-12b\.workers\.dev/);
  assert.match(fn, /Vary: 'Origin'/);
  assert.doesNotMatch(page, /service_role/i);
});

test('member invite sends an Auth email and does not report success before delivery', () => {
  const page = readFileSync('src/features/members/MembersPage.tsx', 'utf8');
  const fn = readFileSync('supabase/functions/invite-household-member/index.ts', 'utf8');
  const migration = read('supabase/migrations/20261028000200_accept_household_invitations.sql');
  assert.match(fn, /SUPABASE_SECRET_KEYS/);
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn, /auth\.admin\.inviteUserByEmail/);
  assert.match(fn, /redirectOrigin\(request\)/);
  assert.match(fn, /email_sent: true/);
  assert.match(fn, /admin\.from\('household_invitations'\)\.insert/);
  assert.match(fn, /emailError/);
  assert.match(fn, /status: 'revoked'/);
  assert.match(page, /email_sent === true/);
  assert.match(page, /refetchQueries/);
  assert.match(page, /setQueryData/);
  assert.match(migration, /household_members/);
  assert.match(migration, /household_invitations/);
  assert.match(migration, /on_auth_user_created/);
  assert.match(migration, /status = 'accepted'/);
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

test('pending invitations can be revoked without deleting audit history', () => {
  const page = read('src/features/members/MembersPage.tsx');
  const migration = read('supabase/migrations/20261029000100_cancel_household_invitations.sql');
  const fn = read('supabase/functions/invite-household-member/index.ts');
  assert.match(page, /cancel_household_invitation/);
  assert.match(page, /Batalkan/);
  assert.match(migration, /status = 'revoked'/);
  assert.match(migration, /invitation_revoked/);
  assert.match(migration, /household_role\(invitation\.household_id\) in \('owner', 'admin'\)/);
  assert.match(migration, /create unique index/);
  assert.match(fn, /Undangan untuk email ini masih pending/);
  assert.match(fn, /already been registered|already registered/);
  assert.match(fn, /cleanupError/);
  assert.match(page, /onError: async/);
});

test('invitation acceptance is explicit, email-bound, and household-directed', () => {
  const migration = read('supabase/migrations/20261029000300_explicit_household_invitation_acceptance.sql');
  const app = read('src/App.tsx');
  const page = read('src/features/invitations/InvitationPage.tsx');
  const hook = read('src/features/invitations/useInvitation.ts');
  const auth = read('src/features/auth/AuthPage.tsx');
  assert.match(migration, /lower\(email\) = lower\(current_email\)/);
  assert.match(migration, /accept_household_invitation/);
  assert.match(migration, /invitation_accepted/);
  assert.match(migration, /create or replace function public\.handle_new_user/);
  assert.doesNotMatch(migration, /set status = 'accepted'.*where lower\(email\)/s);
  assert.match(app, /InvitationPage/);
  assert.match(app, /if \(invitationId\)/);
  assert.match(app, /invitation_id/);
  assert.match(app, /invitationIdFromMetadata/);
  assert.match(app, /isInvitationEntryPath/);
  assert.match(page, /Terima undangan/);
  assert.match(page, /details\.household_name/);
  assert.match(page, /joinedHousehold\.id/);
  assert.match(page, /status === 'accepted' \? invitation\.data\.household_id : undefined/);
  assert.match(page, /Membuka aplikasi/);
  assert.match(page, /new URL\('\/app', window\.location\.origin\)/);
  assert.match(page, /isStaleInvitationError/);
  assert.match(page, /hasRedirected\.current/);
  assert.match(hook, /accept_household_invitation/);
  assert.match(auth, /invitationId/);
  assert.match(auth, /authRedirectUrl/);
  assert.match(app, /preferredHouseholdId/);
  assert.match(app, /preferredHousehold \?\? households\.data\[0\]/);
});

test('invitation flow has a server fallback when production RPCs are missing from schema cache', () => {
  const page = read('src/features/invitations/InvitationPage.tsx');
  const hook = read('src/features/invitations/useInvitation.ts');
  const fallback = read('supabase/functions/household-invitation/index.ts');
  const management = read('src/management.css');
  const responsive = read('src/responsive-polish.css');
  assert.match(page, /invitation-state/);
  assert.match(page, /Undangan tidak ditemukan/);
  assert.match(hook, /isMissingInvitationRpc/);
  assert.match(hook, /functions\.invoke\('household-invitation'/);
  assert.match(fallback, /auth\.getUser/);
  assert.match(fallback, /household_invitations/);
  assert.match(fallback, /invitation_accepted/);
  assert.match(fallback, /invitation_declined/);
  assert.match(fallback, /lowerCase|toLowerCase/);
  assert.match(management, /invitation-card\{box-sizing:border-box;width:min\(520px,100%\)/);
  assert.match(management, /invitation-card \.invitation-actions button\{display:flex/);
  assert.match(management, /@media\(max-width:520px\).*invitation-actions\{grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(management, /invitation-page\{box-sizing:border-box;width:100%/);
  assert.match(responsive, /\.auth-page, \.auth-shell, \.auth-card, \.invitation-card/);
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

test('admin user database is household-scoped and protects Auth deletion', () => {
  const fn = read('supabase/functions/admin-user-directory/index.ts');
  const cleanup = read('supabase/migrations/20261029000400_auth_user_deletion_cleanup.sql');
  const page = read('src/features/admin-users/AdminUsersPage.tsx');
  const shell = read('src/components/AppShell.tsx');
  const routes = read('src/routes.tsx');
  assert.match(fn, /auth\.getUser/);
  assert.match(fn, /in\('role', \['owner', 'admin'\]\)/);
  assert.match(fn, /household_members/);
  assert.match(fn, /auth\.admin\.getUserById/);
  assert.match(fn, /auth\.admin\.deleteUser/);
  assert.match(fn, /user_is_household_owner/);
  assert.match(cleanup, /prepare_auth_user_deletion/);
  assert.match(cleanup, /auth_user_deletion_cleanup/);
  assert.match(cleanup, /audit_events/);
    assert.match(cleanup, /audit_events_actor_id_fkey/);
    assert.match(cleanup, /on delete set null/);
    assert.doesNotMatch(cleanup, /update public\.audit_events/);
  assert.match(cleanup, /household_schedule_rotation_days/);
  assert.match(cleanup, /linked_user_id = null/);
  assert.match(fn, /role === 'owner'/);
  assert.match(fn, /userId === auth\.user\.id/);
  assert.match(fn, /otherMemberships/);
  assert.match(fn, /confirmationEmail/);
  assert.match(fn, /user_deleted/);
  assert.match(fn, /list_households/);
  assert.match(fn, /delete_household/);
  assert.match(fn, /confirmationName/);
  assert.match(fn, /household\.created_by !== auth\.user\.id/);
  assert.match(page, /admin-user-directory/);
  assert.match(page, /Hapus permanen/);
  assert.match(page, /Database household/);
  assert.match(page, /Hapus household/);
  assert.match(page, /database-tabs/);
  assert.match(page, /Ketik ulang email/);
  assert.match(page, /confirmDisabled/);
  assert.match(shell, /Database/);
  assert.doesNotMatch(shell, /Database pengguna/);
  assert.match(shell, /canAccessAdmin/);
  assert.match(shell, /adminNavigation/);
  assert.match(routes, /function AdminOnlyRoute/);
  assert.match(routes, /household_access/);
  assert.match(routes, /to: '\/app'/);
  const adminNavigation = read('supabase/migrations/20261029000500_admin_navigation_access.sql');
  assert.match(adminNavigation, /household_assignees_admin_select/);
  assert.match(adminNavigation, /schedule_rotations_admin_select/);
  assert.match(adminNavigation, /household_admin_required/);
  assert.match(adminNavigation, /household_role\(requested_household_id\) in \('owner', 'admin'\)/);
  assert.match(adminNavigation, /create or replace function public\.household_report/);
  assert.match(adminNavigation, /create or replace function public\.export_household\(requested_household_id uuid\)/);
  assert.match(routes, /database-pengguna/);
  assert.doesNotMatch(page, /service_role/i);
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
