-- Enums
create type user_role as enum ('admin', 'client', 'subcontractor', 'user');
create type project_status as enum ('lead', 'estimate', 'contracted', 'active', 'punch_list', 'complete', 'on_hold', 'cancelled');
create type schedule_task_type as enum ('foundation', 'framing', 'roofing', 'electrical', 'plumbing', 'hvac', 'insulation', 'drywall', 'flooring', 'cabinets', 'painting', 'trim', 'exterior', 'landscaping', 'cleanup', 'inspection', 'other');
create type schedule_task_status as enum ('pending', 'in_progress', 'complete', 'blocked', 'skipped');
create type notification_channel as enum ('email', 'sms', 'push', 'in_app');
create type notification_status as enum ('pending', 'sent', 'failed', 'read');
create type ledger_entry_type as enum ('permit', 'inspection', 'contract', 'change_order', 'invoice', 'payment', 'photo', 'note', 'milestone');

-- users (mirrors auth.users)
create table public.users (
  id            uuid primary key,
  email         varchar(320) not null,
  name          text,
  phone         varchar(20),
  role          user_role not null default 'user',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);

-- admin_emails
create table public.admin_emails (
  email     text primary key,
  added_at  timestamptz not null default now(),
  added_by  text not null default 'system'
);

-- clients
create table public.clients (
  id          serial primary key,
  user_id     uuid references public.users(id) on delete set null,
  name        varchar(200) not null,
  email       varchar(320) not null,
  phone       varchar(20),
  address     text,
  city        varchar(100),
  state       varchar(50),
  zip         varchar(10),
  notes       text,
  lead_source varchar(100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- projects
create table public.projects (
  id                    serial primary key,
  client_id             int not null references public.clients(id) on delete cascade,
  name                  varchar(300) not null,
  description           text,
  status                project_status not null default 'lead',
  project_type          varchar(100),
  address               text,
  city                  varchar(100),
  state                 varchar(50) default 'OR',
  zip                   varchar(10),
  estimated_budget      numeric,
  contracted_budget     numeric,
  actual_cost           numeric default 0,
  estimated_start_date  timestamptz,
  estimated_end_date    timestamptz,
  actual_start_date     timestamptz,
  actual_end_date       timestamptz,
  completion_percent    int default 0,
  client_portal_enabled boolean default true,
  site_cam_url          text,
  permit_numbers        text,
  license_number        varchar(50) default 'CCB #246527',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- estimates
create table public.estimates (
  id                  serial primary key,
  project_id          int references public.projects(id) on delete cascade,
  client_id           int references public.clients(id) on delete set null,
  square_footage      numeric,
  project_type        varchar(100),
  complexity          varchar(20),
  materials           text,
  location            varchar(200),
  additional_notes    text,
  estimated_low       numeric,
  estimated_mid       numeric,
  estimated_high      numeric,
  labor_cost          numeric,
  materials_cost      numeric,
  permits_cost        numeric,
  contingency         numeric,
  ai_reasoning        text,
  sent_to_client      boolean default false,
  sent_at             timestamptz,
  approved_by_client  boolean default false,
  approved_at         timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- field_reports
create table public.field_reports (
  id                  serial primary key,
  project_id          int not null references public.projects(id) on delete cascade,
  author_id           uuid references public.users(id) on delete set null,
  report_date         timestamptz not null default now(),
  voice_memo_url      text,
  transcription       text,
  summary             text,
  tasks_completed     text,
  materials_used      text,
  issues_flagged      text,
  material_shortages  text,
  published_to_client boolean default false,
  published_at        timestamptz,
  photo_urls          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- schedule_items
create table public.schedule_items (
  id               serial primary key,
  project_id       int not null references public.projects(id) on delete cascade,
  parent_id        int references public.schedule_items(id) on delete set null,
  title            varchar(300) not null,
  description      text,
  task_type        schedule_task_type default 'other',
  status           schedule_task_status default 'pending',
  is_outdoor       boolean default false,
  weather_sensitive boolean default false,
  planned_start    timestamptz,
  planned_end      timestamptz,
  actual_start     timestamptz,
  actual_end       timestamptz,
  duration_days    int,
  depends_on       text,
  sort_order       int default 0,
  assigned_to      text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- materials
create table public.materials (
  id                  serial primary key,
  project_id          int references public.projects(id) on delete cascade,
  name                varchar(300) not null,
  description         text,
  category            varchar(100),
  unit                varchar(50),
  quantity_needed     numeric,
  quantity_ordered    numeric default 0,
  quantity_received   numeric default 0,
  unit_price_current  numeric,
  unit_price_budgeted numeric,
  vendor_name         varchar(200),
  vendor_sku          varchar(100),
  vendor_url          text,
  po_number           varchar(100),
  ordered_at          timestamptz,
  expected_delivery   timestamptz,
  received_at         timestamptz,
  is_shortage         boolean default false,
  phase_needed        varchar(100),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ledger_entries
create table public.ledger_entries (
  id               serial primary key,
  project_id       int not null references public.projects(id) on delete cascade,
  author_id        uuid references public.users(id) on delete set null,
  entry_type       ledger_entry_type not null,
  title            varchar(300) not null,
  description      text not null,
  amount_delta     numeric,
  document_url     text,
  document_name    text,
  visible_to_client boolean default true,
  created_at       timestamptz not null default now()
);

-- finish_selections
create table public.finish_selections (
  id                  serial primary key,
  project_id          int not null references public.projects(id) on delete cascade,
  client_id           int references public.clients(id) on delete set null,
  room                varchar(100),
  category            varchar(100),
  item_name           varchar(300) not null,
  brand               varchar(200),
  sku                 varchar(100),
  color_name          varchar(200),
  image_url           text,
  unit_price          numeric,
  quantity            numeric,
  total_cost          numeric,
  allowance           numeric,
  budget_delta        numeric,
  client_approved     boolean default false,
  client_approved_at  timestamptz,
  eric_approved       boolean default false,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- notifications
create table public.notifications (
  id              serial primary key,
  recipient_id    uuid references public.users(id) on delete cascade,
  project_id      int references public.projects(id) on delete cascade,
  channel         notification_channel not null,
  status          notification_status default 'pending',
  subject         varchar(500),
  body            text not null,
  external_id     varchar(200),
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  read_at         timestamptz,
  failure_reason  text,
  n8n_workflow_id varchar(200),
  created_at      timestamptz not null default now()
);

-- portfolio_projects
create table public.portfolio_projects (
  id                  serial primary key,
  title               varchar(300) not null,
  slug                varchar(300) not null unique,
  category            varchar(100),
  description         text,
  short_description   varchar(500),
  location            varchar(200),
  completion_year     int,
  square_footage      int,
  project_value       numeric,
  duration_weeks      int,
  cover_image_url     text,
  gallery_image_urls  text,
  before_image_urls   text,
  after_image_urls    text,
  client_testimonial  text,
  client_name         varchar(200),
  featured            boolean default false,
  published           boolean default false,
  sort_order          int default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- sub_contractors
create table public.sub_contractors (
  id                       serial primary key,
  name                     varchar(200) not null,
  company                  varchar(200),
  email                    varchar(320),
  phone                    varchar(20),
  trade                    varchar(100),
  license_number           varchar(100),
  insurance_expiry         timestamptz,
  rating                   int check (rating between 1 and 5),
  total_projects_completed int default 0,
  notes                    text,
  is_active                boolean default true,
  has_portal_access        boolean default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
