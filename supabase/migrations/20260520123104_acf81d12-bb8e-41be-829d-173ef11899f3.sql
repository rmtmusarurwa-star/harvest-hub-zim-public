create type public.listing_category as enum ('produce','livestock','poultry','dairy','grain','other');
create type public.listing_status as enum ('active','sold','draft','archived');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category public.listing_category not null default 'other',
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  unit text not null default 'unit',
  location text not null default '',
  province text not null default '',
  image_url text,
  delivery_available boolean not null default false,
  rating numeric(3,2) not null default 4.7 check (rating >= 0 and rating <= 5),
  view_count integer not null default 0,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_category_idx on public.listings(category);
create index listings_status_idx on public.listings(status);
create index listings_farmer_idx on public.listings(farmer_id);

alter table public.listings enable row level security;

create policy "Anyone authenticated can view active listings"
on public.listings for select
to authenticated
using (status = 'active' or farmer_id = auth.uid());

create policy "Farmers can insert their own listings"
on public.listings for insert
to authenticated
with check (farmer_id = auth.uid());

create policy "Farmers can update their own listings"
on public.listings for update
to authenticated
using (farmer_id = auth.uid())
with check (farmer_id = auth.uid());

create policy "Farmers can delete their own listings"
on public.listings for delete
to authenticated
using (farmer_id = auth.uid());

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();