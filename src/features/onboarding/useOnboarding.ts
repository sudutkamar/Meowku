import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Household } from '../../lib/types';

export type OnboardingInput = { householdName: string; timezone: string };

export function useCurrentHouseholds(userId?: string) {
  return useQuery({
    queryKey: ['current-households', userId],
    enabled: Boolean(supabase && userId),
    queryFn: async () => {
      if (!supabase || !userId) return null;
      const { data: memberships, error } = await supabase.from('household_members').select('household_id, joined_at').eq('user_id', userId).eq('is_active', true).order('joined_at');
      if (error) throw error;
      const ids = (memberships ?? []).map((row) => row.household_id);
      if (!ids.length) return [];
      const { data: rows, error: householdError } = await supabase.from('households').select('*').in('id', ids);
      if (householdError) throw householdError;
      const householdMap = new Map((rows ?? []).map((row) => [row.id, row]));
      return ids.map((id) => householdMap.get(id)).filter(Boolean) as unknown as Household[];
    },
  });
}

/** Backward-compatible first household helper for non-shell consumers. */
export function useCurrentHousehold(userId?: string) {
  const households = useCurrentHouseholds(userId);
  return { ...households, data: households.data?.[0] ?? null };
}

export function useOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ householdName, timezone }: OnboardingInput) => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const name = householdName.trim();
      if (!name) throw new Error('Nama household wajib diisi.');
      const { data, error } = await supabase.rpc('create_household', { household_name: name }).single();
      if (error) throw error;
      const household = data as { id: string };
      const { data: updated, error: updateError } = await supabase.from('households').update({ timezone }).eq('id', household.id).select().single();
      if (updateError) throw updateError;
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['current-households'] });
      void queryClient.invalidateQueries({ queryKey: ['current-household'] });
    },
  });
}
