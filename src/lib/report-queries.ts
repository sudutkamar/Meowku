import { supabase } from './supabase';

export type ReportRange = { fromDate: string; toDate: string; catId?: string };
export type HouseholdReport = {
  completed_total: number;
  overdue_total: number;
  scheduled_total: number;
  completion_rate: number;
  expense_total: number;
  expense_by_category: Array<{ category: string; amount: number }>;
  weight_series: Array<{ cat_id: string; recorded_at: string; weight_kg: number }>;
  vaccine_due_total: number;
};

async function fetchReportSummary(householdId: string, fromDate: string, toDate: string, timezone: string) {
  type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
  const rpc = supabase!.rpc.bind(supabase) as unknown as (name: string, args: Record<string, string>) => Promise<RpcResult>;
  const current = await rpc('household_report', {
    requested_household_id: householdId,
    from_date: fromDate,
    to_date: toDate,
    timezone_value: timezone,
  });
  // Prefer the timezone-aware RPC, but keep older local schemas usable while
  // their latest migrations are being applied.
  if (current.error?.code !== 'PGRST202') return current;
  return rpc('household_report', {
    requested_household_id: householdId,
    from_date: fromDate,
    to_date: toDate,
  });
}

export async function fetchHouseholdReport(householdId: string, { fromDate, toDate, catId }: ReportRange, timezone = 'Asia/Jakarta'): Promise<HouseholdReport> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const [summary, expenses, weights, vaccines] = await Promise.all([
    fetchReportSummary(householdId, fromDate, toDate, timezone),
    supabase.from('cat_expenses').select('category, amount, spent_at').eq('household_id', householdId).gte('spent_at', fromDate).lte('spent_at', toDate).eq(catId ? 'cat_id' : 'household_id', catId ?? householdId),
    supabase.from('cat_health_records').select('cat_id, recorded_at, weight_kg').eq('household_id', householdId).eq('record_type', 'weight').gte('recorded_at', `${fromDate}T00:00:00`).lte('recorded_at', `${toDate}T23:59:59`).not('weight_kg', 'is', null).eq(catId ? 'cat_id' : 'household_id', catId ?? householdId).order('recorded_at'),
    supabase.from('cat_vaccinations').select('next_due_at').eq('household_id', householdId).not('next_due_at', 'is', null).gte('next_due_at', fromDate).lte('next_due_at', toDate).eq(catId ? 'cat_id' : 'household_id', catId ?? householdId),
  ]);
  const { data, error } = summary;
  if (error) throw error;
  if (expenses.error) throw expenses.error;
  if (weights.error) throw weights.error;
  if (vaccines.error) throw vaccines.error;
  const row = (Array.isArray(data) ? data[0] : data) as HouseholdReport | null;
  if (!row) throw new Error('Laporan tidak tersedia.');
  const categoryTotals = new Map<string, number>();
  for (const expense of expenses.data ?? []) categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + Number(expense.amount));
  return { ...row, expense_total: [...categoryTotals.values()].reduce((total, amount) => total + amount, 0), expense_by_category: [...categoryTotals.entries()].map(([category, amount]) => ({ category, amount })), weight_series: (weights.data ?? []).map((item) => ({ cat_id: item.cat_id, recorded_at: item.recorded_at, weight_kg: Number(item.weight_kg) })), vaccine_due_total: vaccines.data?.length ?? 0 };
}
