import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { householdLocalDate } from '../dashboard/useDashboard';
import { validateSchedule } from './scheduleForm';

export type ScheduleStatus = 'active' | 'paused' | 'archived';
export type ScheduleSlot = { id?: string; label: string; local_time: string; sort_order: number; is_active?: boolean };
export type ScheduleTarget = { id?: string; target_key: string; cat_id?: string | null; litter_box_id?: string | null; is_active?: boolean };
export type ScheduleInput = {
  title: string;
  category: 'feeding' | 'litter' | 'medicine' | 'other';
  custom_category?: string;
  start_date: string;
  end_date?: string;
  repeat_interval: number;
  repeat_unit: 'day' | 'week' | 'month';
  timezone: string;
  time: string;
  days_of_week?: number[];
  day_of_month?: number | null;
  last_day?: boolean;
  slots?: ScheduleSlot[];
  targets?: ScheduleTarget[];
};
export type ScheduleRecord = ScheduleInput & { id: string; scheduled_at?: string; status: ScheduleStatus; is_active: boolean; slots: ScheduleSlot[]; targets: ScheduleTarget[] };
export type TargetOptions = {
  cats: Array<{ id: string; name: string }>;
  litterBoxes: Array<{ id: string; name: string }>;
};
export type OccurrenceFilter = 'Today' | 'Tomorrow' | 'This Week' | 'This Month';
export type ScheduleOccurrence = {
  id: string;
  schedule_id: string;
  target_key: string;
  slot_id: string;
  local_date: string;
  scheduled_at: string;
  assigned_to: string | null;
  assignee_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  archived_at: string | null;
  schedules: { title: string; category: string; custom_category: string | null; status: ScheduleStatus; is_active: boolean; start_date: string | null; end_date: string | null; repeat_interval: number; repeat_unit: 'day' | 'week' | 'month' } | null;
  schedule_slots: { label: string; local_time: string } | null;
  household_assignees: { display_name: string } | null;
};
export type ScheduleMember = { user_id: string; full_name: string | null; role: 'owner' | 'admin' | 'member' };

export function sortScheduleSlots(slots: ScheduleSlot[]) {
  return [...slots].sort((left, right) => left.local_time.localeCompare(right.local_time) || left.sort_order - right.sort_order);
}

const schedulesKey = (householdId?: string) => ['schedules', householdId];
const occurrenceKey = (householdId?: string, timezone?: string, filter?: OccurrenceFilter) => ['schedule-occurrences', householdId, timezone, filter];
const targetOptionsKey = (householdId?: string) => ['schedule-target-options', householdId];

function scheduledAt(input: ScheduleInput) {
  // The first active slot is the source of truth for a schedule's anchor time.
  // `input.time` is kept for legacy records, but must not override a user-edited
  // slot value from the schedule form.
  const firstActiveSlot = (input.slots ?? []).find((slot) => slot.is_active !== false);
  const time = firstActiveSlot?.local_time?.slice(0, 5) || input.time || '08:00';
  const offset = input.timezone === 'Asia/Jayapura' ? '+09:00' : input.timezone === 'Asia/Makassar' ? '+08:00' : '+07:00';
  return `${input.start_date}T${time}:00${offset}`;
}

