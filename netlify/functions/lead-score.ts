import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { checkRateLimit, getClientIP } from "../../server/_core/rateLimit";

const LEAD_SCORE_SYSTEM_PROMPT = `You are an AI lead scoring assistant for Precision Core Builders, a licensed Oregon contractor (CCB #246527) in Eugene, OR.
Score incoming project leads from 0-100 based on:
- Project type fit (custom homes, remodels, additions score highest)
- Budget alignment (higher budget = higher score, especially $75k+)
- Location proximity to Eugene, OR (Lane County scores best)
- Timeline (projects starting within 6 months score higher)
- Specificity of request (detailed requests score higher than vague)

Return ONLY valid JSON:
{
  "score": <0-100>,
  "priority": "low"|"medium"|"high"|"urgent",
  "reasoning": "1-2 sentence explanation",
  "suggestedAction": "Specific next action for Eric to take",
  "estimatedValue": <estimated project value in dollars or null>
}`;

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: "" };

  try {
    // Rate limit: 20 scores per minute per IP
    const ip = getClientIP(event.headers as Record<string, string>);
    const rl = await checkRateLimit(`lead:${ip}`, 20);
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, "Retry-After": "60" },
        body: JSON.stringify({ error: "Too many requests" }),
      };
    }

    const lead = JSON.parse(event.body ?? "{}");
    const prompt = [
      `Name: ${lead.name ?? "Unknown"}`,
      `Project type: ${lead.projectType ?? "Not specified"}`,
      `Budget: ${lead.budget ?? "Not specified"}`,
      `Location: ${lead.location ?? "Not specified"}`,
      `Timeline: ${lead.timeline ?? "Not specified"}`,
      `Description: ${lead.message ?? lead.description ?? "None"}`,
    ].join("\n");

    const result = await invokeLLM({
      messages: [
        { role: "system", content: LEAD_SCORE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      maxTokens: 400,
      temperature: 0.1,
    });

    let score;
    try {
      score = JSON.parse(result.text);
    } catch {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI returned invalid format" }),
      };
    }
    return { statusCode: 200, headers, body: JSON.stringify(score) };
  } catch (err) {
    console.error("[lead-score]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
