/**
 * Deterministic AI router — the routing seam for every AI surface.
 *
 * This is routing, not reasoning. It chooses one specialist contract before the
 * model is called; the model keeps responsibility for judgment *within* that
 * bounded context. Keep this file dependency-free and easy to test.
 *
 * Ported in shape from Clearview's `functions/ask/_lib/icm-router.mjs`, with
 * construction specialists in place of window ones.
 *
 * Rule: never insert an LLM classification call ahead of this router. Intent
 * that can be identified from explicit signals is a deterministic decision, and
 * a model hop here would cost latency, money, and auditability for nothing.
 */

/**
 * Where the request came from. This is an authorization boundary as much as a
 * routing one: a public visitor must never reach a specialist whose contract
 * assumes access to internal operational data.
 */
export type AiSurface = "public" | "portal" | "internal";

export type SpecialistId =
  | "estimator"
  | "general-advisor"
  | "client-liaison"
  | "ops-copilot"
  | "field-reporter"
  | "procurement"
  | "scheduler"
  | "lead-analyst";

export type Route = {
  id: SpecialistId;
  /** Why this route was chosen — returned to callers and logged. */
  reason:
    | "explicit-message-match"
    | "surface-default"
    | "caller-pinned"
    | "default-advisor";
};

type RouteRule = { id: SpecialistId; test: RegExp };

/** Reachable from an unauthenticated public surface. */
const PUBLIC_ROUTES: RouteRule[] = [
  {
    id: "estimator",
    test: /\b(estimate|quote|bid|proposal|cost|costs|price|pricing|budget|how much|afford|ballpark|per square foot|per sqft)\b/i,
  },
  {
    id: "general-advisor",
    test: /\b(compare|comparison|difference|versus|vs\.?|which|choose|options?|timeline|how long|process|permit|permits|material|finish|remodel|addition|build)\b/i,
  },
];

/** Requires an authenticated client (portal) session. */
const PORTAL_ROUTES: RouteRule[] = [
  {
    id: "client-liaison",
    test: /\b(my project|my home|my build|status|progress|update|schedule|when will|selection|selections|finish|milestone|invoice|payment)\b/i,
  },
];

/** Requires an authenticated admin (Eric). */
const INTERNAL_ROUTES: RouteRule[] = [
  {
    id: "field-reporter",
    test: /\b(field report|daily report|site report|voice memo|transcription|crew log|what got done|log the day)\b/i,
  },
  {
    id: "procurement",
    test: /\b(material|materials|shortage|shortages|purchase order|\bpo\b|vendor|supplier|order|reorder|inventory|lumber|stock)\b/i,
  },
  {
    id: "scheduler",
    test: /\b(schedule|scheduling|reschedule|gantt|weather|rain|forecast|delay|delayed|behind|critical path|sequencing|task order)\b/i,
  },
  {
    id: "lead-analyst",
    test: /\b(lead|leads|prospect|inquiry|enquiry|follow[- ]?up|followup|qualify|qualification|who should i call)\b/i,
  },
  {
    id: "ops-copilot",
    test: /\b(command center|operations|operational|dashboard|today|this week|workload|backlog|over budget|profitability|margin|what needs attention|what should i do)\b/i,
  },
];

const ROUTES_BY_SURFACE: Record<AiSurface, RouteRule[]> = {
  // Specific public intents first; the advisor is the catch-all.
  public: PUBLIC_ROUTES,
  // A portal user may legitimately ask a cost question, so the public rules
  // stay reachable — but never the internal ones.
  portal: [...PORTAL_ROUTES, ...PUBLIC_ROUTES],
  // Internal intents win on the admin surface, then everything else.
  internal: [...INTERNAL_ROUTES, ...PUBLIC_ROUTES],
};

const DEFAULT_BY_SURFACE: Record<AiSurface, SpecialistId> = {
  public: "general-advisor",
  portal: "client-liaison",
  internal: "ops-copilot",
};

/** Specialists a given surface is permitted to reach. */
export function allowedSpecialists(surface: AiSurface): SpecialistId[] {
  const ids = ROUTES_BY_SURFACE[surface].map(r => r.id);
  return [...new Set([...ids, DEFAULT_BY_SURFACE[surface]])];
}

export type RouteInput = {
  message?: string;
  surface?: AiSurface;
  /**
   * A caller that already knows the job (voice-to-report, daily-briefing,
   * lead-score) pins the specialist instead of pattern-matching prose. The pin
   * is still checked against the surface's allow-list — a pin cannot be used
   * to escape the authorization boundary.
   */
  specialist?: SpecialistId;
};

/**
 * Choose exactly one specialist. Always returns a route; there is no
 * "unroutable" state, because a bounded default is safer than an unbounded
 * prompt.
 */
export function routeAi({
  message = "",
  surface = "public",
  specialist,
}: RouteInput = {}): Route {
  const text = String(message).trim();
  const allowed = allowedSpecialists(surface);

  if (specialist && allowed.includes(specialist)) {
    return { id: specialist, reason: "caller-pinned" };
  }
  // A pin the surface may not reach falls through to normal routing rather
  // than erroring — fail down, never fail open.
  if (specialist && !allowed.includes(specialist)) {
    return { id: DEFAULT_BY_SURFACE[surface], reason: "surface-default" };
  }

  for (const rule of ROUTES_BY_SURFACE[surface]) {
    if (rule.test.test(text)) {
      return { id: rule.id, reason: "explicit-message-match" };
    }
  }

  return { id: DEFAULT_BY_SURFACE[surface], reason: "default-advisor" };
}

/** One-line description for logs and API responses. */
export function routeSummary(route: Route): string {
  return `AI route: ${route.id} (${route.reason})`;
}
