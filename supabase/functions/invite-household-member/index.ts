import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'https://meowku.panda-12b.workers.dev', ...configuredOrigins]);
const appOrigin = configuredOrigins[0] ?? 'https://meowku.panda-12b.workers.dev';
const corsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'http://127.0.0.1:5173',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
};
const reply = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });

function createAdminClient() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) throw new Error('Supabase secret key untuk email belum dikonfigurasi.');
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(secretKeys) as Record<string, string>;
  } catch {
    throw new Error('Konfigurasi secret key Supabase tidak valid.');
  }
  const secretKey = parsed.default ?? Object.values(parsed)[0];
  if (!secretKey) throw new Error('Supabase secret key untuk email belum dikonfigurasi.');
  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { status: 204, headers: corsHeaders(request) });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return reply(request, { error: 'Unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return reply(request, { error: 'Unauthorized' }, 401);
    if (request.method !== 'POST') return reply(request, { error: 'Method not allowed' }, 405);
    const body = await request.json() as { householdId?: string; email?: string; role?: 'admin' | 'member' };
    const email = body.email?.trim().toLowerCase();
    if (!body.householdId || !email || email.length > 320 || !/^\S+@\S+\.\S+$/.test(email) || !['admin', 'member'].includes(body.role ?? '')) return reply(request, { error: 'Household, email, atau role tidak valid.' }, 400);
    const { data: membership, error: membershipError } = await client.from('household_members').select('household_id, role').eq('household_id', body.householdId).eq('user_id', auth.user.id).eq('is_active', true).in('role', ['owner', 'admin']).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return reply(request, { error: 'Hanya owner atau admin yang dapat mengundang anggota.' }, 403);
    const admin = createAdminClient();
    const { data, error } = await client.from('household_invitations').insert({ household_id: membership.household_id, email, role: body.role, invited_by: auth.user.id }).select().single();
    if (error) throw error;
    const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appOrigin}/app/pengguna?invitation=${data.id}`,
      data: { invitation_id: data.id, household_id: membership.household_id, invited_role: body.role },
    });
    if (emailError) {
      await admin.from('household_invitations').update({ status: 'revoked' }).eq('id', data.id);
      throw new Error(`Email undangan gagal dikirim: ${emailError.message}`);
    }
    return reply(request, { ...data, email_sent: true });
  } catch (error) { return reply(request, { error: error instanceof Error ? error.message : 'Undangan gagal dibuat.' }, 400); }
});