function localDateFromTimestamp(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Asia/Jakarta' }).format(new Date(value));
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function rangeFor(filter: OccurrenceFilter, timezone: string) {
  const start = householdLocalDate(timezone);
  if (filter === 'Today') return { from: start, to: start };
  if (filter === 'Tomorrow') {
    const tomorrow = addDays(start, 1);
    return { from: tomorrow, to: tomorrow };
  }
  const day = new Date(`${start}T00:00:00Z`).getUTCDay();
  if (filter === 'This Week') {
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return { from: addDays(start, mondayOffset), to: addDays(start, mondayOffset + 6) };
  }
  const monthStart = `${start.slice(0, 8)}01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { from: monthStart, to: new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10) };
}

async function householdTargets(householdId: string): Promise<TargetOptions> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const [cats, litterBoxes] = await Promise.all([
    supabase.from('cats').select('id, name').eq('household_id', householdId).eq('is_active', true).order('name'),
    supabase.from('litter_boxes').select('id, name').eq('household_id', householdId).eq('is_active', true).order('name'),
  ]);
  if (cats.error) throw cats.error;
  if (litterBoxes.error) throw litterBoxes.error;
  return { cats: cats.data ?? [], litterBoxes: litterBoxes.data ?? [] };
}

async function hydratedSchedules(householdId: string): Promise<ScheduleRecord[]> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const [schedules, slots, targets] = await Promise.all([
    supabase.from('schedules').select('*').eq('household_id', householdId).order('start_date'),
    supabase.from('schedule_slots').select('*').order('sort_order'),
    supabase.from('schedule_targets').select('*').order('target_key'),
  ]);
  const failed = [schedules, slots, targets].find((result) => result.error);
  if (failed?.error) throw failed.error;
  const slotRows = slots.data ?? [];
  const targetRows = targets.data ?? [];
  return (schedules.data ?? []).map((schedule) => {
    const scheduleTimezone = schedule.timezone || 'Asia/Jakarta';
    const scheduleSlots = sortScheduleSlots(slotRows.filter((slot) => slot.schedule_id === schedule.id && slot.is_active));
    const scheduleTargets = targetRows.filter((target) => target.schedule_id === schedule.id && target.is_active);
    return {
      ...schedule,
      start_date: schedule.start_date ?? localDateFromTimestamp(schedule.scheduled_at, scheduleTimezone),
      timezone: scheduleTimezone,
      time: scheduleSlots[0]?.local_time?.slice(0, 5) ?? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: scheduleTimezone }).format(new Date(schedule.scheduled_at)),
      slots: scheduleSlots,
      targets: scheduleTargets,
      status: (schedule.status ?? (schedule.is_active ? 'active' : 'archived')) as ScheduleStatus,
    } as ScheduleRecord;
  });
}

export function useSchedules(householdId?: string) {
  return useQuery({ queryKey: schedulesKey(householdId), enabled: Boolean(supabase && householdId), queryFn: () => {
    if (!householdId) throw new Error('Household belum tersedia.');
    return hydratedSchedules(householdId);
  } });
}

export function useScheduleTargetOptions(householdId?: string) {
  return useQuery({ queryKey: targetOptionsKey(householdId), enabled: Boolean(supabase && householdId), queryFn: () => {
    if (!householdId) throw new Error('Household belum tersedia.');
    return householdTargets(householdId);
  } });
}

export function useScheduleOccurrences(householdId: string | undefined, timezone: string, filter: OccurrenceFilter) {
  return useQuery({
    queryKey: occurrenceKey(householdId, timezone, filter),
    enabled: Boolean(supabase && householdId),
    queryFn: async (): Promise<ScheduleOccurrence[]> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const range = rangeFor(filter, timezone);
      // Jadwal besok punya preview berbasis definisi aktif di ScheduleHistoryPage.
      // Jangan blokir preview hanya karena backfill occurrence gagal/terlambat;
      // occurrence yang sudah ada tetap dibaca di bawah, lalu page menambahkan
      // baris yang belum tersinkron dari definisi Supabase.
      if (filter !== 'Tomorrow') {
        const { error: generationError } = await supabase.rpc('generate_schedule_occurrences', {
          requested_household_id: householdId,
          range_start: range.from,
          range_end: range.to,
        });
        if (generationError) throw generationError;
      }
      const [occurrences, assignees] = await Promise.all([
        supabase.from('schedule_occurrences').select('*, schedules!inner(title, category, custom_category, status, is_active, start_date, end_date, repeat_interval, repeat_unit), schedule_slots(label, local_time)').eq('household_id', householdId).eq('schedules.is_active', true).eq('schedules.status', 'active').is('archived_at', null).gte('local_date', range.from).lte('local_date', range.to).order('local_date').order('scheduled_at'),
        supabase.from('household_assignees').select('id, display_name').eq('household_id', householdId).eq('is_active', true),
      ]);
      // Next Up tetap dapat dirender dari definisi jadwal aktif bila occurrence
      // atau daftar assignee belum tersedia karena backfill/schema lama.
      if (occurrences.error && filter !== 'Tomorrow') throw occurrences.error;
      if (assignees.error && filter !== 'Tomorrow') throw assignees.error;
      const names = new Map((assignees.data ?? []).map((assignee) => [assignee.id, { display_name: assignee.display_name }]));
      return (occurrences.data ?? []).map((occurrence) => ({ ...occurrence, household_assignees: occurrence.assignee_id ? names.get(occurrence.assignee_id) ?? null : null })) as unknown as ScheduleOccurrence[];
    },
  });
}

export function useScheduleMembers(householdId?: string) {
  return useQuery({
    queryKey: ['schedule-history-members', householdId],
    enabled: Boolean(supabase && householdId),
    queryFn: async (): Promise<ScheduleMember[]> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const { data: members, error: memberError } = await supabase.from('household_members').select('user_id, role').eq('household_id', householdId).eq('is_active', true);
      if (memberError) throw memberError;
      const ids = (members ?? []).map((member) => member.user_id);
      if (!ids.length) return [];
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      if (profileError) throw profileError;
      const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
      return (members ?? []).map((member) => ({ user_id: member.user_id, role: member.role as ScheduleMember['role'], full_name: names.get(member.user_id) ?? null }));
    },
  });
}

export function useTodayOccurrences(householdId?: string, timezone = 'Asia/Jakarta') {
  return useScheduleOccurrences(householdId, timezone, 'Today');
}

function invalidateScheduleQueries(client: ReturnType<typeof useQueryClient>, householdId?: string) {
  void client.invalidateQueries({ queryKey: schedulesKey(householdId) });
  void client.invalidateQueries({ queryKey: ['schedule-occurrences', householdId] });
  void client.invalidateQueries({ queryKey: ['dashboard', householdId] });
}

export function useCreateSchedule(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: ScheduleInput) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const validationError = validateSchedule(input);
    if (validationError) throw new Error(validationError);
    const { data, error } = await supabase.rpc('create_schedule', {
      title_value: input.title.trim(), category_value: input.category, custom_category_value: input.custom_category?.trim() || null, scheduled_at_value: scheduledAt(input), household_id_value: householdId,
      start_date_value: input.start_date, end_date_value: input.end_date || null, repeat_interval_value: input.repeat_interval,
      repeat_unit_value: input.repeat_unit, timezone_value: input.timezone, days_of_week_value: input.days_of_week ?? [],
      day_of_month_value: input.day_of_month ?? null, last_day_value: input.last_day ?? false,
      slots_value: input.slots ?? [{ label: input.title.trim(), local_time: input.time, sort_order: 0, is_active: true }], targets_value: input.targets ?? [],
    });
    if (error) throw error;
    if (!data) throw new Error('Jadwal tidak berhasil dibuat.');
    return data;
  }, onSuccess: () => invalidateScheduleQueries(client, householdId) });
}

export function useUpdateSchedule(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ scheduleId, definition }: { scheduleId: string; definition: ScheduleInput }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const validationError = validateSchedule(definition);
    if (validationError) throw new Error(validationError);
    const { data, error } = await supabase.rpc('update_schedule_definition', {
      schedule_id_value: scheduleId,
      definition_value: { ...definition, title: definition.title.trim(), slots: definition.slots ?? [], targets: definition.targets ?? [] },
    });
    if (error) throw error;
    return data;
  }, onSuccess: () => invalidateScheduleQueries(client, householdId) });
}

function useScheduleLifecycle(householdId: string | undefined, rpc: 'pause_schedule' | 'resume_schedule' | 'restore_schedule' | 'archive_schedule' | 'delete_schedule') {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (scheduleId: string) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc(rpc, { schedule_id_value: scheduleId });
    if (error) throw error;
    return data;
  }, onSuccess: () => invalidateScheduleQueries(client, householdId) });
}

export const usePauseSchedule = (householdId?: string) => useScheduleLifecycle(householdId, 'pause_schedule');
export const useResumeSchedule = (householdId?: string) => useScheduleLifecycle(householdId, 'resume_schedule');
export const useRestoreSchedule = (householdId?: string) => useScheduleLifecycle(householdId, 'restore_schedule');
export const useArchiveSchedule = (householdId?: string) => useScheduleLifecycle(householdId, 'archive_schedule');
export const useDeleteSchedule = (householdId?: string) => useScheduleLifecycle(householdId, 'delete_schedule');

export function useGenerateOccurrences(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ fromDate, toDate }: { fromDate: string; toDate: string }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('generate_schedule_occurrences', { requested_household_id: householdId, range_start: fromDate, range_end: toDate });
    if (error) throw error;
    return data;
  }, onSuccess: () => invalidateScheduleQueries(client, householdId) });
}

export function useCompleteOccurrence(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ occurrenceId, note }: { occurrenceId: string; note?: string }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('complete_occurrence', {
      occurrence_id: occurrenceId,
      completed_at_value: new Date().toISOString(),
      note_value: note ?? '',
    });
    if (error) throw error;
    return data;
  }, onSuccess: () => { invalidateScheduleQueries(client, householdId); void client.invalidateQueries({ queryKey: ['history', householdId] }); void client.invalidateQueries({ queryKey: ['report', householdId] }); } });
}

export function useArchiveOccurrence(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (occurrenceId: string) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('archive_occurrence', { occurrence_id_value: occurrenceId });
    if (error) throw error;
    return data;
  }, onSuccess: () => { invalidateScheduleQueries(client, householdId); void client.invalidateQueries({ queryKey: ['history', householdId] }); } });
}
