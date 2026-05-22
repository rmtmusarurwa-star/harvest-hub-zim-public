
-- Enum for message type and offer status
create type public.message_type as enum ('text', 'offer');
create type public.offer_status as enum ('pending', 'accepted', 'declined');

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

alter table public.conversations enable row level security;

create policy "Participants can view conversations"
  on public.conversations for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

create policy "Buyers can create conversations"
  on public.conversations for insert to authenticated
  with check (auth.uid() = buyer_id and buyer_id <> farmer_id);

create policy "Participants can update conversations"
  on public.conversations for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

create index conversations_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index conversations_farmer_idx on public.conversations(farmer_id, last_message_at desc);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  type public.message_type not null default 'text',
  content text not null default '',
  offer_price numeric,
  offer_quantity numeric,
  offer_status public.offer_status,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
  ));

create policy "Participants can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
  );

create policy "Participants can update messages"
  on public.messages for update to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
  ));

create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- Bump conversation last_message_at on new message
create or replace function public.bump_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
after insert on public.messages
for each row execute function public.bump_conversation_timestamp();

-- When offer accepted, mark listing as sold
create or replace function public.handle_offer_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_listing uuid;
  v_farmer uuid;
begin
  if new.type = 'offer'
     and new.offer_status = 'accepted'
     and (old.offer_status is distinct from 'accepted') then
    select c.listing_id, c.farmer_id into v_listing, v_farmer
    from public.conversations c where c.id = new.conversation_id;

    -- Only farmer can accept
    if auth.uid() = v_farmer then
      update public.listings set status = 'sold' where id = v_listing;
    end if;
  end if;
  return new;
end;
$$;

create trigger messages_offer_accepted
after update on public.messages
for each row execute function public.handle_offer_accepted();

-- Realtime
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
