import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export const scheduleRotationKey = (householdId?: string) => ['schedule-rotation', householdId];
export type RotationDay = { id?: string; weekday: number; assignee_id: string };
export type ScheduleRotation = { id: string; household_id: string; start_date: string; end_date: string; is_active: boolean; days: RotationDay[] } | null;
export type HouseholdAssignee = { id: string; household_id: string; display_name: string; linked_user_id: string | null; is_active: boolean };

export function useScheduleRotation(householdId?: string) {
  return useQuery({ queryKey: scheduleRotationKey(householdId), enabled: Boolean(supabase && householdId), queryFn: async (): Promise<ScheduleRotation> => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('get_household_schedule_rotation', { requested_household_id: householdId });
    if (error) throw error;
    const response = (data ?? { rotation: null, days: [] }) as { rotation: Omit<ScheduleRotation, 'days'> | null; days: RotationDay[] };
    return response.rotation ? { ...response.rotation, days: response.days ?? [] } as ScheduleRotation : null;
  } });
}

export function useScheduleRotationMembers(householdId?: string) {
  return useQuery({ queryKey: ['schedule-assignees', householdId], enabled: Boolean(supabase && householdId), queryFn: async (): Promise<HouseholdAssignee[]> => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.from('household_assignees').select('id, household_id, display_name, linked_user_id, is_active').eq('household_id', householdId).eq('is_active', true).order('display_name');
    if (error) throw error;
    return data ?? [];
  } });
}

export function useSaveScheduleAssignee(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ displayName, assigneeId }: { displayName: string; assigneeId?: string }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('save_household_assignee', { requested_household_id: householdId, display_name_value: displayName, assignee_id_value: assigneeId ?? null });
    if (error) throw error;
    return data;
  }, onSuccess: () => void client.invalidateQueries({ queryKey: ['schedule-assignees', householdId] }) });
}

export function useArchiveScheduleAssignee(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (assigneeId: string) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('archive_household_assignee', { requested_household_id: householdId, assignee_id_value: assigneeId });
    if (error) throw error;
    return data;
  }, onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['schedule-assignees', householdId] });
    void client.invalidateQueries({ queryKey: scheduleRotationKey(householdId) });
    void client.invalidateQueries({ queryKey: ['schedule-occurrences', householdId] });
    void client.invalidateQueries({ queryKey: ['dashboard', householdId] });
  } });
}

export function useSaveScheduleRotation(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ startDate, endDate, days }: { startDate: string; endDate: string; days: RotationDay[] }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('save_household_schedule_rotation', { requested_household_id: householdId, start_date_value: startDate, end_date_value: endDate, days_value: days.filter((day) => day.assignee_id).map(({ weekday, assignee_id }) => ({ weekday, assignee_id })) });
    if (error) throw error;
    return data;
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: scheduleRotationKey(householdId) }); void client.invalidateQueries({ queryKey: ['schedule-occurrences', householdId] }); void client.invalidateQueries({ queryKey: ['dashboard', householdId] }); void client.invalidateQueries({ queryKey: ['schedule-history', householdId] }); } });
}
