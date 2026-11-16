-- Self-service profile updates must be limited to display fields.
-- Role and identity columns are never editable by the row owner; role changes
-- only happen through trusted security definer RPCs (e.g. transfer ownership).

revoke update on table public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- A user updating their own row may never change their role. Trusted
  -- security definer functions run as postgres and are unaffected.
  if auth.uid() is not distinct from new.id and auth.uid() = old.id then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();
