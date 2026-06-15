/**
 * Notification delivery — optional email (Resend) and SMS (Twilio) channels.
 * Every function is env-gated and best-effort: it no-ops cleanly when the
 * provider isn't configured and never throws, so callers (e.g. the daily
 * briefing) can fire them without guarding.
 */
import { ENV } from "./env";

export type DeliveryResult = {
  channel: "email" | "sms";
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/** Send a plain-text email via Resend. No-ops unless RESEND_API_KEY +
 *  BRIEFING_EMAIL_TO are configured. */
export async function sendEmail(opts: {
  subject: string;
  text: string;
  to?: string;
}): Promise<DeliveryResult> {
  const to = opts.to ?? ENV.briefingEmailTo;
  if (!ENV.resendApiKey || !to) {
    return { channel: "email", ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.briefingEmailFrom,
        to: to.split(",").map(s => s.trim()),
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      return { channel: "email", ok: false, error: detail.slice(0, 200) };
    }
    return { channel: "email", ok: true };
  } catch (err) {
    return {
      channel: "email",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Send an SMS via Twilio. No-ops unless the Twilio credentials +
 *  BRIEFING_SMS_TO are configured. */
export async function sendSms(opts: {
  body: string;
  to?: string;
}): Promise<DeliveryResult> {
  const to = opts.to ?? ENV.briefingSmsTo;
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioFrom || !to) {
    return { channel: "sms", ok: false, skipped: true };
  }
  try {
    const auth = Buffer.from(
      `${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`
    ).toString("base64");
    const form = new URLSearchParams({
      From: ENV.twilioFrom,
      To: to,
      // Twilio segments long messages; trim to keep it to a couple segments.
      Body: opts.body.slice(0, 600),
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      return { channel: "sms", ok: false, error: detail.slice(0, 200) };
    }
    return { channel: "sms", ok: true };
  } catch (err) {
    return {
      channel: "sms",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
