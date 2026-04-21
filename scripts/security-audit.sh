#!/bin/bash

# Security Audit Script for Precision Core Builders
# Run this script regularly to check for security vulnerabilities

set -e

echo "🔒 Precision Core Builders - Security Audit"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install pnpm first.${NC}"
    exit 1
fi

echo "📦 Running pnpm audit..."
echo ""

# Run pnpm audit and capture the exit code
if pnpm audit --audit-level=moderate; then
    echo -e "${GREEN}✅ No moderate or higher vulnerabilities found!${NC}"
    AUDIT_PASSED=true
else
    echo -e "${YELLOW}⚠️  Vulnerabilities detected. Review the output above.${NC}"
    AUDIT_PASSED=false
fi

echo ""
echo "🔍 Checking package versions against known vulnerabilities..."
echo ""

# Check critical package versions
check_version() {
    local package=$1
    local min_version=$2
    local current_version=$(pnpm list "$package" --depth=0 --parseable 2>/dev/null | grep "$package@" | cut -d@ -f3 || echo "not installed")

    if [ "$current_version" = "not installed" ]; then
        echo -e "${YELLOW}⚠️  $package: Not installed${NC}"
        return 1
    fi

    # Simple version comparison (works for most semver)
    if [ "$current_version" = "$min_version" ] || [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
        echo -e "${GREEN}✅ $package: $current_version (>= $min_version)${NC}"
        return 0
    else
        echo -e "${RED}❌ $package: $current_version (< $min_version) - VULNERABLE${NC}"
        return 1
    fi
}

# Check all critical packages
VULNERABLE=false

check_version "vite" "8.1.0" || VULNERABLE=true
check_version "drizzle-orm" "0.50.0" || VULNERABLE=true
check_version "dompurify" "3.4.0" || VULNERABLE=true
check_version "mermaid" "10.9.4" || VULNERABLE=true
check_version "nanoid" "5.1.7" || VULNERABLE=true
check_version "esbuild" "0.25.0" || VULNERABLE=true

echo ""
echo "📋 Summary"
echo "=========="

if [ "$AUDIT_PASSED" = true ] && [ "$VULNERABLE" = false ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Security issues detected. Please update vulnerable packages.${NC}"
    echo ""
    echo "To fix vulnerabilities:"
    echo "  1. Update package.json with latest versions"
    echo "  2. Run: pnpm install"
    echo "  3. Run: pnpm audit fix"
    echo "  4. Run this script again to verify"
    exit 1
fi
