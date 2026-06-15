/**
 * submission-created — Netlify Forms trigger.
 *
 * Fires automatically whenever a Netlify Form is submitted. For the contact
 * "project-inquiry" form, it AI-scores the inquiry (free-first LLM chain) and
 * persists it to the leads table so it appears, prioritized, on the Command
 * Center lead board — no manual entry required.
 *
 * This is invoked internally by Netlify (not via /api/*), so it needs no auth.
 * It never throws: the form submission is already saved by Netlify Forms
 * regardless of scoring success.
 */
import type { Handler } from "@netlify/functions";
import { scoreLead } from "../../server/_core/leadScoring";
import { db } from "../../server/db";

/** The contact form's `form-name`. Other forms are ignored. */
const INQUIRY_FORM = "project-inquiry";

type SubmissionPayload = {
  form_name?: string;
  data?: Record<string, string>;
};

export const handler: Handler = async event => {
  try {
    const parsed = JSON.parse(event.body ?? "{}") as {
      payload?: SubmissionPayload;
    };
    const payload = parsed.payload;
    if (!payload) return { statusCode: 200, body: "ignored" };

    // Only act on the project inquiry form.
    if (payload.form_name && payload.form_name !== INQUIRY_FORM) {
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

    // Preserve contact details (the leads table has no email/phone columns) by
    // folding them into the message.
    const contactBits = [
      data.email && `Email: ${data.email}`,
      data.phone && `Phone: ${data.phone}`,
    ].filter(Boolean);
    const message = [data.message?.trim(), contactBits.join(" · ")]
      .filter(Boolean)
      .join("\n\n");

    let scored;
    try {
      scored = await scoreLead({
        name,
        projectType,
        budget: data.budget,
        location: data.location,
        message: data.message,
      });
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
      budget: data.budget ?? null,
      location: data.location ?? null,
      message: message || null,
      score: scored.score,
      priority: scored.priority,
      reasoning: scored.reasoning,
      suggested_action: scored.suggestedAction,
      estimated_value: scored.estimatedValue,
    });
    if (error) {
      console.error("[submission-created] insert failed:", error);
      return { statusCode: 200, body: "insert failed" };
    }

    console.log(
      `[submission-created] scored lead "${name}" → ${scored.score} (${scored.priority})`
    );
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("[submission-created]", err);
    return { statusCode: 200, body: "error" };
  }
};
