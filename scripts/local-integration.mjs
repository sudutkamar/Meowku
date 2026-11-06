import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// This runner is intentionally local-only. It expects a fresh `supabase db reset --local`
// before execution and creates disposable Auth/domain fixtures in that local database.
// It must never be pointed at a hosted project.

const root = resolve(process.cwd());
const localEnv = readFileSync(resolve(root, '.env.development.local'), 'utf8');
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54331';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!publishableKey || !secretKey) {
  throw new Error('Local integration test needs SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY from `supabase status -o env`.');
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) {
  throw new Error(`Refusing to run against a non-local Supabase URL: ${url}`);
}

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, clientOptions);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function result(label, request) {
  const { data, error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function expectedError(label, request, fragment) {
  const { data, error } = await request;
  assert(error, `${label}: expected an authorization/database error, but the request succeeded`);
  if (fragment) assert(error.message.includes(fragment), `${label}: expected ${fragment}, got ${error.message}`);
  return { data, error };
}

async function createLocalUser(email, fullName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'MeowkuQA!2026',
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`create local Auth user ${email}: ${error.message}`);
  assert(data.user?.id, `create local Auth user ${email}: no user id returned`);
  return data.user.id;
}

async function signIn(email) {
  const client = createClient(url, publishableKey, clientOptions);
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'MeowkuQA!2026' });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  assert(data.user?.id && data.session?.access_token, `sign in ${email}: no authenticated session returned`);
  return { client, userId: data.user.id };
}

function localDatePlus(days, timeZone = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days));
  return date.toISOString().slice(0, 10);
}

