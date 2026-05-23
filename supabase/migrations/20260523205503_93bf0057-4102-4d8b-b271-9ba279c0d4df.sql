CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  VALUES (v_recipient, v_kind, v_msg, '/chat?c=' || NEW.conversation_id);

  IF NEW.type = 'offer' AND NEW.offer_status IS NOT NULL AND NEW.offer_status IN ('accepted','declined') THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.sender_id, 'offer', 'Your offer was ' || NEW.offer_status, '/chat?c=' || NEW.conversation_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_offer_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'offer' AND NEW.offer_status IS DISTINCT FROM OLD.offer_status
     AND NEW.offer_status IN ('accepted','declined') THEN
    INSERT INTO public.notifications(user_id, type, message, link)
    VALUES (NEW.sender_id, 'offer', 'Your offer was ' || NEW.offer_status, '/chat?c=' || NEW.conversation_id);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.notifications SET link = '/chat' WHERE link = '/messages';