# Precision Core Builders: Project TODO

## Phase 1: Foundation & Design System

- [ ] Set up Tailwind CSS 4 with custom "Quiet Luxury" color palette
- [ ] Implement custom typography (Playfair Display + Inter)
- [ ] Create design tokens and CSS variables in `client/src/index.css`
- [ ] Set up Framer Motion for micro-interactions and animations
- [ ] Implement Supabase Auth with role-based access (admin/user)
- [ ] Create DashboardLayout component for Eric's Command Center
- [ ] Build landing page with "Quiet Luxury" aesthetic and cinematic video backgrounds
- [ ] Set up error boundaries and error handling

## Phase 2: Core Operations (Field Reporting & Scheduling)

- [ ] Implement voice-to-report system (Whisper transcription)
- [ ] Build Gemini integration for field report generation
- [ ] Create Netlify Function for `/api/voice-to-report`
- [ ] Build Gantt chart component with drag-and-drop
- [ ] Implement weather-responsive scheduling logic
- [ ] Integrate OpenWeatherMap API for Eugene, OR weather
- [ ] Create Netlify Function for `/api/weather-schedule`
- [ ] Build field report UI for Eric to review and publish
- [ ] Implement real-time updates to client portal via Supabase Realtime
- [ ] Create ledger entry system for all field report actions

## Phase 3: Client Experience (Portal & Estimator)

- [ ] Build client portal landing page with project timeline
- [ ] Create live project timeline/Gantt view for clients
- [ ] Implement digital finish selection manager component
- [ ] Build budget impact calculator for finish selections
- [ ] Create AI Project Estimator UI
- [ ] Implement Netlify Function for `/api/estimate-project`
- [ ] Build real-time cost range calculations based on project parameters
- [ ] Create "Core Values" ledger component for transparent decision tracking
- [ ] Implement immutable ledger entries in database
- [ ] Add milestone-based automated billing UI

## Phase 4: Automation (Procurement & Sub-Contractors)

