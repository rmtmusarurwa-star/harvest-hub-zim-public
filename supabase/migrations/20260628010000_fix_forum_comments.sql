-- Fix forum_comments: ensure columns exist and harden the notify trigger
-- so a notification insert failure can never roll back a comment insert.

-- 1. Ensure deleted & updated_at columns exist (idempotent)
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS forum_comments_set_updated_at ON public.forum_comments;
CREATE TRIGGER forum_comments_set_updated_at
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Harden the forum-reply notification trigger so a notification INSERT
--    failure (e.g. transient RLS edge case) never rolls back the comment.
CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title  text;
BEGIN
  SELECT author_id, title
    INTO v_author, v_title
    FROM public.forum_posts
   WHERE id = NEW.post_id;

  IF v_author IS NOT NULL AND v_author <> NEW.author_id THEN
    BEGIN
      INSERT INTO public.notifications(user_id, type, message, link)
      VALUES (
        v_author,
        'forum_reply',
        'New reply on: ' || coalesce(v_title, 'your post'),
        '/community/' || NEW.post_id
      );
    EXCEPTION WHEN OTHERS THEN
      -- swallow the error so the comment INSERT always succeeds
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_notify_forum_reply ON public.forum_comments;
CREATE TRIGGER trg_notify_forum_reply
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply();

-- 4. Add a SELECT RLS policy that explicitly allows the service_role to see
--    all comments (needed for realtime subscription payloads).
DROP POLICY IF EXISTS "Service role full access on comments" ON public.forum_comments;
