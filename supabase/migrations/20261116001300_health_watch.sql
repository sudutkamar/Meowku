-- Health Watch RPC (read-only, member-scoped)
create or replace function household_health_watch(p_household_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('ok', true);
$$;
