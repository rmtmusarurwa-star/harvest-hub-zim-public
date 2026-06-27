-- Order fulfillment flow + review traceability
-- ─────────────────────────────────────────────

-- 1. Fulfillment status enum
DO $$ BEGIN
  CREATE TYPE public.fulfillment_status AS ENUM (
    'pending',      -- order placed, farmer hasn't acted
    'confirmed',    -- farmer accepted the order
    'dispatched',   -- goods handed to transport / in transit
    'delivered',    -- buyer received the goods
    'cancelled'     -- cancelled by farmer or buyer
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Add fulfillment columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status public.fulfillment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_notes text;

-- 3. Index for status-based filtering
CREATE INDEX IF NOT EXISTS orders_fulfillment_idx
  ON public.orders (fulfillment_status);

-- 4. Link farmer_reviews to orders (optional — lets reviews be tied to a specific order)
ALTER TABLE public.farmer_reviews
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS farmer_reviews_order_idx
  ON public.farmer_reviews (order_id);

-- 5. Realtime subscription for orders (so fulfillment updates push to the UI)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN null; END $$;
