import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function normalizeOrigin(value: string) {
  try { return new URL(value).origin; } catch { return value.replace(/\/+$/, ''); }
}

const configuredOrigins = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((origin) => normalizeOrigin(origin.trim())).filter(Boolean);
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'https://meowku.panda-12b.workers.dev', ...configuredOrigins]);
const headers = (request: Request) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(normalizeOrigin(request.headers.get('Origin') ?? '')) ? normalizeOrigin(request.headers.get('Origin') ?? '') : 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  Vary: 'Origin',
});
const reply = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(request) });

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

function adminClient() {
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

async function findInvitation(admin: ReturnType<typeof adminClient>, invitationId: string, email: string) {
  const { data: invitation, error: invitationError } = await admin.from('household_invitations').select('id, household_id, email, role, status, invited_by, created_at').eq('id', invitationId).maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation || invitation.email.toLowerCase() !== email.toLowerCase()) return null;
  const [{ data: household, error: householdError }, { data: profile }, inviterResult] = await Promise.all([
    admin.from('households').select('id, name').eq('id', invitation.household_id).maybeSingle(),
    admin.from('profiles').select('full_name').eq('id', invitation.invited_by).maybeSingle(),
    admin.auth.admin.getUserById(invitation.invited_by),
  ]);
  if (householdError) throw householdError;
  if (!household) return null;
  const inviterEmail = inviterResult.data.user?.email ?? '';
  return {
    id: invitation.id,
    household_id: invitation.household_id,
    household_name: household.name,
    inviter_name: profile?.full_name?.trim() || inviterEmail.split('@')[0] || 'Pengelola household',
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    created_at: invitation.created_at,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== 'POST') return reply(request, { error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return reply(request, { error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey(), { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user?.email) return reply(request, { error: 'Unauthorized' }, 401);
    const body = await request.json() as { action?: 'get' | 'accept' | 'decline'; invitationId?: string };
    if (!body.invitationId || !/^[0-9a-f-]{36}$/i.test(body.invitationId) || !['get', 'accept', 'decline'].includes(body.action ?? '')) return reply(request, { error: 'Undangan atau aksi tidak valid.' }, 400);
    const admin = adminClient();
    const details = await findInvitation(admin, body.invitationId, auth.user.email);
    if (!details) return reply(request, { error: 'Undangan tidak ditemukan atau email akun tidak cocok.' }, 404);
    if (body.action === 'get') return reply(request, { invitation: details });
    if (details.status !== 'pending') return reply(request, { error: 'Undangan ini sudah diproses.' }, 409);

    if (body.action === 'accept') {
      const { data: existingMember, error: existingMemberError } = await admin.from('household_members').select('role').eq('household_id', details.household_id).eq('user_id', auth.user.id).maybeSingle();
      if (existingMemberError) throw existingMemberError;
      const role = existingMember?.role === 'owner' ? 'owner' : details.role;
      const { error: memberError } = await admin.from('household_members').upsert({ household_id: details.household_id, user_id: auth.user.id, role, is_active: true }, { onConflict: 'household_id,user_id' });
      if (memberError) throw memberError;
      const { error: invitationError } = await admin.from('household_invitations').update({ status: 'accepted' }).eq('id', details.id).eq('status', 'pending');
      if (invitationError) throw invitationError;
      const { error: auditError } = await admin.from('audit_events').insert({ household_id: details.household_id, actor_id: auth.user.id, action: 'invitation_accepted', entity_type: 'household_invitation', entity_id: details.id, metadata: { email: details.email, role: details.role } });
      if (auditError) throw auditError;
      const { data: household, error: householdError } = await admin.from('households').select('*').eq('id', details.household_id).single();
      if (householdError) throw householdError;
      return reply(request, { household });
    }

    const { error: declineError } = await admin.from('household_invitations').update({ status: 'revoked' }).eq('id', details.id).eq('status', 'pending');
    if (declineError) throw declineError;
    const { error: auditError } = await admin.from('audit_events').insert({ household_id: details.household_id, actor_id: auth.user.id, action: 'invitation_declined', entity_type: 'household_invitation', entity_id: details.id, metadata: { email: details.email, role: details.role } });
    if (auditError) throw auditError;
    return reply(request, { id: details.id, status: 'revoked' });
  } catch (error) {
    return reply(request, { error: error instanceof Error ? error.message : 'Undangan gagal diproses.' }, 400);
  }
});
