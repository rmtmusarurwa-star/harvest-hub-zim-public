
-- farmer_details
create table public.farmer_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text not null default '',
  province text not null default '',
  speciality text not null default '',
  cover_url text,
  trust_score integer not null default 50,
  follower_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farmer_details enable row level security;

create policy "Farmer details viewable by authenticated"
  on public.farmer_details for select to authenticated using (true);

create policy "Farmers can insert own details"
  on public.farmer_details for insert to authenticated
  with check (user_id = auth.uid());

create policy "Farmers can update own details"
  on public.farmer_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger farmer_details_updated_at
  before update on public.farmer_details
  for each row execute function public.set_updated_at();

-- farmer_reviews
create table public.farmer_reviews (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (farmer_id, reviewer_id)
);

alter table public.farmer_reviews enable row level security;

create policy "Reviews viewable by authenticated"
  on public.farmer_reviews for select to authenticated using (true);

create policy "Users can post own reviews"
  on public.farmer_reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and reviewer_id <> farmer_id);

create policy "Users can update own reviews"
  on public.farmer_reviews for update to authenticated
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

create policy "Users can delete own reviews"
  on public.farmer_reviews for delete to authenticated
  using (reviewer_id = auth.uid());

create index farmer_reviews_farmer_idx on public.farmer_reviews(farmer_id, created_at desc);

-- farmer_follows
create table public.farmer_follows (
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (farmer_id, follower_id)
);

alter table public.farmer_follows enable row level security;

create policy "Follows viewable by authenticated"
  on public.farmer_follows for select to authenticated using (true);

create policy "Users can follow"
  on public.farmer_follows for insert to authenticated
  with check (follower_id = auth.uid() and follower_id <> farmer_id);

create policy "Users can unfollow"
  on public.farmer_follows for delete to authenticated
  using (follower_id = auth.uid());

-- Auto-create farmer_details for new Farmer profiles
create or replace function public.handle_new_farmer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'farmer' then
    insert into public.farmer_details (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_create_farmer_details
  after insert on public.profiles
  for each row execute function public.handle_new_farmer_profile();

-- Backfill existing farmers
insert into public.farmer_details (user_id)
  select id from public.profiles where role = 'farmer'
  on conflict (user_id) do nothing;

-- Trust score recompute
create or replace function public.recompute_trust_score(_farmer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  listings_count int;
  avg_rating numeric;
  reviews_count int;
  followers int;
  score int;
begin
  select count(*) into listings_count from public.listings where farmer_id = _farmer_id;
  select coalesce(avg(rating),0), count(*) into avg_rating, reviews_count
    from public.farmer_reviews where farmer_id = _farmer_id;
  select count(*) into followers from public.farmer_follows where farmer_id = _farmer_id;

  score := least(100, greatest(0,
    30
    + least(25, listings_count * 3)
    + (avg_rating * 6)::int
    + least(15, reviews_count * 2)
    + least(10, followers)
  ));

  update public.farmer_details set trust_score = score, follower_count = followers
    where user_id = _farmer_id;
end;
$$;

create or replace function public.trigger_recompute_trust_listings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_trust_score(coalesce(new.farmer_id, old.farmer_id));
  return null;
end;
$$;

create trigger listings_recompute_trust
  after insert or update or delete on public.listings
  for each row execute function public.trigger_recompute_trust_listings();

create or replace function public.trigger_recompute_trust_reviews()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_trust_score(coalesce(new.farmer_id, old.farmer_id));
  return null;
end;
$$;

create trigger reviews_recompute_trust
  after insert or update or delete on public.farmer_reviews
  for each row execute function public.trigger_recompute_trust_reviews();

create or replace function public.trigger_recompute_trust_follows()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_trust_score(coalesce(new.farmer_id, old.farmer_id));
  return null;
end;
$$;

create trigger follows_recompute_trust
  after insert or delete on public.farmer_follows
  for each row execute function public.trigger_recompute_trust_follows();
