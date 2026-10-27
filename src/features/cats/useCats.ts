import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toDatabaseError } from '../../lib/database-errors';

export type CatInput = { name: string; age_months?: number; breed?: string; weight_kg?: number; notes?: string };
const key = (householdId?: string) => ['cats', householdId];
function validate(input: CatInput) { if (!input.name.trim()) throw new Error('Nama wajib diisi.'); }

export function useCats(householdId?: string) {
  return useQuery({ queryKey: key(householdId), enabled: Boolean(supabase && householdId), queryFn: async () => {
    if (!supabase || !householdId) throw new Error('Household belum tersedia.');
    const { data, error } = await supabase.from('cats').select('*').eq('household_id', householdId).eq('is_active', true).order('name');
    if (error) throw toDatabaseError(error); return data ?? [];
  }});
}
export function useCreateCat(householdId?: string) { const client = useQueryClient(); return useMutation({ mutationFn: async (input: CatInput) => { validate(input); if (!supabase || !householdId) throw new Error('Household belum tersedia.'); const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error('Sesi pengguna tidak tersedia.'); const payload = { name: input.name.trim(), age_months: input.age_months ?? 0, breed: input.breed ?? null, weight_kg: input.weight_kg ?? null, notes: input.notes ?? null, household_id: householdId, owner_id: auth.user.id }; const { data, error } = await supabase.from('cats').insert(payload).select().single(); if (error) throw toDatabaseError(error); return data; }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) }); }
export function useUpdateCat(householdId?: string) { const client = useQueryClient(); return useMutation({ mutationFn: async ({ id, input }: { id: string; input: CatInput }) => { validate(input); if (!supabase || !householdId) throw new Error('Household belum tersedia.'); const payload = { name: input.name.trim(), age_months: input.age_months ?? 0, breed: input.breed ?? null, weight_kg: input.weight_kg ?? null, notes: input.notes ?? null }; const { data, error } = await supabase.from('cats').update(payload).eq('id', id).eq('household_id', householdId).select().single(); if (error) throw toDatabaseError(error); return data; }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) }); }
export function useArchiveCat(householdId?: string) { const client = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { if (!supabase || !householdId) throw new Error('Household belum tersedia.'); const { error } = await supabase.from('cats').update({ is_active: false }).eq('id', id).eq('household_id', householdId); if (error) throw toDatabaseError(error); }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) }); }
export function useDeleteCat(householdId?: string) { const client = useQueryClient(); return useMutation({ mutationFn: async (id: string) => { if (!supabase || !householdId) throw new Error('Household belum tersedia.'); const { error } = await supabase.from('cats').delete().eq('id', id).eq('household_id', householdId); if (error) throw toDatabaseError(error); }, onSuccess: () => client.invalidateQueries({ queryKey: key(householdId) }) }); }
