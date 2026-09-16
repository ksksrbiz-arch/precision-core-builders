/**
 * POST /api/estimate-project — planning-level construction cost estimate.
 *
 * Code owns every dollar figure (`shared/estimating/`); the LLM only writes the
 * narrative explaining it. Previously the model produced the numbers from
 * benchmarks embedded in its system prompt and they were written straight to
 * the `estimates` table — a free-tier model originating the figures a public
 * prospect sees. Now:
 *
 *   compute (deterministic) → validate → explain (LLM, optional) → persist
 *
 * Every step fails down rather than open. An unpriced or unknown project type
 * returns VERIFY and invites a site visit; a failed validation refuses to
 * persist; a missing or broken LLM still returns the estimate with a
 * deterministic explanation, where it used to return a 502 and nothing at all.
 */
import { invokeLLM } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import {
  computeEstimate,
  validateEstimate,
  validateBasis,
  ESTIMATING_BASIS,
} from "../../shared/estimating";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { verifyAuth } from "./_utils/authGuard";
import { withGuards } from "./_lib/http";
import { PROMPTS } from "./_lib/llm/prompts";
import { routeAi } from "../../server/_core/ai/router";
import { specialistPrompt } from "../../server/_core/ai/specialists";
import { z } from "zod";

// Bounds are deliberately generous but finite — this is public, unauthenticated
// input that gets fed straight into an LLM prompt (token-cost/prompt-injection
// surface) and, for the notes/location fields, into a database row.
const estimateRequestSchema = z.object({
  projectType: z.string().trim().min(1).max(100),
  squareFootage: z.coerce.number().int().min(1).max(50_000).optional(),
  complexity: z.enum(["low", "medium", "high"]).optional(),
  materials: z.array(z.string().trim().max(100)).max(30).optional(),
  location: z.string().trim().max(200).optional(),
  additionalNotes: z.string().trim().max(2_000).optional(),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
});

/**
 * Explanation used whenever the model is unavailable or its output can't be
 * trusted. Built from the same derivation the model would have been given, so
 * the visitor always gets a real account of where the number came from.
 */
function fallbackReasoning(derivation: string[]): string {
  return [
    ...derivation,
    "This is a planning-level range from published cost assumptions, not a firm quote — an on-site visit produces the real number.",
  ].join(" ");
}

const MONEY_RE = /\$\s?[\d,]+(?:\.\d{2})?/g;
const PERCENT_RE = /\d+(?:\.\d+)?\s?%/g;

/** Strip separators so "$52,500" and "$52500" compare equal. */
const normaliseFigure = (s: string) => s.replace(/[,\s]/g, "");

/**
 * Reject an explanation that invents figures. The model is told not to
 * introduce dollar amounts or rates beyond what it was handed; this checks
 * rather than trusts. On any violation the deterministic explanation is used
 * instead — the estimate itself is unaffected either way.
 *
 * Matching is exact per figure, not substring: "5%" must not be accepted
 * because the derivation happens to mention "45%", and "$18" must not pass
 * because "$180" appears.
 */
function reasoningViolations(
  text: string,
  derivation: string[],
  estimate: Record<string, number>
): string[] {
  const issues: string[] = [];
  const source = derivation.join(" ");

  // Figures the model may legitimately restate: every rate and percentage in
  // the derivation, plus the computed estimate figures it was shown.
  const allowedMoney = new Set(
    [
      ...(source.match(MONEY_RE) ?? []),
      ...Object.values(estimate).map(n => `$${n.toLocaleString()}`),
    ].map(normaliseFigure)
  );
  const allowedPercents = new Set(
    (source.match(PERCENT_RE) ?? []).map(normaliseFigure)
  );

  for (const amount of text.match(MONEY_RE) ?? []) {
    if (!allowedMoney.has(normaliseFigure(amount))) {
      issues.push(`introduced an unsupported dollar figure (${amount.trim()})`);
    }
  }

  for (const percent of text.match(PERCENT_RE) ?? []) {
    if (!allowedPercents.has(normaliseFigure(percent))) {
      issues.push(`introduced an unsupported percentage (${percent.trim()})`);
    }
  }

  if (
    /\b(guarantee|guaranteed|firm quote|final price|locked in)\b/i.test(text)
  ) {
    issues.push("presented the estimate as a commitment");
  }

  return issues;
}

