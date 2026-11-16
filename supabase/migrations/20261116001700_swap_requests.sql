-- Tukar shift (swap) propose/accept
create table if not exists occurrence_swap_requests (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references schedule_occurrences(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'proposed' check (status in ('proposed','accepted','declined','cancelled')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table occurrence_swap_requests enable row level security;
create policy osr_read on occurrence_swap_requests for select using (
  requester_id = auth.uid() or target_user_id = auth.uid()
);
create policy osr_insert on occurrence_swap_requests for insert with check (
  requester_id = auth.uid()
);

create or replace function is_household_member_of_user(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from household_members where household_id = p_household_id and user_id = p_user_id and is_active = true);
$$;

create or replace function propose_occurrence_swap(p_occurrence_id uuid, p_target_user_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_occ public.schedule_occurrences; v_id uuid;
begin
  select * into v_occ from public.schedule_occurrences where id = p_occurrence_id;
  if v_occ.id is null then raise exception 'occurrence_not_found'; end if;
  if not is_household_member(v_occ.household_id) then raise exception 'household_access_denied'; end if;
  if not is_household_member_of_user(v_occ.household_id, p_target_user_id) then raise exception 'target_not_member'; end if;
  insert into occurrence_swap_requests (occurrence_id, requester_id, target_user_id, reason)
  values (p_occurrence_id, auth.uid(), p_target_user_id, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function respond_occurrence_swap(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_req occurrence_swap_requests;
begin
  select * into v_req from occurrence_swap_requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'request_not_found'; end if;
  if v_req.target_user_id <> auth.uid() then raise exception 'not_target_user'; end if;
  if v_req.status <> 'proposed' then raise exception 'request_not_pending'; end if;
  if p_accept then
    update occurrence_swap_requests set status = 'accepted', decided_at = now() where id = p_request_id;
    perform reassign_occurrence(v_req.occurrence_id, v_req.target_user_id);
  else
    update occurrence_swap_requests set status = 'declined', decided_at = now() where id = p_request_id;
  end if;
end;
$$;
grant execute on function propose_occurrence_swap(uuid,uuid,text) to authenticated;
grant execute on function respond_occurrence_swap(uuid,boolean) to authenticated;