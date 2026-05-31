
-- Prevent duplicate conversations between same buyer/farmer/listing pair
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_with_listing
  ON public.conversations (buyer_id, farmer_id, listing_id)
  WHERE listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_no_listing
  ON public.conversations (buyer_id, farmer_id)
  WHERE listing_id IS NULL;

-- Auto-reset soft-delete flags for BOTH participants whenever a new message
-- is inserted, so a conversation never gets "stuck" hidden after deletion.
CREATE OR REPLACE FUNCTION public.unhide_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET deleted_for_buyer = false,
         deleted_for_farmer = false
   WHERE id = NEW.conversation_id
     AND (deleted_for_buyer = true OR deleted_for_farmer = true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unhide_conversation_on_message ON public.messages;
CREATE TRIGGER trg_unhide_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.unhide_conversation_on_message();

-- Likes on forum comments
CREATE TABLE IF NOT EXISTS public.forum_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.forum_comment_likes TO authenticated;
GRANT ALL ON public.forum_comment_likes TO service_role;

ALTER TABLE public.forum_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes viewable by authenticated"
  ON public.forum_comment_likes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users add own comment likes"
  ON public.forum_comment_likes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users remove own comment likes"
  ON public.forum_comment_likes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS forum_comment_likes_comment_idx
  ON public.forum_comment_likes (comment_id);
