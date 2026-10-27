create type public.household_role as enum ('owner','admin','member');

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  timezone text not null default 'Asia/Jakarta',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members m where m.household_id = target_household and m.user_id = auth.uid() and m.is_active);
$$;

create or replace function public.household_role(target_household uuid)
returns public.household_role language sql stable security definer set search_path = public as $$
  select m.role from public.household_members m where m.household_id = target_household and m.user_id = auth.uid() and m.is_active limit 1;
$$;

drop policy if exists households_select_member on public.households;
create policy households_select_member on public.households for select using (public.is_household_member(id));
drop policy if exists households_insert_authenticated on public.households;
create policy households_insert_authenticated on public.households for insert with check (created_by = auth.uid());
drop policy if exists households_update_admin on public.households;
create policy households_update_admin on public.households for update using (public.household_role(id) in ('owner','admin')) with check (public.household_role(id) in ('owner','admin'));
drop policy if exists members_select_member on public.household_members;
create policy members_select_member on public.household_members for select using (public.is_household_member(household_id));
drop policy if exists members_insert_admin on public.household_members;
create policy members_insert_admin on public.household_members for insert with check (public.household_role(household_id) in ('owner','admin'));
drop policy if exists members_update_admin on public.household_members;
create policy members_update_admin on public.household_members for update using (public.household_role(household_id) in ('owner','admin')) with check (public.household_role(household_id) in ('owner','admin'));

create or replace function public.create_household(household_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare created public.households;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.households(name, created_by) values (trim(household_name), auth.uid()) returning * into created;
  insert into public.household_members(household_id, user_id, role) values (created.id, auth.uid(), 'owner');
  return created;
end;
$$;

grant execute on function public.create_household(text) to authenticated;
