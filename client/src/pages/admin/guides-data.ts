/**
 * Admin Guides — Comprehensive reference for every system.
 * Written for Eric: direct, zero fluff, get-it-done.
 */

import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  DollarSign,
  HardHat,
  Layers,
  Package,
  Pencil,
  Shield,
  Users,
  Wrench,
  Mic,
  Cloud,
  FileText,
  Bell,
  Camera,
  CreditCard,
  Lock,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

export type GuideStep = {
  action: string;
  detail?: string;
};

export type GuideSection = {
  heading: string;
  body?: string;
  steps?: GuideStep[];
  tips?: string[];
  warning?: string;
};

export type Guide = {
  id: string;
  title: string;
  icon: LucideIcon;
  tagline: string;
  path: string; // admin route this guide covers
  sections: GuideSection[];
};

// ── Guide Data ────────────────────────────────────────────────────────────

export const GUIDES: Guide[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMAND CENTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "command-center",
    title: "Command Center",
    icon: HardHat,
    tagline: "Your daily briefing. Everything at a glance.",
    path: "/admin",
    sections: [
      {
        heading: "What This Is",
        body: "Your morning dashboard. Open it before you leave the house. It shows active project count, total budget vs. actual spend, material shortages, and the latest field reports — all in one screen.",
      },
      {
        heading: "KPI Cards",
        body: "The four cards across the top are your vitals:",
        steps: [
          { action: "Active Projects", detail: "How many jobs are currently in progress. If this number surprises you, something slipped through." },
          { action: "Total Revenue", detail: "Sum of all invoiced amounts across active and completed projects." },
          { action: "Budget Health", detail: "Green = under budget. Yellow = within 10%. Red = over. Don't let it go red." },
          { action: "Open Tasks", detail: "Unfinished action items across all projects. Keep this number dropping." },
        ],
      },
      {
        heading: "Budget Chart",
        body: "Bar chart comparing estimated vs. actual spend per project. If a bar's actual (dark) exceeds its estimate (light), that project is bleeding money. Click any bar to jump directly to that project.",
      },
      {
        heading: "Recent Activity Feed",
        body: "Last 10 actions across the system — new reports filed, materials ordered, client approvals, schedule changes. This is your audit trail. If something happened, it's here.",
      },
      {
        heading: "Material Shortages",
        body: "Bottom section flags any materials running low on active projects. Each item shows the project, what's short, and quantity needed. Click to go straight to the Materials page and place the order.",
        warning: "If you see a shortage for a project that starts this week, handle it NOW. Don't wait for the automated PO.",
      },
      {
        heading: "Quick Actions",
        tips: [
          "\"+ New Project\" — start a new job right from here",
          "\"+ Field Report\" — file a report without navigating away",
          "Click any project name to drill into its detail page",
          "The page auto-refreshes every 60 seconds. No need to hit reload.",
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROJECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "projects",
    title: "Projects",
    icon: ClipboardList,
    tagline: "Every job you're running. Create, track, close.",
    path: "/admin/projects",
    sections: [
      {
        heading: "Project List",
        body: "Shows all projects — active, paused, and completed. Each row shows the client name, status, budget, and last activity date. Use the status filter tabs at the top to narrow it down.",
      },
      {
        heading: "Creating a New Project",
        steps: [
          { action: "Click \"+ New Project\"" },
          { action: "Enter project name", detail: "Use the format: [Client Last Name] — [Job Type]. Example: \"Johnson — Kitchen Remodel\"" },
          { action: "Set the client", detail: "Pick from existing clients or create a new one inline." },
          { action: "Enter estimated budget", detail: "This is your bid number. It locks in as the baseline for budget tracking." },
          { action: "Set start date and target completion" },
          { action: "Add project address", detail: "This feeds the weather system. Get it right." },
          { action: "Hit Save" },
        ],
        tips: [
          "The project address drives weather-responsive scheduling. Wrong address = wrong weather data = bad schedule adjustments.",
          "Budget can be updated later, but every change is logged in the Ledger.",
        ],
      },
      {
        heading: "Project Detail Page",
        body: "Click any project to see everything about it:",
        steps: [
          { action: "Overview tab", detail: "Budget summary, timeline, client info, and milestone progress bar." },
          { action: "Field Reports tab", detail: "Every report filed for this project, newest first." },
          { action: "Materials tab", detail: "All materials allocated, ordered, and delivered for this job." },
          { action: "Schedule tab", detail: "Gantt-style view of tasks with weather overlays." },
          { action: "Documents tab", detail: "Permits, contracts, photos, inspection reports." },
          { action: "Financials tab", detail: "Invoices sent, payments received, change orders." },
        ],
      },
      {
        heading: "Project Statuses",
        steps: [
          { action: "Planning", detail: "Bid accepted, not yet started. Permits, materials, scheduling phase." },
          { action: "Active", detail: "Boots on the ground. Work in progress." },
          { action: "Paused", detail: "Waiting on client decision, permits, weather hold, etc." },
          { action: "Punch List", detail: "Main work done. Working through final items." },
          { action: "Completed", detail: "Job's done. Final invoice sent." },
        ],
        warning: "Moving to \"Completed\" triggers the final invoice workflow. Make sure the punch list is actually clear before you flip it.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLIENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "clients",
    title: "Clients",
    icon: Users,
    tagline: "Your client roster. Contact info, project history, portal access.",
    path: "/admin/clients",
    sections: [
      {
        heading: "What This Is",
        body: "Every client you've ever worked with. Active clients show at the top. Each entry has their contact info, linked projects, and whether they have portal access enabled.",
      },
      {
        heading: "Adding a Client",
        steps: [
          { action: "Click \"+ New Client\"" },
          { action: "Enter full name, email, and phone", detail: "Email is required — it's how they access the Client Portal." },
          { action: "Add property address", detail: "If different from project address." },
          { action: "Set communication preference", detail: "Email, phone, or text. The system uses this for automated notifications." },
          { action: "Save" },
        ],
      },
      {
        heading: "Client Portal Access",
        body: "Each client gets their own portal login. From here you control what they see:",
        steps: [
          { action: "Toggle portal access on/off", detail: "Turning it on sends them an invite email with login instructions." },
          { action: "Live Site-Cam", detail: "Enable/disable their camera access per project." },
          { action: "Report visibility", detail: "Choose which field reports they can see. Some are internal-only." },
          { action: "Selection Manager", detail: "When enabled, they can pick finishes and see budget impacts in real time." },
        ],
        tips: [
          "Give portal access on Day 1. Clients who can see progress make fewer phone calls.",
          "If a client is calling you daily for updates, they probably don't have portal access. Fix that.",
        ],
      },
      {
        heading: "Client History",
        body: "Click any client to see every project you've done for them, total lifetime revenue, and a timeline of all interactions. Repeat clients are gold — the system flags them automatically.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIELD REPORTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "field-reports",
    title: "Field Reports",
    icon: BookOpen,
    tagline: "Voice-to-report. Talk into your phone, get a structured report.",
    path: "/admin/field-reports",
    sections: [
      {
        heading: "How It Works",
        body: "You're on-site, hands dirty. You don't have time to type. Hit the mic button, say what happened today, and the system does the rest. It transcribes your voice, categorizes the content, and generates a structured daily report.",
      },
      {
        heading: "Recording a Report",
        steps: [
          { action: "Go to Field Reports → + New Report" },
          { action: "Select the project from the dropdown" },
          { action: "Hit the red mic button and start talking", detail: "Speak naturally. Mention what was done, who was on-site, any problems, material usage, and what's planned for tomorrow." },
          { action: "Hit stop when you're done" },
          { action: "The AI transcribes and structures it in ~10 seconds" },
          { action: "Review the generated report", detail: "It breaks your words into: Work Completed, Issues/Delays, Materials Used, Tomorrow's Plan." },
          { action: "Edit anything that's off, then hit Submit" },
        ],
        tips: [
          "Mention specific quantities: \"Used 12 sheets of 3/4\" plywood\" not just \"used some plywood.\"",
          "Say names: \"Dave and Mike were on-site\" — the system tracks crew allocation.",
          "Call out problems explicitly: \"The framing lumber delivery was short 40 2x6s\" — this triggers a material shortage alert.",
          "Don't ramble. State facts. The AI can't fix vague input.",
        ],
      },
      {
        heading: "What Happens After You Submit",
        steps: [
          { action: "Client portal updates automatically", detail: "If the report is marked client-visible, they see a cleaned-up summary." },
          { action: "Project milestones update", detail: "Completed work items advance the progress bar." },
          { action: "Material shortages flagged", detail: "If you mentioned anything running low, it hits the Command Center and the Materials page." },
          { action: "Subcontractor notifications", detail: "If you mentioned needing a sub tomorrow, the system can auto-notify them." },
        ],
      },
      {
        heading: "Report Types",
        steps: [
          { action: "Daily Progress", detail: "Standard end-of-day report. Most common." },
          { action: "Issue Report", detail: "Something went wrong. Damage, safety concern, code violation discovered." },
          { action: "Inspection Report", detail: "Log the results of a city/county inspection." },
          { action: "Change Order", detail: "Client requested something different. Documents the scope change and cost impact." },
        ],
        warning: "Change Order reports automatically create a budget amendment entry in the Ledger. Make sure the numbers are right before submitting.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SITE PLANS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "site-plans",
    title: "Site Plans",
    icon: Pencil,
    tagline: "Hand-drawn site specs. Sketch it like you would on a napkin, but digital.",
    path: "/admin/site-plans",
    sections: [
      {
        heading: "What This Is",
        body: "A full drawing canvas built on Excalidraw. Everything you sketch looks hand-drawn — like a pencil on paper. Use it for floor plans, site layouts, detail sketches, and quick specs you'd normally scribble on the back of a 2x4.",
      },
      {
        heading: "Basic Drawing",
        steps: [
          { action: "Select a tool from the top toolbar", detail: "Rectangle for walls/rooms, line for dimensions, ellipse for fixtures, text for labels." },
          { action: "Click and drag on the canvas to draw" },
          { action: "Hold Shift for perfect squares/circles/straight lines" },
          { action: "Double-click any shape to add text inside it" },
          { action: "Use Ctrl+D (Cmd+D on Mac) to duplicate selected elements" },
          { action: "Scroll to zoom, hold Space and drag to pan" },
        ],
      },
      {
        heading: "Construction Stamp Library",
        body: "Click the \"Stamps\" button in the toolbar to open the library. Pre-built elements you can drop onto the canvas with one click:",
        steps: [
          { action: "Structural", detail: "Exterior walls (thick), interior walls (thin), load-bearing walls (hatched), columns/posts." },
          { action: "Openings", detail: "36\" doors with swing arc, 48\" windows, sliding doors." },
          { action: "Plumbing", detail: "Sinks, toilets, bathtubs, showers. Blue symbols." },
          { action: "Electrical", detail: "Outlets (red circles), switches, light fixtures (yellow), electrical panels." },
          { action: "Dimensions", detail: "Dimension lines with measurements, note callout diamonds." },
        ],
        tips: [
          "Click a stamp to place it at the center of your view. Then drag it where it goes.",
          "The stamps use industry-standard colors: blue for plumbing, red for electrical.",
          "Combine stamps with freehand drawing for quick on-site sketches.",
        ],
      },
      {
        heading: "Grid & Snapping",
        body: "Click the grid icon in the toolbar to toggle a 20px snap grid. Elements will snap to grid intersections when you drag them. This keeps your drawings clean without trying.",
        tips: [
          "Grid ON for floor plans and precise layouts.",
          "Grid OFF for quick freehand sketches and detail callouts.",
        ],
      },
      {
        heading: "Exporting & Sharing",
        steps: [
          { action: "Export as PNG", detail: "For sending to clients or printing. High-res image." },
          { action: "Export as SVG", detail: "Scalable vector. Good for putting in permits or formal docs." },
          { action: "Export as .excalidraw", detail: "Native format. Reopen and edit later." },
          { action: "Share button", detail: "Generates a link for the client portal so they can view (not edit) the plan." },
        ],
        warning: "PNG exports what's on screen. Zoom out to capture the full plan before exporting.",
      },
      {
        heading: "Pro Moves",
        tips: [
          "Alt+drag to duplicate an element while moving it. Fastest way to repeat walls.",
          "Select multiple elements → right-click → \"Group\" to move them together.",
          "Use the hand-drawn roughness to your advantage — clients love the authentic look.",
          "Name your plans clearly: \"[Client] — [What] — [Date]\". You'll thank yourself later.",
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCHEDULE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "schedule",
    title: "Schedule",
    icon: Calendar,
    tagline: "Weather-smart scheduling. Rain moves roofing; sun moves painting.",
    path: "/admin/schedule",
    sections: [
      {
        heading: "How It Works",
        body: "The schedule pulls the 7-day forecast for Eugene, OR (and each project's specific address). When rain, snow, or high wind is predicted, outdoor tasks automatically shift to backup dates and interior work moves up. You still have final say — it suggests, you approve.",
      },
      {
        heading: "The Gantt View",
        body: "Each project's tasks are laid out horizontally on a timeline. Color coding:",
        steps: [
          { action: "Blue bars", detail: "Scheduled and confirmed." },
          { action: "Yellow bars", detail: "Weather-flagged. Might need to move." },
          { action: "Red bars", detail: "Overdue or blocked." },
          { action: "Green bars", detail: "Completed." },
          { action: "Gray dashed bars", detail: "Waiting on dependency (previous task must finish first)." },
        ],
      },
      {
        heading: "Adding Tasks",
        steps: [
          { action: "Click a project row → \"+ Add Task\"" },
          { action: "Name the task", detail: "Be specific: \"Frame east wall\" not \"framing\"." },
          { action: "Set indoor/outdoor", detail: "This is critical. It's how the weather system knows what to reschedule." },
          { action: "Set duration in days" },
          { action: "Link dependencies if needed", detail: "Foundation must finish before framing starts. Set that here." },
          { action: "Assign crew or sub-contractor" },
          { action: "Save" },
        ],
        warning: "If you don't mark a task as outdoor, the weather system won't touch it. Roofing marked as indoor = roofing in the rain.",
      },
      {
        heading: "Weather Adjustments",
        body: "When the system detects bad weather for an outdoor task, it:",
        steps: [
          { action: "Flags the task yellow on the Gantt chart" },
          { action: "Suggests moving it to the next clear day" },
          { action: "Offers to swap in an interior task from the same project" },
          { action: "Sends you a notification with the suggested changes" },
          { action: "You approve or override. Nothing moves without your say." },
        ],
        tips: [
          "Check the schedule Sunday night. The system has already analyzed the week ahead.",
          "If you override a weather suggestion and it rains, that's on you. The system logs it.",
          "Weather data updates every 6 hours automatically.",
        ],
      },
      {
        heading: "Crew & Sub Notifications",
        body: "When you approve a schedule change, affected crew and subcontractors get automatic notifications via their preferred method (text or email). Includes: new date, time, site address, and any notes you add.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESTIMATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "estimates",
    title: "Estimates",
    icon: BarChart3,
    tagline: "AI-assisted project estimates. Fast, accurate, defensible.",
    path: "/admin/estimates",
    sections: [
      {
        heading: "What This Is",
        body: "The AI Estimator takes project details and generates a line-item cost breakdown. It uses local Eugene/OR material pricing, labor rates, and your historical project data to produce estimates that are actually defensible.",
      },
      {
        heading: "Creating an Estimate",
        steps: [
          { action: "Click \"+ New Estimate\"" },
          { action: "Select project type", detail: "Kitchen remodel, bathroom, new construction, deck, roofing, etc." },
          { action: "Enter square footage and scope details" },
          { action: "Set quality tier", detail: "Standard, Premium, or Luxury. This adjusts material costs and finish levels." },
          { action: "Add any special requirements", detail: "Permits needed, structural engineering, specialty materials." },
          { action: "Hit \"Generate Estimate\"" },
          { action: "Review the line-item breakdown", detail: "Materials, labor, sub costs, permits, contingency. Every line is editable." },
          { action: "Adjust any numbers, then Save or Send to Client" },
        ],
      },
      {
        heading: "Line Item Breakdown",
        body: "Every estimate is broken into categories:",
        steps: [
          { action: "Materials", detail: "Itemized by type. Lumber, hardware, fixtures, finishes. Prices pulled from current market data." },
          { action: "Labor", detail: "Calculated from estimated hours × your loaded labor rate." },
          { action: "Subcontractor costs", detail: "Electrical, plumbing, HVAC — based on your sub-contractor rate cards." },
          { action: "Permits & inspections", detail: "Auto-calculated for Lane County/Eugene requirements." },
          { action: "Contingency", detail: "Default 10%. Adjust up for older homes, complex jobs." },
          { action: "Markup", detail: "Your profit margin. Separate from contingency." },
        ],
      },
      {
        heading: "Converting to a Project",
        body: "When the client approves the estimate, click \"Convert to Project.\" This creates the project with the estimate as the baseline budget. Every dollar is tracked from that point forward.",
        warning: "Once converted, the estimate becomes read-only. Any scope changes go through Change Orders in Field Reports.",
      },
      {
        heading: "Historical Comparison",
        body: "The system compares your new estimate against similar past projects. It'll flag if you're significantly over or under what you've charged before. Trust the data, but use your judgment — no two jobs are identical.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MATERIALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "materials",
    title: "Materials",
    icon: Package,
    tagline: "Track inventory, auto-generate POs, monitor pricing.",
    path: "/admin/materials",
    sections: [
      {
        heading: "What This Is",
        body: "Your material tracking system. Knows what's allocated to each project, what's been ordered, what's on-site, and what's running low. Generates purchase orders and monitors vendor pricing.",
      },
      {
        heading: "Material Tracking",
        body: "Each project has a materials list derived from its estimate. As you order and receive materials, the system tracks:",
        steps: [
          { action: "Allocated", detail: "What the estimate says you need." },
          { action: "Ordered", detail: "POs that have been sent." },
          { action: "Delivered", detail: "What's arrived on-site. Log deliveries as they come." },
          { action: "Used", detail: "What's been installed. Updated via field reports." },
          { action: "Remaining", detail: "The math: Delivered minus Used." },
        ],
      },
      {
        heading: "Logging a Delivery",
        steps: [
          { action: "Go to Materials → select the project" },
          { action: "Click \"Log Delivery\"" },
          { action: "Select items from the PO or add new items" },
          { action: "Enter quantities received" },
          { action: "Note any shortages or damage", detail: "This creates an automatic Issue Report in Field Reports." },
          { action: "Upload a photo of the delivery ticket" },
          { action: "Save" },
        ],
        warning: "Always log deliveries the same day. If you wait, the shortage alerts won't fire when they should.",
      },
      {
        heading: "Auto-Generated Purchase Orders",
        body: "The system monitors project phases. When you're 2 weeks from needing materials for the next phase, it drafts a PO based on the estimate quantities and current vendor pricing.",
        steps: [
          { action: "You get a notification: \"PO draft ready for [Project]\"" },
          { action: "Review quantities and pricing" },
          { action: "Adjust if needed" },
          { action: "Approve → PO sends to the vendor automatically" },
        ],
        tips: [
          "The system favors your preferred vendors. Set these in Settings → Vendor Preferences.",
          "If pricing has spiked more than 15% since the estimate, you get a yellow warning. Consider talking to the client about a Change Order before the cost hits.",
        ],
      },
      {
        heading: "Price Monitoring",
        body: "The system checks lumber, hardware, and fixture pricing weekly against your baseline estimates. If something jumps significantly, it flags the affected projects. You'll see it on the Command Center and here.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUB-CONTRACTORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "sub-contractors",
    title: "Sub-Contractors",
    icon: Wrench,
    tagline: "Your subs roster. Rate cards, availability, performance.",
    path: "/admin/sub-contractors",
    sections: [
      {
        heading: "What This Is",
        body: "Every sub you work with, organized by trade. Contact info, rate cards, CCB numbers, insurance expiration, and a reliability score based on your past projects together.",
      },
      {
        heading: "Adding a Sub",
        steps: [
          { action: "Click \"+ New Sub-Contractor\"" },
          { action: "Enter company name, contact name, phone, email" },
          { action: "Select trade", detail: "Electrical, plumbing, HVAC, concrete, roofing, painting, drywall, etc." },
          { action: "Enter CCB license number", detail: "The system verifies it against Oregon CCB records." },
          { action: "Set their rate card", detail: "Hourly rate, day rate, or per-job pricing." },
          { action: "Upload insurance certificate", detail: "The system alerts you 30 days before it expires." },
          { action: "Save" },
        ],
        warning: "Never put a sub on a job without a current insurance certificate. The system will flag it, but don't ignore it.",
      },
      {
        heading: "Assigning Subs to Projects",
        body: "From the Schedule page or the Project Detail page, assign subs to specific tasks. When the schedule confirms, they get an automated notification with:",
        steps: [
          { action: "Date and time" },
          { action: "Site address with map link" },
          { action: "Scope of work for that visit" },
          { action: "Site access instructions", detail: "Gate codes, where to park, who to check in with." },
          { action: "Safety briefing link", detail: "Required reading before first visit to any new site." },
        ],
      },
      {
        heading: "Reliability Score",
        body: "The system tracks three things per sub: shows up on time, does quality work, stays in budget. Each is rated 1-5 based on your feedback after each job. Over time, this becomes your go-to reference for who to call first.",
        tips: [
          "Rate your subs after every project. It takes 10 seconds and saves you from repeating bad hires.",
          "Sort by reliability score when assigning subs. The best ones float to the top.",
        ],
      },
      {
        heading: "Insurance & License Tracking",
        body: "The system monitors expiration dates. You get alerts at 60 days, 30 days, and 7 days before a sub's insurance or CCB license expires. If it expires, they're automatically flagged as \"unavailable\" for new assignments until updated.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LEDGER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "ledger",
    title: "Ledger",
    icon: Shield,
    tagline: "Immutable record of every dollar and decision. Your CYA file.",
    path: "/admin/ledger",
    sections: [
      {
        heading: "What This Is",
        body: "The Core Values Ledger. An immutable log of every financial transaction, contract, permit, inspection, change order, and client approval. Nothing gets deleted. Everything is timestamped. This is your paper trail — digital and permanent.",
      },
      {
        heading: "What Gets Logged Automatically",
        steps: [
          { action: "Invoices sent and payments received" },
          { action: "Change orders — scope, cost impact, client approval" },
          { action: "Material purchase orders and delivery confirmations" },
          { action: "Permit applications and inspection results" },
          { action: "Budget amendments from any source" },
          { action: "Client selections (finishes, fixtures) with cost deltas" },
          { action: "Contract signatures" },
          { action: "Subcontractor payments" },
        ],
      },
      {
        heading: "Searching the Ledger",
        body: "Use the filter bar to narrow by project, date range, entry type, or dollar amount. Every entry links back to its source — click to see the original report, invoice, or document.",
        tips: [
          "Filter by \"Change Order\" before client meetings. Know exactly what changed and why.",
          "Filter by project + \"Payment\" to see payment history at a glance.",
          "The Ledger is exportable. PDF or CSV. Use it for tax prep, dispute resolution, or bonding applications.",
        ],
      },
      {
        heading: "Client-Facing Ledger",
        body: "A cleaned-up subset of the Ledger is visible in the Client Portal. Clients see: invoices, payments, change orders, permits, and inspections. They do NOT see: your material costs, sub-contractor payments, or internal notes.",
        warning: "If you add notes to a ledger entry, mark them as \"Internal\" if they shouldn't be client-facing. Default is internal, but double-check.",
      },
      {
        heading: "Why This Matters",
        body: "20 years in the business, you know this: disputes happen. Clients forget what they approved. Subs claim they weren't told. Inspectors say things weren't documented. The Ledger is your defense. Every decision, every dollar, every date — right here. Use it.",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BILLING & PAYMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "billing",
    title: "Billing & Payments",
    icon: CreditCard,
    tagline: "Milestone invoicing. One-click client approvals. Get paid faster.",
    path: "/admin/billing",
    sections: [
      {
        heading: "How Invoicing Works",
        body: "Invoices are milestone-based. When a project phase completes, the system generates a draft invoice for that milestone's portion of the budget. You review it, tweak if needed, and send. The client gets an email with a one-click \"Approve & Pay\" button.",
      },
      {
        heading: "Setting Up Milestones",
        steps: [
          { action: "Go to the Project → Financials tab" },
          { action: "Set payment milestones", detail: "Example: 30% at contract, 25% at framing, 25% at rough-in, 20% at completion." },
          { action: "Link each milestone to a project phase", detail: "When that phase marks complete, the invoice drafts automatically." },
        ],
      },
      {
        heading: "Sending an Invoice",
        steps: [
          { action: "Review the auto-generated draft", detail: "Check the line items, amounts, and milestone description." },
          { action: "Add any change order adjustments" },
          { action: "Hit \"Send to Client\"" },
          { action: "Client receives email with payment link", detail: "Stripe or PayPal. Their choice." },
          { action: "When they pay, you get notified and the Ledger updates automatically." },
        ],
      },
      {
        heading: "Overdue Payments",
        body: "If a payment is overdue by 7 days, the system sends an automatic reminder. At 14 days, another. At 30 days, you get a flag to follow up personally. The system doesn't send anything aggressive — that's your call.",
        tips: [
          "Set payment terms in the project contract. Net 15 for most clients.",
          "The Client Portal shows their outstanding balance. They can see what they owe without calling you.",
          "Partial payments are tracked. If they pay half, the system shows the remaining balance.",
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getGuideById(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}

export function getGuideByPath(path: string): Guide | undefined {
  return GUIDES.find((g) => g.path === path);
}
