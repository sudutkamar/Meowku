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
    const body = await request.json() as { occurrenceId?: string; completedAt?: string; note?: string };
    if (!body.occurrenceId) throw new Error('occurrenceId is required');
    // The RPC updates schedule_occurrences and appends audit_events in one transaction.
    const { data, error } = await client.rpc('complete_occurrence', { occurrence_id: body.occurrenceId, completed_at_value: body.completedAt ?? new Date().toISOString(), note_value: body.note ?? '' });
    if (error) throw error;
    return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Completion failed' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
