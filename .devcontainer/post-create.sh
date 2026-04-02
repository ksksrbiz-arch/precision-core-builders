#!/usr/bin/env bash
# post-create.sh — runs after on-create; good for heavier setup
set -euo pipefail

# ── Supabase CLI login hint ─────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Supabase Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " To link to the production project run:"
echo "   supabase login"
echo "   supabase link --project-ref mdxfvxycwzauixuphjau"
echo ""
echo " To start a local Supabase stack (optional):"
echo "   supabase start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Netlify CLI (global, lightweight) ──────────────────────
echo "→ Installing Netlify CLI globally..."
npm install -g netlify-cli --silent

echo "✓ post-create complete"
