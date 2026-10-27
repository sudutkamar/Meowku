-- Phase 1: enforce tenant integrity for all cat-care relationships and retire
-- legacy owner_id policies that predate household membership authorization.

-- The initial prototype policies were permissive and only checked owner_id.
-- Keeping them alongside household policies would allow cross-household writes.
drop policy if exists "own cats" on public.cats;
drop policy if exists "own litter boxes" on public.litter_boxes;
drop policy if exists "own schedules" on public.schedules;
drop policy if exists "own activities" on public.activities;
drop policy if exists "admins read all cats" on public.cats;
drop policy if exists "admins read all litter boxes" on public.litter_boxes;
drop policy if exists "admins read all schedules" on public.schedules;
drop policy if exists "admins read all activities" on public.activities;

-- A household_id must agree with every related domain row. RLS protects access;
-- these triggers protect referential integrity even when a UUID is supplied by
-- a client or a trusted function.
create or replace function public.validate_cat_care_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare related_household uuid;
begin
  if new.cat_id is not null then
    select household_id into related_household from public.cats where id = new.cat_id;
    if related_household is null or related_household <> new.household_id then
      raise exception 'cat_household_mismatch';
    end if;
  end if;

  if tg_table_name = 'cat_food_profiles' then
    select household_id into related_household from public.food_products where id = new.food_product_id;
    if related_household is null or related_household <> new.household_id then
      raise exception 'food_product_household_mismatch';
    end if;
  end if;

  if tg_table_name <> 'cat_attachments' and new.attachment_id is not null then
    select household_id into related_household from public.cat_attachments where id = new.attachment_id;
    if related_household is null or related_household <> new.household_id then
      raise exception 'attachment_household_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists cat_attachments_household_integrity on public.cat_attachments;
create trigger cat_attachments_household_integrity
before insert or update on public.cat_attachments
for each row execute function public.validate_cat_care_household();

drop trigger if exists cat_health_records_household_integrity on public.cat_health_records;
create trigger cat_health_records_household_integrity
before insert or update on public.cat_health_records
for each row execute function public.validate_cat_care_household();

drop trigger if exists cat_vaccinations_household_integrity on public.cat_vaccinations;
create trigger cat_vaccinations_household_integrity
before insert or update on public.cat_vaccinations
for each row execute function public.validate_cat_care_household();

drop trigger if exists cat_food_profiles_household_integrity on public.cat_food_profiles;
create trigger cat_food_profiles_household_integrity
before insert or update on public.cat_food_profiles
for each row execute function public.validate_cat_care_household();

drop trigger if exists cat_expenses_household_integrity on public.cat_expenses;
create trigger cat_expenses_household_integrity
before insert or update on public.cat_expenses
for each row execute function public.validate_cat_care_household();

drop trigger if exists cat_scan_records_household_integrity on public.cat_scan_records;
create trigger cat_scan_records_household_integrity
before insert or update on public.cat_scan_records
for each row execute function public.validate_cat_care_household();

-- Keep audit timestamps authoritative. A client may optionally send an event
-- time, but it cannot create an unbounded future or historical completion.
create or replace function public.complete_occurrence(
  occurrence_id uuid,
  completed_at_value timestamptz default now(),
  note_value text default ''
) returns public.schedule_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare occurrence public.schedule_occurrences; effective_completed_at timestamptz;
begin
  select o.* into occurrence
  from public.schedule_occurrences o
  where o.id = occurrence_id and public.is_household_member(o.household_id)
  for update;
  if occurrence.id is null then raise exception 'occurrence_not_found'; end if;
  if occurrence.completed_at is not null then return occurrence; end if;

  effective_completed_at := coalesce(completed_at_value, now());
  if effective_completed_at < now() - interval '24 hours'
     or effective_completed_at > now() + interval '5 minutes' then
    raise exception 'completed_at_out_of_range';
  end if;

  update public.schedule_occurrences
  set completed_at = effective_completed_at,
      completed_by = auth.uid(),
      note = left(coalesce(note_value, ''), 2000)
  where id = occurrence_id and completed_at is null
  returning * into occurrence;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occurrence.household_id, auth.uid(), 'completed', 'schedule_occurrence', occurrence.id,
    jsonb_build_object('schedule_id', occurrence.schedule_id, 'target_key', occurrence.target_key, 'note', occurrence.note));
  return occurrence;
end;
$$;

grant execute on function public.complete_occurrence(uuid, timestamptz, text) to authenticated;
