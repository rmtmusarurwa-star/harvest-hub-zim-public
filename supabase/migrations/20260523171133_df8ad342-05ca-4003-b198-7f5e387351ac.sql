create type public.vehicle_type as enum ('truck','tractor','pickup','refrigerated','van','lorry');
create type public.vehicle_availability as enum ('available','busy','offline');
create type public.booking_status as enum ('pending','confirmed','in_transit','completed','cancelled');
create type public.request_status as enum ('open','matched','closed');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  type public.vehicle_type not null default 'truck',
  name text not null default '',
  capacity_kg numeric not null default 1000,
  location text not null default '',
  province text not null default '',
  price_per_km numeric not null default 0,
  price_per_trip numeric not null default 0,
  availability public.vehicle_availability not null default 'available',
  description text not null default '',
  rating numeric not null default 4.7,
  phone text not null default '',
  whatsapp text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vehicles enable row level security;
create policy "Vehicles viewable by authenticated" on public.vehicles for select to authenticated using (true);
create policy "Owners insert vehicles" on public.vehicles for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update vehicles" on public.vehicles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete vehicles" on public.vehicles for delete to authenticated using (owner_id = auth.uid());
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();

create table public.transport_bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  buyer_id uuid not null,
  owner_id uuid not null,
  pickup text not null default '',
  destination text not null default '',
  scheduled_date date,
  cargo text not null default '',
  estimated_weight_kg numeric not null default 0,
  contact_phone text not null default '',
  status public.booking_status not null default 'pending',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transport_bookings enable row level security;
create policy "Participants view bookings" on public.transport_bookings for select to authenticated
  using (buyer_id = auth.uid() or owner_id = auth.uid());
create policy "Buyers create bookings" on public.transport_bookings for insert to authenticated
  with check (buyer_id = auth.uid());
create policy "Participants update bookings" on public.transport_bookings for update to authenticated
  using (buyer_id = auth.uid() or owner_id = auth.uid())
  with check (buyer_id = auth.uid() or owner_id = auth.uid());
create trigger transport_bookings_set_updated_at before update on public.transport_bookings for each row execute function public.set_updated_at();

create table public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null,
  pickup text not null default '',
  destination text not null default '',
  cargo text not null default '',
  estimated_weight_kg numeric not null default 0,
  scheduled_date date,
  budget numeric not null default 0,
  contact_phone text not null default '',
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transport_requests enable row level security;
create policy "Requests viewable by authenticated" on public.transport_requests for select to authenticated using (true);
create policy "Users post own requests" on public.transport_requests for insert to authenticated with check (poster_id = auth.uid());
create policy "Posters update own requests" on public.transport_requests for update to authenticated using (poster_id = auth.uid()) with check (poster_id = auth.uid());
create policy "Posters delete own requests" on public.transport_requests for delete to authenticated using (poster_id = auth.uid());
create trigger transport_requests_set_updated_at before update on public.transport_requests for each row execute function public.set_updated_at();

create table public.transport_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.transport_requests(id) on delete cascade,
  responder_id uuid not null,
  message text not null default '',
  quoted_price numeric not null default 0,
  contact_phone text not null default '',
  created_at timestamptz not null default now()
);
alter table public.transport_request_responses enable row level security;
create policy "Responses viewable by authenticated" on public.transport_request_responses for select to authenticated using (true);
create policy "Transporters can respond" on public.transport_request_responses for insert to authenticated with check (responder_id = auth.uid());
create policy "Responders manage own responses" on public.transport_request_responses for delete to authenticated using (responder_id = auth.uid());
create index transport_request_responses_req_idx on public.transport_request_responses(request_id);
