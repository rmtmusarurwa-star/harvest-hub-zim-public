-- enums
create type public.equipment_category as enum (
  'tractors','combine_harvesters','irrigation_systems','generators',
  'balers','planters','sprayers','tillage_equipment','other'
);

create type public.equipment_availability as enum ('available','unavailable','maintenance');

create type public.equipment_booking_status as enum (
  'pending','confirmed','active','completed','cancelled','rejected'
);

-- equipment
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  category public.equipment_category not null default 'other',
  location text not null default '',
  province text not null default '',
  description text not null default '',
  price_per_day numeric not null default 0,
  price_per_week numeric not null default 0,
  price_per_month numeric not null default 0,
  deposit numeric not null default 0,
  availability public.equipment_availability not null default 'available',
  rating numeric not null default 4.7,
  image_url text,
  phone text not null default '',
  whatsapp text not null default '',
  specs text not null default '',
  delivery_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

create policy "Equipment viewable by authenticated" on public.equipment
  for select to authenticated using (true);
create policy "Owners insert equipment" on public.equipment
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update equipment" on public.equipment
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete equipment" on public.equipment
  for delete to authenticated using (owner_id = auth.uid());

create trigger equipment_set_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

-- bookings
create table public.equipment_bookings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid,
  equipment_name text not null default '',
  renter_id uuid not null,
  owner_id uuid not null,
  start_date date not null,
  end_date date not null,
  total_cost numeric not null default 0,
  deposit numeric not null default 0,
  delivery boolean not null default false,
  delivery_address text not null default '',
  contact_phone text not null default '',
  notes text not null default '',
  status public.equipment_booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipment_bookings enable row level security;

create policy "Participants view equipment bookings" on public.equipment_bookings
  for select to authenticated using (renter_id = auth.uid() or owner_id = auth.uid());
create policy "Renters create equipment bookings" on public.equipment_bookings
  for insert to authenticated with check (renter_id = auth.uid());
create policy "Participants update equipment bookings" on public.equipment_bookings
  for update to authenticated using (renter_id = auth.uid() or owner_id = auth.uid())
  with check (renter_id = auth.uid() or owner_id = auth.uid());

create trigger equipment_bookings_set_updated_at
  before update on public.equipment_bookings
  for each row execute function public.set_updated_at();

create index equipment_owner_idx on public.equipment(owner_id);
create index equipment_category_idx on public.equipment(category);
create index equipment_bookings_renter_idx on public.equipment_bookings(renter_id);
create index equipment_bookings_owner_idx on public.equipment_bookings(owner_id);
create index equipment_bookings_equipment_idx on public.equipment_bookings(equipment_id);