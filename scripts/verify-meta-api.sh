#!/bin/bash

# ============================================================================
# Meta API Integration Verification Script
# ============================================================================
# This script verifies that all Meta API integration files are in place
# and checks the environment configuration.
#
# Usage: ./scripts/verify-meta-api.sh
# ============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🔍 Verifying Meta API Integration..."
echo "Project root: $PROJECT_ROOT"
echo ""

# ============================================================================
# Check Files
# ============================================================================

echo "📁 Checking required files..."

FILES=(
  "src/lib/meta/graph-api.ts"
  "src/app/api/marketing/social-posts/publish/route.ts"
  "src/app/api/marketing/social-posts/sync-analytics/route.ts"
  "supabase/migrations/011_meta_api_enhancements.sql"
  "src/types/marketing.ts"
  "docs/META_API_INTEGRATION.md"
  "docs/FRONTEND_META_INTEGRATION.md"
  "META_API_IMPLEMENTATION_SUMMARY.md"
)

MISSING_FILES=()

for file in "${FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    MISSING_FILES+=("$file")
  fi
done

echo ""

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "❌ ERROR: ${#MISSING_FILES[@]} file(s) missing!"
  exit 1
fi

# ============================================================================
# Check Environment Variables
# ============================================================================

echo "🔐 Checking environment variables..."

if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "  ✅ .env file exists"

  # Source the .env file
  set -a
  source "$PROJECT_ROOT/.env"
  set +a

  # Check each variable
  if [ -n "$META_ACCESS_TOKEN" ]; then
    TOKEN_LENGTH=${#META_ACCESS_TOKEN}
    echo "  ✅ META_ACCESS_TOKEN is set (length: $TOKEN_LENGTH chars)"
  else
    echo "  ⚠️  META_ACCESS_TOKEN is NOT set"
  fi

  if [ -n "$META_PAGE_ID" ]; then
    echo "  ✅ META_PAGE_ID is set: $META_PAGE_ID"
  else
    echo "  ⚠️  META_PAGE_ID is NOT set"
  fi

  if [ -n "$META_IG_USER_ID" ]; then
    echo "  ✅ META_IG_USER_ID is set: $META_IG_USER_ID"
  else
    echo "  ⚠️  META_IG_USER_ID is NOT set"
  fi
else
  echo "  ⚠️  .env file not found"
fi

echo ""

# ============================================================================
# Check TypeScript Compilation
# ============================================================================

echo "🔨 Checking TypeScript compilation..."

if command -v pnpm &> /dev/null; then
  echo "  📦 pnpm is installed"

  # Check if node_modules exists
  if [ -d "$PROJECT_ROOT/node_modules" ]; then
    echo "  ✅ node_modules exists"
  else
    echo "  ⚠️  node_modules not found. Run: pnpm install"
  fi

  # Try to compile TypeScript (dry run)
  cd "$PROJECT_ROOT"
  if pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
    echo "  ❌ TypeScript compilation has errors"
  else
    echo "  ✅ TypeScript compilation check passed"
  fi
else
  echo "  ⚠️  pnpm not found. Install with: npm install -g pnpm"
fi

echo ""

# ============================================================================
# Check Database Migration
# ============================================================================

echo "🗄️  Checking database migration..."

if [ -f "$PROJECT_ROOT/supabase/migrations/011_meta_api_enhancements.sql" ]; then
  echo "  ✅ Migration file exists"

  # Count lines
  LINE_COUNT=$(wc -l < "$PROJECT_ROOT/supabase/migrations/011_meta_api_enhancements.sql")
  echo "  📊 Migration has $LINE_COUNT lines"

  # Check for key components
  if grep -q "error_message" "$PROJECT_ROOT/supabase/migrations/011_meta_api_enhancements.sql"; then
    echo "  ✅ Contains error_message column"
  fi

  if grep -q "engagement_rate" "$PROJECT_ROOT/supabase/migrations/011_meta_api_enhancements.sql"; then
    echo "  ✅ Contains engagement_rate column"
  fi

  if grep -q "calculate_engagement_rate" "$PROJECT_ROOT/supabase/migrations/011_meta_api_enhancements.sql"; then
    echo "  ✅ Contains engagement rate calculation trigger"
  fi
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "============================================"
echo "✅ Verification Complete!"
echo "============================================"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. If environment variables are not set:"
echo "   Follow the setup guide in docs/META_API_INTEGRATION.md"
echo ""
echo "2. Run database migration:"
echo "   cd $PROJECT_ROOT && pnpm db:migrate"
echo ""
echo "3. Install dependencies (if needed):"
echo "   cd $PROJECT_ROOT && pnpm install"
echo ""
echo "4. Start development server:"
echo "   cd $PROJECT_ROOT && pnpm dev"
echo ""
echo "5. Test the API:"
echo "   See META_API_IMPLEMENTATION_SUMMARY.md for test commands"
echo ""
echo "6. Frontend integration:"
echo "   See docs/FRONTEND_META_INTEGRATION.md for UI implementation"
echo ""
echo "============================================"
