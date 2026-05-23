-- Shops & Suppliers schema
create type public.shop_category as enum (
  'agro_vets',
  'feed_suppliers',
  'fertilizer_chemicals',
  'irrigation_equipment',
  'farming_tools',
  'vaccines_medicine',
  'butcheries'
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  category public.shop_category not null default 'agro_vets',
  location text not null default '',
  province text not null default '',
  description text not null default '',
  verified boolean not null default false,
  rating numeric not null default 4.6,
  logo_url text,
  banner_url text,
  whatsapp text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;

create policy "Shops viewable by authenticated"
  on public.shops for select to authenticated using (true);
create policy "Owners can insert shops"
  on public.shops for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners can update shops"
  on public.shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners can delete shops"
  on public.shops for delete to authenticated using (owner_id = auth.uid());

create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  unit text not null default 'unit',
  stock_quantity integer not null default 0,
  description text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_products enable row level security;

create policy "Shop products viewable by authenticated"
  on public.shop_products for select to authenticated using (true);
create policy "Shop owners insert products"
  on public.shop_products for insert to authenticated
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Shop owners update products"
  on public.shop_products for update to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Shop owners delete products"
  on public.shop_products for delete to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

create trigger shop_products_set_updated_at
  before update on public.shop_products
  for each row execute function public.set_updated_at();

create index shop_products_shop_idx on public.shop_products(shop_id);
