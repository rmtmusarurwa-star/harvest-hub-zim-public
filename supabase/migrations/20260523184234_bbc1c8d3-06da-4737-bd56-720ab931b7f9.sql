
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant the ones authenticated users legitimately call
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transport_request_contact(uuid) TO authenticated;
