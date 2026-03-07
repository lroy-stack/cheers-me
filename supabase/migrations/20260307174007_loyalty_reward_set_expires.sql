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
  SELECT visit_count INTO v_visit_count FROM customers WHERE id = p_customer_id;

  IF v_visit_count IN (5, 10, 20, 50, 100) THEN
    v_milestone := v_visit_count;
    SELECT EXISTS(
      SELECT 1 FROM loyalty_rewards
      WHERE customer_id = p_customer_id AND visit_milestone = v_milestone
    ) INTO v_already_awarded;

    IF NOT v_already_awarded THEN
      v_reward_text := CASE v_milestone
        WHEN 5 THEN 'Free drink on your 5th visit! Thank you for your loyalty.'
        WHEN 10 THEN 'Free dessert on your 10th visit! You''re a regular now!'
        WHEN 20 THEN 'Free appetizer on your 20th visit! We love having you here.'
        WHEN 50 THEN '20% off your next meal on your 50th visit! You''re part of the Cheers family!'
        WHEN 100 THEN 'Free dinner for two on your 100th visit! You''re a legend!'
        ELSE 'Loyalty reward'
      END;

      INSERT INTO loyalty_rewards (customer_id, visit_milestone, reward_description, reward_issued_at, expires_at, status)
      VALUES (p_customer_id, v_milestone, v_reward_text, NOW(), NOW() + INTERVAL '90 days', 'active');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
