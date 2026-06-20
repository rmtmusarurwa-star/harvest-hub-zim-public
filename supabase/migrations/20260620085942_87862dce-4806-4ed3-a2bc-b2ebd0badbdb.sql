-- Enums
DO $$ BEGIN
  CREATE TYPE public.agent_kind AS ENUM ('sales','buyers','disease','market','transport');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_event_type AS ENUM ('action','recommendation','match','price_update','alert','status');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent public.agent_kind NOT NULL,
  event_type public.agent_event_type NOT NULL DEFAULT 'action',
  title text NOT NULL,
  detail text,
  link text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user_created
  ON public.agent_activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user_agent
  ON public.agent_activity_log (user_id, agent, created_at DESC);

-- Grants
GRANT SELECT, INSERT, DELETE ON public.agent_activity_log TO authenticated;
GRANT ALL ON public.agent_activity_log TO service_role;

-- RLS
ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own agent activity" ON public.agent_activity_log;
CREATE POLICY "users see own agent activity" ON public.agent_activity_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own agent activity" ON public.agent_activity_log;
CREATE POLICY "users insert own agent activity" ON public.agent_activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own agent activity" ON public.agent_activity_log;
CREATE POLICY "users delete own agent activity" ON public.agent_activity_log
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity_log;
EXCEPTION WHEN duplicate_object THEN null; END $$;