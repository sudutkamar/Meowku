create or replace function public.schedule_pattern_report(p_household_id uuid, p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('household_id', p_household_id, 'days', p_days, 'patterns', '[]'::jsonb);
end; $$;
grant execute on function public.schedule_pattern_report(uuid, int) to authenticated;
