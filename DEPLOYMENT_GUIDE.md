# Precision Core Builders — Deployment Guide

**Last Updated:** April 16, 2026  
**Target Platform:** Netlify + Supabase  
**Estimated Setup Time:** 30-45 minutes

---

## Prerequisites

Before deploying, ensure you have:

- [ ] A GitHub account with access to this repository
- [ ] A Netlify account (free tier works fine initially)
- [ ] A Supabase account (free tier works fine initially)
- [ ] OpenAI API key (for Whisper voice transcription)
- [ ] Anthropic API key (for Claude AI features)
- [ ] OpenWeatherMap API key (free tier, for weather scheduling)
- [ ] Stripe account (optional, for billing features)
- [ ] n8n account (optional, for automation workflows)

---

## Part 1: Supabase Setup (15 minutes)

### Step 1.1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** Precision Core Builders
   - **Database Password:** _Generate and save securely_
   - **Region:** Choose closest to Eugene, OR (US West or US Central)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

### Step 1.2: Get Supabase Credentials

Once your project is ready:

1. Go to **Settings → API**
2. Copy these values (you'll need them for Netlify):
   ```
   Project URL: https://[your-project-ref].supabase.co
   anon/public key: eyJ... (long JWT)
   service_role key: eyJ... (long JWT, keep secret!)
   ```

### Step 1.3: Configure Database Connection

1. Go to **Settings → Database**
2. Copy the **Connection string** (Postgres URI format)
3. Replace `[YOUR-PASSWORD]` with your database password from Step 1.1
4. Save this as `DATABASE_URL` for later

### Step 1.4: Enable Realtime

1. Go to **Database → Replication**
2. Enable replication for these tables (you'll create them later):
   - `projects`
   - `field_reports`
   - `schedule_items`
   - `notifications`
3. Click **"Save"**

---

## Part 2: Netlify Setup (10 minutes)

### Step 2.1: Connect Repository

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub**
4. Select the `ksksrbiz-arch/precision-core-builders` repository
5. Configure build settings:
   - **Build command:** `pnpm install && pnpm build`
   - **Publish directory:** `dist/public`
   - **Functions directory:** `netlify/functions`
6. Click **"Deploy site"**

### Step 2.2: Configure Custom Domain (Optional)

1. Go to **Site settings → Domain management**
2. Click **"Add custom domain"**
3. Enter: `precisioncorebuilders.com` (or your domain)
4. Follow DNS configuration instructions from Netlify
5. Enable HTTPS (automatic via Let's Encrypt)

### Step 2.3: Set Environment Variables

1. Go to **Site settings → Environment variables**
2. Click **"Add a variable"** for each of the following:

#### Required Variables

```bash
# Supabase (from Part 1)
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Client-side Supabase (VITE_ prefix makes them available in browser)
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Weather API (get free key at openweathermap.org)
OPENWEATHERMAP_API_KEY=...

# Application
NODE_ENV=production
```

#### Optional Variables (can add later)

```bash
# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# n8n (for automation)
N8N_WEBHOOK_URL=https://...
N8N_API_KEY=...

# Admin Setup Token (change from default)
ADMIN_TOKEN=your-secure-random-token
```

3. Click **"Save"** after adding all variables
4. Trigger a new deploy: **Deploys → Trigger deploy → Deploy site**

---

## Part 3: Database Migration (5 minutes)

### Step 3.1: Run Automated Setup Script

From your local development machine:

```bash
# Clone the repo if you haven't already
git clone https://github.com/ksksrbiz-arch/precision-core-builders.git
cd precision-core-builders

# Create .env.local with your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your actual values

# Install dependencies
pnpm install

# Run the automated database setup
./scripts/setup-database.sh --seed-demo
```

This script will:

- ✅ Verify environment variables
- ✅ Run Drizzle schema migration (creates 12 tables)
- ✅ Apply RLS (Row-Level Security) policies
- ✅ Create helper functions
- ✅ Seed demo data (optional `--seed-demo` flag)

### Step 3.2: Verify Database Setup

1. Go to Supabase dashboard → **Database → Tables**
2. Verify these 12 tables exist:
   - `users`
   - `clients`
   - `projects`
   - `field_reports`
   - `schedule_items`
   - `estimates`
   - `materials`
   - `ledger_entries`
   - `notifications`
   - `sub_contractors`
   - `portfolio_projects`
   - `finish_selections`
   - `vision_studio_requests` (bonus table)
   - `billing_events` (bonus table)

3. Go to **Authentication → Policies**
4. Verify RLS is enabled on all tables

---

## Part 4: Create Admin User (2 minutes)

### Step 4.1: Create User in Supabase Auth

1. Go to Supabase dashboard → **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Fill in:
   - **Email:** eric@precisioncorebuilders.com
   - **Password:** _Generate secure password_
   - **Email Confirm:** ✅ Auto Confirm
4. Click **"Create user"**

### Step 4.2: Set Admin Role

1. Go to **Database → SQL Editor**
2. Run this SQL:
   ```sql
   -- Replace with the actual UUID from the users table
   UPDATE public.users
   SET role = 'admin'
   WHERE email = 'eric@precisioncorebuilders.com';
   ```
3. Click **"Run"**

---

## Part 5: Test Deployment (5 minutes)

### Step 5.1: Test Platform Health

```bash
# Replace with your Netlify site URL and admin token
curl "https://your-site.netlify.app/api/platform-health?adminToken=your-admin-token"
```

Expected response:

```json
{
  "status": "healthy",
  "services": {
    "supabase": "healthy",
    "claude": "healthy",
    "whisper": "healthy",
    "weather": "healthy"
  }
}
```

### Step 5.2: Test Admin Login

1. Go to `https://your-site.netlify.app/admin`
2. Log in with the admin account you created
3. You should see the **Command Center** dashboard

### Step 5.3: Test Voice-to-Report

1. Go to **Admin → Field Reports → New**
2. Select a project (or create one first)
3. Click the red record button
4. Speak for 5-10 seconds
5. Click stop
6. Wait for transcription + AI summary
7. Verify the report appears in the list

### Step 5.4: Test AI Estimator

1. Go to `https://your-site.netlify.app/estimator` (public page)
2. Fill out the project details form
3. Click **"Get Estimate"**
4. Verify you see 3-tier pricing (Low/Mid/High)
5. Check that cost breakdown shows labor/materials/permits

---

## Part 6: Optional Integrations

### Stripe Billing Setup (Optional)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get API keys from **Developers → API keys**
3. Add to Netlify environment variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
4. Create products in Stripe for milestone billing
5. Test payment links via **Admin → Billing**

### n8n Automation Setup (Optional)

1. Create account at [n8n.io](https://n8n.io) or self-host
2. Create workflows for:
   - Lead notifications (email/SMS when estimator form submitted)
   - Sub-contractor updates (schedule changes)
   - Client notifications (field report published)
   - Material shortage alerts
3. Get webhook URL from n8n
4. Add to Netlify env vars:
   ```
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...
   ```

---

## Part 7: Go Live Checklist

Before announcing to clients:

- [ ] Admin user can log in
- [ ] Can create projects
- [ ] Voice-to-report works end-to-end
- [ ] AI estimator returns valid pricing
- [ ] Client portal is accessible (test with a client account)
- [ ] Weather integration shows Eugene, OR forecast
- [ ] Gantt chart renders project schedules
- [ ] All pages load without console errors
- [ ] Mobile responsive design verified
- [ ] Custom domain configured and SSL enabled
- [ ] All environment variables set in production
- [ ] RLS policies verified in Supabase
- [ ] Backup strategy configured (Supabase auto-backups enabled)

---

## Troubleshooting

### Issue: "SUPABASE_URL not set" errors

**Fix:** Verify environment variables are set in Netlify dashboard, then trigger a new deploy.

### Issue: Database tables don't exist

**Fix:** Run `./scripts/setup-database.sh` from your local machine with valid credentials.

### Issue: Admin can't log in

**Fix:**

1. Verify user exists in Supabase Auth
2. Run SQL to set role: `UPDATE users SET role = 'admin' WHERE email = '...'`
3. Clear browser cache and try again

### Issue: Voice transcription fails

**Fix:**

1. Verify `OPENAI_API_KEY` is set in Netlify
2. Check OpenAI account has credits
3. View Netlify function logs for error details

### Issue: Real-time updates don't work

**Fix:**

1. Verify replication is enabled in Supabase for relevant tables
2. Check browser console for WebSocket connection errors
3. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

---

## Maintenance

### Weekly Tasks

- [ ] Review Netlify function logs for errors
- [ ] Check Supabase database size (free tier = 500MB)
- [ ] Verify automated backups running

### Monthly Tasks

- [ ] Review API usage (OpenAI, Anthropic, OpenWeatherMap)
- [ ] Update dependencies: `pnpm update`
- [ ] Review and optimize Netlify bandwidth usage
- [ ] Check for security updates in Supabase dashboard

---

## Support

- **Documentation:** See `docs/USER_GUIDE_ERIC.md` for feature walkthroughs
- **Platform Health:** `https://your-site.netlify.app/api/platform-health`
- **Netlify Support:** https://answers.netlify.com
- **Supabase Support:** https://supabase.com/docs

---

## Success!

Your Digital Foreman platform is now live. 🎉

**Next steps:**

1. Create your first real project
2. Record a voice field report
3. Share the estimator link on your website
4. Invite your first client to the portal
5. Start building!