export const handler = withGuards(
  { methods: ["POST"], auth: "none" },
  async ({ event, json, error }) => {
    // Rate limit: 10 req/min anonymous, 30 req/min authenticated.
    const ip = getClientIp(event.headers);
    let limitKey = `estimate-anon:${ip}`;
    let maxRequests = 10;

    const authHeader = event.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      const authResult = await verifyAuth(event.headers);
      if (authResult.ok) {
        limitKey = `estimate-user:${authResult.user.id}`;
        maxRequests = 30;
      }
    }

    const rl = checkRateLimit(limitKey, { maxRequests, windowMs: 60_000 });
    if (!rl.allowed) {
      return error(
        429,
        "Too many requests. Please wait before requesting another estimate.",
        rateLimitHeaders(rl)
      );
    }

    try {
      const rawInput = JSON.parse(event.body ?? "{}");
      const parsed = estimateRequestSchema.safeParse(rawInput);
      if (!parsed.success) {
        return error(
          400,
          `Invalid request: ${parsed.error.issues.map(i => `${i.path.join(".")} ${i.message}`).join("; ")}`
        );
      }
      const {
        squareFootage,
        projectType,
        complexity,
        materials,
        location,
        additionalNotes,
        projectId,
        clientId,
      } = parsed.data;

      // ── 1. Compute deterministically ────────────────────────────────────
      const computed = computeEstimate({
        projectType,
        squareFootage,
        complexity,
        materials,
      });

      // A project type with no reviewed cost band is a VERIFY result, not a
      // guess. 200 rather than an error: this is a valid, useful answer.
      if (computed.status === "verify") {
        return json(200, {
          status: "verify",
          reason: computed.reason,
          projectType: computed.projectType?.label ?? projectType,
          message:
            "We don't publish a range for this one — the honest answer needs eyes on the project. Request a free on-site estimate and Eric will price it properly.",
        });
      }

      // ── 2. Validate before anything leaves the function ─────────────────
      const problems = validateEstimate(computed.estimate);
      if (problems.length) {
        // The arithmetic is deterministic, so this means the *basis* is
        // broken, not the request. Never show or persist a bad estimate.
        console.error(
          "[estimate-project] estimate failed validation:",
          problems
        );
        return error(
          500,
          "The estimating basis is currently failing its own integrity checks, so no estimate can be produced. This has been logged."
        );
      }

      const basisReport = validateBasis(ESTIMATING_BASIS);
      if (!basisReport.ok) {
        console.error(
          "[estimate-project] estimating basis is invalid:",
          basisReport.problems
        );
      }
      if (basisReport.warnings.length) {
        console.warn(
          "[estimate-project] estimating basis warnings:",
          basisReport.warnings
        );
      }

      // ── 3. Explain (optional — never blocks the estimate) ────────────────
      let aiReasoning = fallbackReasoning(computed.derivation);
      let explanationSource: "ai" | "deterministic" = "deterministic";

      try {
        const userPrompt = [
          `Project type: ${computed.projectType.label}`,
          squareFootage ? `Square footage: ${squareFootage} sqft` : "",
          `Complexity: ${complexity ?? "medium"}`,
          materials?.length
            ? `Selected materials: ${materials.join(", ")}`
            : "",
          `Location: ${location ?? "Eugene, OR"}`,
          additionalNotes ? `Additional notes: ${additionalNotes}` : "",
          "",
          "COMPUTED ESTIMATE (final — do not restate or alter these figures):",
          `  Conservative: $${computed.estimate.estimatedLow.toLocaleString()}`,
          `  Expected:     $${computed.estimate.estimatedMid.toLocaleString()}`,
          `  Premium:      $${computed.estimate.estimatedHigh.toLocaleString()}`,
          "",
          "DERIVATION:",
          ...computed.derivation.map(d => `  ${d}`),
        ]
          .filter(Boolean)
          .join("\n");

        const result = await invokeLLM({
          feature: "estimate-project",
          messages: [
            {
              role: "system",
              // The job is fixed, so the estimator contract is pinned. It
              // carries the shared prohibitions the prose prompt does not --
              // no code claims, no licensing claims, no promised dates.
              content: [
                PROMPTS.estimator,
                specialistPrompt(
                  routeAi({ surface: "public", specialist: "estimator" }).id
                ),
              ].join("\n\n"),
            },
            { role: "user", content: userPrompt },
          ],
          maxTokens: 400,
          temperature: 0.2,
        });

        const text = result.text.trim();
        const violations = reasoningViolations(
          text,
          computed.derivation,
          computed.estimate
        );
        if (text && !violations.length) {
          aiReasoning = text;
          explanationSource = "ai";
        } else if (violations.length) {
          console.warn(
            "[estimate-project] explanation rejected:",
            violations.join("; ")
          );
        }
      } catch (llmErr) {
        // The estimate is already computed and validated — an explanation
        // failure must never cost the visitor their number.
        console.warn(
          "[estimate-project] explanation unavailable:",
          llmErr instanceof Error ? llmErr.message : llmErr
        );
      }

      // ── 4. Persist ──────────────────────────────────────────────────────
      let savedEstimate = null;
      const db = getSupabaseAdmin();
      if (db && (projectId || clientId)) {
        const { data } = await db
          .from("estimates")
          .insert({
            project_id: projectId,
            client_id: clientId,
            square_footage: squareFootage,
            project_type: projectType,
            complexity,
            materials: materials ? JSON.stringify(materials) : null,
            location: location ?? "Eugene, OR",
            additional_notes: additionalNotes,
            estimated_low: computed.estimate.estimatedLow,
            estimated_mid: computed.estimate.estimatedMid,
            estimated_high: computed.estimate.estimatedHigh,
            labor_cost: computed.estimate.laborCost,
            materials_cost: computed.estimate.materialsCost,
            permits_cost: computed.estimate.permitsCost,
            contingency: computed.estimate.contingency,
            ai_reasoning: aiReasoning,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select()
          .single();
        savedEstimate = data;
      }

      return json(200, {
        status: "ok",
        ...computed.estimate,
        aiReasoning,
        savedEstimate,
        // Additive metadata — the estimator UI can surface how the number was
        // reached and how old its assumptions are.
        basis: {
          source: ESTIMATING_BASIS.basis.source,
          region: ESTIMATING_BASIS.basis.region,
          reviewedAt: ESTIMATING_BASIS.basis.reviewedAt,
          ageDays: basisReport.ageDays,
          stale: basisReport.warnings.length > 0,
          explanationSource,
        },
      });
    } catch (err) {
      console.error("[estimate-project]", err);
      return error(
        500,
        "Unable to generate the estimate right now. Please try again."
      );
    }
  }
);
