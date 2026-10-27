-- Cat health, food, attachments, and expense foundation.
-- All records are household-scoped and contain no seed data.

create table if not exists public.cat_attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  attachment_type text not null check (attachment_type in ('health', 'vaccination', 'food', 'expense', 'scan')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cat_health_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  record_type text not null check (record_type in ('checkup', 'symptom', 'medication', 'weight', 'note')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text,
  weight_kg numeric(6,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 200)),
  recorded_at timestamptz not null,
  attachment_id uuid references public.cat_attachments(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_vaccinations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  vaccine_name text not null check (char_length(trim(vaccine_name)) between 1 and 160),
  dose_number smallint not null default 1 check (dose_number > 0 and dose_number <= 20),
  administered_at date not null,
  next_due_at date,
  clinic_name text,
  notes text,
  attachment_id uuid references public.cat_attachments(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_due_at is null or next_due_at >= administered_at)
);

create table if not exists public.food_products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  brand text not null check (char_length(trim(brand)) between 1 and 120),
  product_name text not null check (char_length(trim(product_name)) between 1 and 180),
  variant text,
  barcode text,
  food_type text not null default 'other' check (food_type in ('dry', 'wet', 'treat', 'supplement', 'other')),
  life_stage text check (life_stage is null or life_stage in ('kitten', 'adult', 'senior', 'all_life_stages')),
  ingredients text,
  guaranteed_analysis jsonb not null default '{}'::jsonb,
  calories text,
  source text not null default 'manual' check (source in ('manual', 'barcode', 'ocr')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists food_products_household_barcode_idx
  on public.food_products(household_id, barcode) where barcode is not null;

create table if not exists public.cat_food_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  food_product_id uuid not null references public.food_products(id) on delete restrict,
  serving_amount numeric(8,2) check (serving_amount is null or serving_amount > 0),
  serving_unit text check (serving_unit is null or serving_unit in ('gram', 'ml', 'piece', 'sachet', 'can')),
  feeding_frequency text,
  started_at date not null default current_date,
  ended_at date,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.cat_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete set null,
  category text not null check (category in ('food', 'medicine', 'veterinary', 'vaccination', 'grooming', 'litter', 'other')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  merchant text,
  spent_at date not null,
  notes text,
  attachment_id uuid references public.cat_attachments(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_scan_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete set null,
  attachment_id uuid not null references public.cat_attachments(id) on delete cascade,
  scan_type text not null check (scan_type in ('food_label', 'receipt', 'payment_proof')),
  barcode text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected', 'failed')),
  extracted_data jsonb not null default '{}'::jsonb,
  error_message text,
  confirmed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cat_health_records_cat_date_idx on public.cat_health_records(household_id, cat_id, recorded_at desc);
create index if not exists cat_vaccinations_due_idx on public.cat_vaccinations(household_id, next_due_at);
create index if not exists cat_food_profiles_cat_idx on public.cat_food_profiles(household_id, cat_id, started_at desc);
create index if not exists cat_expenses_date_idx on public.cat_expenses(household_id, spent_at desc);
create index if not exists cat_scan_records_status_idx on public.cat_scan_records(household_id, status, created_at desc);

create or replace function public.set_cat_records_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cat_health_records_updated_at on public.cat_health_records;
create trigger cat_health_records_updated_at before update on public.cat_health_records for each row execute function public.set_cat_records_updated_at();
drop trigger if exists cat_vaccinations_updated_at on public.cat_vaccinations;
create trigger cat_vaccinations_updated_at before update on public.cat_vaccinations for each row execute function public.set_cat_records_updated_at();
drop trigger if exists food_products_updated_at on public.food_products;
create trigger food_products_updated_at before update on public.food_products for each row execute function public.set_cat_records_updated_at();
drop trigger if exists cat_expenses_updated_at on public.cat_expenses;
create trigger cat_expenses_updated_at before update on public.cat_expenses for each row execute function public.set_cat_records_updated_at();

alter table public.cat_attachments enable row level security;
alter table public.cat_health_records enable row level security;
alter table public.cat_vaccinations enable row level security;
alter table public.food_products enable row level security;
alter table public.cat_food_profiles enable row level security;
alter table public.cat_expenses enable row level security;
alter table public.cat_scan_records enable row level security;

create policy cat_attachments_member on public.cat_attachments for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and uploaded_by = auth.uid());

create policy cat_health_records_member on public.cat_health_records for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy cat_vaccinations_member on public.cat_vaccinations for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy food_products_member on public.food_products for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy cat_food_profiles_member on public.cat_food_profiles for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy cat_expenses_member on public.cat_expenses for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy cat_scan_records_member on public.cat_scan_records for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

insert into storage.buckets (id, name, public)
values ('cat-attachments', 'cat-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists cat_attachments_storage_select on storage.objects;
create policy cat_attachments_storage_select on storage.objects for select
  using (bucket_id = 'cat-attachments' and public.is_household_member((storage.foldername(name))[1]::uuid));

drop policy if exists cat_attachments_storage_insert on storage.objects;
create policy cat_attachments_storage_insert on storage.objects for insert
  with check (bucket_id = 'cat-attachments' and public.is_household_member((storage.foldername(name))[1]::uuid));

drop policy if exists cat_attachments_storage_delete on storage.objects;
create policy cat_attachments_storage_delete on storage.objects for delete
  using (bucket_id = 'cat-attachments' and public.is_household_member((storage.foldername(name))[1]::uuid));
