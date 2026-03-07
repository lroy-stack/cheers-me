-- ============================================================================
-- Fix D-03 (part 2): migration 050 already applied RLS for the 13 actual tables.
-- monthly_financials and weekly_financials are VIEWS — they are not tables,
-- so RLS cannot be applied directly to them. This is a no-op placeholder.
-- ============================================================================
SELECT 1;
