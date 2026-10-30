import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type InvitationDetails = { id: string; household_id: string; household_name: string; inviter_name: string; email: string; role: 'admin' | 'member'; status: 'pending' | 'accepted' | 'revoked'; created_at: string };
type AcceptedHousehold = { id: string; name?: string; timezone?: string };

function isMissingInvitationRpc(error: { message?: string } | null) {
  return /schema cache|does not exist|could not find the function/i.test(error?.message ?? '');
}

async function edgeInvitation(action: 'get' | 'accept' | 'decline', invitationId: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.functions.invoke('household-invitation', { body: { action, invitationId } });
  if (error) throw error;
  return data as { invitation?: InvitationDetails; household?: AcceptedHousehold; id?: string; status?: string };
}

export function useInvitation(invitationId: string | null, userId?: string) {
  return useQuery<InvitationDetails | null>({
    queryKey: ['household-invitation', invitationId, userId],
    enabled: Boolean(supabase && invitationId && userId),
    queryFn: async () => {
      if (!supabase || !invitationId) throw new Error('Undangan tidak tersedia.');
      const { data, error } = await supabase.rpc('get_household_invitation', { requested_invitation_id: invitationId });
      if (error && isMissingInvitationRpc(error)) {
        const fallback = await edgeInvitation('get', invitationId);
        return fallback.invitation ?? null;
      }
      if (error) throw error;
      return (data?.[0] ?? null) as InvitationDetails | null;
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.rpc('accept_household_invitation', { requested_invitation_id: invitationId });
      if (error && isMissingInvitationRpc(error)) {
        const fallback = await edgeInvitation('accept', invitationId);
        if (!fallback.household?.id) throw new Error('Household undangan tidak ditemukan setelah diterima.');
        return fallback.household;
      }
      if (error) throw error;
      if (!data) throw new Error('Undangan tidak berhasil diterima.');
      return data as AcceptedHousehold;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['current-households'] }); void queryClient.invalidateQueries({ queryKey: ['household-invitation'] }); },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error } = await supabase.rpc('decline_household_invitation', { requested_invitation_id: invitationId });
      if (error && isMissingInvitationRpc(error)) return edgeInvitation('decline', invitationId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['household-invitation'] }),
  });
}
