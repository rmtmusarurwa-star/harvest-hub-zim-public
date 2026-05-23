
GRANT SELECT ON public.equipment TO authenticated;
GRANT SELECT ON public.vehicles TO authenticated;
GRANT SELECT ON public.shops TO authenticated;
GRANT SELECT ON public.transport_requests TO authenticated;

DROP FUNCTION IF EXISTS public.get_equipment_contact(uuid);
DROP FUNCTION IF EXISTS public.get_vehicle_contact(uuid);
DROP FUNCTION IF EXISTS public.get_shop_contact(uuid);
DROP FUNCTION IF EXISTS public.get_transport_request_contact(uuid);
