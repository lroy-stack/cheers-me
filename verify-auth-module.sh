#!/bin/bash

echo "========================================"
echo "Authentication Module Verification"
echo "========================================"
echo ""

# Files to check
files=(
  "src/lib/supabase/server.ts"
  "src/lib/supabase/client.ts"
  "src/lib/supabase/middleware.ts"
  "src/lib/utils/auth.ts"
  "src/app/api/auth/sign-in/route.ts"
  "src/app/api/auth/sign-up/route.ts"
  "src/app/api/auth/sign-out/route.ts"
  "src/app/api/auth/callback/route.ts"
  "src/app/api/profile/route.ts"
  "src/app/api/profile/avatar/route.ts"
  "src/types/index.ts"
  "middleware.ts"
  "API_ROUTES.md"
  "AUTH_MODULE_SUMMARY.md"
)

echo "Checking for required files..."
echo ""

all_present=true

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
    all_present=false
  fi
done

echo ""
echo "========================================"

if [ "$all_present" = true ]; then
  echo "✅ All files present!"
  echo ""
  echo "Next steps:"
  echo "1. Ensure Supabase is running: supabase start"
  echo "2. Run migrations: pnpm db:migrate"
  echo "3. Create avatars storage bucket in Supabase"
  echo "4. Start dev server: pnpm dev"
  echo "5. Test API routes with curl or Postman"
else
  echo "❌ Some files are missing!"
  echo "Please check the implementation."
fi

echo "========================================"
