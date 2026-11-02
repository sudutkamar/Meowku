-- History detail and task-performance reporting.
-- Audit rows remain append-only. Task status is derived from immutable
-- occurrence rows so a missed task is never represented by a fabricated event.

alter table public.audit_events
  add column if not exists actor_name text;

create or replace function public.snapshot_audit_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_name is null and new.actor_id is not null then
    select nullif(trim(p.full_name), '')
    into new.actor_name
    from public.profiles p
    where p.id = new.actor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_events_actor_snapshot on public.audit_events;
create trigger audit_events_actor_snapshot
before insert on public.audit_events
for each row execute function public.snapshot_audit_actor();

create or replace function public.audit_care_snapshot(payload jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', payload->>'name',
    'title', payload->>'title',
    'brand', payload->>'brand',
    'product_name', payload->>'product_name',
    'record_type', payload->>'record_type',
    'vaccine_name', payload->>'vaccine_name',
    'category', payload->>'category',
    'status', payload->>'status',
    'is_active', payload->'is_active',
    'stock_quantity', payload->'stock_quantity',
    'stock_unit', payload->>'stock_unit'
  ));
$$;

create or replace function public.audit_care_display_name(table_name text, payload jsonb)
returns text
language sql
immutable
as $$
  select nullif(trim(case table_name
    when 'food_products' then concat_ws(' ', payload->>'brand', payload->>'product_name', nullif(payload->>'variant', ''))
    when 'cat_health_records' then coalesce(payload->>'title', payload->>'record_type')
    when 'cat_vaccinations' then payload->>'vaccine_name'
    when 'cat_expenses' then coalesce(payload->>'merchant', payload->>'category')
    when 'cat_attachments' then payload->>'file_name'
    when 'cat_scan_records' then payload->>'scan_type'
    else coalesce(payload->>'name', payload->>'title')
  end), '');
$$;

create or replace function public.audit_care_entity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  household_value uuid;
  entity_value uuid;
  action_value text;
  entity_type_value text;
  actor_value uuid := auth.uid();
  old_payload jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  new_payload jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  display_name_value text;
  metadata_value jsonb;
  changed_fields jsonb;
begin
  if actor_value is null then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    household_value := old.household_id;
    entity_value := old.id;
  else
    household_value := new.household_id;
    entity_value := new.id;
  end if;
  if household_value is null then return coalesce(new, old); end if;

  action_value := case lower(tg_op)
    when 'insert' then 'created'
    else lower(tg_op)
  end;
  if tg_op = 'UPDATE'
     and (new_payload->>'is_active') = 'false'
     and (old_payload->>'is_active') = 'true' then
    action_value := 'archived';
  end if;
  entity_type_value := case tg_table_name
    when 'cats' then 'cat'
    when 'litter_boxes' then 'litter_box'
    when 'catalog_items' then 'catalog_item'
    when 'cat_health_records' then 'cat_health_record'
    when 'cat_vaccinations' then 'cat_vaccination'
    when 'cat_food_profiles' then 'cat_food_profile'
    when 'cat_expenses' then 'cat_expense'
    when 'food_products' then 'food_product'
    when 'cat_attachments' then 'cat_attachment'
    when 'cat_scan_records' then 'cat_scan_record'
    else tg_table_name
  end;

  display_name_value := public.audit_care_display_name(
    tg_table_name,
    case when tg_op = 'DELETE' then old_payload else new_payload end
  );
  metadata_value := jsonb_build_object(
    'source_table', tg_table_name,
    'display_name', display_name_value
  );

  if tg_op = 'UPDATE' then
    changed_fields := jsonb_strip_nulls(jsonb_build_object(
      'name', case when new_payload->>'name' is distinct from old_payload->>'name' then jsonb_build_object('before', old_payload->>'name', 'after', new_payload->>'name') end,
      'title', case when new_payload->>'title' is distinct from old_payload->>'title' then jsonb_build_object('before', old_payload->>'title', 'after', new_payload->>'title') end,
      'category', case when new_payload->>'category' is distinct from old_payload->>'category' then jsonb_build_object('before', old_payload->>'category', 'after', new_payload->>'category') end,
      'status', case when new_payload->>'status' is distinct from old_payload->>'status' then jsonb_build_object('before', old_payload->>'status', 'after', new_payload->>'status') end,
      'is_active', case when new_payload->>'is_active' is distinct from old_payload->>'is_active' then jsonb_build_object('before', old_payload->'is_active', 'after', new_payload->'is_active') end,
      'stock_quantity', case when new_payload->>'stock_quantity' is distinct from old_payload->>'stock_quantity' then jsonb_build_object('before', old_payload->'stock_quantity', 'after', new_payload->'stock_quantity') end,
      'stock_unit', case when new_payload->>'stock_unit' is distinct from old_payload->>'stock_unit' then jsonb_build_object('before', old_payload->>'stock_unit', 'after', new_payload->>'stock_unit') end
    ));
    metadata_value := metadata_value || jsonb_build_object('changed_fields', changed_fields);
  elsif tg_op = 'INSERT' then
    metadata_value := metadata_value || jsonb_build_object('after', public.audit_care_snapshot(new_payload));
  else
    metadata_value := metadata_value || jsonb_build_object('before', public.audit_care_snapshot(old_payload));
  end if;

  insert into public.audit_events(household_id, actor_id, action, entity_type, entity_id, metadata)
  values (household_value, actor_value, action_value, entity_type_value, entity_value, metadata_value);
  return coalesce(new, old);
