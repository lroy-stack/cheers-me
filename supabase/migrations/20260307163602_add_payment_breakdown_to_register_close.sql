-- Add payment method breakdown columns to cash_register_closes
-- Tracks cash, card (TPV), and Bizum amounts separately plus opening cash float
ALTER TABLE cash_register_closes
  ADD COLUMN IF NOT EXISTS opening_cash    DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bizum_amount    DECIMAL(10,2) NOT NULL DEFAULT 0;
