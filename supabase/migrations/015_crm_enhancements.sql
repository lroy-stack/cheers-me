-- ============================================================================
-- CRM & Customer Intelligence Enhancements
-- Module: M10
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customer search and filtering
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_language ON customers(language);
CREATE INDEX IF NOT EXISTS idx_customers_vip ON customers(vip) WHERE vip = true;
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday);
CREATE INDEX IF NOT EXISTS idx_customers_anniversary ON customers(anniversary);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit);

-- Review filtering and sentiment analysis
CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer_id ON customer_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_platform ON customer_reviews(platform);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_sentiment ON customer_reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created_at ON customer_reviews(created_at);

-- Loyalty rewards
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer_id ON loyalty_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_visit_milestone ON loyalty_rewards(visit_milestone);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_issued_at ON loyalty_rewards(reward_issued_at);

-- ============================================================================
-- ENHANCED CONSTRAINTS
-- ============================================================================

-- Ensure email format is valid (basic check)
ALTER TABLE customers
ADD CONSTRAINT customers_email_format
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure language is valid ISO code
ALTER TABLE customers
ADD CONSTRAINT customers_language_check
CHECK (language IS NULL OR language IN ('en', 'nl', 'es', 'de'));

-- Ensure visit_count is non-negative
ALTER TABLE customers
ADD CONSTRAINT customers_visit_count_check
CHECK (visit_count >= 0);

-- Ensure rating is between 0 and 5
ALTER TABLE customer_reviews
ADD CONSTRAINT customer_reviews_rating_check
CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on loyalty_rewards (was missing)
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- Customer Reviews: Managers and admins can read all reviews
CREATE POLICY "Managers can read all reviews"
ON customer_reviews FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

-- Managers and admins can insert reviews (manual input from platforms)
CREATE POLICY "Managers can insert reviews"
ON customer_reviews FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Managers and admins can update reviews (for response drafts)
CREATE POLICY "Managers can update reviews"
ON customer_reviews FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Loyalty Rewards: Managers and admins can read all rewards
CREATE POLICY "Managers can read loyalty rewards"
ON loyalty_rewards FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

-- Managers and admins can insert loyalty rewards
CREATE POLICY "Managers can insert loyalty rewards"
ON loyalty_rewards FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Customers: Managers can insert/update customers
CREATE POLICY "Managers can insert customers"
ON customers FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'waiter')
);

CREATE POLICY "Managers can update customers"
ON customers FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'waiter')
);

-- ============================================================================
-- FUNCTIONS & STORED PROCEDURES
-- ============================================================================

