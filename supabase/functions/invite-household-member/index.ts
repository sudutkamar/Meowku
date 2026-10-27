import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return reply({ error: 'Unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return reply({ error: 'Unauthorized' }, 401);
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const body = await request.json() as { householdId?: string; email?: string; role?: 'admin' | 'member' };
    const email = body.email?.trim().toLowerCase();
    if (!body.householdId || !email || email.length > 320 || !/^\S+@\S+\.\S+$/.test(email) || !['admin', 'member'].includes(body.role ?? '')) return reply({ error: 'Household, email, atau role tidak valid.' }, 400);
    const { data: membership, error: membershipError } = await client.from('household_members').select('household_id, role').eq('household_id', body.householdId).eq('user_id', auth.user.id).eq('is_active', true).in('role', ['owner', 'admin']).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return reply({ error: 'Hanya owner atau admin yang dapat mengundang anggota.' }, 403);
    const { data, error } = await client.from('household_invitations').insert({ household_id: membership.household_id, email, role: body.role, invited_by: auth.user.id }).select().single();
    if (error) throw error;
    return reply(data);
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Undangan gagal dibuat.' }, 400); }
});
