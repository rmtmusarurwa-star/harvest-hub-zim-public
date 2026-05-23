-- Payment method + status enums
create type public.payment_method as enum ('ecocash','onemoney','zipit','cash_on_delivery','card');
create type public.payment_status as enum ('pending','awaiting_confirmation','paid','failed','cancelled');

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  buyer_id uuid not null,
  farmer_id uuid not null,
  listing_id uuid,
  listing_title text not null default '',
  quantity numeric not null default 1,
  unit text not null default 'unit',
  unit_price numeric not null default 0,
  total_amount numeric not null default 0,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  payment_reference text,
  proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders(buyer_id);
create index orders_farmer_idx on public.orders(farmer_id);

alter table public.orders enable row level security;

create policy "Buyers and farmers can view their orders"
  on public.orders for select to authenticated
  using (buyer_id = auth.uid() or farmer_id = auth.uid());

create policy "Buyers can create their orders"
  on public.orders for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "Participants can update orders"
  on public.orders for update to authenticated
  using (buyer_id = auth.uid() or farmer_id = auth.uid())
  with check (buyer_id = auth.uid() or farmer_id = auth.uid());

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Payment proofs storage bucket (private)
insert into storage.buckets (id, name, public)
values ('payment-proofs','payment-proofs', false)
on conflict (id) do nothing;

create policy "Users can view own payment proofs"
  on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload own payment proofs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own payment proofs"
  on storage.objects for update to authenticated
  using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
