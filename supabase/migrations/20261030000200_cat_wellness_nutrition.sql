-- Structured wellness and nutrition fields. These are records and calculations
-- inputs only; the application must not present them as a diagnosis.

alter table public.cats add column if not exists sex text not null default 'unknown';
alter table public.cats add column if not exists sterilized boolean not null default false;
alter table public.cats add column if not exists birth_date date;
alter table public.cats add column if not exists body_condition_score smallint;
alter table public.cats add column if not exists microchip_number text;
alter table public.cats add column if not exists allergies text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cats_sex_valid') then
    alter table public.cats add constraint cats_sex_valid check (sex in ('female', 'male', 'unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cats_bcs_valid') then
    alter table public.cats add constraint cats_bcs_valid check (body_condition_score is null or body_condition_score between 1 and 9);
  end if;
end $$;

alter table public.food_products add column if not exists kcal_per_100g numeric(8,2);
alter table public.food_products add column if not exists moisture_percent numeric(5,2);
alter table public.food_products add column if not exists protein_percent numeric(5,2);
alter table public.food_products add column if not exists fat_percent numeric(5,2);
alter table public.food_products add column if not exists fiber_percent numeric(5,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'food_products_nutrition_percent_valid') then
    alter table public.food_products add constraint food_products_nutrition_percent_valid check (
      coalesce(moisture_percent, 0) between 0 and 100 and
      coalesce(protein_percent, 0) between 0 and 100 and
      coalesce(fat_percent, 0) between 0 and 100 and
      coalesce(fiber_percent, 0) between 0 and 100
    );
  end if;
end $$;

alter table public.cat_food_profiles add column if not exists daily_kcal_target numeric(8,2);
alter table public.cat_food_profiles add column if not exists treat_percent numeric(5,2);
alter table public.cat_food_profiles add column if not exists water_ml_target numeric(8,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cat_food_profiles_nutrition_targets_valid') then
    alter table public.cat_food_profiles add constraint cat_food_profiles_nutrition_targets_valid check (
      (daily_kcal_target is null or daily_kcal_target > 0) and
      (treat_percent is null or treat_percent between 0 and 100) and
      (water_ml_target is null or water_ml_target > 0)
    );
  end if;
end $$;

alter table public.cat_health_records add column if not exists dose_amount numeric(8,2);
alter table public.cat_health_records add column if not exists dose_unit text;
alter table public.cat_health_records add column if not exists frequency text;
alter table public.cat_health_records add column if not exists started_at date;
alter table public.cat_health_records add column if not exists ended_at date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cat_health_medication_dates_valid') then
    alter table public.cat_health_records add constraint cat_health_medication_dates_valid check (ended_at is null or started_at is null or ended_at >= started_at);
  end if;
end $$;
