import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = input.title?.trim();
  const content = input.content?.trim();

  if (!title)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  if (!content)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  if (title.length > TITLE_MAX_LENGTH)
    throw new TRPCError({ code: "BAD_REQUEST", message: `Title must be ≤ ${TITLE_MAX_LENGTH} characters.` });
  if (content.length > CONTENT_MAX_LENGTH)
    throw new TRPCError({ code: "BAD_REQUEST", message: `Content must be ≤ ${CONTENT_MAX_LENGTH} characters.` });

  return { title, content };
}

/**
 * Dispatches an owner notification via n8n webhook.
 * n8n routes the event to SMS, email, or in-app depending on workflow config.
 * Returns true if accepted, false if n8n is unreachable (non-fatal).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.n8nWebhookUrl) {
    // n8n not configured yet — log and continue gracefully
    console.warn("[Notification] N8N_WEBHOOK_URL not set. Notification dropped:", title);
    return false;
  }

  try {
    const res = await fetch(`${ENV.n8nWebhookUrl.replace(/\/$/, "")}/owner-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Notification] n8n webhook responded ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Notification] Failed to reach n8n:", err);
    return false;
  }
}
