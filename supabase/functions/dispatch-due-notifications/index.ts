import webpush from 'npm:web-push';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dispatch-secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Occurrence = { id: string; household_id: string; scheduled_at: string; target_key: string; schedules: { title: string; is_active: boolean; status: string } | null; schedule_slots: { label: string; is_active: boolean } | null };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('x-dispatch-secret') !== Deno.env.get('NOTIFICATION_DISPATCH_SECRET')) return json({ error: 'Forbidden' }, 403);
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return json({ error: 'Push notification belum dikonfigurasi.' }, 503);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const now = new Date().toISOString();
    const { data: rawOccurrences, error: occurrenceError } = await admin.from('schedule_occurrences').select('id, household_id, scheduled_at, target_key, schedules!inner(title, is_active, status), schedule_slots!inner(label, is_active)').lte('scheduled_at', now).is('completed_at', null).is('archived_at', null).eq('schedules.is_active', true).eq('schedules.status', 'active').eq('schedule_slots.is_active', true).order('scheduled_at').limit(500);
    if (occurrenceError) throw occurrenceError;
    const occurrences = (rawOccurrences ?? []) as unknown as Occurrence[];
    let created = 0;
    let delivered = 0;
    let revoked = 0;
    for (const householdId of [...new Set(occurrences.map((item) => item.household_id))]) {
      const householdOccurrences = occurrences.filter((item) => item.household_id === householdId);
      const { data: members, error: memberError } = await admin.from('household_members').select('user_id').eq('household_id', householdId).eq('is_active', true);
      if (memberError) throw memberError;
      const memberIds = (members ?? []).map((member) => member.user_id);
      if (!memberIds.length) continue;
      const { data: preferences, error: preferenceError } = await admin.from('notification_preferences').select('user_id, due_reminders').eq('household_id', householdId).in('user_id', memberIds);
      if (preferenceError) throw preferenceError;
      const disabled = new Set((preferences ?? []).filter((preference) => preference.due_reminders === false).map((preference) => preference.user_id));
      const rows = memberIds.filter((userId) => !disabled.has(userId)).flatMap((userId) => householdOccurrences.map((occurrence) => ({ household_id: householdId, user_id: userId, occurrence_id: occurrence.id, type: 'due_reminder', title: `Waktunya ${occurrence.schedules?.title ?? 'perawatan kucing'}`, body: `${occurrence.schedule_slots?.label ?? 'Jadwal'} perlu dilakukan sekarang.`, action_url: '/app/riwayat-jadwal' })));
      if (!rows.length) continue;
      const { data: inserted, error: insertError } = await admin.from('notifications').upsert(rows, { onConflict: 'user_id,occurrence_id,type', ignoreDuplicates: true }).select('id, user_id, household_id, occurrence_id, title, body, action_url');
      if (insertError) throw insertError;
      created += inserted?.length ?? 0;
      for (const notification of inserted ?? []) {
        const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions').select('id, endpoint, subscription').eq('user_id', notification.user_id).eq('household_id', notification.household_id).is('revoked_at', null);
        if (subscriptionError) throw subscriptionError;
        for (const subscription of subscriptions ?? []) {
          try {
            await webpush.sendNotification(subscription.subscription, JSON.stringify({ title: notification.title, body: notification.body, actionUrl: notification.action_url, tag: notification.id }));
            delivered += 1;
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await admin.from('push_subscriptions').update({ revoked_at: new Date().toISOString() }).eq('id', subscription.id);
              revoked += 1;
            }
          }
        }
      }
    }
    return json({ due: occurrences.length, created, delivered, revoked });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Dispatch failed' }, 500);
  }
});
