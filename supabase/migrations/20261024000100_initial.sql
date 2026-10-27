create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff')),
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, age_months integer not null default 0 check (age_months >= 0), breed text, weight_kg numeric(5,2), notes text, photo_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.litter_boxes (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, location text, status text not null default 'clean' check (status in ('clean','needs_cleaning','maintenance')),
  last_cleaned_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, category text not null check (category in ('feeding','litter','medicine','other')),
  scheduled_at timestamptz not null, repeat_rule text, target_cat_ids uuid[] not null default '{}', litter_box_id uuid references public.litter_boxes(id) on delete set null,
  completed_at timestamptz, completed_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null, action text not null, metadata jsonb not null default '{}', created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

alter table public.profiles enable row level security; alter table public.cats enable row level security; alter table public.litter_boxes enable row level security; alter table public.schedules enable row level security; alter table public.activities enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id=auth.uid() or public.is_admin());
drop policy if exists "own cats" on public.cats;
create policy "own cats" on public.cats for all using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
drop policy if exists "own litter boxes" on public.litter_boxes;
create policy "own litter boxes" on public.litter_boxes for all using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
drop policy if exists "own schedules" on public.schedules;
create policy "own schedules" on public.schedules for all using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
drop policy if exists "own activities" on public.activities;
create policy "own activities" on public.activities for all using (owner_id=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or public.is_admin());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id, full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
