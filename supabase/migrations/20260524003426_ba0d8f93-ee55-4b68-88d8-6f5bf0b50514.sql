-- Soft delete column for forum comments
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Keep updated_at fresh on edit
DROP TRIGGER IF EXISTS forum_comments_set_updated_at ON public.forum_comments;
CREATE TRIGGER forum_comments_set_updated_at
BEFORE UPDATE ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime for community tables (ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.forum_comments REPLICA IDENTITY FULL;
ALTER TABLE public.forum_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.forum_posts REPLICA IDENTITY FULL;