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
import { sendEmail, sendSms } from "../../server/_core/delivery";
import { db } from "../../server/db";
import { PROMPTS } from "./_lib/llm/prompts";

const SYSTEM_PROMPT = PROMPTS.dailyBriefing;

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
      feature: "daily-briefing",
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

  // Optional external delivery (email + SMS). Both no-op when unconfigured and
  // only fire if at least one in-app briefing was newly delivered today.
  if (delivered > 0) {
    const [email, sms] = await Promise.all([
      sendEmail({ subject, text: briefing }),
      sendSms({ body: `${subject}\n\n${briefing}` }),
    ]);
    if (email.ok) console.log("[daily-briefing] emailed");
    if (email.error)
      console.error("[daily-briefing] email failed:", email.error);
    if (sms.ok) console.log("[daily-briefing] texted");
    if (sms.error) console.error("[daily-briefing] sms failed:", sms.error);
  }

  return { statusCode: 200 };
});
