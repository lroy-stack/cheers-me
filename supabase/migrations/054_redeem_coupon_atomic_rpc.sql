-- ============================================================================
-- Atomic coupon redemption RPC function using FOR UPDATE row-level lock.
-- Replaces 3 separate queries (SELECT + INSERT redemption + UPDATE balance)
-- with a single transaction to prevent race conditions (P-02/B-02 audit finding).
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_coupon(
  p_coupon_id UUID,
  p_amount_cents INTEGER,
  p_validated_by UUID,
  p_validation_method TEXT DEFAULT 'code_entry',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_new_remaining INTEGER;
  v_new_status TEXT;
  v_result JSONB;
BEGIN
  -- Lock the coupon row for update (prevents concurrent redemptions)
  SELECT *
  INTO v_coupon
  FROM gift_coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon not found');
  END IF;

  -- Validate status
  IF v_coupon.status IN ('expired', 'fully_used', 'cancelled', 'pending_payment') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coupon is not redeemable (status: ' || v_coupon.status || ')'
    );
  END IF;

  -- Check expiry
  IF v_coupon.expires_at < NOW() THEN
    UPDATE gift_coupons SET status = 'expired' WHERE id = p_coupon_id;
    RETURN jsonb_build_object('success', false, 'error', 'Coupon has expired');
  END IF;

  -- Check balance
  IF p_amount_cents > v_coupon.remaining_cents THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'remaining_cents', v_coupon.remaining_cents
    );
  END IF;

  -- Calculate new balance and status
  v_new_remaining := v_coupon.remaining_cents - p_amount_cents;
  v_new_status := CASE WHEN v_new_remaining = 0 THEN 'fully_used' ELSE 'partially_used' END;

  -- Insert redemption record
  INSERT INTO gift_coupon_redemptions (
    coupon_id,
    amount_cents,
    validated_by,
    validation_method,
    notes
  ) VALUES (
    p_coupon_id,
    p_amount_cents,
    p_validated_by,
    p_validation_method,
    p_notes
  );

  -- Update coupon balance atomically
  UPDATE gift_coupons
  SET
    remaining_cents = v_new_remaining,
    status = v_new_status
  WHERE id = p_coupon_id;

  -- Return success with updated state
  RETURN jsonb_build_object(
    'success', true,
    'coupon_id', p_coupon_id,
    'redeemed_amount_cents', p_amount_cents,
    'remaining_cents', v_new_remaining,
    'new_status', v_new_status
  );
END;
$$;
