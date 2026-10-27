import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type NotificationRecord = {
  id: string;
  household_id: string;
  user_id: string;
  occurrence_id: string | null;
  type: 'due_reminder' | 'system';
  title: string;
  body: string;
  action_url: string;
  read_at: string | null;
  hidden_at: string | null;
  created_at: string;
};
export type NotificationPreferences = { user_id: string; household_id: string; due_reminders: boolean; sound_enabled: boolean; updated_at: string };

const key = (householdId?: string) => ['notifications', householdId];

export function useNotifications(householdId?: string) {
  return useQuery({
    queryKey: key(householdId),
    enabled: Boolean(supabase && householdId),
    queryFn: async (): Promise<NotificationRecord[]> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const { data, error } = await supabase.from('notifications').select('*').eq('household_id', householdId).is('hidden_at', null).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as NotificationRecord[];
    },
  });
}

export function useMarkNotificationRead(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('mark_notification_read', { notification_id_value: id });
    if (error) throw error;
    return data;
  }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) });
}

export function useHideNotifications(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async () => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.rpc('hide_notifications');
    if (error) throw error;
    return data;
  }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) });
}

export function useNotificationPreferences(householdId?: string) {
  return useQuery({
    queryKey: ['notification-preferences', householdId],
    enabled: Boolean(supabase && householdId),
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Sesi pengguna tidak tersedia.');
      const { data, error } = await supabase.from('notification_preferences').select('*').eq('household_id', householdId).eq('user_id', userData.user.id).maybeSingle();
      if (error) throw error;
      return data as NotificationPreferences | null;
    },
  });
}

export function useUpdateNotificationPreferences(householdId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: { due_reminders: boolean; sound_enabled: boolean }) => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Sesi pengguna tidak tersedia.');
    const { data, error } = await supabase.from('notification_preferences').upsert({ user_id: userData.user.id, household_id: householdId, ...input }, { onConflict: 'user_id,household_id' }).select().single();
    if (error) throw error;
    return data;
  }, onSuccess: () => client.invalidateQueries({ queryKey: ['notification-preferences', householdId] }) });
}
