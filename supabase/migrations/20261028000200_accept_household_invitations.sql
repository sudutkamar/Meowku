-- Join invited users to their household when Supabase Auth creates the account.
-- The invitation email is sent by the invite-household-member Edge Function;
-- this trigger keeps the membership and invitation status synchronized.

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

  insert into public.household_members(household_id, user_id, role)
  select invitation.household_id, new.id, invitation.role
  from public.household_invitations invitation
  where lower(invitation.email) = lower(new.email)
    and invitation.status = 'pending'
  on conflict (household_id, user_id) do update
    set role = excluded.role,
        is_active = true;

  update public.household_invitations
  set status = 'accepted'
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
