-- Health Watch RPC (read-only, member-scoped)
create or replace function household_health_watch(p_household_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case when is_household_member(p_household_id)
    then jsonb_build_object('ok', true, 'flags', '[]'::jsonb)
    else jsonb_build_object('error', 'household_access_denied') end;
$$;
