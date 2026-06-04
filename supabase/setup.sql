-- =====================================================================
-- Precision Core Builders — CONSOLIDATED DATABASE SETUP (idempotent)
-- =====================================================================
-- Safe to run multiple times. Paste this whole file into the Supabase
-- SQL Editor for the project, then run it.
--
--   1. Schema: enums, 19 tables, foreign keys, indexes
--   2. RLS:    helper functions + policies for every table
--
-- After running, set the role for the admin account:
--   UPDATE public.users SET role = 'admin' WHERE email = '<eric-email>';
-- (See README at bottom for the admin/auth steps.)
-- =====================================================================

-- ── SECTION 1: SCHEMA ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "public"."blueprint_auth_method" AS ENUM('oauth', 'api_key');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."lead_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ledger_entry_type" AS ENUM('decision', 'change_order', 'inspection', 'permit', 'milestone', 'cost_adjustment', 'note');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'read');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."project_status" AS ENUM('lead', 'estimate_sent', 'contracted', 'in_progress', 'punch_list', 'complete', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."schedule_task_status" AS ENUM('pending', 'in_progress', 'complete', 'blocked', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."schedule_task_type" AS ENUM('outdoor', 'indoor', 'framing', 'roofing', 'electrical', 'plumbing', 'insulation', 'drywall', 'flooring', 'cabinetry', 'painting', 'finish_work', 'inspection', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."vision_analysis_mode" AS ENUM('general', 'progress', 'safety', 'material', 'defect', 'estimate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "admin_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	"added_by" text
);

CREATE TABLE IF NOT EXISTS "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" varchar(100),
	"stripe_invoice_id" varchar(100),
	"event_type" varchar(50) NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'usd' NOT NULL,
	"client_email" varchar(255),
	"client_name" varchar(255),
	"description" text,
	"invoice_url" text,
	"invoice_pdf" text,
	"project_id" integer,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "blueprint_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"blueprint_resource_id" varchar(200) NOT NULL,
	"resource_type" varchar(50) DEFAULT 'plan' NOT NULL,
	"title" varchar(500),
	"url" text,
	"metadata" text,
	"attached_by" uuid,
	"visible_to_client" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "blueprint_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_user_id" varchar(320),
	"provider_email" varchar(320),
	"auth_method" "blueprint_auth_method" DEFAULT 'oauth' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"api_key_enc" text,
	"expires_at" timestamp,
	"scopes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blueprint_connections_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"name" varchar(200) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(50),
	"zip" varchar(10),
	"notes" text,
	"lead_source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"client_id" integer,
	"square_footage" numeric(10, 2),
	"project_type" varchar(100),
	"complexity" varchar(20),
	"materials" text,
	"location" varchar(200),
	"additional_notes" text,
	"estimated_low" numeric(12, 2),
	"estimated_mid" numeric(12, 2),
	"estimated_high" numeric(12, 2),
	"labor_cost" numeric(12, 2),
	"materials_cost" numeric(12, 2),
	"permits_cost" numeric(12, 2),
	"contingency" numeric(12, 2),
	"ai_reasoning" text,
	"sent_to_client" boolean DEFAULT false,
	"sent_at" timestamp,
	"approved_by_client" boolean DEFAULT false,
	"approved_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "field_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"author_id" uuid,
	"report_date" timestamp DEFAULT now() NOT NULL,
	"voice_memo_url" text,
	"transcription" text,
	"summary" text,
	"tasks_completed" text,
	"materials_used" text,
	"issues_flagged" text,
	"material_shortages" text,
	"published_to_client" boolean DEFAULT false,
	"published_at" timestamp,
	"photo_urls" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "finish_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer,
	"room" varchar(100),
	"category" varchar(100),
	"item_name" varchar(300) NOT NULL,
	"brand" varchar(200),
	"sku" varchar(100),
	"color_name" varchar(200),
	"image_url" text,
	"unit_price" numeric(10, 2),
	"quantity" numeric(10, 2),
	"total_cost" numeric(12, 2),
	"allowance" numeric(12, 2),
	"budget_delta" numeric(12, 2),
	"client_approved" boolean DEFAULT false,
	"client_approved_at" timestamp,
	"eric_approved" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"author_id" uuid,
	"entry_type" "ledger_entry_type" NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"amount_delta" numeric(12, 2),
	"document_url" text,
	"document_name" text,
	"visible_to_client" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar(300) NOT NULL,
	"description" text,
	"category" varchar(100),
	"unit" varchar(50),
	"quantity_needed" numeric(10, 2),
	"quantity_ordered" numeric(10, 2) DEFAULT '0',
	"quantity_received" numeric(10, 2) DEFAULT '0',
	"unit_price_current" numeric(10, 2),
	"unit_price_budgeted" numeric(10, 2),
	"vendor_name" varchar(200),
	"vendor_sku" varchar(100),
	"vendor_url" text,
	"po_number" varchar(100),
	"ordered_at" timestamp,
	"expected_delivery" timestamp,
	"received_at" timestamp,
	"is_shortage" boolean DEFAULT false,
	"phase_needed" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" uuid,
	"project_id" integer,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'pending',
	"subject" varchar(500),
	"body" text NOT NULL,
	"external_id" varchar(200),
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"read_at" timestamp,
	"failure_reason" text,
	"n8n_workflow_id" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "portfolio_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(300) NOT NULL,
	"category" varchar(100),
	"description" text,
	"short_description" varchar(500),
	"location" varchar(200),
	"completion_year" integer,
	"square_footage" integer,
	"project_value" numeric(12, 2),
	"duration_weeks" integer,
	"cover_image_url" text,
	"gallery_image_urls" text,
	"before_image_urls" text,
	"after_image_urls" text,
	"client_testimonial" text,
	"client_name" varchar(200),
	"featured" boolean DEFAULT false,
	"published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_projects_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'lead' NOT NULL,
	"project_type" varchar(100),
	"address" text,
	"city" varchar(100),
	"state" varchar(50) DEFAULT 'OR',
	"zip" varchar(10),
	"estimated_budget" numeric(12, 2),
	"contracted_budget" numeric(12, 2),
	"actual_cost" numeric(12, 2) DEFAULT '0',
	"estimated_start_date" timestamp,
	"estimated_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"completion_percent" integer DEFAULT 0,
	"client_portal_enabled" boolean DEFAULT true,
	"site_cam_url" text,
	"permit_numbers" text,
	"license_number" varchar(50) DEFAULT 'CCB #246527',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "schedule_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"parent_id" integer,
	"title" varchar(300) NOT NULL,
	"description" text,
	"task_type" "schedule_task_type" DEFAULT 'other',
	"status" "schedule_task_status" DEFAULT 'pending',
	"is_outdoor" boolean DEFAULT false,
	"weather_sensitive" boolean DEFAULT false,
	"planned_start" timestamp,
	"planned_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"duration_days" integer,
	"depends_on" text,
	"sort_order" integer DEFAULT 0,
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "site_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"author_id" uuid,
	"name" varchar(300) DEFAULT 'Untitled Site Plan' NOT NULL,
	"elements" text DEFAULT '[]' NOT NULL,
	"app_state" text DEFAULT '{}' NOT NULL,
	"thumbnail_data_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sub_contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"company" varchar(200),
	"email" varchar(320),
	"phone" varchar(20),
	"trade" varchar(100),
	"license_number" varchar(100),
	"insurance_expiry" timestamp,
	"rating" integer,
	"total_projects_completed" integer DEFAULT 0,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"has_portal_access" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" text,
	"phone" varchar(20),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "vision_studio_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"project_id" integer,
	"mode" "vision_analysis_mode" DEFAULT 'general' NOT NULL,
	"custom_prompt" text,
	"analysis" text NOT NULL,
	"model" varchar(50) NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"image_storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "blueprint_artifacts" ADD CONSTRAINT "blueprint_artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "blueprint_artifacts" ADD CONSTRAINT "blueprint_artifacts_attached_by_users_id_fk" FOREIGN KEY ("attached_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "blueprint_connections" ADD CONSTRAINT "blueprint_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimates" ADD CONSTRAINT "estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "estimates" ADD CONSTRAINT "estimates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "finish_selections" ADD CONSTRAINT "finish_selections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "finish_selections" ADD CONSTRAINT "finish_selections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "site_plans" ADD CONSTRAINT "site_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "site_plans" ADD CONSTRAINT "site_plans_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_clients_user_id" ON "clients" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_estimates_project_id" ON "estimates" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_estimates_client_id" ON "estimates" USING btree ("client_id");

CREATE INDEX IF NOT EXISTS "idx_estimates_created_at" ON "estimates" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "idx_field_reports_project_id" ON "field_reports" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_field_reports_report_date" ON "field_reports" USING btree ("report_date");

CREATE INDEX IF NOT EXISTS "idx_finish_selections_project_id" ON "finish_selections" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_ledger_entries_project_id" ON "ledger_entries" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_materials_project_id" ON "materials" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_materials_is_shortage" ON "materials" USING btree ("is_shortage");

CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_id" ON "notifications" USING btree ("recipient_id");

CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" USING btree ("status");

CREATE INDEX IF NOT EXISTS "idx_notifications_project_id" ON "notifications" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_projects_client_id" ON "projects" USING btree ("client_id");

CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" USING btree ("status");

CREATE INDEX IF NOT EXISTS "idx_schedule_items_project_id" ON "schedule_items" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "idx_schedule_items_status" ON "schedule_items" USING btree ("status");

CREATE INDEX IF NOT EXISTS "idx_schedule_items_planned_start" ON "schedule_items" USING btree ("planned_start");

CREATE INDEX IF NOT EXISTS "idx_users_id_role" ON "users" USING btree ("id","role");;

-- ── SECTION 2: ROW-LEVEL SECURITY ────────────────────────────────────
-- ============================================================
-- Precision Core Builders — Row-Level Security Policies
-- ============================================================
-- Run this SQL in the Supabase SQL editor after applying the
-- Drizzle schema migration (pnpm db:push).
--
-- Design principles:
--   • Admins (role = 'admin' in public.users) have unrestricted access.
--   • Clients can only read/write data belonging to their own account.
--     A client's identity is established by matching auth.uid() to
--     clients.user_id, then following project/client_id foreign keys.
--   • The public can only read published portfolio projects.
--   • All other tables are private by default.
--
-- Helper function: is_admin()
--   Returns TRUE when the calling JWT belongs to a user whose role
--   in public.users is 'admin'.  Uses SECURITY DEFINER so RLS on
--   the users table itself doesn't block the lookup.
--
-- Performance note:
--   The idx_users_id_role index below is critical on Nano tier
--   (t4g.nano) — every admin EXISTS sub-query in every policy
--   would otherwise trigger a table scan on public.users.
-- ============================================================

-- ─── Performance Index (run first — used by every admin check) ─
CREATE INDEX IF NOT EXISTS idx_users_id_role
  ON public.users (id, role);

COMMENT ON INDEX idx_users_id_role IS
  'Supports fast admin role checks in RLS policies. Critical for Nano tier performance when RLS is active.';

-- ─── Helper: is_admin() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ─── Helper: client_id_for_user() ────────────────────────────
-- Returns the clients.id for the authenticated user (or NULL).
CREATE OR REPLACE FUNCTION public.client_id_for_user()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- 1. users
--    • Admins: full access.
--    • Users: can read/update their own row only.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "users_self_select" ON public.users;
CREATE POLICY "users_self_select"
  ON public.users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. clients
--    • Admins: full access.
--    • Clients: can select/update their own row.
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
CREATE POLICY "clients_admin_all"
  ON public.clients FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "clients_self_select" ON public.clients;
CREATE POLICY "clients_self_select"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "clients_self_update" ON public.clients;
CREATE POLICY "clients_self_update"
  ON public.clients FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. projects
--    • Admins: full access.
--    • Clients: can read projects where they are the client AND
--      client_portal_enabled = true.
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
CREATE POLICY "projects_admin_all"
  ON public.projects FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "projects_client_select" ON public.projects;
CREATE POLICY "projects_client_select"
  ON public.projects FOR SELECT
  USING (
    client_id = public.client_id_for_user()
    AND client_portal_enabled = true
  );

-- ============================================================
-- 4. field_reports
--    • Admins: full access.
--    • Clients: can read published reports for their projects.
-- ============================================================
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_reports_admin_all" ON public.field_reports;
CREATE POLICY "field_reports_admin_all"
  ON public.field_reports FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "field_reports_client_select" ON public.field_reports;
CREATE POLICY "field_reports_client_select"
  ON public.field_reports FOR SELECT
  USING (
    published_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 5. schedule_items
--    • Admins: full access.
--    • Clients: can read schedule items for their projects.
-- ============================================================
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_items_admin_all" ON public.schedule_items;
CREATE POLICY "schedule_items_admin_all"
  ON public.schedule_items FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "schedule_items_client_select" ON public.schedule_items;
CREATE POLICY "schedule_items_client_select"
  ON public.schedule_items FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 6. estimates
--    • Admins: full access.
--    • Clients: can read estimates linked to their client record.
-- ============================================================
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimates_admin_all" ON public.estimates;
CREATE POLICY "estimates_admin_all"
  ON public.estimates FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "estimates_client_select" ON public.estimates;
CREATE POLICY "estimates_client_select"
  ON public.estimates FOR SELECT
  USING (client_id = public.client_id_for_user());

-- ============================================================
-- 7. ledger_entries
--    • Admins: full access.
--    • Clients: can read entries marked visible_to_client = true.
-- ============================================================
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_entries_admin_all" ON public.ledger_entries;
CREATE POLICY "ledger_entries_admin_all"
  ON public.ledger_entries FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "ledger_entries_client_select" ON public.ledger_entries;
CREATE POLICY "ledger_entries_client_select"
  ON public.ledger_entries FOR SELECT
  USING (
    visible_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 8. materials
--    • Admins: full access.
--    • Clients: no direct access (materials are internal).
-- ============================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;
CREATE POLICY "materials_admin_all"
  ON public.materials FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 9. portfolio_projects
--    • Admins: full access.
--    • Public: can read published items (is_published = true).
-- ============================================================
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_admin_all" ON public.portfolio_projects;
CREATE POLICY "portfolio_admin_all"
  ON public.portfolio_projects FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "portfolio_public_select" ON public.portfolio_projects;
CREATE POLICY "portfolio_public_select"
  ON public.portfolio_projects FOR SELECT
  USING (published = true);

-- ============================================================
-- 10. sub_contractors
--     • Admins: full access.
--     • All others: no access.
-- ============================================================
ALTER TABLE public.sub_contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_contractors_admin_all" ON public.sub_contractors;
CREATE POLICY "sub_contractors_admin_all"
  ON public.sub_contractors FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 11. finish_selections
--     • Admins: full access.
--     • Clients: read/insert their own selections.
-- ============================================================
ALTER TABLE public.finish_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finish_selections_admin_all" ON public.finish_selections;
CREATE POLICY "finish_selections_admin_all"
  ON public.finish_selections FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "finish_selections_client_select" ON public.finish_selections;
CREATE POLICY "finish_selections_client_select"
  ON public.finish_selections FOR SELECT
  USING (client_id = public.client_id_for_user());

DROP POLICY IF EXISTS "finish_selections_client_insert" ON public.finish_selections;
CREATE POLICY "finish_selections_client_insert"
  ON public.finish_selections FOR INSERT
  WITH CHECK (client_id = public.client_id_for_user());

-- ============================================================
-- 12. notifications
--     • Admins: full access.
--     • Recipients: can read/mark-read their own notifications.
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "notifications_recipient_select" ON public.notifications;
CREATE POLICY "notifications_recipient_select"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_recipient_update" ON public.notifications;
CREATE POLICY "notifications_recipient_update"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================
-- 13. vision_studio_requests
--     • Admins: full access.
--     • Users: can read their own requests.
-- ============================================================
ALTER TABLE public.vision_studio_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vision_requests_admin_all" ON public.vision_studio_requests;
CREATE POLICY "vision_requests_admin_all"
  ON public.vision_studio_requests FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "vision_requests_owner_select" ON public.vision_studio_requests;
CREATE POLICY "vision_requests_owner_select"
  ON public.vision_studio_requests FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 14. billing_events
--     • Admins: full access.
--     • All others: no direct access (webhook-managed only).
-- ============================================================
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_events_admin_all" ON public.billing_events;
CREATE POLICY "billing_events_admin_all"
  ON public.billing_events FOR ALL
  USING (public.is_admin());

-- ============================================================
-- Service-role bypass
-- ============================================================
-- Supabase's service-role key automatically bypasses RLS.
-- The server-side Supabase client (db.ts) uses the service-role
-- key and is therefore not affected by these policies.
-- Client-side code uses the anon key and IS subject to RLS.
-- ============================================================

-- ============================================================
-- 15. admin_emails
--     • Admins: full access (defence in depth — the trigger
--       that auto-assigns admin role reads this table, but UI
--       management is admin-only).
--     • All others: no access.
-- ============================================================
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_emails_admin_all" ON public.admin_emails;
CREATE POLICY "admin_emails_admin_all"
  ON public.admin_emails FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 16. profiles
--     • Users: can read/update their own profile.
--     • Admins: full access.
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 17. site_plans (Excalidraw canvases)
--     • Admins: full access.
--     • Clients: can read plans for their projects.
-- ============================================================
ALTER TABLE public.site_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_plans_admin_all" ON public.site_plans;
CREATE POLICY "site_plans_admin_all"
  ON public.site_plans FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "site_plans_client_select" ON public.site_plans;
CREATE POLICY "site_plans_client_select"
  ON public.site_plans FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 18. blueprint_connections (encrypted OAuth tokens)
--     • Users: can read/update their own connection only.
--     • Admins: full access.
-- ============================================================
ALTER TABLE public.blueprint_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blueprint_connections_admin_all" ON public.blueprint_connections;
CREATE POLICY "blueprint_connections_admin_all"
  ON public.blueprint_connections FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "blueprint_connections_self_select" ON public.blueprint_connections;
CREATE POLICY "blueprint_connections_self_select"
  ON public.blueprint_connections FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "blueprint_connections_self_update" ON public.blueprint_connections;
CREATE POLICY "blueprint_connections_self_update"
  ON public.blueprint_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 19. blueprint_artifacts (linked Blueprint resources)
--     • Admins: full access.
--     • Clients: can read artifacts marked visible_to_client
--       for their projects.
-- ============================================================
ALTER TABLE public.blueprint_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blueprint_artifacts_admin_all" ON public.blueprint_artifacts;
CREATE POLICY "blueprint_artifacts_admin_all"
  ON public.blueprint_artifacts FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "blueprint_artifacts_client_select" ON public.blueprint_artifacts;
CREATE POLICY "blueprint_artifacts_client_select"
  ON public.blueprint_artifacts FOR SELECT
  USING (
    visible_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );


-- ── SECTION 3: ADMIN ROLE ALLOWLIST + AUTH SYNC ──────────────────────
-- Auto-assigns role='admin' to allow-listed emails on signup/login and
-- backfills existing auth.users. Edit the ARRAY[...] to manage admins.
-- ─── 1. Allowlist helper ─────────────────────────────────────
-- Checks hardcoded admin emails AND the admin_emails table.
-- Edit the ARRAY[...] literal to add or remove admins, then re-run
-- this migration; the trigger and backfill below will pick up the
-- change.
CREATE OR REPLACE FUNCTION public.is_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    lower(coalesce(p_email, '')) = ANY (ARRAY[
      'skdev@1commerce.online',
      'erictadlock@precisioncorebuilders.com',
      'eric@precisioncorebuilders.com'
    ])
    OR EXISTS (
      SELECT 1 FROM public.admin_emails
      WHERE lower(email) = lower(coalesce(p_email, ''))
    );
$$;

-- ─── 2. Upsert helper for auth → public.users sync ───────────
-- SECURITY DEFINER so it can write to public.users regardless of
-- the caller's RLS context (the trigger fires under the auth
-- service role, but we keep this explicit for safety).
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_email(NEW.email) THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;

  INSERT INTO public.users (id, email, role, last_signed_in)
  VALUES (NEW.id, NEW.email, v_role, now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        -- Only upgrade to admin from the allowlist; never silently
        -- downgrade an existing admin who isn't on the list.
        role = CASE
          WHEN public.is_admin_email(EXCLUDED.email) THEN 'admin'::public.user_role
          ELSE public.users.role
        END,
        last_signed_in = now(),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- ─── 3. Trigger on auth.users ────────────────────────────────
-- Fires on INSERT (new signup) and UPDATE (email change, magic
-- link confirmation) so allow-listed accounts get the admin role
-- the first time Supabase Auth sees them.
DROP TRIGGER IF EXISTS on_auth_user_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_admin_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- ─── 4. Backfill existing accounts ───────────────────────────
-- Insert a public.users row for any already-existing auth.users
-- entry on the allowlist, or upgrade an existing row to admin.
INSERT INTO public.users (id, email, role, last_signed_in)
SELECT au.id, au.email, 'admin'::public.user_role, now()
FROM auth.users au
WHERE public.is_admin_email(au.email)
ON CONFLICT (id) DO UPDATE
  SET role = 'admin'::public.user_role,
      email = EXCLUDED.email,
      updated_at = now();
