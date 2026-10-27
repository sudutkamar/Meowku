create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  due_reminders boolean not null default true,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, household_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_id uuid references public.schedule_occurrences(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  action_url text not null default '/jadwal',
  read_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('due_reminder', 'system')),
  constraint notifications_due_key unique (user_id, occurrence_id, type)
);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists notification_preferences_member on public.notification_preferences;
create policy notification_preferences_member on public.notification_preferences
  for all using (user_id = auth.uid() and public.is_household_member(household_id))
  with check (user_id = auth.uid() and public.is_household_member(household_id));

drop policy if exists push_subscriptions_member on public.push_subscriptions;
create policy push_subscriptions_member on public.push_subscriptions
  for all using (user_id = auth.uid() and public.is_household_member(household_id))
  with check (user_id = auth.uid() and public.is_household_member(household_id));

drop policy if exists notifications_recipient_select on public.notifications;
create policy notifications_recipient_select on public.notifications
  for select using (user_id = auth.uid() and public.is_household_member(household_id));

drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications
  for update using (user_id = auth.uid() and public.is_household_member(household_id))
  with check (user_id = auth.uid() and public.is_household_member(household_id));

create or replace function public.mark_notification_read(notification_id_value uuid)
returns public.notifications
language plpgsql security definer set search_path = public as $$
declare result public.notifications;
begin
  update public.notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = notification_id_value
    and n.user_id = auth.uid()
    and public.is_household_member(n.household_id)
  returning n.* into result;
  if result.id is null then raise exception 'notification_not_found'; end if;
  return result;
end;
$$;

create or replace function public.hide_notifications()
returns integer
language plpgsql security definer set search_path = public as $$
declare hidden_count integer;
begin
  update public.notifications n
  set hidden_at = coalesce(n.hidden_at, now())
  where n.user_id = auth.uid()
    and n.hidden_at is null
    and public.is_household_member(n.household_id);
  get diagnostics hidden_count = row_count;
  return hidden_count;
end;
$$;

create or replace function public.notification_unread_count()
returns bigint
language sql security definer set search_path = public as $$
  select count(*)
  from public.notifications n
  where n.user_id = auth.uid()
    and n.read_at is null
    and n.hidden_at is null
    and public.is_household_member(n.household_id);
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.hide_notifications() to authenticated;
grant execute on function public.notification_unread_count() to authenticated;
