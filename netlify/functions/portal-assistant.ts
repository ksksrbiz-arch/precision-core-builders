/**
 * Portal Assistant — POST /api/portal-assistant
 *
 * A client-facing conversational assistant for the project portal. Answers a
 * client's questions about THEIR OWN project (status, schedule, recent updates,
 * finish selections, client-visible decisions) using a strictly client-scoped,
 * client-safe snapshot. Requires an authenticated user; data is scoped to the
 * caller's own client record, so internal cost/margin/vendor/lead data is never
 * exposed.
 */
import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { buildPortalSnapshot } from "../../server/_core/portalSnapshot";
import { verifyAuth } from "./_utils/authGuard";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";

const SYSTEM_PROMPT = `You are the project assistant for Precision Core Builders (master builder Eric Tadlock, CCB #246527, Eugene OR), speaking directly to a CLIENT about their construction project.

Use ONLY the CLIENT PROJECT DATA provided. Rules:
- Warm, professional, reassuring tone — you represent a luxury builder. Be concise.
- Answer about the client's project: current status & % complete, what's in progress and what's next on the schedule, recent published updates, their finish selections and budget impacts, and logged decisions.
- Format money as US dollars. Reference dates plainly (e.g. "June 20").
- NEVER discuss internal costs, profit margins, vendor pricing, other clients, or anything not in the provided data.
- If the data doesn't cover the question (e.g. invoices, change requests, scheduling a call), don't guess — invite them to message Eric directly through the portal or their usual contact.
- If there is no project data, warmly let them know their project information isn't available yet and to reach out to the Precision Core Builders team.`;

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

  // Any authenticated user — data is scoped to their own client record.
  const auth = await verifyAuth(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  // Rate limit: 15 questions per minute per user.
  const rl = checkRateLimit(`portal-assistant:${auth.user.id}`, {
    maxRequests: 15,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({ error: "Too many requests. Please slow down." }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? "{}") as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const messages = (body.messages ?? [])
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-12);

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No messages provided." }),
      };
    }

    const snapshot = await buildPortalSnapshot(auth.user.id);

    const result = await invokeLLM({
      feature: "portal-assistant",
      userId: auth.user.id,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${snapshot.text}` },
        ...messages,
      ],
      maxTokens: 700,
      temperature: 0.4,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: result.text,
        provider: result.provider,
        hasProjects: snapshot.hasProjects,
      }),
    };
  } catch (err) {
    console.error("[portal-assistant]", err);
    const isConfigError =
      err instanceof Error && err.message.includes("No LLM API key configured");
    return {
      statusCode: isConfigError ? 503 : 500,
      headers,
      body: JSON.stringify({
        error: isConfigError
          ? "The assistant isn't available right now. Please check back soon."
          : "The assistant is temporarily unavailable. Please try again.",
      }),
    };
  }
};
