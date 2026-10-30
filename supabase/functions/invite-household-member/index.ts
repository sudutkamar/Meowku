import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function normalizeOrigin(value: string) {
  try { return new URL(value).origin; } catch { return value.replace(/\/+$/, ''); }
}

const configuredOrigins = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((origin) => normalizeOrigin(origin.trim())).filter(Boolean);
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'https://meowku.panda-12b.workers.dev', ...configuredOrigins]);
const defaultAppOrigin = configuredOrigins[0] ?? 'https://meowku.panda-12b.workers.dev';
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

function redirectOrigin(request: Request) {
  const origin = normalizeOrigin(request.headers.get('Origin')?.trim() ?? '');
  return allowedOrigins.has(origin) ? origin : defaultAppOrigin;
}

function createAdminClient() {
  // Supabase runtimes expose the legacy service-role secret by default, while
  // newer projects may provide the JSON secret-key bundle instead. Support
  // both server-only names so an SMTP setup cannot silently break invitations.
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
  if (!secretKey) throw new Error('Supabase secret key untuk email belum dikonfigurasi.');
  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isAlreadyRegisteredError(error: { message?: string } | null) {
  return /already been registered|already registered/i.test(error?.message ?? '');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
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
    const { data: existingInvitation, error: existingInvitationError } = await client
      .from('household_invitations')
      .select('id')
      .eq('household_id', membership.household_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingInvitationError) throw existingInvitationError;
    if (existingInvitation) return reply(request, { error: 'Undangan untuk email ini masih pending. Batalkan undangan lama sebelum mengirim ulang.' }, 409);
    const admin = createAdminClient();
    // The JWT-authenticated client is used for authorization above. The
    // server client owns the write so the invitation cannot disappear from a
    // PostgREST response because of a client-side RLS/select mismatch.
    const { data, error } = await admin.from('household_invitations').insert({ household_id: membership.household_id, email, role: body.role, invited_by: auth.user.id }).select().single();
    if (error) throw error;
    if (!data) throw new Error('Undangan tidak berhasil dibuat.');
    const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${redirectOrigin(request)}/app/pengguna?invitation=${data.id}`,
      data: { invitation_id: data.id, household_id: membership.household_id, invited_role: body.role },
    });
    if (emailError) {
      const { error: cleanupError } = await admin
        .from('household_invitations')
        .update({ status: 'revoked' })
        .eq('id', data.id)
        .eq('status', 'pending');
      if (cleanupError) throw new Error(`Email undangan gagal dikirim dan record pending gagal dibersihkan: ${cleanupError.message}`);
      if (isAlreadyRegisteredError(emailError)) {
        return reply(request, { error: 'Akun dengan email ini sudah terdaftar. Undangan yang gagal sudah dibatalkan dan tidak lagi tercatat sebagai pending.' }, 409);
      }
      throw new Error(`Email undangan gagal dikirim: ${emailError.message}`);
    }
    return reply(request, { ...data, email_sent: true });
  } catch (error) { return reply(request, { error: error instanceof Error ? error.message : 'Undangan gagal dibuat.' }, 400); }
});
