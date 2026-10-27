-- Make household export explicit and safe for users who belong to multiple households.
create or replace function public.export_household(requested_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare payload jsonb;
begin
  if auth.uid() is null or not public.is_household_member(requested_household_id) then
    raise exception 'household_access_denied';
  end if;

  select jsonb_build_object(
    'household', (select to_jsonb(h) from public.households h where h.id = requested_household_id),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = requested_household_id), '[]'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c)) from public.cats c where c.household_id = requested_household_id), '[]'::jsonb),
    'litter_boxes', coalesce((select jsonb_agg(to_jsonb(l)) from public.litter_boxes l where l.household_id = requested_household_id), '[]'::jsonb),
    'catalog_items', coalesce((select jsonb_agg(to_jsonb(i)) from public.catalog_items i where i.household_id = requested_household_id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s)) from public.schedules s where s.household_id = requested_household_id), '[]'::jsonb),
    'occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from public.schedule_occurrences o where o.household_id = requested_household_id), '[]'::jsonb),
    'audit_events', coalesce((select jsonb_agg(to_jsonb(a)) from public.audit_events a where a.household_id = requested_household_id), '[]'::jsonb)
  ) into payload;
  return payload;
end;
$$;

revoke execute on function public.export_household() from authenticated;
grant execute on function public.export_household(uuid) to authenticated;
