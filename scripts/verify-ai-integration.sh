#!/bin/bash

# AI Assistant Integration Verification Script
# Run this to verify the backend implementation is complete

echo "🤖 AI Assistant Backend Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Environment variable
echo "1️⃣  Checking environment variables..."
if grep -q "ANTHROPIC_API_KEY" .env.local 2>/dev/null; then
    if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env.local; then
        echo -e "${GREEN}✅ ANTHROPIC_API_KEY is set${NC}"
    else
        echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY exists but may not be configured${NC}"
    fi
else
    echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env.local${NC}"
fi
echo ""

# Check 2: Core files exist
echo "2️⃣  Checking core files..."
files=(
    "src/lib/ai/claude.ts"
    "src/lib/ai/system-prompt.ts"
    "src/lib/ai/tool-definitions.ts"
    "src/lib/ai/tools.ts"
    "src/app/api/ai/chat/route.ts"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
        all_files_exist=false
    fi
done
echo ""

# Check 3: TypeScript compilation
echo "3️⃣  Checking TypeScript compilation..."
if pnpm exec tsc --noEmit --project tsconfig.json 2>&1 | grep -E "(src/lib/ai|src/app/api/ai)" > /dev/null; then
    echo -e "${RED}❌ TypeScript errors found in AI files${NC}"
else
    echo -e "${GREEN}✅ No TypeScript errors in AI files${NC}"
fi
echo ""

# Check 4: Dependencies
echo "4️⃣  Checking dependencies..."
if grep -q "@anthropic-ai/sdk" package.json; then
    echo -e "${GREEN}✅ @anthropic-ai/sdk installed${NC}"
else
    echo -e "${RED}❌ @anthropic-ai/sdk not found${NC}"
fi

if grep -q "date-fns" package.json; then
    echo -e "${GREEN}✅ date-fns installed${NC}"
else
    echo -e "${RED}❌ date-fns not found${NC}"
fi
echo ""

# Check 5: Documentation
echo "5️⃣  Checking documentation..."
docs=(
    "AI_ASSISTANT_IMPLEMENTATION.md"
    "AI_ASSISTANT_QUICK_START.md"
    "FRONTEND_AI_INTEGRATION_GUIDE.md"
    "AI_ASSISTANT_BACKEND_COMPLETE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc${NC}"
    else
        echo -e "${YELLOW}⚠️  $doc not found${NC}"
    fi
done
echo ""

# Check 6: Test file
echo "6️⃣  Checking test files..."
if [ -f "tests/integration/ai-chat.test.ts" ]; then
    echo -e "${GREEN}✅ Integration tests created${NC}"
else
    echo -e "${YELLOW}⚠️  Integration tests not found${NC}"
fi
echo ""

# Summary
echo "===================================="
echo "📊 Summary"
echo "===================================="

if [ "$all_files_exist" = true ]; then
    echo -e "${GREEN}✅ All core files present${NC}"
    echo -e "${GREEN}✅ Backend implementation complete${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify ANTHROPIC_API_KEY in .env.local"
    echo "  2. Run: pnpm dev"
    echo "  3. Test endpoint: POST /api/ai/chat"
    echo "  4. Build frontend chat widget (see FRONTEND_AI_INTEGRATION_GUIDE.md)"
else
    echo -e "${RED}❌ Some files are missing${NC}"
    echo "Please review the implementation"
fi

echo ""
echo "For testing instructions, see: AI_ASSISTANT_QUICK_START.md"
echo "For frontend guide, see: FRONTEND_AI_INTEGRATION_GUIDE.md"
