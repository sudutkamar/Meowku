-- Uncompleting a checklist occurrence must be limited to the user who completed
-- it or an owner/admin of the household. Signature, return type, audit event
-- writing, and security definer behavior are preserved from 20261106000200.

create or replace function public.uncomplete_occurrence(
  occurrence_id uuid
) returns public.schedule_occurrences
language plpgsql security definer set search_path = public as $$
declare
  occ public.schedule_occurrences;
begin
  select * into occ from public.schedule_occurrences where id = occurrence_id for update;
  if occ.id is null then raise exception 'occurrence_not_found'; end if;
  if occ.household_id is null or not public.is_household_member(occ.household_id) then
    raise exception 'household_access_denied';
  end if;
  if occ.completed_at is null then return occ; end if;
  if occ.completed_by is distinct from auth.uid()
    and public.household_role(occ.household_id) not in ('owner','admin') then
    raise exception 'uncomplete_not_authorized';
  end if;

  update public.schedule_occurrences
  set completed_at = null, completed_by = null
  where id = occurrence_id returning * into occ;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occ.household_id, auth.uid(), 'uncompleted', 'schedule_occurrence', occ.id,
    jsonb_build_object('local_date', occ.local_date));

  return occ;
end;
$$;

notify pgrst, 'reload schema';