end;
$$;

-- Add context to newly completed occurrences while preserving the existing
-- server-side timestamp bounds and idempotent behavior.
create or replace function public.complete_occurrence(
  occurrence_id uuid,
  completed_at_value timestamptz default now(),
  note_value text default ''
) returns public.schedule_occurrences
language plpgsql
security definer
set search_path = public
as $$
declare
  occurrence public.schedule_occurrences;
  effective_completed_at timestamptz;
  schedule_title text;
  target_label text;
begin
  select o.* into occurrence
  from public.schedule_occurrences o
  where o.id = occurrence_id and public.is_household_member(o.household_id)
  for update;
  if occurrence.id is null then raise exception 'occurrence_not_found'; end if;
  if occurrence.completed_at is not null then return occurrence; end if;

  effective_completed_at := coalesce(completed_at_value, now());
  if effective_completed_at < now() - interval '24 hours'
     or effective_completed_at > now() + interval '5 minutes' then
    raise exception 'completed_at_out_of_range';
  end if;

  update public.schedule_occurrences
  set completed_at = effective_completed_at,
      completed_by = auth.uid(),
      note = left(coalesce(note_value, ''), 2000)
  where id = occurrence_id and completed_at is null
  returning * into occurrence;

  select s.title,
    case
      when occurrence.target_key = 'household' then 'Semua rumah'
      when occurrence.target_key like 'cat:%' then coalesce(c.name, 'Kucing')
      when occurrence.target_key like 'litter:%' then coalesce(l.name, 'Litter box')
      else occurrence.target_key
    end
  into schedule_title, target_label
  from public.schedules s
  left join public.cats c on c.id = case when occurrence.target_key ~ '^cat:[0-9a-fA-F-]{36}$' then substring(occurrence.target_key from 5)::uuid end
  left join public.litter_boxes l on l.id = case when occurrence.target_key ~ '^litter:[0-9a-fA-F-]{36}$' then substring(occurrence.target_key from 7)::uuid end
  where s.id = occurrence.schedule_id;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id, metadata)
  values (occurrence.household_id, auth.uid(), 'completed', 'schedule_occurrence', occurrence.id,
    jsonb_build_object(
      'schedule_id', occurrence.schedule_id,
      'schedule_title', schedule_title,
      'target_key', occurrence.target_key,
      'target_label', target_label,
      'local_date', occurrence.local_date,
      'scheduled_at', occurrence.scheduled_at,
      'completed_at', occurrence.completed_at,
      'note', occurrence.note
    ));
  return occurrence;
