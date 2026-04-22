# Security Policy

## Vulnerability Management

This document outlines the security measures and mitigations implemented in the Precision Core Builders platform.

## Fixed Vulnerabilities (2026-04-21)

### Vite Development Server Vulnerabilities

**Affected versions:** vite < 8.0.9

**Issues fixed:**

1. **CVE-2024-XXXXX**: `server.fs.deny` bypassed with queries (High)
2. **CVE-2024-XXXXX**: Arbitrary file read via Vite dev server WebSocket (High)
3. **CVE-2024-XXXXX**: Path traversal in optimized deps `.map` handling (Moderate)

**Mitigation:**

- Updated Vite from 8.0.3 to 8.0.9+
- Enhanced `vite.config.ts` with strict file system access controls
- Added comprehensive `server.fs.deny` patterns including:
  - All hidden files (`**/.*`)
  - Git directories (`**/.git/**`)
  - Node modules (`**/node_modules/**`)
  - Package files (`**/package.json`, `**/pnpm-lock.yaml`)
  - Environment files (`**/.env*`)
- Implemented `server.fs.allow` whitelist restricting access to `client/` and `shared/` directories only
- Disabled CORS in development to prevent external requests
- Disabled sourcemaps in production builds

### Drizzle ORM SQL Injection

**Affected versions:** drizzle-orm < 0.45.2

**Issue:** SQL injection via improperly escaped SQL identifiers (High)

**Mitigation:**

- Updated Drizzle ORM from 0.44.6 to 0.45.2+
- Current implementation uses Supabase client which provides built-in SQL injection protection
- No raw SQL queries or `sql` template literals used in codebase

### Third-Party Library Vulnerabilities

**DOMPurify XSS Vulnerabilities (Moderate):**

- Multiple XSS vulnerabilities in DOMPurify
- Enforced version constraint: `dompurify >= 3.4.0`

**Mermaid XSS (Moderate):**

- XSS in sequence diagram labels
- Enforced version constraint: `mermaid >= 10.9.4`

**nanoid Predictability (Moderate):**

- Predictable results when given non-integer values
- Enforced version constraint: `nanoid >= 5.1.7`

**esbuild Development Server (Moderate):**

- Any website could send requests to dev server
- Enforced version constraint: `esbuild >= 0.25.0`

## Security Configuration

### Package Manager Overrides

All security-critical dependencies are enforced via `pnpm.overrides` in `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "dompurify": ">=3.4.0",
      "path-to-regexp": ">=0.1.13",
      "picomatch": ">=4.0.4",
      "nanoid": ">=5.1.7",
      "lodash": ">=4.17.23",
      "lodash-es": ">=4.18.0",
      "qs": ">=6.14.2",
      "rollup": ">=4.59.0",
      "tar": ">=7.5.11",
      "esbuild": ">=0.25.0",
      "mermaid": ">=10.9.4",
      "vite": ">=8.0.9",
      "drizzle-orm": ">=0.45.2"
    }
  }
}
```

### Vite Security Configuration

See `vite.config.ts` for complete configuration. Key security settings:

- **Strict file system access:** Only whitelisted directories accessible
- **Comprehensive deny list:** Blocks access to sensitive files
- **CORS disabled in development:** Prevents external requests
- **Sourcemaps disabled in production:** Prevents code inspection

### Database Security

- **Supabase Row Level Security (RLS):** All tables protected by RLS policies
- **Service role key isolation:** Server-side only, never exposed to client
- **No raw SQL:** All queries use Supabase client's parameterized methods
- **Type-safe queries:** Drizzle ORM provides compile-time type checking

## Security Best Practices

### Code Guidelines

1. **Never use raw SQL queries** - Use Supabase client or Drizzle ORM query builders
2. **Never expose service keys client-side** - Only use in Netlify Functions
3. **Always validate user input** - Use Zod schemas for all tRPC procedures
4. **Never trust client data** - Re-validate on server
5. **Use prepared statements** - Supabase client handles this automatically

### Dependency Management

1. **Run `pnpm audit` regularly** to check for new vulnerabilities
2. **Update dependencies monthly** or when security patches are released
3. **Review release notes** before upgrading critical packages
4. **Test thoroughly** after dependency updates

### Development Workflow

1. **Never commit secrets** - Use Netlify environment variables
2. **Review security alerts** on GitHub Dependabot
3. **Enable branch protection** on main branch
4. **Require PR reviews** for all code changes

## Reporting a Vulnerability

If you discover a security vulnerability, please email the project owner directly rather than opening a public issue. Include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if applicable)

## Security Audit History

| Date       | Auditor | Findings | Status   |
| ---------- | ------- | -------- | -------- |
| 2026-04-21 | Claude  | 17 CVEs  | Resolved |

## Next Steps

- [ ] Set up automated security scanning in CI/CD pipeline
- [ ] Configure GitHub Dependabot auto-merge for security patches
- [ ] Implement Content Security Policy (CSP) headers
- [ ] Add rate limiting to API endpoints
- [ ] Implement request validation middleware
- [ ] Set up security monitoring and alerting

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Netlify Security](https://docs.netlify.com/security/secure-access-to-sites/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Vite Security](https://vitejs.dev/config/server-options.html#server-fs-deny)
