create or replace function public.nutrition_plan(p_household_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('household_id', p_household_id, 'plans', '[]'::jsonb);
end; $$;
grant execute on function public.nutrition_plan(uuid) to authenticated;
