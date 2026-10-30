-- Keep household data and immutable history intact when an admin removes an
-- Auth user. The Auth delete is still the destructive operation; this trigger
-- only detaches user-owned foreign keys before PostgreSQL removes auth.users.

create or replace function public.household_owner_for_user(target_household uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id
  from public.household_members
  where household_id = target_household
    and role = 'owner'
    and is_active
  order by joined_at
  limit 1;
$$;

create or replace function public.prepare_auth_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Never silently transfer ownership of a household. The admin function
  -- already blocks this case, and this trigger protects direct Auth deletes.
  if exists (
    select 1
    from public.household_members
    where user_id = old.id and role = 'owner' and is_active
  ) then
    raise exception 'user_is_household_owner';
  end if;

  -- Preserve legacy owner fields and all household-scoped creator fields by
  -- assigning them to the active household owner.
  update public.households h
  set created_by = public.household_owner_for_user(h.id)
  where h.created_by = old.id
    and public.household_owner_for_user(h.id) is not null;

  update public.cats c
  set owner_id = public.household_owner_for_user(c.household_id)
  where c.owner_id = old.id
    and c.household_id is not null
    and public.household_owner_for_user(c.household_id) is not null;

  update public.litter_boxes l
  set owner_id = public.household_owner_for_user(l.household_id)
  where l.owner_id = old.id
    and l.household_id is not null
    and public.household_owner_for_user(l.household_id) is not null;

  update public.schedules s
  set owner_id = public.household_owner_for_user(s.household_id)
  where s.owner_id = old.id
    and s.household_id is not null
    and public.household_owner_for_user(s.household_id) is not null;

  update public.activities a
  set owner_id = public.household_owner_for_user(s.household_id)
  from public.schedules s
  where a.owner_id = old.id
    and a.schedule_id = s.id
    and s.household_id is not null
    and public.household_owner_for_user(s.household_id) is not null;

  update public.catalog_items item
  set created_by = public.household_owner_for_user(item.household_id)
  where item.created_by = old.id
    and public.household_owner_for_user(item.household_id) is not null;

  update public.cat_attachments attachment
  set uploaded_by = public.household_owner_for_user(attachment.household_id)
  where attachment.uploaded_by = old.id
    and public.household_owner_for_user(attachment.household_id) is not null;

  update public.cat_health_records record
  set created_by = public.household_owner_for_user(record.household_id)
  where record.created_by = old.id
    and public.household_owner_for_user(record.household_id) is not null;

  update public.cat_vaccinations record
  set created_by = public.household_owner_for_user(record.household_id)
  where record.created_by = old.id
    and public.household_owner_for_user(record.household_id) is not null;

  update public.food_products product
  set created_by = public.household_owner_for_user(product.household_id)
  where product.created_by = old.id
    and public.household_owner_for_user(product.household_id) is not null;

  update public.cat_food_profiles profile
  set created_by = public.household_owner_for_user(profile.household_id)
  where profile.created_by = old.id
    and public.household_owner_for_user(profile.household_id) is not null;

  update public.cat_expenses expense
  set created_by = public.household_owner_for_user(expense.household_id)
  where expense.created_by = old.id
    and public.household_owner_for_user(expense.household_id) is not null;

  update public.cat_scan_records scan
  set created_by = public.household_owner_for_user(scan.household_id)
  where scan.created_by = old.id
    and public.household_owner_for_user(scan.household_id) is not null;

  update public.household_assignees assignee
  set created_by = public.household_owner_for_user(assignee.household_id),
      linked_user_id = null
  where (assignee.created_by = old.id or assignee.linked_user_id = old.id)
    and public.household_owner_for_user(assignee.household_id) is not null;

  update public.household_schedule_rotations rotation
  set created_by = public.household_owner_for_user(rotation.household_id),
      updated_by = public.household_owner_for_user(rotation.household_id)
  where (rotation.created_by = old.id or rotation.updated_by = old.id)
    and public.household_owner_for_user(rotation.household_id) is not null;

  -- Preserve the assignment label when possible; otherwise remove the stale
  -- legacy rotation row so its assignment check remains valid.
  delete from public.household_schedule_rotation_days rotation_day
  where rotation_day.user_id = old.id and rotation_day.assignee_id is null;
  update public.household_schedule_rotation_days rotation_day
  set user_id = null
  where rotation_day.user_id = old.id;

  update public.household_invitations invitation
  set invited_by = public.household_owner_for_user(invitation.household_id)
  where invitation.invited_by = old.id
    and public.household_owner_for_user(invitation.household_id) is not null;

  -- Immutable audit history is retained. Its nullable actor link is changed to
  -- NULL by the ON DELETE SET NULL foreign key below, never by an UPDATE.
  -- Completion/assignment history is retained, but deleted actor links are
  -- cleared because these columns are intentionally nullable.
  update public.schedules set completed_by = null where completed_by = old.id;
  update public.schedule_occurrences
  set completed_by = null,
      archived_by = null,
      assigned_to = null
  where completed_by = old.id or archived_by = old.id or assigned_to = old.id;
  update public.activities set created_by = null where created_by = old.id;

  return old;
end;
$$;

-- Audit rows are immutable. Let PostgreSQL detach a deleted Auth actor rather
-- than trying to update the append-only table inside the deletion trigger.
alter table public.audit_events alter column actor_id drop not null;
alter table public.audit_events drop constraint if exists audit_events_actor_id_fkey;
alter table public.audit_events
  add constraint audit_events_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

revoke all on function public.household_owner_for_user(uuid) from public, anon, authenticated;
revoke all on function public.prepare_auth_user_deletion() from public, anon, authenticated;

drop trigger if exists auth_user_deletion_cleanup on auth.users;
create trigger auth_user_deletion_cleanup
before delete on auth.users
for each row execute function public.prepare_auth_user_deletion();

notify pgrst, 'reload schema';
