/**
 * Lead scoring — shared logic used by the manual lead-score endpoint and the
 * automatic submission-created trigger (new website inquiries).
 */
import { invokeLLM, parseLlmJson } from "./llm";

export const LEAD_SCORE_SYSTEM_PROMPT = `You are an AI lead scoring assistant for Precision Core Builders, a licensed Oregon contractor (CCB #246527) in Eugene, OR.
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

export type LeadInput = {
  name?: string;
  projectType?: string;
  budget?: string;
  location?: string;
  timeline?: string;
  message?: string;
  description?: string;
};

export type LeadPriority = "low" | "medium" | "high" | "urgent";

export type ScoredLead = {
  score: number;
  priority: LeadPriority;
  reasoning: string;
  suggestedAction: string;
  estimatedValue: number | null;
};

const PRIORITIES: LeadPriority[] = ["low", "medium", "high", "urgent"];

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Derive a priority from the score when the model omits/garbles it. */
function priorityFromScore(score: number): LeadPriority {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Score a lead via the free-first LLM chain. Returns a normalized result;
 * throws if the model output can't be parsed.
 */
export async function scoreLead(input: LeadInput): Promise<ScoredLead> {
  const prompt = [
    `Name: ${input.name ?? "Unknown"}`,
    `Project type: ${input.projectType ?? "Not specified"}`,
    `Budget: ${input.budget ?? "Not specified"}`,
    `Location: ${input.location ?? "Not specified"}`,
    `Timeline: ${input.timeline ?? "Not specified"}`,
    `Description: ${input.message ?? input.description ?? "None"}`,
  ].join("\n");

  const result = await invokeLLM({
    feature: "lead-score",
    messages: [
      { role: "system", content: LEAD_SCORE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    jsonMode: true,
    maxTokens: 400,
    temperature: 0.1,
  });

  // Tolerate code fences / preamble in the model output (matches every other
  // AI function) rather than throwing on a single stray token.
  const raw = parseLlmJson<Record<string, unknown>>(result.text);
  const score = clampScore(raw.score);
  const priority = PRIORITIES.includes(raw.priority as LeadPriority)
    ? (raw.priority as LeadPriority)
    : priorityFromScore(score);
  const estimatedValueNum =
    typeof raw.estimatedValue === "number"
      ? raw.estimatedValue
      : parseFloat(String(raw.estimatedValue ?? ""));

  return {
    score,
    priority,
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
    suggestedAction:
      typeof raw.suggestedAction === "string" ? raw.suggestedAction : "",
    estimatedValue: Number.isFinite(estimatedValueNum)
      ? estimatedValueNum
      : null,
  };
}
