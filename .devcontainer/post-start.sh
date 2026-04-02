#!/usr/bin/env bash
# post-start.sh — runs every time the Codespace (re)starts
set -euo pipefail

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Precision Core Builders — Dev Environment Ready"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " pnpm dev          → Vite dev server  (port 3000)"
echo " netlify dev       → Netlify + functions (port 8888)"
echo " supabase start    → Local Supabase stack"
echo " supabase db diff  → Diff schema vs migrations"
echo " pnpm build        → Production build"
echo " pnpm test         → Run test suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick dependency check in case packages are stale after a resume
pnpm install --frozen-lockfile --silent 2>/dev/null || true
