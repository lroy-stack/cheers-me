#!/bin/bash
# ============================================================================
# Loyalty Program Implementation Validation Script
# ============================================================================
# This script validates that all loyalty program components are in place

set -e

echo "🔍 Validating Loyalty Program Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
FAILURES=0

# Helper functions
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    ((SUCCESS++))
  else
    echo -e "${RED}✗${NC} Missing: $1"
    ((FAILURES++))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} Found directory: $1"
    ((SUCCESS++))
  else
    echo -e "${RED}✗${NC} Missing directory: $1"
    ((FAILURES++))
  fi
}

check_function_in_migration() {
  if grep -q "$2" "$1"; then
    echo -e "${GREEN}✓${NC} Function $2 exists in $1"
    ((SUCCESS++))
  else
    echo -e "${RED}✗${NC} Function $2 not found in $1"
    ((FAILURES++))
  fi
}

echo "📁 Checking Database Migrations..."
echo "=================================="

check_file "supabase/migrations/001_initial_schema.sql"
check_file "supabase/migrations/015_crm_enhancements.sql"
check_file "supabase/migrations/016_loyalty_redemption.sql"

echo ""
echo "🔧 Checking Database Functions..."
echo "=================================="

check_function_in_migration "supabase/migrations/015_crm_enhancements.sql" "record_customer_visit"
check_function_in_migration "supabase/migrations/015_crm_enhancements.sql" "check_loyalty_milestone"
check_function_in_migration "supabase/migrations/016_loyalty_redemption.sql" "redeem_loyalty_reward"
check_function_in_migration "supabase/migrations/016_loyalty_redemption.sql" "get_customer_unredeemed_rewards"
check_function_in_migration "supabase/migrations/016_loyalty_redemption.sql" "get_loyalty_statistics"
check_function_in_migration "supabase/migrations/016_loyalty_redemption.sql" "get_top_loyalty_customers"

echo ""
echo "🌐 Checking API Routes..."
echo "=================================="

check_file "src/app/api/crm/loyalty-rewards/route.ts"
check_file "src/app/api/crm/loyalty-rewards/[id]/redeem/route.ts"
check_file "src/app/api/crm/loyalty-rewards/statistics/route.ts"
check_file "src/app/api/crm/loyalty-rewards/top-customers/route.ts"
check_file "src/app/api/crm/customers/[id]/visit/route.ts"
check_file "src/app/api/crm/customers/[id]/loyalty-rewards/route.ts"

echo ""
echo "📚 Checking Documentation..."
echo "=================================="

check_file "docs/LOYALTY_PROGRAM.md"
check_file "docs/LOYALTY_API_QUICK_REFERENCE.md"
check_file "LOYALTY_IMPLEMENTATION_SUMMARY.md"

echo ""
echo "🧪 Checking Tests..."
echo "=================================="

check_file "tests/integration/loyalty-program.test.ts"

echo ""
echo "🔒 Checking Security..."
echo "=================================="

# Check that RLS is enabled in migrations
if grep -q "ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY" "supabase/migrations/015_crm_enhancements.sql"; then
  echo -e "${GREEN}✓${NC} RLS enabled on loyalty_rewards table"
  ((SUCCESS++))
else
  echo -e "${RED}✗${NC} RLS not enabled on loyalty_rewards table"
  ((FAILURES++))
fi

# Check that policies exist
if grep -q "CREATE POLICY.*loyalty_rewards" "supabase/migrations/015_crm_enhancements.sql"; then
  echo -e "${GREEN}✓${NC} RLS policies defined for loyalty_rewards"
  ((SUCCESS++))
else
  echo -e "${RED}✗${NC} RLS policies missing for loyalty_rewards"
  ((FAILURES++))
fi

# Check that requireRole is used in API routes
if grep -q "requireRole" "src/app/api/crm/loyalty-rewards/[id]/redeem/route.ts"; then
  echo -e "${GREEN}✓${NC} Authentication check in redemption endpoint"
  ((SUCCESS++))
else
  echo -e "${YELLOW}⚠${NC} No requireRole check found in redemption endpoint"
  ((WARNINGS++))
fi

echo ""
echo "📊 Checking Table Structure..."
echo "=================================="

# Check that required columns exist in migration
if grep -q "redeemed_at" "supabase/migrations/016_loyalty_redemption.sql"; then
  echo -e "${GREEN}✓${NC} redeemed_at column added"
  ((SUCCESS++))
else
  echo -e "${RED}✗${NC} redeemed_at column not found in migration"
  ((FAILURES++))
fi

if grep -q "redeemed_by" "supabase/migrations/016_loyalty_redemption.sql"; then
  echo -e "${GREEN}✓${NC} redeemed_by column added"
  ((SUCCESS++))
else
  echo -e "${RED}✗${NC} redeemed_by column not found in migration"
  ((FAILURES++))
fi

if grep -q "redeemed_notes" "supabase/migrations/016_loyalty_redemption.sql"; then
  echo -e "${GREEN}✓${NC} redeemed_notes column added"
  ((SUCCESS++))
else
  echo -e "${RED}✗${NC} redeemed_notes column not found in migration"
  ((FAILURES++))
fi

echo ""
echo "🎯 Checking Milestone Configuration..."
echo "=================================="

# Check that all milestones (5, 10, 20, 50, 100) are defined
for milestone in 5 10 20 50 100; do
  if grep -q "WHEN $milestone THEN" "supabase/migrations/015_crm_enhancements.sql"; then
    echo -e "${GREEN}✓${NC} Milestone $milestone configured"
    ((SUCCESS++))
  else
    echo -e "${RED}✗${NC} Milestone $milestone not found"
    ((FAILURES++))
  fi
done

echo ""
echo "=================================="
echo "📋 VALIDATION SUMMARY"
echo "=================================="
echo -e "${GREEN}✓ Successes:${NC} $SUCCESS"
echo -e "${YELLOW}⚠ Warnings:${NC}  $WARNINGS"
echo -e "${RED}✗ Failures:${NC}  $FAILURES"
echo ""

if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Loyalty program implementation is complete.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run migration: npx supabase db push"
  echo "  2. Run tests: npm test tests/integration/loyalty-program.test.ts"
  echo "  3. Build frontend UI components"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please review the errors above.${NC}"
  exit 1
fi