- [ ] Design material procurement database schema
- [ ] Build material procurement UI for Eric
- [ ] Implement Netlify Function for `/api/material-procurement`
- [ ] Integrate vendor pricing APIs (Home Depot, Lowe's, etc.)
- [ ] Create AI-driven vendor suggestion system
- [ ] Build n8n workflow for sub-contractor scheduling
- [ ] Implement SMS/Email notification system via n8n
- [ ] Create sub-contractor portal for site access codes and briefings
- [ ] Build automated PO draft generation
- [ ] Implement material shortage alerts

## Phase 5: Analytics & Portfolio (Command Center & Showcase)

- [ ] Build owner Command Center dashboard layout
- [ ] Implement AI lead prioritization system
- [ ] Create Netlify Function for `/api/lead-score`
- [ ] Build resource orchestration UI (sub-contractor scheduling)
- [ ] Implement profitability tracking dashboard (estimated vs. actual)
- [ ] Create LLM-powered search functionality
- [ ] Build project portfolio showcase page
- [ ] Implement 360-degree project walkthroughs (Three.js or similar)
- [ ] Create before/after image sliders
- [ ] Add project testimonials and case studies

## Phase 6: Authentication & Security

- [ ] Implement Supabase Auth login/logout flows
- [ ] Set up Row-Level Security (RLS) policies for data isolation
- [ ] Create admin-only procedures and middleware
- [ ] Implement secure session management
- [ ] Add CSRF protection
- [ ] Implement rate limiting for API endpoints
- [ ] Set up audit logging for all sensitive operations
- [ ] Create compliance documentation for Oregon CCB #246527

## Phase 7: Integration & Automation

- [ ] Set up n8n self-hosted or cloud instance
- [ ] Create n8n workflows for lead intake
- [ ] Build n8n workflows for project milestone notifications
- [ ] Implement n8n workflows for sub-contractor comms
- [ ] Create n8n workflows for vendor outreach
- [ ] Set up webhook integrations between Supabase and n8n
- [ ] Implement automated review request triggers

## Phase 8: Advanced Features

- [ ] Implement live site-cam integration (streaming setup)
- [ ] Build site-cam viewer component in client portal
- [ ] Create change order management system
- [ ] Implement digital approval workflow for change orders
- [ ] Build payment integration (Stripe/PayPal for Business)
- [ ] Create invoice generation and delivery system
- [ ] Implement project budget tracking and alerts
- [ ] Build cost variance analysis

## Phase 9: Testing & Optimization

- [ ] Write Vitest tests for all tRPC procedures
- [ ] Write Vitest tests for voice-to-report workflow
- [ ] Write Vitest tests for weather scheduling logic
- [ ] Write Vitest tests for cost estimation
- [ ] Write Vitest tests for lead scoring
- [ ] Implement E2E tests for critical user flows
- [ ] Performance optimization (Lighthouse score > 90)
- [ ] SEO optimization (meta tags, structured data)
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

## Phase 10: Deployment & Documentation

- [ ] Set up GitHub CI/CD pipeline
- [ ] Configure Netlify deployment
- [ ] Set up environment variables in Netlify dashboard
- [ ] Create deployment documentation
- [ ] Write API documentation for tRPC procedures
- [ ] Create user guides for Eric (admin) and clients
- [ ] Set up monitoring and error tracking (Sentry)
- [ ] Create runbook for common operations

## Phase 11: Polish & Launch

- [ ] Cinematic video background optimization
- [ ] Micro-interaction refinement
- [ ] Loading state polish
- [ ] Error message clarity
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Performance profiling and optimization
- [ ] Final security audit
- [ ] Launch preparation and go-live checklist

## Database Schema Tasks

- [ ] Create `users` table (admin/user roles)
- [ ] Create `projects` table (project metadata, budget, timeline)
- [ ] Create `clients` table (client info, project history)
- [ ] Create `field_reports` table (voice memos, transcriptions)
- [ ] Create `materials` table (inventory, vendors, pricing)
- [ ] Create `schedule_items` table (Gantt tasks, dependencies)
- [ ] Create `estimates` table (saved estimates with cost breakdowns)
- [ ] Create `ledger_entries` table (immutable decision log)
- [ ] Create `portfolio_projects` table (completed projects, media)
- [ ] Create `sub_contractors` table (vendor info, contact, schedule)
- [ ] Create `finish_selections` table (client finish choices, budget impact)
- [ ] Create `notifications` table (alerts, messages, delivery status)

## Netlify Functions to Build

- [ ] `/api/voice-to-report` - Whisper + Gemini integration
- [ ] `/api/estimate-project` - Cost calculation engine
- [ ] `/api/weather-schedule` - Weather API + scheduling logic
- [ ] `/api/material-procurement` - Vendor pricing + PO generation
- [ ] `/api/lead-score` - AI lead prioritization
- [ ] `/api/generate-invoice` - Invoice generation
- [ ] `/api/send-notification` - SMS/Email via n8n

## UI Components to Build

- [ ] GanttChart (weather-responsive)
- [ ] FinishSelector (digital showroom)
- [ ] CoreValuesLedger (transparent log)
- [ ] SiteCamViewer (live camera feed)
- [ ] ProjectEstimator (interactive cost calculator)
- [ ] CommandCenterDashboard (admin hub)
- [ ] ClientPortalTimeline (project progress)
- [ ] BeforeAfterSlider (project showcase)
- [ ] VoiceRecorder (field memo capture)
- [ ] MaterialProcurementUI (PO management)
- [ ] LeadPrioritizationBoard (admin lead management)
- [ ] ProfitabilityDashboard (cost tracking)

## Notes

- All voice transcription and AI processing must be done server-side (Netlify Functions)
- Real-time updates use Supabase Realtime subscriptions
- All sensitive data encrypted at rest and in transit
- Row-Level Security ensures data isolation between clients
- n8n workflows handle all external integrations and notifications
- Design system must be consistently applied across all pages
- Performance optimization critical for mobile field use