-- Function to record a customer visit (increments visit_count, updates last_visit)
CREATE OR REPLACE FUNCTION record_customer_visit(
  p_customer_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE customers
  SET
    visit_count = visit_count + 1,
    last_visit = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Check for loyalty milestones (5th, 10th, 20th, 50th visits)
  PERFORM check_loyalty_milestone(p_customer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and create loyalty rewards at milestones
CREATE OR REPLACE FUNCTION check_loyalty_milestone(
  p_customer_id UUID
)
RETURNS void AS $$
DECLARE
  v_visit_count INTEGER;
  v_milestone INTEGER;
  v_reward_text TEXT;
  v_already_awarded BOOLEAN;
BEGIN
  -- Get current visit count
  SELECT visit_count INTO v_visit_count
  FROM customers
  WHERE id = p_customer_id;

  -- Check if we hit a milestone (5, 10, 20, 50, 100)
  IF v_visit_count IN (5, 10, 20, 50, 100) THEN
    v_milestone := v_visit_count;

    -- Check if reward already issued for this milestone
    SELECT EXISTS(
      SELECT 1 FROM loyalty_rewards
      WHERE customer_id = p_customer_id
      AND visit_milestone = v_milestone
    ) INTO v_already_awarded;

    IF NOT v_already_awarded THEN
      -- Determine reward text based on milestone
      v_reward_text := CASE v_milestone
        WHEN 5 THEN 'Free drink on your 5th visit! Thank you for your loyalty.'
        WHEN 10 THEN 'Free dessert on your 10th visit! You''re a regular now!'
        WHEN 20 THEN 'Free appetizer on your 20th visit! We love having you here.'
        WHEN 50 THEN '20% off your next meal on your 50th visit! You''re part of the Cheers family!'
        WHEN 100 THEN 'Free dinner for two on your 100th visit! You''re a legend!'
        ELSE 'Loyalty reward'
      END;

      -- Create the reward
      INSERT INTO loyalty_rewards (
        customer_id,
        visit_milestone,
        reward_description,
        reward_issued_at
      ) VALUES (
        p_customer_id,
        v_milestone,
        v_reward_text,
        NOW()
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customers with upcoming birthdays (next N days)
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(
  days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  birthday DATE,
  days_until_birthday INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.birthday,
    -- Calculate days until birthday this year
    CASE
      WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE)
      THEN EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
      ELSE 365 + EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
    END AS days_until
  FROM customers c
  WHERE
    c.birthday IS NOT NULL
    AND (
      -- Birthday is within the next N days this year
      CASE
        WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE)
        THEN EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE 365 + EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
      END
    ) <= days_ahead
  ORDER BY days_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customers with upcoming anniversaries (next N days)
CREATE OR REPLACE FUNCTION get_upcoming_anniversaries(
  days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  anniversary DATE,
  days_until_anniversary INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.anniversary,
    -- Calculate days until anniversary this year
    CASE
      WHEN EXTRACT(DOY FROM c.anniversary) >= EXTRACT(DOY FROM CURRENT_DATE)
      THEN EXTRACT(DOY FROM c.anniversary)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
      ELSE 365 + EXTRACT(DOY FROM c.anniversary)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
    END AS days_until
  FROM customers c
  WHERE
    c.anniversary IS NOT NULL
    AND (
      -- Anniversary is within the next N days this year
      CASE
        WHEN EXTRACT(DOY FROM c.anniversary) >= EXTRACT(DOY FROM CURRENT_DATE)
        THEN EXTRACT(DOY FROM c.anniversary)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE 365 + EXTRACT(DOY FROM c.anniversary)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
      END
    ) <= days_ahead
  ORDER BY days_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer insights (for dashboard)
CREATE OR REPLACE FUNCTION get_customer_insights()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_customers', (SELECT COUNT(*) FROM customers),
    'vip_customers', (SELECT COUNT(*) FROM customers WHERE vip = true),
    'avg_visit_count', (SELECT ROUND(AVG(visit_count), 2) FROM customers),
    'customers_this_month', (
      SELECT COUNT(*) FROM customers
      WHERE last_visit >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    'total_reviews', (SELECT COUNT(*) FROM customer_reviews),
    'avg_rating', (
      SELECT ROUND(AVG(rating), 2) FROM customer_reviews WHERE rating IS NOT NULL
    ),
    'sentiment_breakdown', (
      SELECT json_build_object(
        'positive', COUNT(*) FILTER (WHERE sentiment = 'positive'),
        'neutral', COUNT(*) FILTER (WHERE sentiment = 'neutral'),
        'negative', COUNT(*) FILTER (WHERE sentiment = 'negative')
      )
      FROM customer_reviews
    ),
    'pending_review_responses', (
      SELECT COUNT(*) FROM customer_reviews
      WHERE response_sent IS NULL AND sentiment = 'negative'
    ),
    'upcoming_birthdays_7days', (
      SELECT COUNT(*) FROM get_upcoming_birthdays(7)
    ),
    'loyalty_rewards_issued_this_month', (
      SELECT COUNT(*) FROM loyalty_rewards
      WHERE reward_issued_at >= DATE_TRUNC('month', CURRENT_DATE)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate AI review response (placeholder for Claude API call)
-- This will be called from API route, but we define the workflow here
CREATE OR REPLACE FUNCTION generate_review_response_draft(
  p_review_id UUID,
  p_response_draft TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE customer_reviews
  SET
    response_draft = p_response_draft,
    updated_at = NOW()
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark review response as sent
CREATE OR REPLACE FUNCTION send_review_response(
  p_review_id UUID,
  p_response_text TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE customer_reviews
  SET
    response_sent = p_response_text,
    updated_at = NOW()
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get VIP customers (for special treatment tracking)
CREATE OR REPLACE FUNCTION get_vip_customers()
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  visit_count INTEGER,
  last_visit DATE,
  preferences TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.visit_count,
    c.last_visit,
    c.preferences,
    c.notes
  FROM customers c
  WHERE c.vip = true
  ORDER BY c.visit_count DESC, c.last_visit DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update customers.updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

-- Trigger to update customer_reviews.updated_at
CREATE OR REPLACE FUNCTION update_customer_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_reviews_updated_at
BEFORE UPDATE ON customer_reviews
FOR EACH ROW
EXECUTE FUNCTION update_customer_reviews_updated_at();

-- ============================================================================
-- SAMPLE DATA / REFERENCE
-- ============================================================================

-- Loyalty milestone reference (for documentation)
COMMENT ON COLUMN loyalty_rewards.visit_milestone IS
'Milestone visits: 5, 10, 20, 50, 100. Rewards auto-generated via check_loyalty_milestone function.';

COMMENT ON COLUMN customers.vip IS
'VIP flag for customers who receive special treatment. Can be set manually or auto-flagged at high visit counts.';

COMMENT ON TABLE customer_reviews IS
'Reviews manually imported from TripAdvisor, Google, Restaurant Guru. Sentiment can be AI-analyzed or manually tagged.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION record_customer_visit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_loyalty_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_birthdays(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_anniversaries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_review_response_draft(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_review_response(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vip_customers() TO authenticated;
