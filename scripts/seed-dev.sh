#!/bin/bash

# ============================================================================
# GrandCafe Cheers — Development Seed Setup Script
# ============================================================================
# This script helps you set up the database with seed data for development
# Usage: ./scripts/seed-dev.sh [--reset] [--interactive]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  GrandCafe Cheers — Development Seed Setup     ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
  echo -e "\n${BLUE}→${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

check_env() {
  print_section "Checking environment setup..."

  if [ ! -f ".env.local" ]; then
    print_error ".env.local not found"
    echo ""
    echo "Please create .env.local with:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=..."
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    echo "  SUPABASE_SERVICE_ROLE_KEY=..."
    exit 1
  fi

  if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    export $(grep -v '^#' .env.local | xargs)
  fi

  if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_error "NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
  fi

  print_success ".env.local found and loaded"
}

check_dependencies() {
  print_section "Checking dependencies..."

  # Check for pnpm
  if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found, trying npm..."
    PACKAGE_MANAGER="npm"
  else
    PACKAGE_MANAGER="pnpm"
    print_success "pnpm found"
  fi

  # Check for Node
  if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 20+"
    exit 1
  fi
  print_success "Node.js $(node --version) found"

  # Check for supabase CLI
  if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI not found. Some features will be limited."
    print_warning "Install with: npm i -g @supabase/cli"
  else
    print_success "Supabase CLI found"
  fi
}

check_migrations() {
  print_section "Checking database migrations..."

  # This is a simple check - in production you'd verify actual schema
  echo "Migrations status:"
  echo "  • Assuming all migrations have been applied"
  echo "  • If you see errors, run: supabase db push"
}

show_options() {
  print_section "Seed Options:"
  echo "  1) TypeScript seed (recommended) - Auto-creates users + data"
  echo "  2) SQL seed - Requires existing auth users"
  echo "  3) Interactive setup - Walk through step by step"
  echo ""
}

run_ts_seed() {
  print_section "Running TypeScript seed generator..."

  if [ "$PACKAGE_MANAGER" = "npm" ]; then
    npx ts-node supabase/seed.ts
  else
    $PACKAGE_MANAGER exec ts-node supabase/seed.ts
  fi

  if [ $? -eq 0 ]; then
    print_success "TypeScript seed completed!"
  else
    print_error "TypeScript seed failed. Check error messages above."
    exit 1
  fi
}

run_sql_seed() {
  print_section "Running SQL seed..."

  if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI required for SQL seed"
    echo "Install: npm i -g @supabase/cli"
    exit 1
  fi

  print_warning "SQL seed requires you have test users in Supabase Auth first"
  echo "Steps:"
  echo "  1. Go to Supabase dashboard > Authentication > Users"
  echo "  2. Create test users (or let TypeScript seed do this)"
  echo "  3. Copy their UUIDs"
  echo "  4. Update UUIDs in supabase/seed.sql"
  echo "  5. Run SQL via dashboard > SQL Editor"
  echo ""
  read -p "Continue with SQL seed? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening supabase/seed.sql..."
    # User will copy/paste into dashboard
  fi
}

interactive_setup() {
  print_section "Interactive Setup"

  echo "This will guide you through setting up seed data step-by-step."
  echo ""

  read -p "Do you want to reset the entire database first? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_section "Database Reset"
    print_warning "This will DELETE ALL DATA"
    read -p "Are you sure? Type 'reset' to confirm: " confirm
    if [ "$confirm" = "reset" ]; then
      if command -v supabase &> /dev/null; then
        echo "Resetting database..."
        supabase db reset
        print_success "Database reset complete"
      else
        print_error "Supabase CLI required for reset"
        exit 1
      fi
    fi
  fi

  echo ""
  read -p "Should we create test users? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_ts_seed
  else
    print_warning "Skipped user creation"
  fi

  echo ""
  read -p "Should we populate menu, products, etc? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_ts_seed
  fi

  print_success "Setup complete!"
}

show_test_users() {
  print_section "Test User Credentials"

  cat << 'EOF'
Manager/Admin:
  Email: leroy@cheers.test
  Password: TestPassword123!
  Role: manager (full access)

Kitchen Staff:
  Email: kitchen@cheers.test
  Password: TestPassword123!
  Role: kitchen

Waiters:
  Email: waiter1@cheers.test or waiter2@cheers.test
  Password: TestPassword123!
  Role: waiter

Bar Staff:
  Email: bar@cheers.test
  Password: TestPassword123!
  Role: bar

DJ:
  Email: dj@cheers.test
  Password: TestPassword123!
  Role: dj

Owner (Finance):
  Email: owner@cheers.test
  Password: TestPassword123!
  Role: owner

EOF
}

show_next_steps() {
  print_section "Next Steps"

  cat << 'EOF'
1. Start the development server:
   pnpm dev

2. Open http://localhost:3000 in your browser

3. Log in with one of the test credentials above

4. Check the dashboard to see:
   - Sales data for the past 5 days
   - Staff schedules for this week
   - Customer reservations
   - Menu items and pricing
   - Stock inventory levels

5. Test different features:
   - Go to Staff > Schedule to manage shifts
   - Go to Menu > Builder to edit items
   - Go to Stock to check inventory
   - Go to Sales to view financial data
   - Go to Customers to see CRM

6. Run E2E tests:
   pnpm test:e2e

7. For more details, see SEED_DATA_README.md

EOF
}

show_help() {
  cat << 'EOF'
Usage: ./scripts/seed-dev.sh [OPTIONS]

Options:
  --reset         Reset database before seeding (deletes all data!)
  --interactive   Step through setup interactively
  --help          Show this help message
  --users-only    Only seed users (no menu, stock, etc.)
  --skip-check    Skip environment and dependency checks

Examples:
  # Default: check env and run TypeScript seed
  ./scripts/seed-dev.sh

  # Reset and seed fresh
  ./scripts/seed-dev.sh --reset

  # Interactive walk-through
  ./scripts/seed-dev.sh --interactive

EOF
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

main() {
  print_header

  # Parse arguments
  RESET=false
  INTERACTIVE=false
  SKIP_CHECK=false

  while [[ $# -gt 0 ]]; do
    case $1 in
      --reset)
        RESET=true
        shift
        ;;
      --interactive)
        INTERACTIVE=true
        shift
        ;;
      --skip-check)
        SKIP_CHECK=true
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  # Run checks
  if [ "$SKIP_CHECK" = false ]; then
    check_env
    check_dependencies
    check_migrations
  fi

  # Handle reset
  if [ "$RESET" = true ]; then
    print_section "Database Reset"
    print_warning "This will DELETE ALL DATA"
    read -p "Are you sure? Type 'reset' to confirm: " confirm
    if [ "$confirm" = "reset" ]; then
      if command -v supabase &> /dev/null; then
        print_section "Resetting database..."
        supabase db reset --password test
        print_success "Database reset complete"
      else
        print_error "Supabase CLI required for reset"
        exit 1
      fi
    else
      print_warning "Reset cancelled"
      exit 0
    fi
  fi

  # Choose seeding method
  if [ "$INTERACTIVE" = true ]; then
    interactive_setup
  else
    print_section "Starting seed process..."
    run_ts_seed
  fi

  # Show results
  echo ""
  print_success "Seed data successfully created!"
  echo ""

  show_test_users
  show_next_steps

  print_success "All done! Ready for development and testing."
}

# Run main function
main "$@"
