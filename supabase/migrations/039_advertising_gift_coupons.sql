-- ============================================
-- 039: Advertising & Gift Coupons Module
-- Creates tables for advertisements (multilingual) and
-- gift coupon system with Stripe integration
-- ============================================

-- ============================================
-- HELPER: update_updated_at_column (if not exists)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE ad_template AS ENUM (
  'football_match',
  'special_menu',
  'happy_hour',
  'cocktail_presentation',
  'custom'
);

CREATE TYPE ad_placement AS ENUM (
  'banner_top',
  'between_categories',
  'fullscreen_overlay'
);

CREATE TYPE ad_status AS ENUM (
  'draft',
  'active',
  'paused',
  'expired',
  'archived'
);

CREATE TYPE coupon_status AS ENUM (
  'pending_payment',
  'active',
  'partially_used',
  'fully_used',
  'expired',
  'cancelled'
);

CREATE TYPE coupon_theme AS ENUM (
  'elegant',
  'tropical',
  'celebration',
  'seasonal'
);

CREATE TYPE coupon_validation_method AS ENUM (
  'qr_scan',
  'code_entry',
  'ai_assistant'
);

-- ============================================
-- ADVERTISEMENTS TABLE
-- ============================================

CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multilingual content
  title_en TEXT NOT NULL DEFAULT '',
  title_nl TEXT NOT NULL DEFAULT '',
  title_es TEXT NOT NULL DEFAULT '',
  title_de TEXT NOT NULL DEFAULT '',

  description_en TEXT NOT NULL DEFAULT '',
  description_nl TEXT NOT NULL DEFAULT '',
  description_es TEXT NOT NULL DEFAULT '',
  description_de TEXT NOT NULL DEFAULT '',

  cta_text_en TEXT NOT NULL DEFAULT '',
  cta_text_nl TEXT NOT NULL DEFAULT '',
  cta_text_es TEXT NOT NULL DEFAULT '',
  cta_text_de TEXT NOT NULL DEFAULT '',
  cta_url TEXT,

  -- Visuals
  image_url TEXT,
  image_mobile_url TEXT,
  background_color TEXT DEFAULT '#1a1a2e',
  text_color TEXT DEFAULT '#ffffff',

  -- Template & Placement
  template ad_template NOT NULL DEFAULT 'custom',
  placement ad_placement NOT NULL DEFAULT 'banner_top',
  display_pages TEXT[] NOT NULL DEFAULT '{digital_menu}',

  -- Scheduling
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',

  -- Status & Priority
  status ad_status NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 0,

  -- Analytics
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,

  -- Meta
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Public can read active ads
CREATE POLICY "Public can read active ads"
ON advertisements FOR SELECT
USING (status = 'active');

-- Staff can read all ads
CREATE POLICY "Staff can read all ads"
ON advertisements FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'owner'));

-- Admin/manager can create ads
CREATE POLICY "Staff can create ads"
ON advertisements FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager', 'owner'));

-- Admin/manager can update ads
CREATE POLICY "Staff can update ads"
ON advertisements FOR UPDATE
USING (get_user_role() IN ('admin', 'manager', 'owner'));

-- Admin/manager can delete ads
CREATE POLICY "Staff can delete ads"
ON advertisements FOR DELETE
USING (get_user_role() IN ('admin', 'manager', 'owner'));

-- Index for active ads queries
CREATE INDEX idx_advertisements_status ON advertisements(status);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

-- ============================================
-- HELPER: Generate Coupon Code
-- ============================================

CREATE OR REPLACE FUNCTION generate_coupon_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 0, 1
  result TEXT := 'GC-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GIFT COUPONS TABLE
-- ============================================

CREATE TABLE gift_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique code
  code VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_coupon_code(),

  -- Value
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  remaining_cents INTEGER NOT NULL CHECK (remaining_cents >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Visual theme
  theme coupon_theme NOT NULL DEFAULT 'elegant',

  -- Purchaser (GDPR minimal)
  purchaser_name TEXT NOT NULL,
  purchaser_email TEXT NOT NULL,

  -- Recipient (optional)
  recipient_name TEXT,
  personal_message TEXT,

  -- Status
  status coupon_status NOT NULL DEFAULT 'pending_payment',

  -- Stripe
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- GDPR
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent_at TIMESTAMPTZ,
  data_deletion_requested_at TIMESTAMPTZ,

  -- Dates
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 year'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE gift_coupons ENABLE ROW LEVEL SECURITY;

-- Public can read by code (limited fields via API, not RLS)
CREATE POLICY "Public can read coupons by code"
ON gift_coupons FOR SELECT
USING (true);

-- Staff can manage coupons
CREATE POLICY "Staff can manage coupons"
ON gift_coupons FOR ALL
USING (get_user_role() IN ('admin', 'manager', 'owner', 'waiter', 'bar'));

-- Allow inserts for unauthenticated (public purchase)
CREATE POLICY "Public can create coupons"
ON gift_coupons FOR INSERT
WITH CHECK (true);

-- Allow updates for webhook (service role handles this, but just in case)
CREATE POLICY "Public can update pending coupons"
ON gift_coupons FOR UPDATE
USING (status = 'pending_payment');

-- Indexes
CREATE INDEX idx_gift_coupons_code ON gift_coupons(code);
CREATE INDEX idx_gift_coupons_status ON gift_coupons(status);
CREATE INDEX idx_gift_coupons_email ON gift_coupons(purchaser_email);

-- ============================================
-- GIFT COUPON REDEMPTIONS TABLE
-- ============================================

CREATE TABLE gift_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES gift_coupons(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  validated_by UUID REFERENCES auth.users(id),
  validation_method coupon_validation_method NOT NULL DEFAULT 'code_entry',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE gift_coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Staff can read/create redemptions
CREATE POLICY "Staff can manage redemptions"
ON gift_coupon_redemptions FOR ALL
USING (get_user_role() IN ('admin', 'manager', 'owner', 'waiter', 'bar'));

-- Index
CREATE INDEX idx_coupon_redemptions_coupon ON gift_coupon_redemptions(coupon_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ad-images', 'ad-images', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}'),
  ('coupon-pdfs', 'coupon-pdfs', true, 10485760, '{application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ad-images
CREATE POLICY "Public can read ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

CREATE POLICY "Staff can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-images'
  AND (SELECT get_user_role()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Staff can delete ad images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad-images'
  AND (SELECT get_user_role()) IN ('admin', 'manager', 'owner')
);

-- Storage policies for coupon-pdfs
CREATE POLICY "Public can read coupon PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'coupon-pdfs');

CREATE POLICY "Service can upload coupon PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'coupon-pdfs');

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_coupons_updated_at
  BEFORE UPDATE ON gift_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
