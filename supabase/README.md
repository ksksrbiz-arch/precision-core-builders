# Supabase Database Setup — Precision Core Builders

The admin dashboard reads/writes ~19 Postgres tables through the server-side
Supabase client (`server/db.ts`). If those tables are missing, every admin
page loads but shows no data, actions fail, and protected calls return
"unauthorized". This directory contains everything needed to provision the
database end-to-end.

## How it gets applied (Supabase Branching)

This repo is connected to Supabase via the GitHub integration, which
automatically runs any migrations in **`supabase/migrations/`**:

- On a **pull request**, the migrations are applied to that PR's ephemeral
  **preview branch** (a schema-only copy — no production data).
- On **merge to `main`**, the migrations are applied to the **production**
  project.

So the schema is provisioned automatically — no manual SQL step is required
for the normal flow.

## Files

| File                                             | Purpose                                                                                                                                                             |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `migrations/<ts>_init_precision_core_schema.sql` | **Canonical** migration applied by Supabase Branching — enums, 19 tables, FKs, indexes, RLS policies, and the admin-role allowlist + auth-sync trigger. Idempotent. |
| `setup.sql`                                      | Manual fallback — same SQL as the migration, for pasting into the SQL Editor for disaster recovery or a project not wired to branching.                             |
| `schema.ts`                                      | Drizzle ORM schema (source of truth for the table definitions).                                                                                                     |
| `rls-policies.sql`                               | Standalone RLS policies (also folded into the migration / `setup.sql`).                                                                                             |

## Manual fallback (only if not using branching)

1. Open the Supabase project → **SQL Editor**.
2. Paste the entire contents of `setup.sql` and **Run**.
   - It is idempotent: existing tables/enums/policies are left intact, so it
     will not disturb a project where Supabase Auth is already working.
3. Confirm the admin account has the admin role:
   ```sql
   SELECT email, role FROM public.users ORDER BY role;
   ```
   Eric's allow-listed emails are auto-promoted to `admin` by the trigger in
   `setup.sql`. To add another admin, either edit the `ARRAY[...]` in the
   `is_admin_email()` function and re-run `setup.sql`, or:
   ```sql
   INSERT INTO public.admin_emails (email) VALUES ('person@example.com');
   UPDATE public.users SET role = 'admin' WHERE email = 'person@example.com';
   ```

## Required Netlify environment variables

The serverless functions (`netlify/functions/trpc.ts`, `server/db.ts`) need
these set in the Netlify dashboard (Site settings → Environment variables):

| Variable                    | Used for                                                                  |
| :-------------------------- | :------------------------------------------------------------------------ |
| `SUPABASE_URL`              | Supabase project URL (e.g. `https://<ref>.supabase.co`)                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin DB access (bypasses RLS). **Never expose client-side.** |
| `VITE_SUPABASE_URL`         | Client-side Supabase URL (same as above)                                  |
| `VITE_SUPABASE_ANON_KEY`    | Client-side anon key for browser auth                                     |

Optional, depending on which features Eric uses:

| Variable              | Feature                                                        |
| :-------------------- | :------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | AI chat, search, vision studio, estimator, report generation   |
| `OPENWEATHER_API_KEY` | Weather-responsive scheduling                                  |
| `ADMIN_SESSION_TOKEN` | Optional break-glass admin token (header auth without a login) |

After setting variables, trigger a redeploy so the functions pick them up.

## Verifying end-to-end

1. Log in as Eric → you should land on `/admin` (the Callback page routes
   admins there based on `public.users.role`).
2. Create a client, then a project — the lists should populate.
3. If a page is still blank, check the function logs in Netlify and the
   Supabase **Logs → API** view for RLS or missing-table errors.
