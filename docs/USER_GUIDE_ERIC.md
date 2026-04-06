
# Precision Core Builders: Digital Foreman Platform User Guide

Welcome, Eric. This is your complete toolset for running Precision Core Builders operations digitally. Everything you need is here — from field reporting to client billing to weather-aware scheduling.

---

## Quick Start (First 5 Minutes)

1. **Log in** at https://precision-core.netlify.app/admin
2. **Dashboard** → Check your KPIs and active projects
3. **Voice-to-Report** → Record a field memo (your first tool)
4. **Projects** → View all current jobs
5. **Portal** → Show your client the live site camera, finish selections, budget tracking

That's it. Everything else builds from these five actions.

---

## Core Features & How to Use Them

### 1. Voice-to-Report (Field Reporting)

**What it does:** You record a voice memo on-site. AI transcribes it, categorizes it, and creates a daily field report automatically. No typing, no photos, no friction.

**How to use it:**

1. Go to **Admin → Field Reports → New Report**
2. Select the **project** from the dropdown
3. Click the **red record button** — speak for 30 seconds to 5 minutes about:
   - What you accomplished today
   - What's next
   - Material issues or delays
   - Subcontractor notes
   - Client observations
4. Click **Stop** when done
5. AI processes and saves automatically
6. Your client **sees the report in their portal** within 60 seconds

**Pro tips:**
- Speak naturally — AI understands construction language
- Voice notes are timestamped and archived forever
- If you notice a material shortage in your report, the system flags it for procurement automatically
- Each report updates your project's "Core Values Ledger" (the immutable decision log)

---

### 2. Weather-Responsive Scheduling

**What it does:** Rain forecast for Tuesday? The system automatically deprioritizes outdoor tasks and moves interior work up. Your schedule adapts to weather in real time.

**How to use it:**

1. Go to **Admin → Schedule → Gantt Chart**
2. You see all tasks in a visual timeline:
   - Green = completed tasks
   - Blue = in-progress tasks
   - Gray = planned (future) tasks
   - **Yellow = weather-dependent** (roofing, exterior painting, concrete)
3. **Drag tasks left/right** to reschedule (no form filling needed)
4. System checks 7-day Eugene weather forecast automatically
5. Yellow tasks are **automatically deprioritized** if rain is predicted
6. Your clients see the updated schedule in real-time

**Pro tips:**
- Mark tasks as "weather-dependent" when you create them
- Schedule has full team visibility — subs see their assignments immediately
- Rain rescheduling is automatic but you can override any time

---

### 3. AI Project Estimator (Lead Generation)

**What it does:** Homeowners get an instant, AI-powered estimate for their project. They see the price range, cost breakdown, and Eric's reasoning. Then they can request a free on-site estimate.

**How to use it:**

**For yourself (to generate leads):**
1. Share the link: `precision-core.netlify.app/estimator`
2. Embed it on your website
3. Share on social media, Google Local Services, and Nextdoor
4. Each person who uses it becomes a potential lead

**For your team:**
1. Go to **Admin → Estimates → List**
2. You see all estimates generated
3. Each estimate shows:
   - Customer's project type and budget
   - Cost breakdown (labor, materials, permits, contingency)
   - AI reasoning for the estimate
   - Customer contact info (if they requested a quote)

**Pro tips:**
- Estimator uses Eugene, OR market data by default (accurate for your area)
- All estimates are archived — you can reference them later
- When a customer requests an on-site estimate, they go into your CRM (coming soon)

---

### 4. Admin Command Center (Dashboard)

**What it does:** One screen showing everything: active projects, KPIs (revenue, timeline health, completion rate), recent activity, lead scores, and AI insights.

**How to use it:**

1. Go to **Admin → Dashboard**
2. See your **KPI cards** at the top:
   - Active Projects (count)
   - Revenue This Month ($ total)
   - Completion Rate (% on-time)
   - Pipeline Value (projects in planning)
3. Scroll down to see:
   - **Recent Field Reports** → voice memos from the past 3 days
   - **Lead Scoring Panel** → AI scores incoming leads
   - **AI Chat** (bottom right) → Ask "What's my revenue trend?" or "Which projects are at risk?"

**Pro tips:**
- Refresh the page to see latest real-time updates
- AI Chat remembers your project data — ask complex questions
- Use this for morning briefings and end-of-day reviews

---

### 5. Vision Studio (Photo Analysis)

**What it does:** Upload a photo from a jobsite. AI analyzes it for quality issues, material consistency, code compliance, and finishes. Instant feedback.

**How to use it:**

