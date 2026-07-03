/**
 * submission-created — Netlify Forms trigger.
 *
 * Fires automatically whenever a Netlify Form is submitted. For the lead-capture
 * forms — the contact "project-inquiry" form and the public "estimator-lead"
 * form — it AI-scores the lead (free-first LLM chain) and persists it to the
 * leads table so it appears, prioritized, on the Command Center lead board —
 * no manual entry required. Estimator submissions are the highest-intent leads
 * (they just saw a price), so they must never be dropped.
 *
 * This is invoked internally by Netlify (not via /api/*), so it needs no auth.
 * It never throws: the form submission is already saved by Netlify Forms
 * regardless of scoring success.
 */
import type { Handler } from "@netlify/functions";
import { scoreLead, type LeadInput } from "../../server/_core/leadScoring";
import { db } from "../../server/db";

/** Lead-capture `form-name`s this trigger acts on. Other forms are ignored. */
const INQUIRY_FORM = "project-inquiry";
const ESTIMATOR_FORM = "estimator-lead";
const HANDLED_FORMS = [INQUIRY_FORM, ESTIMATOR_FORM];

type SubmissionPayload = {
  form_name?: string;
  data?: Record<string, string>;
};

type FormData = Record<string, string>;

/**
 * A form submission mapped onto the leads insert shape plus the input used to
 * AI-score it. `estimatedValue` overrides the scorer's guess when the form
 * carries a concrete figure (the estimator does); otherwise it's null and the
 * scored value is used.
 */
type NormalizedLead = {
  budget?: string;
  location?: string;
  timeline?: string;
  message: string;
  estimatedValue: number | null;
  scoreInput: LeadInput;
};

/** Fold contact details into the message (leads has no email/phone columns). */
function contactBits(data: FormData): string {
  return [
    data.email && `Email: ${data.email}`,
    data.phone && `Phone: ${data.phone}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function parseEstimate(value: string | undefined): number | null {
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Contact "project-inquiry" form → lead. */
function buildInquiryLead(
  data: FormData,
  name?: string,
  projectType?: string
): NormalizedLead {
  const message = [data.message?.trim(), contactBits(data)]
    .filter(Boolean)
    .join("\n\n");
  return {
    budget: data.budget,
    location: data.location,
    timeline: data.timeline,
    message,
    estimatedValue: null,
    scoreInput: {
      name,
      projectType,
      budget: data.budget,
      location: data.location,
      timeline: data.timeline,
      message: data.message,
    },
  };
}

/**
 * Public "estimator-lead" form → lead. Fields differ from the contact form:
 * there's no free-text message/budget, but there IS the AI estimate the visitor
 * just saw (estimatedMid) plus sqft/complexity. Fold those into the message and
 * feed the estimate in as the budget signal so scoring reflects real intent.
 */
function buildEstimatorLead(
  data: FormData,
  name?: string,
  projectType?: string
): NormalizedLead {
  const estimatedValue = parseEstimate(data.estimatedMid);
  const budget =
    estimatedValue != null
      ? `~${formatUsd(estimatedValue)} (AI estimate)`
      : undefined;
  const detailBits = [
    "Source: AI Estimator",
    data.sqft && `Approx. ${data.sqft} sq ft`,
    data.complexity && `${data.complexity} finish level`,
    budget && `Expected cost ${budget}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const message = [detailBits, contactBits(data)].filter(Boolean).join("\n\n");
  return {
    budget,
    // The estimator only quotes the local Eugene, OR market.
    location: "Eugene, OR",
    timeline: undefined,
    message,
    estimatedValue,
    scoreInput: {
      name,
      projectType,
      budget,
      location: "Eugene, OR",
      message: detailBits,
    },
  };
}

export const handler: Handler = async event => {
  try {
    const parsed = JSON.parse(event.body ?? "{}") as {
      payload?: SubmissionPayload;
    };
    const payload = parsed.payload;
    if (!payload) return { statusCode: 200, body: "ignored" };

    // Only act on the lead-capture forms (contact inquiry + AI estimator).
    const formName = payload.form_name;
    if (formName && !HANDLED_FORMS.includes(formName)) {
      return { statusCode: 200, body: "skipped (other form)" };
    }

    const data = payload.data ?? {};
    const name = data.name?.trim();
    const projectType = data.projectType?.trim();
    if (!name && !projectType) {
      return { statusCode: 200, body: "skipped (empty)" };
    }

    if (!db) {
      console.warn("[submission-created] DB not configured — skipping.");
      return { statusCode: 200, body: "no db" };
    }

    const lead =
      formName === ESTIMATOR_FORM
        ? buildEstimatorLead(data, name, projectType)
        : buildInquiryLead(data, name, projectType);

    let scored;
    try {
      scored = await scoreLead(lead.scoreInput);
    } catch (err) {
      // Persist the lead unscored rather than losing it.
      console.error("[submission-created] scoring failed, saving raw:", err);
      scored = {
        score: 0,
        priority: "low" as const,
        reasoning: "Auto-scoring unavailable at submission time.",
        suggestedAction: "Review and score manually.",
        estimatedValue: null,
      };
    }

    const { error } = await db.from("leads").insert({
      name: name ?? "Website inquiry",
      project_type: projectType ?? null,
      budget: lead.budget ?? null,
      location: lead.location ?? null,
      timeline: lead.timeline ?? null,
      message: lead.message || null,
      score: scored.score,
      priority: scored.priority,
      reasoning: scored.reasoning,
      suggested_action: scored.suggestedAction,
      estimated_value: lead.estimatedValue ?? scored.estimatedValue,
    });
    if (error) {
      console.error("[submission-created] insert failed:", error);
      return { statusCode: 200, body: "insert failed" };
    }

    console.log(
      `[submission-created] scored ${formName ?? "lead"} "${name}" → ` +
        `${scored.score} (${scored.priority})`
    );
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("[submission-created]", err);
    return { statusCode: 200, body: "error" };
  }
};
