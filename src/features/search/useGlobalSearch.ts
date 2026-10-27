import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toDatabaseError } from '../../lib/database-errors';

export type SearchGroup = 'Kucing' | 'Jadwal' | 'Litter Box' | 'Katalog';
export type SearchResult = { id: string; label: string; detail: string; group: SearchGroup; page: string };

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useGlobalSearch(householdId: string | undefined, query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  return useQuery({
    queryKey: ['global-search', householdId, debouncedQuery],
    enabled: Boolean(supabase && householdId && debouncedQuery.length >= 2),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!supabase || !householdId) throw new Error('Household belum tersedia.');
      const pattern = `%${debouncedQuery}%`;
      try {
        const [cats, schedules, litterBoxes, catalog] = await Promise.all([
          supabase.from('cats').select('id, name, breed').eq('household_id', householdId).eq('is_active', true).ilike('name', pattern).limit(5),
          supabase.from('schedules').select('id, title, category').eq('household_id', householdId).eq('is_active', true).ilike('title', pattern).limit(5),
          supabase.from('litter_boxes').select('id, name, location, status').eq('household_id', householdId).eq('is_active', true).ilike('name', pattern).limit(5),
          supabase.from('catalog_items').select('id, name, category').eq('household_id', householdId).eq('is_active', true).ilike('name', pattern).limit(5),
        ]);
        for (const response of [cats, schedules, litterBoxes, catalog]) if (response.error) throw response.error;
        return [
          ...(cats.data ?? []).map((item) => ({ id: item.id, label: item.name, detail: item.breed ?? 'Kucing', group: 'Kucing' as const, page: 'Kucing' })),
          ...(schedules.data ?? []).map((item) => ({ id: item.id, label: item.title, detail: item.category, group: 'Jadwal' as const, page: 'Jadwal' })),
          ...(litterBoxes.data ?? []).map((item) => ({ id: item.id, label: item.name, detail: item.location ?? item.status, group: 'Litter Box' as const, page: 'Litter Box' })),
          ...(catalog.data ?? []).map((item) => ({ id: item.id, label: item.name, detail: item.category, group: 'Katalog' as const, page: 'Katalog' })),
        ];
      } catch (cause) {
        throw toDatabaseError(cause);
      }
    },
  });
}
