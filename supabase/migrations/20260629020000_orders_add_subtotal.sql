-- Add subtotal column to orders so we always know the product cost
-- separately from the total charged to the buyer (which includes platform fee).
--
-- subtotal     = price × qty  (what the listing was priced at)
-- total_amount = subtotal + platform_fee  (what buyer actually pays)
-- platform_fee = 2% charged ON TOP to the buyer
-- farmer receives 100% of subtotal

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);

-- Backfill: for existing orders total_amount == subtotal (fee was wrongly
-- deducted from farmer, not added to buyer). Mark them equal so the
-- payout logic can always reference subtotal safely.
UPDATE orders SET subtotal = total_amount WHERE subtotal IS NULL;
