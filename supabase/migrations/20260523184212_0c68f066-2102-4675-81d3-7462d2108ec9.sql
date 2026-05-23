
-- 1) Restrict notifications INSERT to trigger functions (SECURITY DEFINER as postgres bypasses RLS)
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) Storage: allow owners to delete their own payment proofs
CREATE POLICY "Users can delete own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) Lock down SECURITY DEFINER helper functions: revoke from anon, keep authenticated where needed
REVOKE EXECUTE ON FUNCTION public.recompute_trust_score(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_trust_listings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_trust_reviews() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_trust_follows() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_announcement() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_offer_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_review() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_transport_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_equipment_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_forum_reply() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_offer_accepted() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_farmer_profile() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 4) Restrict contact-bearing tables: hide phone/whatsapp/email columns from non-owners via column-level privileges
-- equipment: only owner can read phone/whatsapp directly. Other authenticated users can read remaining columns.
REVOKE SELECT ON public.equipment FROM authenticated;
GRANT SELECT (id, owner_id, name, category, location, province, description, specs, price_per_day, price_per_week, price_per_month, deposit, image_url, rating, availability, delivery_available, created_at, updated_at)
  ON public.equipment TO authenticated;
-- Allow owners to see their own phone/whatsapp via a secure function
CREATE OR REPLACE FUNCTION public.get_equipment_contact(_equipment_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.phone, e.whatsapp
  FROM public.equipment e
  WHERE e.id = _equipment_id
    AND (
      e.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.equipment_bookings b
        WHERE b.equipment_id = _equipment_id
          AND b.renter_id = auth.uid()
          AND b.status IN ('pending','confirmed')
      )
    )
$$;
REVOKE EXECUTE ON FUNCTION public.get_equipment_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_equipment_contact(uuid) TO authenticated;

-- vehicles
REVOKE SELECT ON public.vehicles FROM authenticated;
GRANT SELECT (id, owner_id, type, name, capacity_kg, location, province, price_per_trip, price_per_km, description, image_url, rating, availability, created_at, updated_at)
  ON public.vehicles TO authenticated;
CREATE OR REPLACE FUNCTION public.get_vehicle_contact(_vehicle_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.phone, v.whatsapp
  FROM public.vehicles v
  WHERE v.id = _vehicle_id
    AND (
      v.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.transport_bookings tb
        WHERE tb.vehicle_id = _vehicle_id
          AND tb.buyer_id = auth.uid()
      )
    )
$$;
REVOKE EXECUTE ON FUNCTION public.get_vehicle_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_vehicle_contact(uuid) TO authenticated;

-- shops
REVOKE SELECT ON public.shops FROM authenticated;
GRANT SELECT (id, owner_id, name, category, location, province, description, rating, logo_url, banner_url, verified, created_at, updated_at)
  ON public.shops TO authenticated;
CREATE OR REPLACE FUNCTION public.get_shop_contact(_shop_id uuid)
RETURNS TABLE(phone text, whatsapp text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.phone, s.whatsapp, s.email
  FROM public.shops s
  WHERE s.id = _shop_id AND auth.uid() IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.get_shop_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_shop_contact(uuid) TO authenticated;

-- transport_requests: hide contact_phone from non-posters
DROP POLICY IF EXISTS "Requests viewable by authenticated" ON public.transport_requests;
REVOKE SELECT ON public.transport_requests FROM authenticated;
GRANT SELECT (id, poster_id, pickup, destination, cargo, estimated_weight_kg, budget, scheduled_date, status, created_at, updated_at)
  ON public.transport_requests TO authenticated;
GRANT SELECT (contact_phone) ON public.transport_requests TO authenticated;
CREATE POLICY "Requests viewable by authenticated"
ON public.transport_requests FOR SELECT TO authenticated USING (true);
-- Re-restrict contact_phone via column revoke and provide RPC
REVOKE SELECT (contact_phone) ON public.transport_requests FROM authenticated;
CREATE OR REPLACE FUNCTION public.get_transport_request_contact(_request_id uuid)
RETURNS TABLE(contact_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.contact_phone
  FROM public.transport_requests r
  WHERE r.id = _request_id
    AND (
      r.poster_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.transport_request_responses rr
        WHERE rr.request_id = _request_id AND rr.responder_id = auth.uid()
      )
    )
$$;
REVOKE EXECUTE ON FUNCTION public.get_transport_request_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_transport_request_contact(uuid) TO authenticated;

-- transport_request_responses: only the request poster and the responder see contact_phone and details
DROP POLICY IF EXISTS "Responses viewable by authenticated" ON public.transport_request_responses;
CREATE POLICY "Responses viewable by participants"
ON public.transport_request_responses FOR SELECT TO authenticated
USING (
  responder_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.transport_requests r
    WHERE r.id = transport_request_responses.request_id AND r.poster_id = auth.uid()
  )
);
