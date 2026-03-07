CREATE TABLE IF NOT EXISTS customer_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  allergen_code TEXT NOT NULL CHECK (allergen_code IN (
    'gluten','crustaceans','eggs','fish','peanuts','soybeans',
    'milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, allergen_code)
);
