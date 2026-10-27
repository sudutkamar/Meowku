import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-keys';
import { householdToday } from '../../lib/timezone';

export type DashboardOccurrence = {
  id: string;
  schedule_id: string;
  target_key: string;
  scheduled_at: string;
  completed_at: string | null;
  archived_at: string | null;
  slotLabel: string;
  targetLabel: string;
  status: 'missed' | 'pending' | 'completed';
  schedules: { title: string; category: string; custom_category: string | null } | null;
};

export type DashboardData = {
  cats: Array<{ id: string; name: string; age_months: number; breed: string | null; photo_url: string | null }>;
  litterBoxes: Array<{ id: string; name: string; status: string; location: string | null }>;
  activeSchedules: number;
  todayOccurrences: DashboardOccurrence[];
  completedToday: number;
  completionRate: number | null;
  recentActivity: Array<{ id: string; action: string; entity_type: string; actor_id: string; created_at: string }>;
  perCatProgress: Array<{ id: string; name: string; completed: number; total: number; rate: number | null }>;
  attentionItems: Array<{ kind: 'overdue' | 'vaccination'; label: string; detail: string; catId?: string }>;
  today: string;
};

export const dashboardKey = (householdId?: string) => ['household', householdId, 'dashboard'];

export function householdLocalDate(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
}

export function useDashboard(householdId?: string, timezone = 'Asia/Jakarta') {
  return useQuery({
    queryKey: householdId ? queryKeys.dashboard(householdId, timezone) : ['household', 'missing', 'dashboard', timezone], enabled: Boolean(supabase && householdId),
    queryFn: async (): Promise<DashboardData> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const today = householdLocalDate(timezone);
      const { error: generationError } = await supabase.rpc('generate_schedule_occurrences', {
        requested_household_id: householdId,
        range_start: today,
        range_end: today,
      });
      if (generationError) throw generationError;
      const [cats, litterBoxes, schedules, occurrences, targets, vaccinations, activity] = await Promise.all([
        supabase.from('cats').select('id, name, age_months, breed, photo_url').eq('household_id', householdId).eq('is_active', true).order('name'),
        supabase.from('litter_boxes').select('id, name, status, location').eq('household_id', householdId).eq('is_active', true).order('name'),
        supabase.from('schedules').select('id, title, category, custom_category').eq('household_id', householdId).eq('is_active', true).eq('status', 'active'),
        supabase.from('schedule_occurrences').select('id, schedule_id, target_key, slot_id, scheduled_at, completed_at, archived_at, schedules!inner(title, category, custom_category, is_active), schedule_slots(label, local_time)').eq('household_id', householdId).eq('local_date', today).is('archived_at', null).eq('schedules.is_active', true).order('scheduled_at'),
        supabase.from('schedule_targets').select('target_key, cat_id, litter_box_id, schedules!inner(household_id)').eq('schedules.household_id', householdId).eq('is_active', true),
        supabase.from('cat_vaccinations').select('cat_id, vaccine_name, next_due_at').eq('household_id', householdId).not('next_due_at', 'is', null).order('next_due_at'),
        // Dashboard hanya menampilkan preview singkat; histori lengkap tetap di halaman Histori.
        supabase.from('audit_events').select('id, action, entity_type, actor_id, created_at').eq('household_id', householdId).order('created_at', { ascending: false }).limit(4),
      ]);
      const failed = [cats, litterBoxes, schedules, occurrences, targets, vaccinations, activity].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const catMap = new Map((cats.data ?? []).map((cat) => [cat.id, cat.name]));
      const boxMap = new Map((litterBoxes.data ?? []).map((box) => [box.id, box.name]));
      const targetMap = new Map((targets.data ?? []).map((target) => [target.target_key, target.cat_id ? catMap.get(target.cat_id) ?? 'Kucing' : target.litter_box_id ? boxMap.get(target.litter_box_id) ?? 'Litter box' : 'Household']));
      const targetCatMap = new Map((targets.data ?? []).map((target) => [target.target_key, target.cat_id ?? null]));
      const scheduleById = new Map((schedules.data ?? []).map((schedule) => [schedule.id, schedule]));
      const now = Date.now();
      const todayOccurrences = (occurrences.data ?? []).map((occurrence) => {
        const row = occurrence as typeof occurrence & { schedule_slots?: { label?: string } | null };
        const completed = Boolean(row.completed_at);
        return { ...row, schedules: scheduleById.get(row.schedule_id) ?? null, slotLabel: row.schedule_slots?.label ?? 'Slot', targetLabel: targetMap.get(row.target_key) ?? row.target_key, status: completed ? 'completed' : new Date(row.scheduled_at).getTime() < now ? 'missed' : 'pending' } as DashboardOccurrence;
      });
      const completedToday = todayOccurrences.filter((occurrence) => occurrence.status === 'completed').length;
      const totalToday = todayOccurrences.length;
      const perCatProgress = (cats.data ?? []).map((cat) => {
        const rows = todayOccurrences.filter((occurrence) => targetCatMap.get(occurrence.target_key) === cat.id);
        const completed = rows.filter((occurrence) => occurrence.status === 'completed').length;
        return { id: cat.id, name: cat.name, completed, total: rows.length, rate: rows.length ? Math.round((completed / rows.length) * 100) : null };
      });
      const attentionItems: DashboardData['attentionItems'] = todayOccurrences.filter((occurrence) => occurrence.status === 'missed').slice(0, 4).map((occurrence) => ({ kind: 'overdue', label: occurrence.schedules?.title ?? 'Tugas jadwal', detail: `${occurrence.targetLabel} · terlewat` }));
      const todayMs = Date.parse(`${today}T23:59:59Z`);
      for (const vaccine of vaccinations.data ?? []) {
        if (!vaccine.next_due_at || !catMap.has(vaccine.cat_id)) continue;
        const dueMs = Date.parse(`${vaccine.next_due_at}T00:00:00Z`);
        if (dueMs <= todayMs + 14 * 86400000) attentionItems.push({ kind: 'vaccination', label: `${vaccine.vaccine_name} · ${catMap.get(vaccine.cat_id)}`, detail: `Jatuh tempo ${vaccine.next_due_at}`, catId: vaccine.cat_id });
      }
      return { cats: cats.data ?? [], litterBoxes: litterBoxes.data ?? [], activeSchedules: schedules.data?.length ?? 0, todayOccurrences, completedToday, completionRate: totalToday ? Math.round((completedToday / totalToday) * 100) : null, recentActivity: activity.data ?? [], perCatProgress, attentionItems: attentionItems.slice(0, 6), today };
    },
  });
}
