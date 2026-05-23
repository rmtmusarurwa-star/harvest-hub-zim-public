ALTER TABLE public.forum_posts REPLICA IDENTITY FULL;
ALTER TABLE public.forum_comments REPLICA IDENTITY FULL;
ALTER TABLE public.forum_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;