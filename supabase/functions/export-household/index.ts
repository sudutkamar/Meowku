import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const authorization = request.headers.get('Authorization');
  if (!authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    const body = await request.json() as { householdId?: string };
    if (!body.householdId) return new Response(JSON.stringify({ error: 'Household wajib dipilih.' }), { status: 400, headers });
    const { data: membership, error: membershipError } = await client.from('household_members').select('household_id').eq('household_id', body.householdId).eq('user_id', auth.user.id).eq('is_active', true).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return new Response(JSON.stringify({ error: 'Household tidak ditemukan.' }), { status: 403, headers });
    const { data, error } = await client.rpc('export_household', { requested_household_id: body.householdId });
    if (error) throw error;
    return new Response(JSON.stringify(data), { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Export gagal.' }), { status: 400, headers }); }
});
