
-- Enums
DO $$ BEGIN
  CREATE TYPE public.forum_category AS ENUM (
    'general','livestock','crops','market','equipment','weather','success','help'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.forum_reaction_type AS ENUM ('like','helpful','insightful');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  category public.forum_category NOT NULL DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by authenticated"
  ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own posts"
  ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors update own posts"
  ON public.forum_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete own posts"
  ON public.forum_posts FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TRIGGER trg_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON public.forum_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts (category);

-- Comments
CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.forum_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own comments"
  ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors update own comments"
  ON public.forum_comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete own comments"
  ON public.forum_comments FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments (post_id, created_at);

-- Reactions
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type public.forum_reaction_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, type)
);
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by authenticated"
  ON public.forum_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own reactions"
  ON public.forum_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own reactions"
  ON public.forum_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_forum_reactions_post ON public.forum_reactions (post_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-images', 'forum-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Forum images public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'forum-images');

CREATE POLICY "Auth users upload forum images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own forum images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);
