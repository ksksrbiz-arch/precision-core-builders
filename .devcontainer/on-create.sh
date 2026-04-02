#!/usr/bin/env bash
# on-create.sh — runs once when the Codespace is first created
set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Precision Core Builders — Codespace Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Enable corepack and pin pnpm version ─────────────────
echo "→ Enabling corepack + pnpm@${PNPM_VERSION:-10.4.1}..."
corepack enable
corepack prepare "pnpm@${PNPM_VERSION:-10.4.1}" --activate

# ── 2. Install project dependencies ────────────────────────
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# ── 3. Copy env template if .env.local doesn't exist ───────
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "→ Created .env.local from .env.example — add your secrets!"
fi

echo "✓ on-create complete"
