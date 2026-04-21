/**
 * Precision Core Builders — PostgreSQL Schema (Supabase)
 * All 12 production tables. Auth is handled by Supabase Auth;
 * this schema covers application data only.
 *
 * Run migrations via Supabase dashboard SQL editor or `pnpm db:push`
 * once SUPABASE_URL + DATABASE_URL are set in Netlify env.
 */
import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const projectStatusEnum = pgEnum("project_status", [
  "lead",
  "estimate_sent",
  "contracted",
  "in_progress",
  "punch_list",
  "complete",
  "on_hold",
]);

export const scheduleTaskTypeEnum = pgEnum("schedule_task_type", [
  "outdoor",
  "indoor",
  "framing",
  "roofing",
  "electrical",
  "plumbing",
  "insulation",
  "drywall",
  "flooring",
  "cabinetry",
  "painting",
  "finish_work",
  "inspection",
  "other",
]);

export const scheduleTaskStatusEnum = pgEnum("schedule_task_status", [
  "pending",
  "in_progress",
  "complete",
  "blocked",
  "deferred",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "decision",
  "change_order",
  "inspection",
  "permit",
  "milestone",
  "cost_adjustment",
  "note",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "read",
]);

export const leadPriorityEnum = pgEnum("lead_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// ─── 1. Users ─────────────────────────────────────────────────────────────────
// Extends Supabase Auth users. auth.uid() = id here.

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.uid()
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").default("user").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

// ─── 2. Clients ───────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 10 }),
  notes: text("notes"),
  leadSource: varchar("lead_source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 3. Projects ──────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("lead").notNull(),
  projectType: varchar("project_type", { length: 100 }), // e.g. "new build", "remodel", "addition"
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }).default("OR"),
  zip: varchar("zip", { length: 10 }),
  // Budget tracking
  estimatedBudget: decimal("estimated_budget", { precision: 12, scale: 2 }),
  contractedBudget: decimal("contracted_budget", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }).default("0"),
  // Timeline
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  // Progress
  completionPercent: integer("completion_percent").default(0),
  // Portal access
  clientPortalEnabled: boolean("client_portal_enabled").default(true),
  siteCamUrl: text("site_cam_url"),
  // CCB compliance
  permitNumbers: text("permit_numbers"), // comma-separated
  licenseNumber: varchar("license_number", { length: 50 }).default(
    "CCB #246527"
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 4. Field Reports ─────────────────────────────────────────────────────────

export const fieldReports = pgTable("field_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reportDate: timestamp("report_date").defaultNow().notNull(),
  // Voice-to-report pipeline
  voiceMemoUrl: text("voice_memo_url"), // Supabase Storage URL
  transcription: text("transcription"),
  // AI-generated structured report
  summary: text("summary"),
  tasksCompleted: text("tasks_completed"), // JSON array string
  materialsUsed: text("materials_used"), // JSON array string
  issuesFlagged: text("issues_flagged"), // JSON array string
  materialShortages: text("material_shortages"), // JSON array string
  // Publishing
  publishedToClient: boolean("published_to_client").default(false),
  publishedAt: timestamp("published_at"),
  // Attachments (photo URLs from Supabase Storage)
  photoUrls: text("photo_urls"), // JSON array string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 5. Schedule Items (Gantt) ────────────────────────────────────────────────

export const scheduleItems = pgTable("schedule_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // self-reference for sub-tasks
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  taskType: scheduleTaskTypeEnum("task_type").default("other"),
  status: scheduleTaskStatusEnum("status").default("pending"),
  // Weather sensitivity: outdoor tasks are auto-deprioritized on rain forecast
  isOutdoor: boolean("is_outdoor").default(false),
  weatherSensitive: boolean("weather_sensitive").default(false),
  // Timeline
  plannedStart: timestamp("planned_start"),
  plannedEnd: timestamp("planned_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  durationDays: integer("duration_days"),
  // Dependencies (comma-separated schedule_item IDs)
  dependsOn: text("depends_on"),
  // Display order in Gantt
  sortOrder: integer("sort_order").default(0),
  assignedTo: text("assigned_to"), // sub-contractor name or internal
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 6. Estimates ─────────────────────────────────────────────────────────────

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Input parameters
  squareFootage: decimal("square_footage", { precision: 10, scale: 2 }),
  projectType: varchar("project_type", { length: 100 }),
  complexity: varchar("complexity", { length: 20 }), // low | medium | high
  materials: text("materials"), // JSON array string of selected materials
  location: varchar("location", { length: 200 }),
  additionalNotes: text("additional_notes"),
  // AI-generated cost ranges
  estimatedLow: decimal("estimated_low", { precision: 12, scale: 2 }),
  estimatedMid: decimal("estimated_mid", { precision: 12, scale: 2 }),
  estimatedHigh: decimal("estimated_high", { precision: 12, scale: 2 }),
  // Cost breakdown
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  materialsCost: decimal("materials_cost", { precision: 12, scale: 2 }),
  permitsCost: decimal("permits_cost", { precision: 12, scale: 2 }),
  contingency: decimal("contingency", { precision: 12, scale: 2 }),
  // AI reasoning
  aiReasoning: text("ai_reasoning"),
  // Status
  sentToClient: boolean("sent_to_client").default(false),
  sentAt: timestamp("sent_at"),
  approvedByClient: boolean("approved_by_client").default(false),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 7. Ledger Entries (Core Values — Immutable Decision Log) ─────────────────

export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  // For cost adjustments / change orders
  amountDelta: decimal("amount_delta", { precision: 12, scale: 2 }),
  // Document URL (permits, inspection reports, change orders)
  documentUrl: text("document_url"),
  documentName: text("document_name"),
  // Client-visible flag
  visibleToClient: boolean("visible_to_client").default(true),
  // Immutability: entries are never updated after creation
  // createdAt is the canonical timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 8. Materials ─────────────────────────────────────────────────────────────

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // lumber, hardware, roofing, etc.
  unit: varchar("unit", { length: 50 }), // board-ft, sq-ft, each, etc.
  quantityNeeded: decimal("quantity_needed", { precision: 10, scale: 2 }),
  quantityOrdered: decimal("quantity_ordered", {
    precision: 10,
    scale: 2,
  }).default("0"),
  quantityReceived: decimal("quantity_received", {
    precision: 10,
    scale: 2,
  }).default("0"),
  // Pricing
  unitPriceCurrent: decimal("unit_price_current", { precision: 10, scale: 2 }),
  unitPriceBudgeted: decimal("unit_price_budgeted", {
    precision: 10,
    scale: 2,
  }),
  // Vendor
  vendorName: varchar("vendor_name", { length: 200 }),
  vendorSku: varchar("vendor_sku", { length: 100 }),
  vendorUrl: text("vendor_url"),
  // PO linkage
  poNumber: varchar("po_number", { length: 100 }),
  orderedAt: timestamp("ordered_at"),
  expectedDelivery: timestamp("expected_delivery"),
  receivedAt: timestamp("received_at"),
  // Alerts
  isShortage: boolean("is_shortage").default(false),
  phaseNeeded: varchar("phase_needed", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 9. Portfolio Projects (Public Showcase) ──────────────────────────────────

export const portfolioProjects = pgTable("portfolio_projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  category: varchar("category", { length: 100 }), // residential, custom home, renovation, commercial
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  location: varchar("location", { length: 200 }),
  completionYear: integer("completion_year"),
  squareFootage: integer("square_footage"),
  projectValue: decimal("project_value", { precision: 12, scale: 2 }),
  durationWeeks: integer("duration_weeks"),
  // Media (Supabase Storage URLs)
  coverImageUrl: text("cover_image_url"),
  galleryImageUrls: text("gallery_image_urls"), // JSON array string
  beforeImageUrls: text("before_image_urls"), // JSON array string
  afterImageUrls: text("after_image_urls"), // JSON array string
  // Testimonial
  clientTestimonial: text("client_testimonial"),
  clientName: varchar("client_name", { length: 200 }),
  // Display
  featured: boolean("featured").default(false),
  published: boolean("published").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 10. Sub-Contractors ──────────────────────────────────────────────────────

export const subContractors = pgTable("sub_contractors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  trade: varchar("trade", { length: 100 }), // electrical, plumbing, roofing, etc.
  licenseNumber: varchar("license_number", { length: 100 }),
  insuranceExpiry: timestamp("insurance_expiry"),
  // Rating / history
  rating: integer("rating"), // 1-5
  totalProjectsCompleted: integer("total_projects_completed").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  // Portal access (for schedule/briefing delivery)
  hasPortalAccess: boolean("has_portal_access").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 11. Finish Selections (Digital Showroom) ─────────────────────────────────

export const finishSelections = pgTable("finish_selections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  room: varchar("room", { length: 100 }), // kitchen, master bath, living room, etc.
  category: varchar("category", { length: 100 }), // flooring, tile, countertop, cabinet, paint, etc.
  itemName: varchar("item_name", { length: 300 }).notNull(),
  brand: varchar("brand", { length: 200 }),
  sku: varchar("sku", { length: 100 }),
  colorName: varchar("color_name", { length: 200 }),
  imageUrl: text("image_url"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  // Budget delta vs. allowance
  allowance: decimal("allowance", { precision: 12, scale: 2 }),
  budgetDelta: decimal("budget_delta", { precision: 12, scale: 2 }), // positive = over
  // Approval workflow
  clientApproved: boolean("client_approved").default(false),
  clientApprovedAt: timestamp("client_approved_at"),
  ericApproved: boolean("eric_approved").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 12. Notifications ────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: uuid("recipient_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  channel: notificationChannelEnum("channel").notNull(),
  status: notificationStatusEnum("status").default("pending"),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  // External delivery
  externalId: varchar("external_id", { length: 200 }), // SendGrid/Twilio message ID
  // Scheduling
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  failureReason: text("failure_reason"),
  // n8n workflow reference
  n8nWorkflowId: varchar("n8n_workflow_id", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type FieldReport = typeof fieldReports.$inferSelect;
export type InsertFieldReport = typeof fieldReports.$inferInsert;

export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type InsertScheduleItem = typeof scheduleItems.$inferInsert;

export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = typeof estimates.$inferInsert;

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

export type PortfolioProject = typeof portfolioProjects.$inferSelect;
export type InsertPortfolioProject = typeof portfolioProjects.$inferInsert;

export type SubContractor = typeof subContractors.$inferSelect;
export type InsertSubContractor = typeof subContractors.$inferInsert;

export type FinishSelection = typeof finishSelections.$inferSelect;
export type InsertFinishSelection = typeof finishSelections.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Vision Studio ───────────────────────────────────────────────────────────

export const visionAnalysisModeEnum = pgEnum("vision_analysis_mode", [
  "general",
  "progress",
  "safety",
  "material",
  "defect",
  "estimate",
]);

export const visionStudioRequests = pgTable("vision_studio_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  projectId: integer("project_id"),
  mode: visionAnalysisModeEnum("mode").notNull().default("general"),
  customPrompt: text("custom_prompt"),
  analysis: text("analysis").notNull(),
  model: varchar("model", { length: 50 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  imageStoragePath: text("image_storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VisionStudioRequest = typeof visionStudioRequests.$inferSelect;
export type InsertVisionStudioRequest =
  typeof visionStudioRequests.$inferInsert;

// ─── Billing Events (Stripe Webhook Records) ────────────────────────────────

export const billingEvents = pgTable("billing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: varchar("stripe_event_id", { length: 100 }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 100 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  clientEmail: varchar("client_email", { length: 255 }),
  clientName: varchar("client_name", { length: 255 }),
  description: text("description"),
  invoiceUrl: text("invoice_url"),
  invoicePdf: text("invoice_pdf"),
  projectId: integer("project_id"),
  metadata: text("metadata"), // JSONB stored as text for drizzle compat
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BillingEvent = typeof billingEvents.$inferSelect;
export type InsertBillingEvent = typeof billingEvents.$inferInsert;

// ─── Site Plans (Excalidraw canvas data) ─────────────────────────────────────

export const sitePlans = pgTable("site_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 300 })
    .notNull()
    .default("Untitled Site Plan"),
  /** JSON-serialised Excalidraw elements array */
  elements: text("elements").notNull().default("[]"),
  /** JSON-serialised Excalidraw appState partial */
  appState: text("app_state").notNull().default("{}"),
  /** Base-64 PNG thumbnail (small, generated on save) */
  thumbnailDataUrl: text("thumbnail_data_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SitePlan = typeof sitePlans.$inferSelect;
export type InsertSitePlan = typeof sitePlans.$inferInsert;
