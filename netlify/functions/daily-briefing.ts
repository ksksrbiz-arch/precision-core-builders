/**
 * Daily Briefing — proactive AI automation (Netlify Scheduled Function).
 *
 * Runs every morning, builds the live operational snapshot + Eugene weather
 * forecast, asks the LLM (free-first chain) for a concise risk-focused
 * briefing, and delivers it as an in-app notification to every admin so it
 * appears in the Notifications view. Not reachable via HTTP.
 *
 * Schedule: 13:00 UTC ≈ 6:00 AM Pacific (DST-dependent).
 */
import { schedule } from "@netlify/functions";
import { invokeLLM, isLLMConfigured } from "../../server/_core/llm";
import { buildOpsSnapshot } from "../../server/_core/opsSnapshot";
import { getEugeneForecast } from "../../server/_core/weather";
import { db } from "../../server/db";

const SYSTEM_PROMPT = `You are the Ops Co-pilot for Precision Core Builders (owner Eric Tadlock, Eugene OR). Write Eric's morning briefing from the OPERATIONAL DATA SNAPSHOT and WEATHER FORECAST provided.

Format (plain text, no markdown headers):
- One-sentence overall status.
- "⚠️ Risks:" — 1-5 bullets: projects over budget, overdue tasks, material shortages. Skip the line if none.
- "🌧️ Weather:" — only if rain/snow days in the forecast overlap upcoming weather-sensitive/outdoor tasks; name the task, project, and day. Skip if no conflict.
- "📞 Leads:" — top 1-3 leads to call today by score, with name + why. Skip if none.
- "✅ Today:" — 2-4 prioritized actions.

Keep it under ~180 words. Use US dollars. Never invent data; if the snapshot is empty, say there's nothing to report yet.`;

async function getAdminRecipientIds(): Promise<string[]> {
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("users")
      .select("id")
      .eq("role", "admin");
    if (error || !data) return [];
    return data.map(r => r.id as string).filter(Boolean);
  } catch {
    return [];
  }
}

/** Skip if a briefing was already delivered to this admin today (idempotent
 *  against retries / multiple invocations). */
async function alreadySentToday(
  recipientId: string,
  startOfDayIso: string
): Promise<boolean> {
  if (!db) return false;
  try {
    const { data } = await db
      .from("notifications")
      .select("id")
      .eq("recipient_id", recipientId)
      .eq("channel", "in_app")
      .ilike("subject", "Daily Briefing%")
      .gte("created_at", startOfDayIso)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export const handler = schedule("0 13 * * *", async () => {
  if (!db) {
    console.warn("[daily-briefing] DB not configured — skipping.");
    return { statusCode: 200 };
  }
  if (!isLLMConfigured()) {
    console.warn("[daily-briefing] No LLM provider configured — skipping.");
    return { statusCode: 200 };
  }

  const recipients = await getAdminRecipientIds();
  if (recipients.length === 0) {
    console.warn("[daily-briefing] No admin recipients found — skipping.");
    return { statusCode: 200 };
  }

  const [snapshot, forecast] = await Promise.all([
    buildOpsSnapshot(),
    getEugeneForecast(7),
  ]);

  const weatherText = forecast.length
    ? `WEATHER FORECAST (Eugene, OR, next ${forecast.length} days):\n` +
      JSON.stringify(forecast)
    : "WEATHER FORECAST: unavailable.";

  let briefing: string;
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${snapshot.text}\n\n${weatherText}\n\nWrite today's briefing.`,
        },
      ],
      maxTokens: 600,
      temperature: 0.3,
    });
    briefing = result.text.trim();
  } catch (err) {
    console.error("[daily-briefing] LLM failed:", err);
    return { statusCode: 200 };
  }

  if (!briefing) {
    console.warn("[daily-briefing] Empty briefing — skipping.");
    return { statusCode: 200 };
  }

  const now = new Date();
  const startOfDayIso = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const subject = `Daily Briefing — ${now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  let delivered = 0;
  for (const recipientId of recipients) {
    if (await alreadySentToday(recipientId, startOfDayIso)) continue;
    try {
      const { error } = await db.from("notifications").insert({
        recipient_id: recipientId,
        channel: "in_app",
        status: "sent",
        subject,
        body: briefing,
        sent_at: now.toISOString(),
      });
      if (!error) delivered++;
    } catch (err) {
      console.error("[daily-briefing] insert failed:", err);
    }
  }

  console.log(`[daily-briefing] delivered ${delivered}/${recipients.length}`);
  return { statusCode: 200 };
});
