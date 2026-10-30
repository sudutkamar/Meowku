import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function normalizeOrigin(value: string) {
  try { return new URL(value).origin; } catch { return value.replace(/\/+$/, ''); }
}

const configuredOrigins = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((origin) => normalizeOrigin(origin.trim())).filter(Boolean);
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'https://meowku.panda-12b.workers.dev', ...configuredOrigins]);
const corsHeaders = (request: Request) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(normalizeOrigin(request.headers.get('Origin') ?? '')) ? normalizeOrigin(request.headers.get('Origin') ?? '') : 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  Vary: 'Origin',
});
const reply = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });

function createAdminClient() {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  let bundledKey = '';
  if (!serviceRoleKey && secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      bundledKey = parsed.default ?? Object.values(parsed)[0] ?? '';
    } catch {
      throw new Error('Konfigurasi secret key Supabase tidak valid.');
    }
  }
  const secretKey = serviceRoleKey || bundledKey;
  if (!secretKey) throw new Error('Supabase secret key admin belum dikonfigurasi.');
  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function publishableKey() {
  const legacyKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  if (legacyKey) return legacyKey;
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (publishableKeys) {
    try {
      const parsed = JSON.parse(publishableKeys) as Record<string, string>;
      const key = parsed.default ?? Object.values(parsed)[0] ?? '';
      if (key) return key;
    } catch {
      throw new Error('Konfigurasi publishable key Supabase tidak valid.');
    }
  }
  throw new Error('Supabase publishable key belum dikonfigurasi.');
}

type MemberRow = { user_id: string; role: 'owner' | 'admin' | 'member'; joined_at: string };
type DirectoryUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: MemberRow['role'];
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  can_delete: boolean;
  delete_block_reason: string | null;
};
type DirectoryHousehold = {
  id: string;
  name: string;
  timezone: string;
  created_by: string;
  created_at: string;
  role: MemberRow['role'];
  member_count: number;
  can_delete: boolean;
  delete_block_reason: string | null;
};

async function authenticatedClient(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return { error: 'Unauthorized' as const };
  const client = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey(), { global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { error: 'Unauthorized' as const };
  return { client, user: data.user };
}

async function loadDirectory(admin: ReturnType<typeof createAdminClient>, householdId: string, callerId: string): Promise<DirectoryUser[]> {
  const { data: members, error: membersError } = await admin
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  if (membersError) throw membersError;
  const memberRows = (members ?? []) as MemberRow[];
  if (!memberRows.length) return [];

  const userIds = memberRows.map((member) => member.user_id);
  const [{ data: profiles, error: profilesError }, { data: memberships, error: membershipsError }] = await Promise.all([
    admin.from('profiles').select('id, full_name').in('id', userIds),
    admin.from('household_members').select('user_id, household_id').in('user_id', userIds).eq('is_active', true),
  ]);
  if (profilesError) throw profilesError;
  if (membershipsError) throw membershipsError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const householdCount = new Map<string, number>();
  for (const membership of memberships ?? []) householdCount.set(membership.user_id, (householdCount.get(membership.user_id) ?? 0) + 1);

  const users = await Promise.all(memberRows.map(async (member) => {
    const { data, error } = await admin.auth.admin.getUserById(member.user_id);
    if (error) throw error;
    const user = data.user;
    const isOwner = member.role === 'owner';
    const isSelf = member.user_id === callerId;
    const isInAnotherHousehold = (householdCount.get(member.user_id) ?? 0) > 1;
    const deleteBlockReason = isSelf
      ? 'Akun yang sedang dipakai tidak dapat dihapus.'
      : isOwner
        ? 'Owner tidak dapat dihapus dari menu ini.'
        : isInAnotherHousehold
          ? 'Akun masih aktif di household lain.'
          : null;
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: profileMap.get(user.id) ?? (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null),
      role: member.role,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      confirmed_at: user.confirmed_at ?? null,
      can_delete: !deleteBlockReason,
      delete_block_reason: deleteBlockReason,
    } satisfies DirectoryUser;
  }));
  return users;
}

