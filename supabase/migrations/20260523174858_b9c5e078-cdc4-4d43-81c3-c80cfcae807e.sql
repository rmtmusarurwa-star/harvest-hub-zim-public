
CREATE TYPE public.notification_type AS ENUM (
  'message','offer','order','order_status','review','transport','equipment','forum_reply','announcement'
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.notification_type NOT NULL,
  message text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '/',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: new message in conversation -> notify the other participant
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_buyer uuid; v_farmer uuid; v_recipient uuid;
  v_kind public.notification_type;
  v_msg text;
BEGIN
  SELECT buyer_id, farmer_id INTO v_buyer, v_farmer FROM public.conversations WHERE id = NEW.conversation_id;
  v_recipient := CASE WHEN NEW.sender_id = v_buyer THEN v_farmer ELSE v_buyer END;
  IF v_recipient IS NULL THEN RETURN NEW; END IF;

  IF NEW.type = 'offer' THEN
    v_kind := 'offer';
    v_msg := 'You received a new offer';
  ELSE
    v_kind := 'message';
    v_msg := 'New message in Harvest Chat';
  END IF;

  INSERT INTO public.notifications(user_id, type, message, link)
  VALUES (v_recipient, v_kind, v_msg, '/messages');

  -- offer status change notifications: notify the buyer (offer sender) when farmer accepts/declines
  IF NEW.type = 'offer' AND NEW.offer_status IS NOT NULL AND NEW.offer_status IN ('accepted','declined') THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.sender_id, 'offer', 'Your offer was ' || NEW.offer_status, '/messages');
  END IF;

  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_new_message AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Trigger: offer status update via UPDATE
CREATE OR REPLACE FUNCTION public.notify_offer_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.type = 'offer' AND NEW.offer_status IS DISTINCT FROM OLD.offer_status
     AND NEW.offer_status IN ('accepted','declined') THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.sender_id, 'offer', 'Your offer was ' || NEW.offer_status, '/messages');
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_offer_status AFTER UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_status();

-- Orders: notify farmer on new order, notify buyer on status update
CREATE OR REPLACE FUNCTION public.notify_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, message, link)
  VALUES (NEW.farmer_id, 'order', 'New order placed: ' || NEW.listing_title, '/financial-hub');
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_order_insert AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_insert();

CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.buyer_id, 'order_status', 'Order ' || NEW.order_code || ' status: ' || NEW.payment_status, '/financial-hub');
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- Reviews
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, message, link)
  VALUES (NEW.farmer_id, 'review', 'You received a new ' || NEW.rating || '-star review', '/farmers/' || NEW.farmer_id);
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_new_review AFTER INSERT ON public.farmer_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();

-- Transport bookings
CREATE OR REPLACE FUNCTION public.notify_transport_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.owner_id, 'transport', 'New transport booking request', '/transport');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.buyer_id, 'transport', 'Your transport booking is confirmed', '/transport');
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_transport_booking_ins AFTER INSERT ON public.transport_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_transport_booking();
CREATE TRIGGER trg_notify_transport_booking_upd AFTER UPDATE ON public.transport_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_transport_booking();

-- Equipment bookings
CREATE OR REPLACE FUNCTION public.notify_equipment_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.owner_id, 'equipment', 'New equipment booking: ' || NEW.equipment_name, '/equipment');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.renter_id, 'equipment', 'Your equipment booking is confirmed', '/equipment');
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_equipment_booking_ins AFTER INSERT ON public.equipment_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_equipment_booking();
CREATE TRIGGER trg_notify_equipment_booking_upd AFTER UPDATE ON public.equipment_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_equipment_booking();

-- Forum reply
CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_author uuid; v_title text;
BEGIN
  SELECT author_id, title INTO v_author, v_title FROM public.forum_posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.author_id THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (v_author, 'forum_reply', 'New reply on: ' || v_title, '/community/' || NEW.post_id);
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_forum_reply AFTER INSERT ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply();

-- Platform announcement -> notify all users
CREATE OR REPLACE FUNCTION public.notify_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.active THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    SELECT p.id, 'announcement', NEW.title, '/' FROM public.profiles p;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_announcement AFTER INSERT ON public.platform_announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_announcement();
