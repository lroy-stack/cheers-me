-- ============================================================================
-- Loyalty Program Redemption Enhancement
-- Module: M10 - CRM & Customer Intelligence
-- Version: 1.0.0
-- Description: Add redemption tracking to loyalty rewards
-- ============================================================================

-- ============================================================================
-- ALTER TABLE: Add redemption fields
-- ============================================================================

-- Add fields to track when and by whom a reward was redeemed
ALTER TABLE loyalty_rewards
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS redeemed_notes TEXT;

-- Add index for filtering by redemption status
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_redeemed_at ON loyalty_rewards(redeemed_at);

-- Add check constraint to ensure redeemed_at and redeemed_by are both set or both null
ALTER TABLE loyalty_rewards
ADD CONSTRAINT loyalty_rewards_redemption_consistency
CHECK (
  (redeemed_at IS NULL AND redeemed_by IS NULL) OR
  (redeemed_at IS NOT NULL AND redeemed_by IS NOT NULL)
);

-- ============================================================================
-- FUNCTIONS: Redemption management
-- ============================================================================

-- Function to redeem a loyalty reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_reward_id UUID,
  p_redeemed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_reward RECORD;
  v_customer RECORD;
BEGIN
  -- Check if reward exists and is not already redeemed
  SELECT * INTO v_reward
  FROM loyalty_rewards
  WHERE id = p_reward_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reward not found'
    );
  END IF;

  IF v_reward.redeemed_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reward already redeemed',
      'redeemed_at', v_reward.redeemed_at
    );
  END IF;

  -- Mark reward as redeemed
  UPDATE loyalty_rewards
  SET
    redeemed_at = NOW(),
    redeemed_by = p_redeemed_by,
    redeemed_notes = p_notes
  WHERE id = p_reward_id;

  -- Get updated reward with customer info
  SELECT
    lr.*,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone
  INTO v_reward
  FROM loyalty_rewards lr
  JOIN customers c ON c.id = lr.customer_id
  WHERE lr.id = p_reward_id;

  RETURN json_build_object(
    'success', true,
    'reward', row_to_json(v_reward)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unredeemed rewards for a customer
CREATE OR REPLACE FUNCTION get_customer_unredeemed_rewards(
  p_customer_id UUID
)
RETURNS TABLE (
  reward_id UUID,
  visit_milestone INTEGER,
  reward_description TEXT,
  reward_issued_at TIMESTAMPTZ,
  days_since_issued INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    visit_milestone,
    reward_description,
    reward_issued_at,
    EXTRACT(DAYS FROM (NOW() - reward_issued_at))::INTEGER
  FROM loyalty_rewards
  WHERE
    customer_id = p_customer_id
    AND redeemed_at IS NULL
  ORDER BY reward_issued_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get loyalty program statistics
CREATE OR REPLACE FUNCTION get_loyalty_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_rewards_issued', (SELECT COUNT(*) FROM loyalty_rewards),
    'total_rewards_redeemed', (SELECT COUNT(*) FROM loyalty_rewards WHERE redeemed_at IS NOT NULL),
    'total_rewards_pending', (SELECT COUNT(*) FROM loyalty_rewards WHERE redeemed_at IS NULL),
    'redemption_rate', (
      CASE
        WHEN (SELECT COUNT(*) FROM loyalty_rewards) > 0
        THEN ROUND(
          (SELECT COUNT(*)::NUMERIC FROM loyalty_rewards WHERE redeemed_at IS NOT NULL) /
          (SELECT COUNT(*)::NUMERIC FROM loyalty_rewards) * 100,
          2
        )
        ELSE 0
      END
    ),
    'rewards_by_milestone', (
      SELECT json_object_agg(
        visit_milestone::TEXT,
        json_build_object(
          'total', total,
          'redeemed', redeemed,
          'pending', pending
        )
      )
      FROM (
        SELECT
          visit_milestone,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE redeemed_at IS NOT NULL) as redeemed,
          COUNT(*) FILTER (WHERE redeemed_at IS NULL) as pending
        FROM loyalty_rewards
        GROUP BY visit_milestone
        ORDER BY visit_milestone
      ) milestone_stats
    ),
    'avg_redemption_days', (
      SELECT ROUND(AVG(EXTRACT(DAYS FROM (redeemed_at - reward_issued_at)))::NUMERIC, 1)
      FROM loyalty_rewards
      WHERE redeemed_at IS NOT NULL
    ),
    'rewards_issued_this_month', (
      SELECT COUNT(*) FROM loyalty_rewards
      WHERE reward_issued_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    'rewards_redeemed_this_month', (
      SELECT COUNT(*) FROM loyalty_rewards
      WHERE redeemed_at >= DATE_TRUNC('month', CURRENT_DATE)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top loyalty customers
CREATE OR REPLACE FUNCTION get_top_loyalty_customers(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  visit_count INTEGER,
  total_rewards INTEGER,
  redeemed_rewards INTEGER,
  pending_rewards INTEGER,
  vip BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.visit_count,
    COUNT(lr.id)::INTEGER as total_rewards,
    COUNT(lr.id) FILTER (WHERE lr.redeemed_at IS NOT NULL)::INTEGER as redeemed_rewards,
    COUNT(lr.id) FILTER (WHERE lr.redeemed_at IS NULL)::INTEGER as pending_rewards,
    c.vip
  FROM customers c
  LEFT JOIN loyalty_rewards lr ON lr.customer_id = c.id
  GROUP BY c.id, c.name, c.email, c.phone, c.visit_count, c.vip
  ORDER BY c.visit_count DESC, total_rewards DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: Update existing policies
-- ============================================================================

-- Managers can update loyalty rewards (for redemption)
DROP POLICY IF EXISTS "Managers can update loyalty rewards" ON loyalty_rewards;
CREATE POLICY "Managers can update loyalty rewards"
ON loyalty_rewards FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'waiter')
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_unredeemed_rewards(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_loyalty_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_loyalty_customers(INTEGER) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN loyalty_rewards.redeemed_at IS
'Timestamp when the reward was redeemed by the customer';

COMMENT ON COLUMN loyalty_rewards.redeemed_by IS
'Staff member who processed the redemption (references profiles.id)';

COMMENT ON COLUMN loyalty_rewards.redeemed_notes IS
'Optional notes about the redemption (e.g., what was given, special circumstances)';

COMMENT ON FUNCTION redeem_loyalty_reward(UUID, UUID, TEXT) IS
'Marks a loyalty reward as redeemed. Returns success status and updated reward data.';

COMMENT ON FUNCTION get_customer_unredeemed_rewards(UUID) IS
'Gets all unredeemed loyalty rewards for a specific customer, sorted by issue date.';

COMMENT ON FUNCTION get_loyalty_statistics() IS
'Returns comprehensive statistics about the loyalty program including redemption rates and milestone breakdown.';

COMMENT ON FUNCTION get_top_loyalty_customers(INTEGER) IS
'Returns top N customers by visit count with their loyalty reward statistics.';
