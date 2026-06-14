/**
 * AI Ops Co-pilot — POST /api/ai-copilot
 *
 * An admin-only conversational assistant that answers natural-language
 * questions over Eric's REAL operational data (projects, estimates, schedule,
 * ledger, leads, materials, field reports). Rather than embeddings, it injects
 * a compact, bounded snapshot of the current business state as context — fast,
 * accurate, and free-tier friendly for a single firm's data volume.
 *
 * Reads private business data via the service-role DB, so it requires an
 * authenticated admin (verifyAdmin).
 */
import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { buildOpsSnapshot } from "../../server/_core/opsSnapshot";
import { verifyAdmin } from "./_utils/authGuard";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";

const SYSTEM_PROMPT = `You are the Ops Co-pilot for Precision Core Builders, the private command-center assistant for owner Eric Tadlock (CCB #246527), a master builder in Eugene, OR.

You answer questions about his live operations using ONLY the OPERATIONAL DATA SNAPSHOT provided below. Rules:
- Be concise and decisive — Eric is busy. Lead with the answer, then brief supporting detail.
- Proactively surface risk: projects over budget (actual_cost vs contracted_budget), tasks behind schedule (planned_end in the past, status not complete), weather-sensitive work, material shortages, and high-priority leads to call.
- When asked "what should I do", give a short prioritized action list.
- Format money as US dollars (e.g. $12,500). Reference projects/clients by name.
- If the snapshot lacks the data needed to answer, say so plainly — never invent numbers, dates, names, or statuses.
- Today's date is provided in the snapshot; use it for "overdue", "this week", etc.`;

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };

  // Exposes the full private dataset — admin only.
  const auth = await verifyAdmin(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  // Rate limit: 20 questions per minute per admin.
  const rl = checkRateLimit(`ai-copilot:${auth.user.id}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many requests. Please slow down.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? "{}") as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const messages = (body.messages ?? [])
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-12); // keep the last few turns to bound tokens

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No messages provided." }),
      };
    }

    const snapshot = await buildOpsSnapshot();

    const result = await invokeLLM({
      feature: "ai-copilot",
      userId: auth.user.id,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${snapshot.text}` },
        ...messages,
      ],
      maxTokens: 900,
      temperature: 0.3,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: result.text,
        model: result.model,
        provider: result.provider,
      }),
    };
  } catch (err) {
    console.error("[ai-copilot]", err);
    const isConfigError =
      err instanceof Error && err.message.includes("No LLM API key configured");
    return {
      statusCode: isConfigError ? 503 : 500,
      headers,
      body: JSON.stringify({
        error: isConfigError
          ? "AI is not configured yet. Add a free GROQ_API_KEY or GOOGLE_AI_API_KEY."
          : "Co-pilot is temporarily unavailable. Please try again.",
      }),
    };
  }
};