async function loadHouseholdDirectory(admin: ReturnType<typeof createAdminClient>, callerId: string, globalAdmin: boolean): Promise<DirectoryHousehold[]> {
  const membershipQuery = admin
    .from('household_members')
    .select('household_id, role, joined_at')
    .eq('user_id', callerId)
    .eq('is_active', true);
  const { data: memberships, error: membershipsError } = globalAdmin
    ? await membershipQuery.order('joined_at', { ascending: true })
    : await membershipQuery.in('role', ['owner', 'admin']).order('joined_at', { ascending: true });
  if (membershipsError) throw membershipsError;
  const memberRows = (memberships ?? []) as Array<{ household_id: string; role: MemberRow['role']; joined_at: string }>;
  if (!memberRows.length) return [];

  const ids = memberRows.map((row) => row.household_id);
  const { data: households, error: householdsError } = globalAdmin
    ? await admin.from('households').select('id, name, timezone, created_by, created_at').order('created_at', { ascending: true })
    : await admin.from('households').select('id, name, timezone, created_by, created_at').in('id', ids).order('created_at', { ascending: true });
  if (householdsError) throw householdsError;
  const householdIds = (households ?? []).map((household) => household.id);
  const { data: memberCounts, error: memberCountsError } = householdIds.length
    ? await admin.from('household_members').select('household_id').in('household_id', householdIds).eq('is_active', true)
    : { data: [], error: null };
  if (memberCountsError) throw memberCountsError;
  const roles = new Map(memberRows.map((row) => [row.household_id, row.role]));
  const counts = new Map<string, number>();
  for (const row of memberCounts ?? []) counts.set(row.household_id, (counts.get(row.household_id) ?? 0) + 1);
  return (households ?? []).map((household) => {
    const role = globalAdmin ? roles.get(household.id) ?? 'admin' : roles.get(household.id) ?? 'member';
    const canDelete = globalAdmin || (role === 'owner' && household.created_by === callerId);
    return {
      ...household,
      role,
      member_count: counts.get(household.id) ?? 0,
      can_delete: canDelete,
      delete_block_reason: canDelete ? null : 'Hanya owner yang membuat household yang dapat menghapusnya.',
    } satisfies DirectoryHousehold;
  });
}

