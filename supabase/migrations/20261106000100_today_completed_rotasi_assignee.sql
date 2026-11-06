-- Fix lanjutan: baris selesai hari ini (mis. Bersihin Tai 06:00 & Makan
-- 07:00) masih menampilkan snapshot lama "A iki" padahal rotasi hari ini
-- (mis. Ariel) sudah benar di slot berikutnya (Makan 13:00).
--
-- Akar: effective_assignee_for_occurrence mengembalikan frozen snapshot
-- untuk semua completed rows. "Petugas" adalah penanggung jawab operasional,
-- bukan "Selesai oleh" (yang sudah ditampilkan terpisah). Jadi untuk
-- local_date >= today (termasuk completed today), petugas harus selalu
-- resolve dari rotasi aktif hari ini. History masa lalu (< today) dan
-- archived tetap immutable.

create or replace function public.effective_assignee_for_occurrence(
  occurrence_id uuid,
  p_household_id uuid,
  local_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  frozen_assignee_id uuid,
  frozen_assigned_to uuid
) returns table (assignee_id uuid, assigned_to uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_today date;
  v_rotation public.household_schedule_rotations;
  v_day public.household_schedule_rotation_days;
  v_assignee public.household_assignees;
begin
  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
    into v_today
  from public.households h where h.id = p_household_id;

  -- History masa lalu & archived: immutable, pakai snapshot lama.
  if archived_at is not null or local_date < v_today then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  -- Hari ini + masa depan (termasuk yang sudah completed hari ini):
  -- petugas SELALU dari rotasi aktif untuk weekday local_date.
  select * into v_rotation
  from public.household_schedule_rotations r
  where r.household_id = p_household_id
    and r.is_active
    and r.start_date <= local_date and r.end_date >= local_date;

  if v_rotation.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select d.* into v_day
  from public.household_schedule_rotation_days d
  where d.rotation_id = v_rotation.id
    and d.weekday = extract(isodow from local_date)::smallint;

  if v_day.assignee_id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  select * into v_assignee
  from public.household_assignees
  where id = v_day.assignee_id and is_active;

  if v_assignee.id is null then
    return query select frozen_assignee_id, frozen_assigned_to;
    return;
  end if;

  return query select v_assignee.id, v_assignee.linked_user_id;
end;
$$;

create or replace function public.repair_future_occurrence_assignments_internal(
  requested_household_id uuid
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_repaired integer := 0;
  v_today date;
begin
  select (now() at time zone coalesce(nullif(h.timezone, ''), 'Asia/Jakarta'))::date
    into v_today
  from public.households h where h.id = requested_household_id;

  update public.schedule_occurrences o
  set assignee_id = eff.assignee_id,
      assigned_to = eff.assigned_to
  from (
    select o2.id as occurrence_id, eff2.assignee_id, eff2.assigned_to
    from public.schedule_occurrences o2
    cross join lateral public.effective_assignee_for_occurrence(
      o2.id, o2.household_id, o2.local_date, o2.completed_at, o2.archived_at,
      o2.assignee_id, o2.assigned_to
    ) eff2
    where o2.household_id = requested_household_id
      and o2.archived_at is null
      and o2.local_date >= v_today
      and (o2.assignee_id is distinct from eff2.assignee_id
           or o2.assigned_to is distinct from eff2.assigned_to)
  ) eff
  where o.id = eff.occurrence_id;

  get diagnostics v_repaired = row_count;
  return v_repaired;
end;
$$;

-- One-off repair (tanpa auth: jalan sebagai migrator).
do $$
declare
  h_id uuid;
begin
  for h_id in select h.id from public.households h loop
    perform public.repair_future_occurrence_assignments_internal(h_id);
  end loop;
end $$;

notify pgrst, 'reload schema';
