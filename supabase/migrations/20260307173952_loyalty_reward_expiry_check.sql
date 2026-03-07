CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_reward_id UUID,
  p_redeemed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_reward RECORD;
BEGIN
  SELECT * INTO v_reward
  FROM loyalty_rewards
  WHERE id = p_reward_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;

  IF v_reward.redeemed_at IS NOT NULL OR v_reward.status = 'redeemed' THEN
    RETURN json_build_object('success', false, 'error', 'Reward already redeemed', 'redeemed_at', v_reward.redeemed_at);
  END IF;

  IF v_reward.expires_at IS NOT NULL AND v_reward.expires_at < NOW() THEN
    UPDATE loyalty_rewards SET status = 'expired' WHERE id = p_reward_id;
    RETURN json_build_object('success', false, 'error', 'Reward has expired', 'expired_at', v_reward.expires_at);
  END IF;

  UPDATE loyalty_rewards
  SET redeemed_at = NOW(), redeemed_by = p_redeemed_by, redeemed_notes = p_notes, status = 'redeemed'
  WHERE id = p_reward_id;

  SELECT lr.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
  INTO v_reward
  FROM loyalty_rewards lr
  JOIN customers c ON c.id = lr.customer_id
  WHERE lr.id = p_reward_id;

  RETURN json_build_object('success', true, 'reward', row_to_json(v_reward));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
