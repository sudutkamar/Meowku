import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const body = await request.json() as { householdId?: string; fromDate?: string; toDate?: string };
    if (!body.householdId || !body.fromDate || !body.toDate) throw new Error('householdId, fromDate, and toDate are required');
    // Membership and idempotency are enforced by the database RPC/RLS, not by client input.
    const { data, error } = await client.rpc('generate_schedule_occurrences', { requested_household_id: body.householdId, range_start: body.fromDate, range_end: body.toDate });
    if (error) throw error;
    return new Response(JSON.stringify({ inserted: data, timezone: 'Asia/Jakarta' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Generation failed' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