end;
$$;

grant execute on function public.complete_occurrence(uuid, timestamptz, text) to authenticated;

create or replace function public.household_task_performance(
  requested_household_id uuid,
  from_date date,
  to_date date,
  timezone_value text default 'Asia/Jakarta'
) returns table (
  occurrence_id uuid,
  schedule_id uuid,
  schedule_title text,
  category text,
  custom_category text,
  slot_label text,
  target_key text,
  target_label text,
  local_date date,
  scheduled_at timestamptz,
  assigned_key text,
  assigned_label text,
  assigned_user_id uuid,
  assignee_id uuid,
  completed_by uuid,
  completed_by_label text,
  completed_at timestamptz,
  archived_at timestamptz,
  note text,
  status text,
  delay_minutes integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.household_role(requested_household_id) not in ('owner', 'admin') then
    raise exception 'household_admin_required';
  end if;
  if from_date > to_date then
    raise exception 'invalid_report_range';
  end if;

  return query
  select
    o.id,
    o.schedule_id,
    s.title,
    s.category,
    s.custom_category,
    slot.label,
    o.target_key,
    case
      when o.target_key = 'household' then 'Semua rumah'
      when o.target_key like 'cat:%' then coalesce(c.name, 'Kucing')
      when o.target_key like 'litter:%' then coalesce(l.name, 'Litter box')
      else o.target_key
    end,
    o.local_date,
    o.scheduled_at,
    coalesce(o.assignee_id::text, o.assigned_to::text, 'unassigned'),
    coalesce(ha.display_name, assigned_profile.full_name, 'Belum ditugaskan'),
    o.assigned_to,
    o.assignee_id,
    o.completed_by,
    case when o.completed_by is null then null else coalesce(completed_profile.full_name, 'Akun dihapus') end,
    o.completed_at,
    o.archived_at,
    o.note,
    case
      when o.archived_at is not null then 'skipped'
      when o.completed_at is not null then 'completed'
      when o.local_date < (now() at time zone coalesce(nullif(trim(timezone_value), ''), 'Asia/Jakarta'))::date then 'missed'
      else 'pending'
    end,
    case
      when o.completed_at is not null and o.completed_at > o.scheduled_at
        then round(extract(epoch from (o.completed_at - o.scheduled_at)) / 60)::integer
      else 0
    end
  from public.schedule_occurrences o
  join public.schedules s on s.id = o.schedule_id and s.household_id = requested_household_id
  left join public.schedule_slots slot on slot.id = o.slot_id
  left join public.cats c on c.id = case when o.target_key ~ '^cat:[0-9a-fA-F-]{36}$' then substring(o.target_key from 5)::uuid end and c.household_id = requested_household_id
  left join public.litter_boxes l on l.id = case when o.target_key ~ '^litter:[0-9a-fA-F-]{36}$' then substring(o.target_key from 7)::uuid end and l.household_id = requested_household_id
  left join public.household_assignees ha on ha.id = o.assignee_id and ha.household_id = requested_household_id
  left join public.profiles assigned_profile on assigned_profile.id = o.assigned_to
  left join public.profiles completed_profile on completed_profile.id = o.completed_by
  where o.household_id = requested_household_id
    and o.local_date between from_date and to_date
  order by o.local_date desc, o.scheduled_at desc;
end;
$$;

grant execute on function public.household_task_performance(uuid, date, date, text) to authenticated;

create index if not exists schedule_occurrences_performance_idx
  on public.schedule_occurrences(household_id, local_date desc, assigned_to, assignee_id, completed_at);

notify pgrst, 'reload schema';