1. Go to **Admin → Vision Studio**
2. Click **Upload Photo** (or drag and drop)
3. Select the **analysis mode**:
   - **General** → Overall site inspection and quality check
   - **Materials** → Identify materials and check consistency
   - **Finishes** → Paint, trim, flooring quality
   - **Structural** → Framing, connections, load-bearing
   - **Safety** → Hazards, code compliance, PPE issues
   - **Timeline** → Progress vs. schedule (use for client updates)
4. AI analyzes in 5–15 seconds
5. Full report is saved and linked to the project

**Pro tips:**
- Use finishes mode for client portal screenshots
- Use structural mode before inspections
- All photos are archived in the project — great for portfolio later

---

### 6. Client Portal (Concierge Experience)

**What it does:** Your clients see everything: project progress, budget tracking, schedule, finish options, and live site camera. You control what they see. Zero confusion.

**How to set it up:**

1. Go to **Admin → Projects → [Select Project] → Client Portal Settings**
2. Enable:
   - Live site camera (if you have one)
   - Finish selector (showroom)
   - Budget tracker
   - Timeline (Gantt chart)
3. Copy the portal link and send to your client
4. Client logs in (link only, no password)

**What your client can do:**
- **View Progress** → Photos, field reports, timeline
- **Select Finishes** → Choose paint colors, tile, fixtures with live budget impact
- **See Budget** → All invoices, change orders, contingency
- **Track Timeline** → Which tasks are done, what's next, when you'll finish
- **Message You** → Built-in messaging (you respond in Admin)

**Pro tips:**
- Client sees updates within 60 seconds of your field report
- Budget impacts appear immediately when they select a finish
- All client activity is logged (approvals, decisions, changes)

---

### 7. Project Management (Full Details)

**What it does:** Every project has a master record: timeline, budget, team, tasks, decisions, and documents.

**How to use it:**

1. Go to **Admin → Projects → [Select Project]**
2. You see all tabs:
   - **Overview** → Photos, description, dates, status
   - **Team** → Contractors, subs, crew assignments
   - **Schedule** → Gantt chart for this project only
   - **Materials** → What you've bought, what's pending, costs
   - **Billing** → Invoices, payments, change orders
   - **Ledger** → Immutable log of all decisions and approvals
   - **Portal** → Settings for client access

**Pro tips:**
- Ledger is your insurance policy — every decision is timestamped
- Use ledger for disputes, inspections, change order justification
- All dates auto-sync to schedule (move a task, dates update everywhere)

---

### 8. Material Procurement (Vendor Management)

**What it does:** You log the materials your projects need. AI monitors prices from multiple vendors. When a better deal appears or a delivery is delayed, you get alerted.

**How to use it:**

1. Go to **Admin → Materials → New Item**
2. Enter:
   - Project
   - Material name
   - Quantity and unit
   - Target vendor(s)
3. System tracks:
   - Current price (live market data)
   - Best price available
   - Lead time
   - Delivery status
4. When you need it, click **Order** (integrates with your vendor account eventually)

**Pro tips:**
- Mark materials as "critical" if they block the schedule
- AI suggests cheaper alternatives automatically
- When prices drop, you get notified

---

### 9. Billing & Invoicing

**What it does:** Milestone-based invoicing. You approve a task as complete. Invoice generates automatically. Client pays one click. No manual invoicing.

**How to use it:**

1. Go to **Admin → Projects → [Project] → Billing**
2. You see all milestones:
   - Foundation complete ($X)
   - Framing complete ($X)
   - Systems rough-in ($X)
   - Finishes ($X)
3. When a milestone is done, click **Mark Complete**
4. Invoice generates automatically and is sent to client
5. Client approves and pays via Stripe (one-click)
6. Money is in your account within 24 hours

**Pro tips:**
- You control milestone amounts and dates
- Client sees invoice in portal immediately
- All payments are backed up forever

---

### 10. Sub-Contractor Management

**What it does:** Subs see only their assigned tasks, schedule, and access codes. No confusion, no missed starts.

**How to use it:**

1. Go to **Admin → Subs → Add**
2. Enter sub name, specialty, contact
3. Assign them to tasks on your schedule
4. System sends them:
   - Their task list for the week
   - Start dates and times
   - Site access codes
   - Safety briefing
   - Your contact info
5. They confirm receipt via SMS

**Pro tips:**
- Subs get automatic reminders 24 hours before their assignment
- Weather delays update their schedule automatically
- All sub communication is logged

---

### 11. Portfolio & Case Studies

**What it does:** Photos from Vision Studio and project completions automatically feed into a portfolio showcase.

**How to use it:**

1. Go to **Admin → Portfolio**
2. When a project is complete, click **Publish to Portfolio**
3. System pulls best photos, creates a case study:
   - Before/after
   - Timeline
   - Budget
   - Scope
   - Result
