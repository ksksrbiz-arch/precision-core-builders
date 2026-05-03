#!/usr/bin/env bash
#
# maintenance-sweep.sh
#
# Single command that runs the full maintenance validation chain — meant to be
# invoked by the site-maintainer subagent (see .claude/agents/site-maintainer.md)
# or run manually before opening a maintenance PR.
#
# Exits non-zero if anything fails. Output is grouped so you can scan it.
#
# Usage:
#   ./scripts/maintenance-sweep.sh

set -euo pipefail

cd "$(dirname "$0")/.."

section() {
  printf '\n\033[1;36m== %s ==\033[0m\n' "$1"
}

fail() {
  printf '\n\033[1;31mFAILED: %s\033[0m\n' "$1" >&2
  exit 1
}

section "Repo state"
git status --short
echo ""
echo "Branch: $(git branch --show-current)"
echo "Last commit: $(git log -1 --format='%h %s')"

section "pnpm install (frozen lockfile)"
pnpm install --frozen-lockfile || fail "pnpm install"

section "Audit (production deps, high+)"
pnpm audit --prod --audit-level=high || echo "audit returned non-zero — review above"

section "Outdated packages (top 30)"
pnpm outdated 2>&1 | head -30 || true

section "Type check"
pnpm check || fail "tsc"

section "Format check"
pnpm format:check || fail "prettier"

section "Tests"
pnpm test || fail "vitest"

section "Build"
pnpm build 2>&1 | tail -40 || fail "vite build"

section "Bundle size watch"
# Flag any non-Excalidraw chunk over 600 KB — Excalidraw is expected.
LARGE=$(find dist/public/assets -name "*.js" -size +600k 2>/dev/null \
  | grep -vE "chunk-EIO257PC|chunk-FX7ZIABN|chunk-K5T4RW27|cytoscape" || true)
if [ -n "$LARGE" ]; then
  echo "WARN: unexpected chunks > 600 KB:"
  echo "$LARGE"
else
  echo "OK: no unexpected large chunks"
fi

section "Security headers in netlify.toml"
grep -q "X-Frame-Options" netlify.toml && echo "OK: X-Frame-Options" || fail "missing X-Frame-Options"
grep -q "X-Content-Type-Options" netlify.toml && echo "OK: X-Content-Type-Options" || fail "missing X-Content-Type-Options"
grep -q "Permissions-Policy" netlify.toml && echo "OK: Permissions-Policy" || fail "missing Permissions-Policy"

section "All checks passed"
echo "Repo is clean. Open a PR if any changes were applied."
