ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_token UUID DEFAULT gen_random_uuid() NOT NULL;