4. Your website's portfolio section updates automatically

**Pro tips:**
- Portfolio drives new leads (proven work)
- Photos are organized by category (kitchen, bath, whole-home, etc.)

---

### 12. AI Chat (Digital Foreman)

**What it does:** Ask questions about your business in plain English. AI answers with data from your projects.

**How to use it:**

- **"How much revenue did we do last month?"**
- **"Which projects are behind schedule?"**
- **"What's our average project cost?"**
- **"Who's scheduled for tomorrow?"**
- **"What was the issue on the Riverside project?"**

**How to access:**
1. Go to **Admin → Dashboard**
2. Look for the **AI Chat** box (bottom right)
3. Type your question
4. AI responds with data

---

## Integration With Your Existing Systems

### Stripe
All invoicing and payments go through Stripe. You receive payments within 24 hours. No transaction fees for invoicing — only standard Stripe card fees on customer payments.

### n8n (Automation)
Your n8n instance can trigger off events:
- Project created → Notify team
- Field report filed → Update client portal
- Material arrived → Mark in inventory
- Invoice paid → Update financials

(n8n workflows are set up in your account. Contact me to configure specific automations.)

### Supabase (Database)
All your data lives in Supabase. Encrypted, backed up, HIPAA-compliant. You own it. You can export it anytime.

---

## Mobile Experience

The entire platform works on mobile:
- iPhone/Android: Full responsive design
- Portrait/Landscape: Optimized layouts
- Offline: Voice recording works offline, syncs when back online
- PWA: Install as an app on your home screen

---

## Keyboard Shortcuts & Tips

| Action | Shortcut |
|--------|----------|
| Jump to Dashboard | `D` |
| New Field Report | `V` |
| New Project | `P` |
| Search | `Cmd+K` or `Ctrl+K` |
| Open AI Chat | `?` |

---

## Security & Privacy

- **Your data is yours.** Encrypted at rest, encrypted in transit. No third-party analytics.
- **Client data is protected.** RLS (Row-Level Security) means clients only see their projects.
- **All changes are logged.** Ledger tracks who did what, when. Perfect for disputes.
- **Two-factor auth** is available in Settings (recommended for security).

---

## Common Workflows

### Workflow: Start a New Project

1. Go to **Admin → Projects → New**
2. Fill in: name, client, start date, estimated end date, budget
3. Upload reference photos
4. Assign team members
5. Create tasks on the schedule
6. Create milestones for invoicing
7. Add subs
8. Send client portal link
9. Done — client sees everything

Time: ~15 minutes.

---

### Workflow: End-of-Day Site Update

1. Go to **Admin → Field Reports → New**
2. Record voice memo (2 min)
3. AI creates report (30 sec)
4. Client sees update in portal (< 1 min)
5. Your ledger is updated

Time: 3 minutes.

---

### Workflow: Handle a Client Question About Budget

1. Client asks in portal: "Can we upgrade the countertops?"
2. You get notified immediately
3. Go to **Admin → Finishes Selector**
4. Select new countertop option
5. System shows budget impact: "+$3,500"
6. You message client back: "Yes, we can. That's +$3.5K, total now $XX,XXX."
7. Client approves
8. Ledger is updated with the decision
9. Invoice adjusts automatically

Time: 5 minutes.

---

## What's Coming (Roadmap)

- **Google Local Services integration** → Ads automatically use your portfolio
- **Automated invoicing** → Recurring billings for long projects
- **Impact.com affiliate tracking** → Commission tracking for referrals
- **Competitor pricing alerts** → Know when subs/vendors change prices
- **Video walkthroughs** → Auto-generate client videos from your photos

---

## Support & Troubleshooting

### The platform isn't loading?
- Refresh the page
- Clear your browser cache
- Try a different browser
- Check your internet connection

### I can't see real-time updates?
- Supabase Realtime may be temporarily degraded
- Refresh the page to manually sync
- Check the "Connection Status" indicator (top right, if connected)

### A task didn't save?
- Check your internet connection
- Try again
- Contact support with the project ID and time of the issue

### I need to export my data?
Go to **Admin → Settings → Data Export** and download your complete project database as JSON or CSV.

---

## Your Next Steps

1. **Log in** at https://precision-core.netlify.app/admin
2. **Create your first project** (or click on an existing one)
3. **Record a voice-to-report** from your next site visit
4. **Share the estimator link** with someone asking for a quote
5. **Invite a client** to their portal
6. **Ask the AI Chat** a question about your business

You've got a fully operational digital construction company now. No friction, no double-entry data, no lost field notes.

---

**Built with precision. For precision. By Eric.**

*Questions? This guide is always in your account under Admin → Help.*
