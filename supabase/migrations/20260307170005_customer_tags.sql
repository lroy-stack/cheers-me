CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (length(tag) > 0 AND length(tag) <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, tag)
);
