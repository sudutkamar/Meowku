-- Invitation recipients must explicitly accept membership. Account creation
-- alone must never silently join a household or bypass the invitation screen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.get_household_invitation(requested_invitation_id uuid)
returns table (id uuid, household_id uuid, household_name text, inviter_name text, email text, role public.household_role, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select invitation.id, invitation.household_id, household.name,
    coalesce(nullif(trim(profile.full_name), ''), split_part(inviter.email, '@', 1)),
    invitation.email, invitation.role, invitation.status, invitation.created_at
  from public.household_invitations invitation
  join public.households household on household.id = invitation.household_id
  join auth.users inviter on inviter.id = invitation.invited_by
  left join public.profiles profile on profile.id = invitation.invited_by
  where invitation.id = requested_invitation_id
    and lower(invitation.email) = lower((select email from auth.users where id = auth.uid()));
$$;

create or replace function public.accept_household_invitation(requested_invitation_id uuid)
returns public.households language plpgsql security definer set search_path = public as $$
declare current_email text; invitation public.household_invitations; joined_household public.households;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select email into current_email from auth.users where id = auth.uid();
  select * into invitation from public.household_invitations
  where id = requested_invitation_id and status = 'pending' and lower(email) = lower(current_email) for update;
  if invitation.id is null then raise exception 'invitation_not_found_or_email_mismatch'; end if;

  insert into public.household_members(household_id, user_id, role, is_active)
  values (invitation.household_id, auth.uid(), invitation.role, true)
  on conflict (household_id, user_id) do update
    set role = case when household_members.role = 'owner' then household_members.role else excluded.role end,
        is_active = true;
  update public.household_invitations set status = 'accepted' where id = invitation.id;
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (invitation.household_id, auth.uid(), 'invitation_accepted', 'household_invitation', invitation.id, jsonb_build_object('email', invitation.email, 'role', invitation.role));
  select * into joined_household from public.households where id = invitation.household_id;
  return joined_household;
end;
$$;

create or replace function public.decline_household_invitation(requested_invitation_id uuid)
returns public.household_invitations language plpgsql security definer set search_path = public as $$
declare current_email text; declined public.household_invitations;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select email into current_email from auth.users where id = auth.uid();
  update public.household_invitations invitation set status = 'revoked'
  where invitation.id = requested_invitation_id and invitation.status = 'pending' and lower(invitation.email) = lower(current_email)
  returning invitation.* into declined;
  if declined.id is null then raise exception 'invitation_not_found_or_email_mismatch'; end if;
  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (declined.household_id, auth.uid(), 'invitation_declined', 'household_invitation', declined.id, jsonb_build_object('email', declined.email, 'role', declined.role));
  return declined;
end;
$$;

revoke all on function public.get_household_invitation(uuid) from public;
revoke all on function public.accept_household_invitation(uuid) from public;
revoke all on function public.decline_household_invitation(uuid) from public;
grant execute on function public.get_household_invitation(uuid) to authenticated;
grant execute on function public.accept_household_invitation(uuid) to authenticated;
grant execute on function public.decline_household_invitation(uuid) to authenticated;
notify pgrst, 'reload schema';
