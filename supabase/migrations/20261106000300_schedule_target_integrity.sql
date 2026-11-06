-- Cross-entity integrity for schedule targets.
-- Schedule targets accept `cat:<uuid>`, `litter:<uuid>` and `household`.
-- RLS protects generic table rows through parent schedule membership, but a
-- malicious/stale client can still insert a target_key pointing at another
-- household, a deleted entity, or an arbitrary string. Enforce it in the DB.

create or replace function public.validate_schedule_target()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_household_id uuid;
  v_kind text;
  v_entity_id uuid;
begin
  select s.household_id into v_household_id
  from public.schedules s
  where s.id = new.schedule_id;

  if v_household_id is null then
    raise exception 'schedule_not_found';
  end if;

  v_kind := split_part(new.target_key, ':', 1);

  if new.target_key = 'household' then
    -- Shared target, no entity check required, but never store cat/litter ids.
    new.cat_id := null;
    new.litter_box_id := null;
    return new;
  end if;

  if v_kind = 'cat' then
    if new.litter_box_id is not null then
      raise exception 'invalid_schedule_target';
    end if;
    begin
      v_entity_id := coalesce(new.cat_id, nullif(substring(new.target_key from 5), '')::uuid);
    exception when others then
      raise exception 'invalid_schedule_target';
    end;
    if v_entity_id is null or not exists (
      select 1 from public.cats
      where id = v_entity_id
        and household_id = v_household_id
        and is_active
    ) then
      raise exception 'schedule_target_not_accessible';
    end if;
    new.cat_id := v_entity_id;
    new.litter_box_id := null;
    return new;
  end if;

  if v_kind = 'litter' then
    if new.cat_id is not null then
      raise exception 'invalid_schedule_target';
    end if;
    begin
      v_entity_id := coalesce(new.litter_box_id, nullif(substring(new.target_key from 7), '')::uuid);
    exception when others then
      raise exception 'invalid_schedule_target';
    end;
    if v_entity_id is null or not exists (
      select 1 from public.litter_boxes
      where id = v_entity_id
        and household_id = v_household_id
        and is_active
    ) then
      raise exception 'schedule_target_not_accessible';
    end if;
    new.litter_box_id := v_entity_id;
    new.cat_id := null;
    return new;
  end if;

  raise exception 'invalid_schedule_target';
end;
$$;

drop trigger if exists schedule_targets_validate on public.schedule_targets;
create trigger schedule_targets_validate
  before insert or update on public.schedule_targets
  for each row execute function public.validate_schedule_target();

-- Prevent archived/deleted entity references from continuing to produce new occurrences.
-- We do not rewrite historical occurrence rows; instead, target deactivation
-- pauses only future occurrences via generate_schedule_occurrences' is_active
-- target filter. This function is idempotent and safe to rerun.
create or replace function public.archive_schedule_targets_for_entity()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_household_id uuid;
  v_target_key text;
begin
  v_household_id := coalesce(new.household_id, old.household_id);
  if coalesce(new.is_active, false) = coalesce(old.is_active, true) then
    return new;
  end if;

  if tg_table_name = 'cats' and new.is_active = false then
    v_target_key := 'cat:' || new.id;
    update public.schedule_targets t
      set is_active = false
    from public.schedules s
    where t.schedule_id = s.id
      and s.household_id = v_household_id
      and t.cat_id = new.id;
    update public.schedule_occurrences o
      set archived_at = coalesce(o.archived_at, now()), archived_by = auth.uid()
    where o.household_id = v_household_id
      and o.target_key = v_target_key
      and o.completed_at is null
      and o.archived_at is null
      and o.local_date >= (now() at time zone coalesce(nullif((select h.timezone from public.households h where h.id = v_household_id), ''), 'Asia/Jakarta'))::date;
  end if;

  if tg_table_name = 'litter_boxes' and new.is_active = false then
    v_target_key := 'litter:' || new.id;
    update public.schedule_targets t
      set is_active = false
    from public.schedules s
    where t.schedule_id = s.id
      and s.household_id = v_household_id
      and t.litter_box_id = new.id;
    update public.schedule_occurrences o
      set archived_at = coalesce(o.archived_at, now()), archived_by = auth.uid()
    where o.household_id = v_household_id
      and o.target_key = v_target_key
      and o.completed_at is null
      and o.archived_at is null
      and o.local_date >= (now() at time zone coalesce(nullif((select h.timezone from public.households h where h.id = v_household_id), ''), 'Asia/Jakarta'))::date;
  end if;

  return new;
end;
$$;

drop trigger if exists cats_archive_schedule_targets on public.cats;
create trigger cats_archive_schedule_targets
  after update of is_active on public.cats
  for each row execute function public.archive_schedule_targets_for_entity();

drop trigger if exists litter_boxes_archive_schedule_targets on public.litter_boxes;
create trigger litter_boxes_archive_schedule_targets
  after update of is_active on public.litter_boxes
  for each row execute function public.archive_schedule_targets_for_entity();

notify pgrst, 'reload schema';
