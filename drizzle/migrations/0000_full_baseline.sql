CREATE TYPE "public"."blueprint_auth_method" AS ENUM('oauth', 'api_key');--> statement-breakpoint
CREATE TYPE "public"."lead_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('decision', 'change_order', 'inspection', 'permit', 'milestone', 'cost_adjustment', 'note');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('lead', 'estimate_sent', 'contracted', 'in_progress', 'punch_list', 'complete', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."schedule_task_status" AS ENUM('pending', 'in_progress', 'complete', 'blocked', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."schedule_task_type" AS ENUM('outdoor', 'indoor', 'framing', 'roofing', 'electrical', 'plumbing', 'insulation', 'drywall', 'flooring', 'cabinetry', 'painting', 'finish_work', 'inspection', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."vision_analysis_mode" AS ENUM('general', 'progress', 'safety', 'material', 'defect', 'estimate');--> statement-breakpoint
CREATE TABLE "admin_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
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
--> statement-breakpoint
CREATE TABLE "blueprint_artifacts" (
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
--> statement-breakpoint
CREATE TABLE "blueprint_connections" (
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
--> statement-breakpoint
CREATE TABLE "clients" (
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
--> statement-breakpoint
CREATE TABLE "estimates" (
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
--> statement-breakpoint
CREATE TABLE "field_reports" (
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
--> statement-breakpoint
CREATE TABLE "finish_selections" (
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
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
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
--> statement-breakpoint
CREATE TABLE "materials" (
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
--> statement-breakpoint
CREATE TABLE "notifications" (
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
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
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
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
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
--> statement-breakpoint
CREATE TABLE "schedule_items" (
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
--> statement-breakpoint
CREATE TABLE "site_plans" (
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
--> statement-breakpoint
CREATE TABLE "sub_contractors" (
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
--> statement-breakpoint
CREATE TABLE "users" (
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
--> statement-breakpoint
CREATE TABLE "vision_studio_requests" (
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
--> statement-breakpoint
ALTER TABLE "blueprint_artifacts" ADD CONSTRAINT "blueprint_artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_artifacts" ADD CONSTRAINT "blueprint_artifacts_attached_by_users_id_fk" FOREIGN KEY ("attached_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_connections" ADD CONSTRAINT "blueprint_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_selections" ADD CONSTRAINT "finish_selections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finish_selections" ADD CONSTRAINT "finish_selections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_plans" ADD CONSTRAINT "site_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_plans" ADD CONSTRAINT "site_plans_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_user_id" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_estimates_project_id" ON "estimates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_estimates_client_id" ON "estimates" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_estimates_created_at" ON "estimates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_field_reports_project_id" ON "field_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_field_reports_report_date" ON "field_reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "idx_finish_selections_project_id" ON "finish_selections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entries_project_id" ON "ledger_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_materials_project_id" ON "materials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_materials_is_shortage" ON "materials" USING btree ("is_shortage");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_id" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_project_id" ON "notifications" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_projects_client_id" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_schedule_items_project_id" ON "schedule_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_items_status" ON "schedule_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_schedule_items_planned_start" ON "schedule_items" USING btree ("planned_start");--> statement-breakpoint
CREATE INDEX "idx_users_id_role" ON "users" USING btree ("id","role");