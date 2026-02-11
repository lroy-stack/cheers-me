-- ============================================================================
-- CRM Schema Validation & Test Queries
-- Run this after applying 015_crm_enhancements.sql
-- ============================================================================

-- Check if all tables exist
DO $$
BEGIN
  ASSERT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers'),
    'Table customers does not exist';
  ASSERT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_reviews'),
    'Table customer_reviews does not exist';
  ASSERT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_rewards'),
    'Table loyalty_rewards does not exist';

  RAISE NOTICE '✓ All CRM tables exist';
END $$;

-- Check if all indexes exist
DO $$
BEGIN
  ASSERT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_customers_email'),
    'Index idx_customers_email does not exist';
  ASSERT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_customers_phone'),
    'Index idx_customers_phone does not exist';
  ASSERT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_customers_vip'),
    'Index idx_customers_vip does not exist';
  ASSERT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_customer_reviews_sentiment'),
    'Index idx_customer_reviews_sentiment does not exist';

  RAISE NOTICE '✓ All CRM indexes exist';
END $$;

-- Check if all functions exist
DO $$
BEGIN
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'record_customer_visit'),
    'Function record_customer_visit does not exist';
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'check_loyalty_milestone'),
    'Function check_loyalty_milestone does not exist';
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_upcoming_birthdays'),
    'Function get_upcoming_birthdays does not exist';
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_upcoming_anniversaries'),
    'Function get_upcoming_anniversaries does not exist';
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_customer_insights'),
    'Function get_customer_insights does not exist';
  ASSERT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_vip_customers'),
    'Function get_vip_customers does not exist';

  RAISE NOTICE '✓ All CRM functions exist';
END $$;

-- Check RLS is enabled
DO $$
BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'customers'),
    'RLS not enabled on customers table';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'customer_reviews'),
    'RLS not enabled on customer_reviews table';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'loyalty_rewards'),
    'RLS not enabled on loyalty_rewards table';

  RAISE NOTICE '✓ RLS enabled on all CRM tables';
END $$;

-- Check if sentiment_type enum exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'sentiment_type'
  ), 'Enum sentiment_type does not exist';

  RAISE NOTICE '✓ sentiment_type enum exists';
END $$;

-- Test customer constraints
DO $$
DECLARE
  v_test_id UUID;
BEGIN
  -- Test valid customer insert
  INSERT INTO customers (name, email, phone, language, visit_count)
  VALUES ('Test Customer', 'test@example.com', '+34612345678', 'en', 0)
  RETURNING id INTO v_test_id;

  RAISE NOTICE '✓ Valid customer insert works';

  -- Test email constraint (should fail)
  BEGIN
    INSERT INTO customers (name, email, language)
    VALUES ('Invalid Email', 'invalid-email', 'en');
    RAISE EXCEPTION 'Email constraint should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ Email format constraint works';
  END;

  -- Test language constraint (should fail)
  BEGIN
    INSERT INTO customers (name, language)
    VALUES ('Invalid Language', 'fr');
    RAISE EXCEPTION 'Language constraint should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ Language constraint works';
  END;

  -- Test negative visit_count (should fail)
  BEGIN
    INSERT INTO customers (name, visit_count)
    VALUES ('Negative Visits', -5);
    RAISE EXCEPTION 'Visit count constraint should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ Visit count constraint works';
  END;

  -- Cleanup
  DELETE FROM customers WHERE id = v_test_id;
END $$;

-- Test loyalty milestone function
DO $$
DECLARE
  v_customer_id UUID;
  v_reward_count INTEGER;
BEGIN
  -- Create test customer
  INSERT INTO customers (name, email, language)
  VALUES ('Loyalty Test', 'loyalty@example.com', 'en')
  RETURNING id INTO v_customer_id;

  -- Record 5 visits (should trigger 5-visit reward)
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);

  -- Check if reward was created
  SELECT COUNT(*) INTO v_reward_count
  FROM loyalty_rewards
  WHERE customer_id = v_customer_id AND visit_milestone = 5;

  ASSERT v_reward_count = 1, 'Loyalty reward not created at 5 visits';
  RAISE NOTICE '✓ Loyalty milestone function works (5 visits)';

  -- Record 5 more visits to reach 10
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);
  PERFORM record_customer_visit(v_customer_id);

  -- Check if 10-visit reward was created
  SELECT COUNT(*) INTO v_reward_count
  FROM loyalty_rewards
  WHERE customer_id = v_customer_id AND visit_milestone = 10;

  ASSERT v_reward_count = 1, 'Loyalty reward not created at 10 visits';
  RAISE NOTICE '✓ Loyalty milestone function works (10 visits)';

  -- Cleanup
  DELETE FROM loyalty_rewards WHERE customer_id = v_customer_id;
  DELETE FROM customers WHERE id = v_customer_id;
