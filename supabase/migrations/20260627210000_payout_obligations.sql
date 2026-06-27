-- payout_obligations: one row per order for every confirmed ClicknPay payment.
-- Funds land in the platform's ClicknPay merchant account; this table tracks
-- what the platform owes each seller so the admin can disburse accurately.

CREATE TABLE IF NOT EXISTS payout_obligations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id         uuid NOT NULL REFERENCES auth.users(id),
  payment_reference text NOT NULL,           -- ClicknPay primaryCode / order_code
  gross_amount      numeric(12,2) NOT NULL,  -- full order total
  platform_fee      numeric(12,2) NOT NULL,  -- platform commission (2 %)
  net_amount        numeric(12,2) NOT NULL,  -- what seller receives
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'disbursed', 'failed')),
  disbursed_at      timestamptz,
  disbursed_by      uuid REFERENCES auth.users(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)  -- one obligation per order, no duplicates on re-polls
);

ALTER TABLE payout_obligations ENABLE ROW LEVEL SECURITY;

-- Sellers can read their own obligations
CREATE POLICY "payout_obligations_seller_read"
  ON payout_obligations FOR SELECT
  USING (auth.uid() = seller_id);

-- Admin (identified by email in application layer, verified via service role)
-- uses service role key for writes; admin reads done via matching email policy
CREATE POLICY "payout_obligations_admin_all"
  ON payout_obligations FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'rmtmusarurwa@icloud.com'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'rmtmusarurwa@icloud.com'
  );

-- Index for fast lookups by seller and payment_reference
CREATE INDEX idx_payout_obligations_seller  ON payout_obligations (seller_id);
CREATE INDEX idx_payout_obligations_ref     ON payout_obligations (payment_reference);
CREATE INDEX idx_payout_obligations_status  ON payout_obligations (status);
