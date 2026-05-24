
-- Conversation soft delete (per side)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deleted_for_buyer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for_farmer boolean NOT NULL DEFAULT false;

-- Extend message_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'image' AND enumtypid = 'public.message_type'::regtype) THEN
    ALTER TYPE public.message_type ADD VALUE 'image';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'voice' AND enumtypid = 'public.message_type'::regtype) THEN
    ALTER TYPE public.message_type ADD VALUE 'voice';
  END IF;
END$$;

-- Media columns on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_duration_seconds numeric;

-- Storage bucket for chat media (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: path convention = <conversation_id>/<user_id>/<filename>
CREATE POLICY "Chat media: participants can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
  )
);

CREATE POLICY "Chat media: participants can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.buyer_id = auth.uid() OR c.farmer_id = auth.uid())
  )
);

CREATE POLICY "Chat media: uploaders can delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
