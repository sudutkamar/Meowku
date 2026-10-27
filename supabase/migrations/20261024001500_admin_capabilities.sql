-- Household capabilities are derived from the authenticated membership row.
create or replace function public.household_access(requested_household_id uuid)
returns table (
  role public.household_role,
  can_manage_members boolean,
  can_manage_entities boolean,
  can_view_audit boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.role,
    m.role in ('owner', 'admin'),
    m.role in ('owner', 'admin'),
    m.role in ('owner', 'admin')
  from public.household_members m
  where m.household_id = requested_household_id
    and m.user_id = auth.uid()
    and m.is_active;
$$;

grant execute on function public.household_access(uuid) to authenticated;

create or replace function public.manage_household_member(
  target_household_id uuid,
  target_user_id uuid,
  next_role public.household_role
)
returns public.household_members
language plpgsql
security definer
set search_path = public
as $$
declare updated_member public.household_members;
begin
  if public.household_role(target_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  if next_role = 'owner' then raise exception 'owner_role_immutable'; end if;

  update public.household_members
  set role = next_role
  where household_id = target_household_id
    and user_id = target_user_id
    and is_active
    and role <> 'owner'
  returning * into updated_member;
  if updated_member.user_id is null then raise exception 'member_not_found'; end if;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (target_household_id, auth.uid(), 'role_changed', 'household_member', target_user_id,
    jsonb_build_object('role', next_role));
  return updated_member;
end;
$$;

create or replace function public.remove_household_member(
  target_household_id uuid,
  target_user_id uuid
)
returns public.household_members
language plpgsql
security definer
set search_path = public
as $$
declare removed_member public.household_members;
begin
  if public.household_role(target_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;

  update public.household_members
  set is_active = false
  where household_id = target_household_id
    and user_id = target_user_id
    and is_active
    and role <> 'owner'
  returning * into removed_member;
  if removed_member.user_id is null then raise exception 'member_not_found'; end if;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (target_household_id, auth.uid(), 'removed', 'household_member', target_user_id, '{}'::jsonb);
  return removed_member;
end;
$$;

grant execute on function public.manage_household_member(uuid, uuid, public.household_role) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

-- Members can read household data, but only owner/admin can change household-wide entities.
drop policy if exists audit_events_member_select on public.audit_events;
drop policy if exists audit_events_admin_select on public.audit_events;
create policy audit_events_admin_select on public.audit_events for select
  using (public.household_role(household_id) in ('owner', 'admin'));

drop policy if exists cats_member on public.cats;
drop policy if exists cats_select_member on public.cats;
drop policy if exists cats_admin_manage on public.cats;
create policy cats_select_member on public.cats for select
  using (public.is_household_member(household_id));
create policy cats_admin_manage on public.cats for all
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());

drop policy if exists litter_boxes_member on public.litter_boxes;
drop policy if exists litter_boxes_select_member on public.litter_boxes;
drop policy if exists litter_boxes_admin_manage on public.litter_boxes;
create policy litter_boxes_select_member on public.litter_boxes for select
  using (public.is_household_member(household_id));
create policy litter_boxes_admin_manage on public.litter_boxes for all
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());

drop policy if exists catalog_items_member on public.catalog_items;
drop policy if exists catalog_items_select_member on public.catalog_items;
drop policy if exists catalog_items_admin_manage on public.catalog_items;
create policy catalog_items_select_member on public.catalog_items for select
  using (public.is_household_member(household_id));
create policy catalog_items_admin_manage on public.catalog_items for all
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin') and created_by = auth.uid());

drop policy if exists schedules_member on public.schedules;
drop policy if exists schedules_select_member on public.schedules;
drop policy if exists schedules_admin_manage on public.schedules;
create policy schedules_select_member on public.schedules for select
  using (public.is_household_member(household_id));
create policy schedules_admin_manage on public.schedules for all
  using (public.household_role(household_id) in ('owner', 'admin'))
  with check (public.household_role(household_id) in ('owner', 'admin') and owner_id = auth.uid());

drop policy if exists schedule_targets_member on public.schedule_targets;
drop policy if exists schedule_targets_select_member on public.schedule_targets;
drop policy if exists schedule_targets_admin_manage on public.schedule_targets;
create policy schedule_targets_select_member on public.schedule_targets for select
  using (exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_household_member(s.household_id)
  ));
create policy schedule_targets_admin_manage on public.schedule_targets for all
  using (exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.household_role(s.household_id) in ('owner', 'admin')
  ))
  with check (exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.household_role(s.household_id) in ('owner', 'admin')
  ));
