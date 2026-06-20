-- Agentic AI layer: shared conversation model for the web "Ask Harvest AI"
-- launcher and the WhatsApp agent (see whatsapp-agent-spec.md). One schema,
-- two transports — channel distinguishes them.

create type agent_channel as enum ('web', 'whatsapp');

-- WhatsApp identity is phone-number-keyed since WhatsApp users won't
-- necessarily have a Harvest Hub account. Web-channel conversations use
-- linked_profile_id directly and leave phone_number null.
create table if not exists whatsapp_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  linked_profile_id uuid references profiles(id) on delete set null,
  display_name text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists agent_conversations (
  id uuid primary key default gen_random_uuid(),
  channel agent_channel not null,
  whatsapp_user_id uuid references whatsapp_users(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint agent_conversations_identity_check check (
    (channel = 'whatsapp' and whatsapp_user_id is not null) or
    (channel = 'web' and profile_id is not null)
  )
);

create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references agent_conversations(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  type text not null default 'text' check (type in ('text', 'image', 'voice', 'interactive', 'tool_result')),
  content text,
  media_url text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_conversation_id_idx on agent_messages (conversation_id, created_at);
create index if not exists agent_conversations_profile_id_idx on agent_conversations (profile_id);
create index if not exists agent_conversations_whatsapp_user_id_idx on agent_conversations (whatsapp_user_id);

alter table whatsapp_users enable row level security;
alter table agent_conversations enable row level security;
alter table agent_messages enable row level security;

-- All reads/writes go through the agent-chat Edge Function using the
-- service role key, so client-side policy stays minimal: a signed-in user
-- can only ever see their own web-channel conversation history.
create policy "users read own web conversations"
  on agent_conversations for select
  using (channel = 'web' and profile_id = auth.uid());

create policy "users read own web messages"
  on agent_messages for select
  using (
    conversation_id in (
      select id from agent_conversations
      where channel = 'web' and profile_id = auth.uid()
    )
  );