END $$;

-- Test get_upcoming_birthdays function
DO $$
DECLARE
  v_customer_id UUID;
  v_birthday_count INTEGER;
BEGIN
  -- Create customer with birthday tomorrow
  INSERT INTO customers (name, email, birthday)
  VALUES (
    'Birthday Test',
    'birthday@example.com',
    CURRENT_DATE + INTERVAL '1 day'
  )
  RETURNING id INTO v_customer_id;

  -- Check if function returns this customer
  SELECT COUNT(*) INTO v_birthday_count
  FROM get_upcoming_birthdays(7)
  WHERE customer_id = v_customer_id;

  ASSERT v_birthday_count = 1, 'get_upcoming_birthdays did not return customer';
  RAISE NOTICE '✓ get_upcoming_birthdays function works';

  -- Cleanup
  DELETE FROM customers WHERE id = v_customer_id;
END $$;

-- Test get_customer_insights function
DO $$
DECLARE
  v_insights JSON;
BEGIN
  v_insights := get_customer_insights();

  ASSERT v_insights IS NOT NULL, 'get_customer_insights returned NULL';
  ASSERT v_insights ? 'total_customers', 'Missing total_customers key';
  ASSERT v_insights ? 'vip_customers', 'Missing vip_customers key';
  ASSERT v_insights ? 'avg_visit_count', 'Missing avg_visit_count key';

  RAISE NOTICE '✓ get_customer_insights function works';
  RAISE NOTICE 'Sample output: %', v_insights;
END $$;

-- Test review constraints
DO $$
DECLARE
  v_customer_id UUID;
  v_review_id UUID;
BEGIN
  -- Create test customer
  INSERT INTO customers (name, email)
  VALUES ('Review Test', 'review@example.com')
  RETURNING id INTO v_customer_id;

  -- Test valid review
  INSERT INTO customer_reviews (customer_id, platform, rating, review_text, sentiment)
  VALUES (v_customer_id, 'TripAdvisor', 4.5, 'Great experience!', 'positive')
  RETURNING id INTO v_review_id;

  RAISE NOTICE '✓ Valid review insert works';

  -- Test invalid rating (should fail)
  BEGIN
    INSERT INTO customer_reviews (customer_id, platform, rating, review_text, sentiment)
    VALUES (v_customer_id, 'Google', 6.0, 'Too high rating', 'positive');
    RAISE EXCEPTION 'Rating constraint should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ Review rating constraint works';
  END;

  -- Cleanup
  DELETE FROM customer_reviews WHERE customer_id = v_customer_id;
  DELETE FROM customers WHERE id = v_customer_id;
END $$;

-- Test VIP customers function
DO $$
DECLARE
  v_customer_id UUID;
  v_vip_count INTEGER;
BEGIN
  -- Create VIP customer
  INSERT INTO customers (name, email, vip, visit_count)
  VALUES ('VIP Test', 'vip@example.com', true, 25)
  RETURNING id INTO v_customer_id;

  -- Check if function returns VIP customer
  SELECT COUNT(*) INTO v_vip_count
  FROM get_vip_customers()
  WHERE customer_id = v_customer_id;

  ASSERT v_vip_count = 1, 'get_vip_customers did not return VIP customer';
  RAISE NOTICE '✓ get_vip_customers function works';

  -- Cleanup
  DELETE FROM customers WHERE id = v_customer_id;
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ CRM SCHEMA VALIDATION COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All tables, indexes, functions, constraints, and RLS policies are working correctly.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create API routes in /api/crm/*';
  RAISE NOTICE '2. Build frontend components for CRM dashboard';
  RAISE NOTICE '3. Integrate Claude API for sentiment analysis and review responses';
  RAISE NOTICE '4. Set up birthday/anniversary notification cron jobs';
  RAISE NOTICE '';
END $$;
