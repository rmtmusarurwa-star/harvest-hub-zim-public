-- Payout preferences per user: where sellers / farmers want to receive money.
-- Funds initially land in the platform's ClicknPay merchant account;
-- this table records each user's preferred payout destination for
-- admin-initiated or automated disbursements.

CREATE TABLE IF NOT EXISTS payout_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecocash_number      text NOT NULL DEFAULT '',
  onemoney_number     text NOT NULL DEFAULT '',
  bank_name           text NOT NULL DEFAULT '',
  bank_account_number text NOT NULL DEFAULT '',
  bank_account_name   text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;

-- Each user can only see and manage their own row
CREATE POLICY "payout_settings_self"
  ON payout_settings
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_payout_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payout_settings_updated_at
  BEFORE UPDATE ON payout_settings
  FOR EACH ROW EXECUTE FUNCTION update_payout_settings_updated_at();
