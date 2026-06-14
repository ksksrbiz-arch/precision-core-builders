import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { verifyAuth } from "./_utils/authGuard";

// Lazily construct the Supabase client so importing this module never throws
// when env vars are absent (e.g. in tests or before setup). Returns null when
// not configured; callers skip persistence in that case.
function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ESTIMATOR_SYSTEM_PROMPT = `You are an expert construction cost estimator specializing in Eugene, Oregon residential construction.
Current Eugene, OR construction cost benchmarks (2024-2025):
- New home construction: $180–$350/sqft depending on finish level
- Full kitchen remodel: $25,000–$80,000
- Bathroom remodel: $8,000–$35,000
- Home addition: $150–$280/sqft
- Outdoor decks: $15–$45/sqft
- Roofing replacement: $8,000–$25,000 for typical home
- Oregon building permits: typically 1-2% of project value
- Labor: typically 40-50% of total project cost
- Contingency: 10-15% recommended

Respond ONLY with valid JSON in this exact format:
{
  "estimatedLow": <number>,
  "estimatedMid": <number>,
  "estimatedHigh": <number>,
  "laborCost": <number>,
  "materialsCost": <number>,
  "permitsCost": <number>,
  "contingency": <number>,
  "aiReasoning": "2-3 sentence explanation of the estimate basis and key cost drivers"
}`;

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 200, headers, body: "" };

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };

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
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error:
          "Too many requests. Please wait before requesting another estimate.",
      }),
    };
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

    if (!projectType)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "projectType required" }),
      };

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
        { role: "system", content: ESTIMATOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      jsonMode: true,
      maxTokens: 800,
      temperature: 0.1,
    });

    const estimate = JSON.parse(result.text);

    // Save to estimates table if projectId or clientId provided
    let savedEstimate = null;
    const db = getDb();
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...estimate, savedEstimate }),
    };
  } catch (err) {
    console.error("[estimate-project]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
    };
  }
};
