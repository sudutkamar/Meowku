create or replace function public.household_activity_feed(p_household_id uuid, p_since timestamptz default null, p_limit int default 50)
returns table (event_id uuid, actor_id uuid, actor_name text, event_type text, created_at timestamptz, payload jsonb)
language sql security definer set search_path = public as $$
  select ae.id, ae.actor_id, p.full_name, ae.action, ae.created_at, ae.metadata
  from public.audit_events ae
  left join public.profiles p on p.id = ae.actor_id
  where ae.household_id = p_household_id
    and is_household_member(p_household_id)
    and (p_since is null or ae.created_at >= p_since)
  order by ae.created_at desc
  limit p_limit;
$$;
grant execute on function public.household_activity_feed(uuid, timestamptz, int) to authenticated;