async function main() {
  const ownerEmail = 'qa.owner@meowku.local';
  const memberEmail = 'qa.member@meowku.local';
  const viewerEmail = 'qa.viewer@meowku.local';
  const ownerId = await createLocalUser(ownerEmail, 'QA Owner');
  const memberId = await createLocalUser(memberEmail, 'QA Member');
  const viewerId = await createLocalUser(viewerEmail, 'QA Viewer');
  const { client: owner } = await signIn(ownerEmail);
  const { client: member } = await signIn(memberEmail);
  const { client: viewer } = await signIn(viewerEmail);

  const firstHousehold = await result('create first household', owner.rpc('create_household', {
    household_name: 'QA Household',
    timezone_value: 'Asia/Jakarta',
  }));
  const householdId = firstHousehold.id;
  assert(firstHousehold.timezone === 'Asia/Jakarta', 'first household should keep the requested timezone');

  const secondHousehold = await result('create second household', owner.rpc('create_household', {
    household_name: 'QA Private Household',
    timezone_value: 'Asia/Makassar',
  }));
  const privateHouseholdId = secondHousehold.id;

  // Production membership is created through the invitation + acceptance flow. The
  // service client here represents the already-authenticated invite Edge Function;
  // all subsequent reads and acceptance use the member's normal JWT/RLS session.
  const invitation = await result('create local invitation fixture', admin.from('household_invitations').insert({
    household_id: householdId,
    email: memberEmail,
    role: 'member',
    invited_by: ownerId,
  }).select().single());
  const invitationDetails = await result('member reads own invitation', member.rpc('get_household_invitation', {
    requested_invitation_id: invitation.id,
  }));
  assert(invitationDetails?.[0]?.email === memberEmail, 'member must see the invitation addressed to its Auth email');
  await result('member accepts invitation', member.rpc('accept_household_invitation', {
    requested_invitation_id: invitation.id,
  }));

  const viewerInvitation = await result('create viewer invitation fixture', admin.from('household_invitations').insert({
    household_id: householdId,
    email: viewerEmail,
    role: 'member',
    invited_by: ownerId,
  }).select().single());
  await result('viewer accepts invitation', viewer.rpc('accept_household_invitation', {
    requested_invitation_id: viewerInvitation.id,
  }));
  const viewerAccess = await result('viewer capability set', viewer.rpc('household_access', { requested_household_id: householdId }));
  assert(viewerAccess?.[0]?.role === 'member' && viewerAccess[0].can_manage_entities === false, 'viewer must remain a read-only member');

  const memberAccess = await result('member household access RPC', member.rpc('household_access', { requested_household_id: householdId }));
  assert(memberAccess?.[0]?.role === 'member', 'member must receive the member capability set');
  assert(memberAccess[0].can_manage_entities === false, 'member must not manage entities');
  assert(memberAccess[0].can_view_audit === false, 'member must not view audit');

  const privateCat = await result('owner creates a cat in the private household', owner.from('cats').insert({
    household_id: privateHouseholdId,
    owner_id: ownerId,
    name: 'QA Private Cat',
    age_months: 12,
  }).select().single());
  const startDate = localDatePlus(1, 'Asia/Jakarta');
  const tomorrowIsoWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay() || 7;
  const nextDate = localDatePlus(2, 'Asia/Jakarta');
  const nextIsoWeekday = new Date(`${nextDate}T00:00:00Z`).getUTCDay() || 7;
  await expectedError('cross-household schedule target is rejected', owner.rpc('create_schedule', {
    title_value: 'QA Invalid Cross-Household Target',
    category_value: 'medicine',
    custom_category_value: null,
    scheduled_at_value: `${startDate}T08:00:00+07:00`,
    household_id_value: householdId,
    start_date_value: startDate,
    end_date_value: nextDate,
    repeat_interval_value: 1,
    repeat_unit_value: 'day',
    timezone_value: 'Asia/Jakarta',
    days_of_week_value: [],
    day_of_month_value: null,
    last_day_value: false,
    slots_value: [{ label: 'Pagi', local_time: '08:00:00', sort_order: 0, is_active: true }],
    targets_value: [{ target_key: `cat:${privateCat.id}`, cat_id: privateCat.id }],
  }), 'schedule_target_not_accessible');

  const homeCat = await result('owner creates a household cat', owner.from('cats').insert({
    household_id: householdId,
    owner_id: ownerId,
    name: 'QA Home Cat',
    age_months: 18,
  }).select().single());
  const memberAssignee = await result('owner creates QA Member assignee', owner.rpc('save_household_assignee', {
    requested_household_id: householdId,
    display_name_value: 'QA Member',
    linked_user_id_value: memberId,
  }));
  const viewerAssignee = await result('owner creates QA Viewer assignee', owner.rpc('save_household_assignee', {
    requested_household_id: householdId,
    display_name_value: 'QA Viewer',
    linked_user_id_value: viewerId,
  }));
  await result('owner activates rotation for tomorrow and day after tomorrow', owner.rpc('save_household_schedule_rotation', {
    requested_household_id: householdId,
    start_date_value: startDate,
    end_date_value: nextDate,
    days_value: [
      { weekday: tomorrowIsoWeekday, assignee_id: memberAssignee.id },
      { weekday: nextIsoWeekday, assignee_id: viewerAssignee.id },
    ],
  }));
  const rotationSchedule = await result('owner creates targeted rotation schedule', owner.rpc('create_schedule', {
    title_value: 'QA Rotation Medicine',
    category_value: 'medicine',
    custom_category_value: null,
    scheduled_at_value: `${startDate}T09:00:00+07:00`,
    household_id_value: householdId,
    start_date_value: startDate,
    end_date_value: nextDate,
    repeat_interval_value: 1,
    repeat_unit_value: 'day',
    timezone_value: 'Asia/Jakarta',
    days_of_week_value: [],
    day_of_month_value: null,
    last_day_value: false,
    slots_value: [{ label: 'Pagi', local_time: '09:00:00', sort_order: 0, is_active: true }],
    targets_value: [{ target_key: `cat:${homeCat.id}`, cat_id: homeCat.id }],
  }));
  const rotationRows = await result('read dynamic rotation rows', owner.rpc('household_schedule_occurrences', {
    requested_household_id: householdId,
    from_date: startDate,
    to_date: nextDate,
  }));
  const rotationOccurrence = (date) => rotationRows.find((row) => row.schedule_id === rotationSchedule.id && row.local_date === date);
  assert(rotationOccurrence(startDate)?.household_assignees?.display_name === 'QA Member', 'tomorrow must resolve to QA Member from the active rotation');
  assert(rotationOccurrence(nextDate)?.household_assignees?.display_name === 'QA Viewer', 'day after tomorrow must resolve to QA Viewer from the active rotation');

  const overrideOccurrence = await result('member targets tomorrow occurrence for override', member.from('schedule_occurrences').select('id').eq('schedule_id', rotationSchedule.id).eq('local_date', startDate).single());
  await result('member ad-hoc reassigns tomorrow to QA Viewer', member.rpc('reassign_occurrence', {
    occurrence_id: overrideOccurrence.id,
    assignee_id_value: viewerAssignee.id,
  }));
  const overriddenRows = await result('read dynamic rotation after ad-hoc override', owner.rpc('household_schedule_occurrences', {
    requested_household_id: householdId,
    from_date: startDate,
    to_date: startDate,
  }));
  assert(overriddenRows.find((row) => row.id === overrideOccurrence.id)?.household_assignees?.display_name === 'QA Viewer', 'manual override must win over rotation');

  await result('member completes tomorrow occurrence', member.rpc('complete_occurrence', {
    occurrence_id: overrideOccurrence.id,
    note_value: 'QA ad-hoc completion',
  }));
  const completedRows = await result('read dynamic rotation after completion', owner.rpc('household_schedule_occurrences', {
    requested_household_id: householdId,
    from_date: startDate,
    to_date: startDate,
  }));
  assert(completedRows.find((row) => row.id === overrideOccurrence.id)?.household_assignees?.display_name === 'QA Viewer', 'manual override must remain effective after completion');
  assert(Boolean(completedRows.find((row) => row.id === overrideOccurrence.id)?.completed_at), 'completion must persist while manual override is active');

  await result('member uncompletes tomorrow occurrence', member.rpc('uncomplete_occurrence', { occurrence_id: overrideOccurrence.id }));
  const uncompleted = await result('read uncompleted occurrence', owner.from('schedule_occurrences').select('completed_at,completed_by').eq('id', overrideOccurrence.id).single());
  assert(uncompleted.completed_at === null && uncompleted.completed_by === null, 'uncomplete must clear completion audit marker');

  await result('member clears manual override and restores rotation', member.rpc('reassign_occurrence', {
    occurrence_id: overrideOccurrence.id,
    assignee_id_value: null,
  }));
  const restoredRows = await result('read dynamic rotation after restoring auto', owner.rpc('household_schedule_occurrences', {
    requested_household_id: householdId,
    from_date: startDate,
    to_date: startDate,
  }));
  assert(restoredRows.find((row) => row.id === overrideOccurrence.id)?.household_assignees?.display_name === 'QA Member', 'clearing manual override must restore active weekday rotation');

  const visibleHousehold = await result('member reads own household', member.from('households').select('id,name').eq('id', householdId).maybeSingle());
  assert(visibleHousehold?.id === householdId, 'member must read the household it belongs to');
  const isolatedHousehold = await result('member is isolated from another household', member.from('households').select('id').eq('id', privateHouseholdId).maybeSingle());
  assert(isolatedHousehold === null, 'member must not read a household it does not belong to');
  const isolatedAccess = await result('member cannot resolve another household capability', member.rpc('household_access', { requested_household_id: privateHouseholdId }));
  assert(Array.isArray(isolatedAccess) && isolatedAccess.length === 0, 'household_access must not leak another household');

  await expectedError('member cannot update household settings', member.rpc('update_household_settings', {
    requested_household_id: householdId,
    household_name_value: 'Unauthorized Rename',
    timezone_value: 'Asia/Makassar',
  }), 'household_admin_required');

  const catalogItem = await result('owner creates catalog item', owner.from('catalog_items').insert({
    household_id: householdId,
    created_by: ownerId,
    name: 'QA Litter Stock',
    category: 'litter',
    notes: 'local integration fixture',
    stock_quantity: 4,
    stock_unit: 'kg',
    minimum_stock: 2,
  }).select().single());
  assert(Number(catalogItem.minimum_stock) === 2, 'catalog minimum stock must persist');
  const memberCatalog = await result('member reads catalog', member.from('catalog_items').select('id,name').eq('id', catalogItem.id).single());
  assert(memberCatalog.id === catalogItem.id, 'member must read household catalog data');
  await expectedError('member cannot update catalog', member.from('catalog_items').update({ minimum_stock: 99 }).eq('id', catalogItem.id).select().single());

  const endDate = localDatePlus(3, 'Asia/Jakarta');
  const schedule = await result('owner creates daily schedule', owner.rpc('create_schedule', {
    title_value: 'QA Daily Feeding',
    category_value: 'feeding',
    custom_category_value: null,
    scheduled_at_value: `${startDate}T08:00:00+07:00`,
    household_id_value: householdId,
    start_date_value: startDate,
    end_date_value: endDate,
    repeat_interval_value: 1,
    repeat_unit_value: 'day',
    timezone_value: 'Asia/Jakarta',
    days_of_week_value: [],
    day_of_month_value: null,
    last_day_value: false,
    slots_value: [{ label: 'Pagi', local_time: '08:00:00', sort_order: 0, is_active: true }],
    targets_value: [],
  }));
  assert(schedule.id && schedule.timezone === 'Asia/Jakarta', 'schedule creation must persist schedule and timezone');

  const occurrencesBefore = await result('read generated occurrences', owner.from('schedule_occurrences').select('id,scheduled_at,completed_at').eq('schedule_id', schedule.id).order('scheduled_at'));
  assert(occurrencesBefore.length === 3, `expected three generated daily occurrences, got ${occurrencesBefore.length}`);
  const beforeTimestamp = Date.parse(occurrencesBefore[0].scheduled_at);

  const updatedHousehold = await result('owner changes household name and timezone atomically', owner.rpc('update_household_settings', {
    requested_household_id: householdId,
    household_name_value: 'QA Household Updated',
    timezone_value: 'Asia/Makassar',
  }));
  assert(updatedHousehold.name === 'QA Household Updated' && updatedHousehold.timezone === 'Asia/Makassar', 'household settings update must persist both fields');
  const occurrencesAfter = await result('read occurrences after timezone change', owner.from('schedule_occurrences').select('scheduled_at,completed_at').eq('schedule_id', schedule.id).order('scheduled_at'));
  assert(occurrencesAfter.length === 3, 'timezone change must not regenerate or lose occurrences');
  assert(Date.parse(occurrencesAfter[0].scheduled_at) === beforeTimestamp - 60 * 60 * 1000, 'future occurrence must move from Jakarta to Makassar without changing local time');

  const memberOccurrence = await result('member reads checklist occurrence', member.from('schedule_occurrences').select('id').eq('schedule_id', schedule.id).limit(1).single());
  assert(memberOccurrence.id, 'member must access checklist data');
  await result('member completes an occurrence with note', member.rpc('complete_occurrence', {
    occurrence_id: memberOccurrence.id,
    note_value: 'Selesai dari integration test',
  }));
  const completedOccurrence = await result('read completed occurrence', owner.from('schedule_occurrences').select('completed_at,note').eq('id', memberOccurrence.id).single());
  assert(completedOccurrence.completed_at && completedOccurrence.note === 'Selesai dari integration test', 'completion and note must persist per occurrence');

  await expectedError('schedule with history cannot be hard deleted', owner.rpc('delete_schedule', { schedule_id_value: schedule.id }), 'schedule_has_history_archive_instead');
  await result('archive schedule while preserving history', owner.rpc('archive_schedule', { schedule_id_value: schedule.id }));
  const archivedSchedule = await result('read archived schedule', owner.from('schedules').select('is_active').eq('id', schedule.id).single());
  assert(archivedSchedule.is_active === false, 'archiving must deactivate the schedule');

  const exportPayload = await result('owner exports household payload', owner.rpc('export_household', { requested_household_id: householdId }));
  const requiredExportKeys = ['schema_version', 'exported_at', 'household', 'profiles', 'members', 'cats', 'catalog_items', 'schedules', 'schedule_occurrences', 'audit_events'];
  assert(exportPayload.schema_version === 2, 'export schema version must be explicit');
  for (const key of requiredExportKeys) assert(Object.hasOwn(exportPayload, key), `export is missing ${key}`);
  assert(exportPayload.schedule_occurrences.length >= 5, 'export must preserve all schedule occurrences, including dynamic-rotation fixtures and archived history');

  const transfer = await result('owner transfers ownership to active member', owner.rpc('transfer_household_ownership', {
    target_household_id: householdId,
    target_user_id: memberId,
  }));
  assert(transfer.user_id === memberId && transfer.role === 'owner', 'ownership transfer must promote the selected member atomically');
  const newOwnerAccess = await result('new owner access after transfer', member.rpc('household_access', { requested_household_id: householdId }));
  assert(newOwnerAccess?.[0]?.role === 'owner' && newOwnerAccess[0].can_view_audit, 'new owner must receive owner capabilities');
  const previousOwnerAccess = await result('previous owner becomes admin after transfer', owner.rpc('household_access', { requested_household_id: householdId }));
  assert(previousOwnerAccess?.[0]?.role === 'admin', 'previous owner must be demoted to admin');

  const unreadCount = await result('member reads notification unread count', member.rpc('notification_unread_count'));
  assert(Number(unreadCount) === 0, 'notification unread count must be household-scoped and initially empty');
  const viewerUnreadCount = await result('viewer reads notification unread count', viewer.rpc('notification_unread_count'));
  assert(Number(viewerUnreadCount) === 0, 'viewer notification unread count must be household-scoped and initially empty');

  console.log(JSON.stringify({
    status: 'PASS',
    checks: [
      'Auth sessions',
      'atomic household onboarding',
      'RLS household isolation',
      'member/admin capabilities',
      'catalog minimum stock',
      'idempotent schedule occurrence generation',
      'timezone migration of future occurrences',
      'per-occurrence completion and note',
      'immutable schedule history guard',
      'complete household export',
      'ownership transfer',
      'notification unread count',
      'dynamic weekday rotation for current/future occurrences',
      'ad-hoc manual override and revert to rotation',
      'uncomplete workflow',
      'cross-household target rejection',
      'read-only member capability fixture',
    ],
    householdId,
    privateHouseholdId,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
