/**
 * First Week curriculum.
 *
 * The System Guide (`guides-data.ts`) is a *reference* — you search it when
 * you're stuck. This is a *lesson plan*: an ordered set of small, do-it-now
 * modules that take a brand-new owner from first login to running the
 * business on the platform, one short session a day.
 *
 * Every module points at a real guide (`guideId`) and a real screen (`path`),
 * so the written reference and the walkthrough video are always one click
 * away and nothing here can drift out of sync with the product.
 */

export type TrainingStep = {
  /** The single thing to do. Imperative, one action. */
  action: string;
  /** Why it matters or what to watch for. */
  detail?: string;
};

export type TrainingModule = {
  id: string;
  /** Day of the first week, 1-5. Modules are grouped and ordered by this. */
  day: number;
  title: string;
  /** One line on what this unlocks — the reason to bother. */
  objective: string;
  /** Guide ID from `guides-data.ts`. Drives the video and "read more" link. */
  guideId: string;
  /** Admin route this module is practised on. */
  path: string;
  /** Realistic hands-on time, in minutes. */
  minutes: number;
  steps: TrainingStep[];
};

export const DAY_LABELS: Record<number, string> = {
  1: "Day 1 — Get oriented",
  2: "Day 2 — Report from the field",
  3: "Day 3 — Run the schedule",
  4: "Day 4 — Money in, money out",
  5: "Day 5 — Work the pipeline",
};

