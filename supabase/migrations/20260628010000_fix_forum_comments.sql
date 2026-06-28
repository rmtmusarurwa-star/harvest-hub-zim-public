-- Fix forum_comments: add missing table-level grants, ensure columns exist,
-- and harden the notify trigger so it never rolls back a comment INSERT.

-- 1. CRITICAL: explicit table-level grants that were missing.
--    forum_comment_likes and agent_activity_log both have these; forum_comments
--    did not, which is why INSERT was silently rejected at the privilege check
--    before RLS policies even ran.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_comments TO authenticated;
GRANT ALL                            ON public.forum_comments TO service_role;

-- Also fix forum_posts and forum_reactions for the same reason
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts    TO authenticated;
GRANT ALL                            ON public.forum_posts    TO service_role;
GRANT SELECT, INSERT, DELETE         ON public.forum_reactions TO authenticated;
GRANT ALL                            ON public.forum_reactions TO service_role;

-- 2. Ensure deleted & updated_at columns exist (idempotent)
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS deleted    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS forum_comments_set_updated_at ON public.forum_comments;
CREATE TRIGGER forum_comments_set_updated_at
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Harden the forum-reply notification trigger so a notification INSERT
--    failure never rolls back the comment.
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
      NULL; -- swallow so the comment INSERT always succeeds
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
