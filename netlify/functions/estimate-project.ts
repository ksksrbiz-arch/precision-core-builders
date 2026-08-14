import { invokeLLM, parseLlmJson } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { verifyAuth } from "./_utils/authGuard";
import { withGuards } from "./_lib/http";
import { PROMPTS } from "./_lib/llm/prompts";
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

      const userPrompt = [
        `Project type: ${projectType}`,
        squareFootage ? `Square footage: ${squareFootage} sqft` : "",
        complexity ? `Complexity: ${complexity}` : "",
        materials?.length ? `Selected materials: ${materials.join(", ")}` : "",
        location ? `Location: ${location}` : "Location: Eugene, OR",
        additionalNotes ? `Additional notes: ${additionalNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await invokeLLM({
        feature: "estimate-project",
        messages: [
          { role: "system", content: PROMPTS.estimator },
          { role: "user", content: userPrompt },
        ],
        jsonMode: true,
        maxTokens: 800,
        temperature: 0.1,
      });

      let estimate: Record<string, unknown>;
      try {
        estimate = parseLlmJson<Record<string, unknown>>(result.text);
      } catch (parseErr) {
        console.error("[estimate-project] JSON parse failed:", parseErr);
        return error(
          502,
          "The AI returned an unexpected response format. Please try again."
        );
      }

      // Whitelist + map the model's cost fields onto the real snake_case
      // columns. Never spread raw LLM JSON into the insert: unexpected keys
      // fail (or pollute) the row, and the camelCase keys don't match the
      // columns anyway.
      const toNum = (v: unknown): number | null => {
        const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
        return Number.isFinite(n) ? n : null;
      };
      const estimateColumns = {
        estimated_low: toNum(estimate.estimatedLow),
        estimated_mid: toNum(estimate.estimatedMid),
        estimated_high: toNum(estimate.estimatedHigh),
        labor_cost: toNum(estimate.laborCost),
        materials_cost: toNum(estimate.materialsCost),
        permits_cost: toNum(estimate.permitsCost),
        contingency: toNum(estimate.contingency),
        ai_reasoning:
          typeof estimate.aiReasoning === "string"
            ? estimate.aiReasoning
            : null,
      };

      // Save to estimates table if projectId or clientId provided
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
            ...estimateColumns,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select()
          .single();
        savedEstimate = data;
      }

      return json(200, { ...estimate, savedEstimate });
    } catch (err) {
      console.error("[estimate-project]", err);
      return error(
        500,
        "Unable to generate the estimate right now. Please try again."
      );
    }
  }
);