export const TRAINING_MODULES: TrainingModule[] = [
  // ── Day 1 ───────────────────────────────────────────────────────────────
  {
    id: "t-command-center",
    day: 1,
    title: "Read your morning dashboard",
    objective:
      "Know, in ten seconds, what every job is costing you and what needs attention today.",
    guideId: "command-center",
    path: "/admin",
    minutes: 10,
    steps: [
      {
        action: "Open the Command Center and read the four KPI cards",
        detail:
          "Active projects, budget vs. actual spend, material shortages, latest reports. This is the screen to open before you leave the house.",
      },
      {
        action: "Find the one number that would ruin your week if it moved",
        detail:
          "For most jobs it's actual spend against budget. Now you know where it lives.",
      },
      {
        action: "Click the help icon in the header",
        detail:
          "That icon appears on every screen and opens the guide for whatever page you're on. If you only remember one thing today, remember that icon.",
      },
    ],
  },
  {
    id: "t-projects",
    day: 1,
    title: "Create your first real project",
    objective:
      "Everything else — reports, schedule, invoices — hangs off a project. Nothing works until one exists.",
    guideId: "projects",
    path: "/admin/projects",
    minutes: 15,
    steps: [
      {
        action: "Add a client first",
        detail:
          "Clients → New. Name, email, phone. The email is what they'll log into the portal with, so get it right.",
      },
      {
        action: "Create a project and attach that client",
        detail:
          "Use a job you're actually running, not a test. Real data makes the rest of the week useful instead of theoretical.",
      },
      {
        action: "Set the budget and the start/end dates",
        detail:
          "The budget drives every profitability number you'll see later. A rough figure beats a blank one.",
      },
    ],
  },

  // ── Day 2 ───────────────────────────────────────────────────────────────
  {
    id: "t-field-reports",
    day: 2,
    title: "Record a field report with your voice",
    objective:
      "Replace the 30-minute end-of-day write-up with 90 seconds of talking on the drive home.",
    guideId: "field-reports",
    path: "/admin/field-reports/new",
    minutes: 15,
    steps: [
      {
        action: "Stand on a job site (or in the shop) and hit record",
        detail:
          "Pick the project, press the red button, and talk for a minute: what got done, what's next, any material or sub problems.",
      },
      {
        action: "Talk like you'd talk to a foreman, not like you're writing",
        detail:
          "Say the trade names and materials out loud. The system is built to understand construction language.",
      },
      {
        action: "Stop, and watch it write the report",
        detail:
          "Transcription, summary, and categories come back automatically. Read it once to see how close it gets.",
      },
      {
        action: "Open the client portal view and see what your client sees",
        detail:
          "This is the whole pitch: they get a real update within a minute of you finishing a sentence.",
      },
    ],
  },
  {
    id: "t-ledger",
    day: 2,
    title: "Check the decision ledger",
    objective:
      "Every decision and cost change is written down permanently — that's your defence in any dispute.",
    guideId: "ledger",
    path: "/admin/ledger",
    minutes: 5,
    steps: [
      {
        action: "Find the entry created by yesterday's field report",
        detail:
          "Reports write to the ledger automatically. You didn't type it.",
      },
      {
        action: "Note that entries can't be edited or deleted",
        detail:
          "That's deliberate. An immutable log is only worth something if nobody — including you — can quietly change it.",
      },
    ],
  },

  // ── Day 3 ───────────────────────────────────────────────────────────────
  {
    id: "t-schedule",
    day: 3,
    title: "Build and drag your schedule",
    objective:
      "See the whole job on one timeline and move a task without redrawing anything.",
    guideId: "schedule",
    path: "/admin/schedule",
    minutes: 20,
    steps: [
      {
        action: "Add five tasks to your project with real dates",
        detail:
          "Rough-in, inspection, drywall, paint, punch. Enough to see the shape of the job.",
      },
      {
        action: "Drag one task to a different week",
        detail:
          "It saves as you drop it. No save button, no confirmation dialog.",
      },
      {
        action: "Mark the tasks that can't happen in the rain",
        detail:
          "Weather-sensitive tasks get flagged automatically when the forecast turns, so you can move interior work up instead of losing the day.",
      },
    ],
  },
  {
    id: "t-materials",
    day: 3,
    title: "Catch a material shortage before it stops you",
    objective: "Stop finding out you're short on a Friday afternoon.",
    guideId: "materials",
    path: "/admin/materials",
    minutes: 15,
    steps: [
      {
        action: "Add the materials for one phase of your project",
        detail: "Quantity needed, quantity on hand, and the vendor.",
      },
      {
        action: "Set one item's on-hand count below what's needed",
        detail: "The system flags the shortage immediately.",
      },
      {
        action: "Generate a purchase order from the shortage",
        detail:
          "Items get grouped by vendor, so one shortage list becomes the right number of POs instead of one giant mess.",
      },
    ],
  },

  // ── Day 4 ───────────────────────────────────────────────────────────────
  {
    id: "t-estimates",
    day: 4,
    title: "Build an estimate and send it",
    objective:
      "Get a defensible three-tier number in front of a prospect the same day they call.",
    guideId: "estimates",
    path: "/admin/estimates",
    minutes: 20,
    steps: [
      {
        action: "Create an estimate from project details",
        detail:
          "You get three tiers — good / better / best — with the cost broken out by category.",
      },
      {
        action: "Edit a line you disagree with",
        detail:
          "The AI number is a starting point, not the answer. Your margins are yours.",
      },
      {
        action: "Review the breakdown before it goes out",
        detail:
          "Check labor and materials separately. That's where an estimate goes wrong.",
      },
    ],
  },
  {
    id: "t-billing",
    day: 4,
    title: "Invoice a milestone",
    objective:
      "Get paid on schedule without chasing anyone with a paper invoice.",
    guideId: "billing",
    path: "/admin/billing",
    minutes: 15,
    steps: [
      {
        action: "Create an invoice against your project",
        detail: "Tie it to a milestone you've actually hit.",
      },
      {
        action: "Send it and watch the status change",
        detail:
          "Payment comes back through Stripe and reconciles against the ledger on its own — you don't mark anything paid by hand.",
      },
      {
        action: "Open the client's payment view",
        detail: "Know what your client sees when the invoice lands.",
      },
    ],
  },

  // ── Day 5 ───────────────────────────────────────────────────────────────
  {
    id: "t-leads",
    day: 5,
    title: "Work the lead board",
    objective:
      "Call the right lead first instead of the one that happened to come in last.",
    guideId: "command-center",
    path: "/admin",
    minutes: 10,
    steps: [
      {
        action: "Open the lead list and read the scores",
        detail:
          "Leads are ranked by project type, budget, and location — the three things that decide whether a job is worth your Saturday.",
      },
      {
        action: "Call the top-scored lead this week",
        detail: "Then check whether the score was right. Trust it accordingly.",
      },
    ],
  },
  {
    id: "t-notifications",
    day: 5,
    title: "Set up how the system reaches you",
    objective:
      "Get told about the things that matter, on the channel you actually check.",
    guideId: "notifications",
    path: "/admin/notifications",
    minutes: 10,
    steps: [
      {
        action: "Choose your channels — in-app, email, or text",
        detail: "Text for anything that can stop work. Email for the rest.",
      },
      {
        action: "Turn off anything that would become noise",
        detail:
          "A notification you learn to ignore is worse than no notification.",
      },
    ],
  },
  {
    id: "t-search",
    day: 5,
    title: "Find anything in three seconds",
    objective:
      "Stop hunting through screens when a client asks a question on the phone.",
    guideId: "search",
    path: "/admin/search",
    minutes: 5,
    steps: [
      {
        action: "Search a client's last name",
        detail: "Projects, clients, reports, and more come back in one list.",
      },
      {
        action: "Search a material or a phrase you said in a voice report",
        detail:
          "Your own words are searchable. That's the payoff of reporting by voice all week.",
      },
    ],
  },
];

/** Modules grouped by day, in order. */
export function modulesByDay(): Array<{
  day: number;
  label: string;
  modules: TrainingModule[];
}> {
  const days = [...new Set(TRAINING_MODULES.map(m => m.day))].sort(
    (a, b) => a - b
  );
  return days.map(day => ({
    day,
    label: DAY_LABELS[day] ?? `Day ${day}`,
    modules: TRAINING_MODULES.filter(m => m.day === day),
  }));
}

export const TOTAL_TRAINING_STEPS = TRAINING_MODULES.reduce(
  (sum, m) => sum + m.steps.length,
  0
);

/** Total hands-on time across every module, shown as an up-front estimate. */
export function totalTrainingMinutes(): number {
  return TRAINING_MODULES.reduce((sum, m) => sum + m.minutes, 0);
}
