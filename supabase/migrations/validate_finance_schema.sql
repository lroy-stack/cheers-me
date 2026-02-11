-- ============================================================================
-- Finance Schema Validation Script
-- Run this after applying migration 014_finance_enhancements.sql
-- ============================================================================

-- Check that all new tables exist
SELECT 'Tables Check' as check_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'cash_flow_transactions',
    'tax_periods',
    'overhead_expenses',
    'financial_targets'
  )
ORDER BY table_name;

-- Check that all views exist
SELECT 'Views Check' as check_type, table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'weekly_financials',
    'monthly_financials',
    'budget_vs_actual'
  )
ORDER BY table_name;

-- Check that all functions exist
SELECT 'Functions Check' as check_type, routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_daily_financials',
    'generate_tax_export'
  )
ORDER BY routine_name;

-- Check that all ENUMs exist
SELECT 'ENUMs Check' as check_type, typname as enum_name
FROM pg_type
WHERE typtype = 'e'
  AND typname IN (
    'transaction_type',
    'payment_method'
  )
ORDER BY typname;

-- Check that all indexes exist
SELECT 'Indexes Check' as check_type, indexname as index_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_cash_flow%'
   OR indexname LIKE 'idx_overhead%'
ORDER BY indexname;

-- Check RLS is enabled on finance tables
SELECT 'RLS Check' as check_type, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'cash_flow_transactions',
    'tax_periods',
    'overhead_expenses',
    'financial_targets',
    'daily_financials',
    'budget'
  )
ORDER BY tablename;

-- Count RLS policies on finance tables
SELECT 'RLS Policies Count' as check_type, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'cash_flow_transactions',
    'tax_periods',
    'overhead_expenses',
    'financial_targets'
  )
GROUP BY tablename
ORDER BY tablename;

-- Verify default targets were inserted
SELECT 'Seed Data Check' as check_type, COUNT(*) as target_count
FROM financial_targets
WHERE period_start = '2024-04-01';

-- Test views work (should return empty results if no data)
SELECT 'Weekly View Test' as check_type, COUNT(*) as row_count
FROM weekly_financials;

SELECT 'Monthly View Test' as check_type, COUNT(*) as row_count
FROM monthly_financials;

SELECT 'Budget vs Actual View Test' as check_type, COUNT(*) as row_count
FROM budget_vs_actual;

-- ============================================================================
-- Sample Data Insert Tests (Optional - run to verify constraints work)
-- ============================================================================

-- Test 1: Insert sample overhead expense
INSERT INTO overhead_expenses (
  date,
  category,
  description,
  amount,
  is_recurring,
  recurrence_frequency,
  vendor
) VALUES (
  CURRENT_DATE,
  'Rent',
  'Monthly rent for restaurant space',
  3500.00,
  true,
  'monthly',
  'Property Management Co.'
) RETURNING id, category, amount;

-- Test 2: Insert sample cash flow transaction
INSERT INTO cash_flow_transactions (
  date,
  transaction_type,
  amount,
  payment_method,
  category,
  description
) VALUES (
  CURRENT_DATE,
  'sale',
  150.00,
  'card',
  'Food',
  'Test sale transaction'
) RETURNING id, transaction_type, amount;

-- Test 3: Insert sample financial target
INSERT INTO financial_targets (
  period_start,
  period_end,
  target_food_cost_ratio,
  target_beverage_cost_ratio,
  target_labor_cost_ratio
) VALUES (
  '2024-06-01',
  '2024-08-31',
  28.00,
  20.00,
  28.00
) RETURNING id, period_start, period_end;

-- ============================================================================
-- Cleanup test data (if you ran the sample inserts above)
-- ============================================================================

-- Delete test data
DELETE FROM overhead_expenses WHERE description = 'Monthly rent for restaurant space';
DELETE FROM cash_flow_transactions WHERE description = 'Test sale transaction';
DELETE FROM financial_targets WHERE period_start = '2024-06-01' AND period_end = '2024-08-31';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Validation Complete' as status,
       'All checks passed if no errors above' as message;
