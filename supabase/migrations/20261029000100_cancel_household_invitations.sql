-- Keep invitation history immutable while allowing an owner/admin to revoke
-- a pending invitation and preventing duplicate pending invites per household.

with ranked_pending as (
  select
    id,
    row_number() over (
      partition by household_id, lower(email)
      order by created_at desc, id desc
    ) as row_number
  from public.household_invitations
  where status = 'pending'
)
update public.household_invitations invitation
set status = 'revoked'
from ranked_pending duplicate
where invitation.id = duplicate.id
  and duplicate.row_number > 1;

create unique index if not exists household_invitations_one_pending_email_idx
  on public.household_invitations (household_id, lower(email))
  where status = 'pending';

create or replace function public.cancel_household_invitation(requested_invitation_id uuid)
returns public.household_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  cancelled public.household_invitations;
begin
  update public.household_invitations invitation
  set status = 'revoked'
  where invitation.id = requested_invitation_id
    and invitation.status = 'pending'
    and public.household_role(invitation.household_id) in ('owner', 'admin')
  returning invitation.* into cancelled;

  if cancelled.id is null then
    raise exception 'invitation_not_found_or_not_pending';
  end if;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    cancelled.household_id,
    auth.uid(),
    'invitation_revoked',
    'household_invitation',
    cancelled.id,
    jsonb_build_object('email', cancelled.email, 'role', cancelled.role)
  );

  return cancelled;
end;
$$;

revoke all on function public.cancel_household_invitation(uuid) from public;
grant execute on function public.cancel_household_invitation(uuid) to authenticated;
