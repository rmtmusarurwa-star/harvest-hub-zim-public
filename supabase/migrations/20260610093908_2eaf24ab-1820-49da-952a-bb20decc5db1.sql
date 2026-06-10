
-- 1) Column-level access on profiles: hide phone from everyone except via helper function
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, role, avatar_url, created_at, updated_at, suspended, bio, location, phone_verified)
  ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) Self-only phone accessor
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

-- 3) Lock down trigger-only SECURITY DEFINER functions (called by triggers, not directly)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'trigger_recompute_trust_follows()',
    'trigger_recompute_trust_listings()',
    'trigger_recompute_trust_reviews()',
    'recompute_trust_score(uuid)',
    'handle_new_farmer_profile()',
    'handle_new_user()',
    'prevent_role_change()',
    'notify_announcement()',
    'notify_equipment_booking()',
    'notify_forum_reply()',
    'notify_new_review()',
    'notify_order_status()',
    'notify_order_insert()',
    'notify_offer_status()',
    'notify_transport_booking()',
    'notify_new_message()',
    'bump_conversation_timestamp()',
    'handle_offer_accepted()',
    'unhide_conversation_on_message()',
    'set_updated_at()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
