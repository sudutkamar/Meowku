-- Custom household assignees may not have a linked auth user.
-- The legacy rotation trigger must validate the assignee snapshot first,
-- otherwise an unlinked name is incorrectly rejected as an inactive member.
create or replace function public.validate_schedule_rotation_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rotation_household uuid;
begin
  select household_id into rotation_household
  from public.household_schedule_rotations
  where id = new.rotation_id;

  if rotation_household is null then
    raise exception 'schedule_rotation_not_found';
  end if;

  if new.assignee_id is not null then
    if not exists (
      select 1
      from public.household_assignees a
      where a.id = new.assignee_id
        and a.household_id = rotation_household
        and a.is_active
    ) then
      raise exception 'assignee_not_active';
    end if;

    -- assignee_id is authoritative for named household assignees. The
    -- linked user is optional, so an unlinked assignee must be accepted.
    return new;
  end if;

  if new.user_id is null or not exists (
    select 1
    from public.household_members m
    where m.household_id = rotation_household
      and m.user_id = new.user_id
      and m.is_active
  ) then
    raise exception 'rotation_member_not_active';
  end if;

  return new;
end;
$$;
