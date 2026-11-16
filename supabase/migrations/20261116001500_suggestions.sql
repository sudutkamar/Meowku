-- Panel Saran data-driven (rules engine)
create or replace function household_suggestions(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_row record;
begin
  if not is_household_member(p_household_id) then
    raise exception 'household_access_denied';
  end if;

  -- kucing tanpa record berat > 30 hari
  for v_row in
    select c.id, c.name
    from cats c
    where c.household_id = p_household_id and c.is_active = true
      and not exists (
        select 1 from cat_health_records h
        where h.cat_id = c.id and h.record_type = 'weight'
          and h.created_at >= now() - interval '30 days'
      )
  loop
    v_result := v_result || jsonb_build_object(
      'rule_id','cat_no_weight_30d','severity','medium',
      'message', v_row.name || ' belum ditimbang 30 hari',
      'action_url','/app/kucing/' || v_row.id
    );
  end loop;

  -- vaksin jatuh tempo <= 14 hari
  for v_row in
    select v.cat_id, v.vaccine_name, v.next_due_at, c.name as cat_name
    from cat_vaccinations v join cats c on c.id = v.cat_id
    where v.household_id = p_household_id and v.next_due_at is not null
      and v.next_due_at <= current_date + 14
  loop
    v_result := v_result || jsonb_build_object(
      'rule_id','vaccine_due_soon','severity','high',
      'message', v_row.vaccine_name || ' untuk ' || v_row.cat_name || ' jatuh tempo ' || v_row.next_due_at,
      'action_url','/app/kucing/' || v_row.cat_id
    );
  end loop;

  -- stok di bawah threshold
  for v_row in
    select id, name from catalog_items
    where household_id = p_household_id and is_active = true
      and low_stock_threshold is not null
      and stock_quantity <= low_stock_threshold
  loop
    v_result := v_result || jsonb_build_object(
      'rule_id','stock_low','severity','medium',
      'message', v_row.name || ' stok rendah',
      'action_url','/app/katalog'
    );
  end loop;

  -- food profile aktif tanpa target kcal
  for v_row in
    select fp.cat_id, c.name
    from cat_food_profiles fp join cats c on c.id = fp.cat_id
    where fp.household_id = p_household_id and fp.is_active = true
      and (fp.daily_kcal_target is null or fp.daily_kcal_target <= 0)
  loop
    v_result := v_result || jsonb_build_object(
      'rule_id','food_no_kcal_target','severity','low',
      'message', v_row.name || ' belum punya target kalori harian',
      'action_url','/app/kucing/' || v_row.cat_id
    );
  end loop;

  return v_result;
end;
$$;
grant execute on function household_suggestions(uuid) to authenticated;