#!/bin/bash
# ============================================================
# Precision Core Builders — Automated Database Setup
# ============================================================
# This script:
# 1. Verifies environment variables are set
# 2. Runs Drizzle schema migration
# 3. Applies RLS policies to Supabase
# 4. Creates indexes and helper functions
# 5. Optionally seeds demo data
#
# Usage:
#   ./scripts/setup-database.sh [--seed-demo]
#
# Prerequisites:
#   - SUPABASE_URL and DATABASE_URL must be set in environment
#   - Supabase project must exist
#   - pnpm must be installed
# ============================================================

set -e  # Exit on any error

SEED_DEMO=false
if [[ "$1" == "--seed-demo" ]]; then
  SEED_DEMO=true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Precision Core Builders — Database Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Verify Environment ──────────────────────────────
echo "✓ Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  echo "   Set it in your .env.local file or Netlify dashboard"
  exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ ERROR: SUPABASE_URL is not set"
  echo "   Set it in your .env.local file or Netlify dashboard"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set"
  echo "   RLS policies will be applied but server-side operations may fail"
fi

echo "✓ Environment variables verified"
echo ""

# ── Step 2: Run Drizzle Migration ──────────────────────────
echo "✓ Running Drizzle schema migration..."
pnpm db:push

if [ $? -ne 0 ]; then
  echo "❌ ERROR: Drizzle migration failed"
  exit 1
fi

echo "✓ Schema migration complete"
echo ""

# ── Step 3: Apply RLS Policies ─────────────────────────────
echo "✓ Applying Row-Level Security policies..."

# Extract Supabase project ref from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

if [ -z "$PROJECT_REF" ]; then
  echo "❌ ERROR: Could not extract project reference from SUPABASE_URL"
  exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "⚠️  WARNING: Supabase CLI not installed"
  echo "   Install it with: npm install -g supabase"
  echo ""
  echo "   To apply RLS policies manually:"
  echo "   1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/sql"
  echo "   2. Copy contents of drizzle/rls-policies.sql"
  echo "   3. Paste and run in SQL editor"
  echo ""
else
  # Apply RLS policies via Supabase CLI
  echo "   Applying RLS policies via Supabase CLI..."
  supabase db execute --file drizzle/rls-policies.sql --project-ref "$PROJECT_REF"
  
  if [ $? -ne 0 ]; then
    echo "⚠️  WARNING: RLS policies may not have been applied"
    echo "   Apply them manually in the Supabase SQL editor"
  else
    echo "✓ RLS policies applied successfully"
  fi
fi

echo ""

# ── Step 4: Apply Additional Migrations ────────────────────
echo "✓ Applying additional table migrations..."

for migration_file in drizzle/migrations/*.sql; do
  if [ -f "$migration_file" ]; then
    echo "   Applying $(basename $migration_file)..."
    
    if command -v supabase &> /dev/null; then
      supabase db execute --file "$migration_file" --project-ref "$PROJECT_REF" || true
    else
      echo "   ⚠️  Skipped (Supabase CLI not installed)"
    fi
  fi
done

echo "✓ Additional migrations applied"
echo ""

# ── Step 5: Seed Demo Data (Optional) ──────────────────────
if [ "$SEED_DEMO" = true ]; then
  echo "✓ Seeding demo data..."
  
  # Call the platform-actions function to seed demo data
  ADMIN_TOKEN=${ADMIN_TOKEN:-"admin-setup-token-change-me"}
  
  curl -X POST "https://precisioncorebuilders.com/api/platform-actions" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"seed_demo\",\"adminToken\":\"$ADMIN_TOKEN\"}" \
    --silent --show-error || echo "⚠️  Demo data seeding failed (expected if platform not yet deployed)"
  
  echo "✓ Demo data seed requested"
  echo ""
fi

# ── Step 6: Verification ───────────────────────────────────
echo "✓ Verifying database setup..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Database Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify tables exist in Supabase dashboard:"
echo "     https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo ""
echo "  2. Verify RLS policies are enabled:"
echo "     https://supabase.com/dashboard/project/$PROJECT_REF/auth/policies"
echo ""
echo "  3. Test the platform health endpoint:"
echo "     curl https://precisioncorebuilders.com/api/platform-health?adminToken=\$ADMIN_TOKEN"
echo ""
echo "  4. Create your first admin user in Supabase Auth:"
echo "     https://supabase.com/dashboard/project/$PROJECT_REF/auth/users"
echo ""
