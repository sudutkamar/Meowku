create or replace function public.household_local_date(household_id uuid)
returns date
language sql
security definer
set search_path = public
as $$
  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
  from public.households h
  where h.id = household_id;
$$;

grant execute on function public.household_local_date(uuid) to authenticated;
