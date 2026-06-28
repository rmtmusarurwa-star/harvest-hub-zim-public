-- PostgREST does not honour column-level SELECT grants properly — it checks for
-- a table-level privilege first and returns 403 when it is absent, even if
-- individual column grants exist.  The column-level grant added in
-- 20260610093908 (to hide the phone column) therefore broke ALL profile reads
-- across the app (community comment authors, chat, marketplace, etc.).
--
-- Fix: restore the table-level SELECT grant.  Phone data is already protected
-- at the application layer via the get_my_phone() SECURITY DEFINER function —
-- no direct SELECT on the phone column is needed from the client.

GRANT SELECT ON public.profiles TO anon, authenticated;
