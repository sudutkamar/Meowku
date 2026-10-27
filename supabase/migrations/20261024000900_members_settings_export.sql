create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.household_role not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists household_invitations_household_idx on public.household_invitations(household_id, created_at desc);
alter table public.households alter column timezone set default 'Asia/Jakarta';
alter table public.household_invitations enable row level security;

drop policy if exists members_insert_admin on public.household_members;
create policy members_insert_admin on public.household_members for insert
  with check (public.household_role(household_id) in ('owner', 'admin') and role in ('admin', 'member'));
drop policy if exists members_update_admin on public.household_members;
create policy members_update_admin on public.household_members for update
  using (public.household_role(household_id) in ('owner', 'admin') and role <> 'owner')
  with check (public.household_role(household_id) in ('owner', 'admin') and role in ('admin', 'member'));

drop policy if exists invitations_admin_select on public.household_invitations;
create policy invitations_admin_select on public.household_invitations for select
  using (public.is_household_member(household_id) and public.household_role(household_id) in ('owner', 'admin'));
drop policy if exists invitations_admin_insert on public.household_invitations;
create policy invitations_admin_insert on public.household_invitations for insert
  with check (public.is_household_member(household_id) and public.household_role(household_id) in ('owner', 'admin') and invited_by = auth.uid() and role in ('admin', 'member'));
drop policy if exists invitations_admin_update on public.household_invitations;
create policy invitations_admin_update on public.household_invitations for update
  using (public.is_household_member(household_id) and public.household_role(household_id) in ('owner', 'admin'))
  with check (public.is_household_member(household_id) and public.household_role(household_id) in ('owner', 'admin'));

create or replace function public.export_household()
returns jsonb language plpgsql security definer set search_path = public as $$
declare target uuid; payload jsonb;
begin
  select household_id into target from public.household_members
    where user_id = auth.uid() and is_active order by joined_at limit 1;
  if target is null then raise exception 'household_access_denied'; end if;
  select jsonb_build_object(
    'household', (select to_jsonb(h) from public.households h where h.id = target),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from public.household_members m where m.household_id = target), '[]'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c)) from public.cats c where c.household_id = target), '[]'::jsonb),
    'litter_boxes', coalesce((select jsonb_agg(to_jsonb(l)) from public.litter_boxes l where l.household_id = target), '[]'::jsonb),
    'catalog_items', coalesce((select jsonb_agg(to_jsonb(i)) from public.catalog_items i where i.household_id = target), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s)) from public.schedules s where s.household_id = target), '[]'::jsonb),
    'occurrences', coalesce((select jsonb_agg(to_jsonb(o)) from public.schedule_occurrences o where o.household_id = target), '[]'::jsonb),
    'audit_events', coalesce((select jsonb_agg(to_jsonb(a)) from public.audit_events a where a.household_id = target), '[]'::jsonb)
  ) into payload;
  return payload;
end;
$$;
grant execute on function public.export_household() to authenticated;
