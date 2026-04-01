import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";

const SYSTEM_PROMPT = `You are the Digital Foreman AI assistant for Precision Core Builders, owned by Eric Tadlock (CCB #246527), a master builder in Eugene, OR with 20+ years of experience.

You assist with:
- Construction project questions and scheduling
- Material estimates and procurement guidance
- Building code and permit questions for Oregon/Lane County
- Weather-sensitive scheduling (Eugene, OR climate)
- Client communication drafts
- Cost estimation guidance

Core values: Precise Construction. Core Values.
Keep responses concise, professional, and practical. If asked about specific project data you don't have access to, say so clearly.`;

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> =
      body.messages ?? [];

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array is required" }),
      };
    }

    // Prepend system prompt
    const fullMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== "system"),
    ];

    const result = await invokeLLM({
      messages: fullMessages,
      maxTokens: 600,
      temperature: 0.4,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: result.text, model: result.model }),
    };
  } catch (err) {
    console.error("[ai-chat]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
