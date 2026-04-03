# Deployment Guide - Precision Core Builders

This guide covers deploying the Precision Core Builders platform to Netlify.

## Prerequisites

- GitHub account with access to the repository
- Netlify account connected to your GitHub account
- Supabase project created and configured
- Auth0 tenant created and configured (optional, for signup flow)

## Netlify Configuration

### 1. Initial Setup

1. Log in to Netlify
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and authorize access
4. Choose the `ksksrbiz-arch/precision-core-builders` repository
5. Configure build settings:
   - **Build command:** `npx vite build`
   - **Publish directory:** `dist/public`
   - **Functions directory:** `netlify/functions`
   - **Node version:** 20

### 2. Environment Variables

Navigate to **Site configuration → Environment variables** and add the following:

#### Required Variables

```
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth0 (required for signup flow)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience.com

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Deployment configuration
NODE_ENV=production
```

#### Optional Variables (for future features)

```
# AI/LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Weather
OPENWEATHERMAP_API_KEY=...

# Automation
N8N_WEBHOOK_URL=https://...
N8N_API_KEY=...
```

### 3. Secrets Scanning Configuration

**IMPORTANT:** Auth0 domain and client ID are **public values** that must be exposed in client-side JavaScript for OAuth to work. Netlify's secrets scanner will block deployment if it finds these values in the bundled assets.

To allow deployment, add this environment variable:

**Key:** `SECRETS_SCAN_OMIT_KEYS`
**Value:** `VITE_AUTH0_DOMAIN,VITE_AUTH0_CLIENT_ID`

This tells Netlify to ignore these specific environment variables during secrets scanning.

#### Why This Is Safe

- Auth0 domain and client ID are **not secrets** - they are public configuration values
- They are designed to be visible in client-side code and browser network traffic
- Auth0 security relies on other mechanisms (redirect URIs, client secrets, etc.)
- These values cannot be used to impersonate your application or access protected resources

## Build Configuration

The build is configured via `netlify.toml` in the repository root. Key settings:

```toml
[build]
  publish = "dist/public"
  command = "npx vite build"

[build.environment]
  NODE_VERSION = "20"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

## Deployment Process

### Automatic Deployments

- **Main branch:** Pushing to `main` triggers a production deployment
- **Pull requests:** Each PR creates a deploy preview
- **Other branches:** Branch deploys can be enabled in Netlify settings

### Manual Deployments

1. Navigate to the site in Netlify
2. Click "Deploys" → "Trigger deploy"
3. Select "Deploy site"

## Troubleshooting

### Secrets Scanning Error

**Error message:**

```
Secret env var "VITE_AUTH0_DOMAIN"'s value detected:
  found value at line 70 in dist/public/assets/index-DPzLDhJ.js
```

**Solution:**
Add `SECRETS_SCAN_OMIT_KEYS=VITE_AUTH0_DOMAIN,VITE_AUTH0_CLIENT_ID` to environment variables.

### Build Failures

1. Check the build logs in Netlify dashboard
2. Verify all required environment variables are set
3. Test the build locally: `pnpm build`
4. Check Node version matches (20)

### Function Errors

1. View function logs in Netlify dashboard
2. Test functions locally: `netlify dev`
3. Verify environment variables are accessible in functions
4. Check function timeout settings (default: 10s, max: 26s)

## Post-Deployment Checklist

- [ ] Verify site loads at the Netlify URL
- [ ] Test Auth0 login flow (if configured)
- [ ] Test Supabase connection
- [ ] Verify environment variables are loaded correctly
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Configure custom domain (if desired)

## Custom Domain Setup

1. Navigate to **Site configuration → Domain management**
2. Click "Add custom domain"
3. Enter your domain (e.g., `precisioncorebuilders.com`)
4. Follow DNS configuration instructions
5. Enable HTTPS (automatic via Let's Encrypt)

## Monitoring

### Netlify Analytics

Enable Netlify Analytics for:

- Page views and unique visitors
- Top pages and bandwidth usage
- Performance metrics

### Error Tracking

Consider integrating:

- Sentry for error tracking
- LogRocket for session replay
- Netlify function logs for serverless monitoring

## Security Headers

Security headers are configured in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(self), microphone=(self), geolocation=(self)"
```

## Support

For deployment issues:

- Check [Netlify documentation](https://docs.netlify.com/)
- Review build logs in Netlify dashboard
- Contact Eric Tadlock for project-specific questions
