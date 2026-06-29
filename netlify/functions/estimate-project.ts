import { invokeLLM } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { verifyAuth } from "./_utils/authGuard";
import { withGuards } from "./_lib/http";
import { PROMPTS } from "./_lib/llm/prompts";

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
      const input = JSON.parse(event.body ?? "{}");
      const {
        squareFootage,
        projectType,
        complexity,
        materials,
        location,
        additionalNotes,
      } = input;

      if (!projectType) return error(400, "projectType required");

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

      const estimate = JSON.parse(result.text);

      // Save to estimates table if projectId or clientId provided
      let savedEstimate = null;
      const db = getSupabaseAdmin();
      if (db && (input.projectId || input.clientId)) {
        const { data } = await db
          .from("estimates")
          .insert({
            project_id: input.projectId,
            client_id: input.clientId,
            square_footage: squareFootage,
            project_type: projectType,
            complexity,
            materials: materials ? JSON.stringify(materials) : null,
            location: location ?? "Eugene, OR",
            additional_notes: additionalNotes,
            ...estimate,
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
      return error(500, err instanceof Error ? err.message : "Internal error");
    }
  }
);