async function isGlobalAdmin(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.role === 'admin';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return reply(request, { error: 'Method not allowed' }, 405);
  try {
    const auth = await authenticatedClient(request);
    if ('error' in auth) return reply(request, { error: auth.error }, 401);
    const body = await request.json() as { action?: 'list' | 'delete' | 'list_households' | 'delete_household'; householdId?: string; userId?: string; confirmationEmail?: string; confirmationName?: string };
    const admin = createAdminClient();
    const globalAdmin = await isGlobalAdmin(auth.client, auth.user.id);
    if (body.action === 'list_households') return reply(request, { households: await loadHouseholdDirectory(admin, auth.user.id, globalAdmin) });
    if (!body.householdId || !/^[0-9a-f-]{36}$/i.test(body.householdId)) return reply(request, { error: 'Household wajib dipilih.' }, 400);

    if (body.action === 'delete_household' && globalAdmin) {
      const { data: household, error: householdError } = await admin.from('households').select('id, name').eq('id', body.householdId).maybeSingle();
      if (householdError) throw householdError;
      if (!household) return reply(request, { error: 'Household tidak ditemukan.' }, 404);
      if (household.name.trim() !== body.confirmationName?.trim()) return reply(request, { error: 'Konfirmasi nama household tidak cocok.' }, 400);
      const { error: deleteHouseholdError } = await admin.from('households').delete().eq('id', household.id);
      if (deleteHouseholdError) throw deleteHouseholdError;
      return reply(request, { deleted: true, household_id: household.id });
    }

    const { data: membership, error: membershipError } = await auth.client
      .from('household_members')
      .select('household_id, role')
      .eq('household_id', body.householdId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return reply(request, { error: 'Hanya owner atau admin yang dapat mengakses database pengguna.' }, 403);

    if (body.action === 'list') return reply(request, { users: await loadDirectory(admin, membership.household_id, auth.user.id) });
    if (body.action === 'delete_household') {
      if (membership.role !== 'owner') return reply(request, { error: 'Hanya owner yang dapat menghapus household.' }, 403);
      const { data: household, error: householdError } = await admin.from('households').select('id, name, created_by').eq('id', membership.household_id).maybeSingle();
      if (householdError) throw householdError;
      if (!household) return reply(request, { error: 'Household tidak ditemukan.' }, 404);
      if (household.created_by !== auth.user.id) return reply(request, { error: 'Hanya pembuat household yang dapat menghapusnya.' }, 403);
      if (household.name.trim() !== body.confirmationName?.trim()) return reply(request, { error: 'Konfirmasi nama household tidak cocok.' }, 400);
      const { error: deleteHouseholdError } = await admin.from('households').delete().eq('id', household.id);
      if (deleteHouseholdError) throw deleteHouseholdError;
      return reply(request, { deleted: true, household_id: household.id });
    }
    if (body.action !== 'delete' || !body.userId || !/^[0-9a-f-]{36}$/i.test(body.userId)) return reply(request, { error: 'Aksi atau pengguna tidak valid.' }, 400);
    if (body.userId === auth.user.id) return reply(request, { error: 'Kamu tidak dapat menghapus akun yang sedang dipakai.' }, 403);

    const { data: targetMembership, error: targetMembershipError } = await admin
      .from('household_members')
      .select('user_id, role')
      .eq('household_id', membership.household_id)
      .eq('user_id', body.userId)
      .eq('is_active', true)
      .maybeSingle();
    if (targetMembershipError) throw targetMembershipError;
    if (!targetMembership) return reply(request, { error: 'Pengguna tidak ditemukan di household aktif.' }, 404);
    if (targetMembership.role === 'owner') return reply(request, { error: 'Owner tidak dapat dihapus dari menu ini.' }, 403);
    if (targetMembership.role === 'admin' && membership.role !== 'owner') return reply(request, { error: 'Hanya owner yang dapat menghapus akun admin.' }, 403);

    const { data: otherMemberships, error: otherMembershipsError } = await admin
      .from('household_members')
      .select('household_id')
      .eq('user_id', body.userId)
      .eq('is_active', true)
      .neq('household_id', membership.household_id)
      .limit(1);
    if (otherMembershipsError) throw otherMembershipsError;
    if (otherMemberships?.length) return reply(request, { error: 'Akun ini masih aktif di household lain. Cabut akses household lain terlebih dahulu.' }, 409);

    const { data: targetUser, error: targetUserError } = await admin.auth.admin.getUserById(body.userId);
    if (targetUserError || !targetUser.user) return reply(request, { error: 'Akun Auth tidak ditemukan.' }, 404);
    const targetEmail = targetUser.user.email?.trim().toLowerCase() ?? '';
    if (!targetEmail || targetEmail !== body.confirmationEmail?.trim().toLowerCase()) return reply(request, { error: 'Konfirmasi email tidak cocok.' }, 400);

    const { error: deleteError } = await admin.auth.admin.deleteUser(body.userId, false);
    if (deleteError) {
      if (/user_is_household_owner/i.test(deleteError.message ?? '')) {
        return reply(request, { error: 'Owner household tidak dapat dihapus dari menu ini. Pindahkan ownership terlebih dahulu.' }, 403);
      }
      if (/foreign key|violates.*constraint|still referenced/i.test(deleteError.message ?? '')) {
        return reply(request, { error: 'Akun masih memiliki relasi database lama. Terapkan migration cleanup user terlebih dahulu, lalu ulangi penghapusan.' }, 409);
      }
      throw deleteError;
    }
    const { error: auditError } = await admin.from('audit_events').insert({
      household_id: membership.household_id,
      actor_id: auth.user.id,
      action: 'user_deleted',
      entity_type: 'auth_user',
      entity_id: body.userId,
      metadata: { email: targetEmail, role: targetMembership.role },
    });
    if (auditError) return reply(request, { error: 'Akun sudah dihapus, tetapi audit aktivitas gagal dicatat. Periksa audit log.' }, 500);
    return reply(request, { deleted: true, user_id: body.userId });
  } catch (error) {
    return reply(request, { error: error instanceof Error ? error.message : 'Operasi database pengguna gagal.' }, 400);
  }
});
