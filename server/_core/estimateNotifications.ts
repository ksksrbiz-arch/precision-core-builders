/**
 * Tell a client their estimate is ready.
 *
 * `estimates.markSent` used to only flip `sent_to_client`, while the admin UI
 * toasted "Estimate sent to client" — nothing was ever delivered, so the client
 * found out only if they happened to open the portal. This sends a best-effort
 * in-app notification (for clients with a portal login) and an email (when the
 * Resend provider is configured). It never throws: delivery trouble must not
 * undo or fail the "mark sent" action.
 *
 * The message is deliberately generic and carries NO dollar figures — the
 * numbers live in the estimate itself, which the client reads in the portal.
 */
import { notificationsRepo } from "../_data/notificationsRepo";
import { sendEmail } from "./delivery";

export type EstimateForNotice = {
  id: number;
  project_id?: number | null;
  projects?: { name?: string | null } | null;
  clients?: {
    name?: string | null;
    email?: string | null;
    user_id?: string | null;
  } | null;
};

export type EstimateNoticeResult = {
  inApp: boolean;
  email: "sent" | "skipped" | "failed" | "no_address";
};

export function estimateReadyMessage(est: EstimateForNotice): {
  subject: string;
  body: string;
} {
  const first = (est.clients?.name ?? "").trim().split(/\s+/)[0];
  const project = est.projects?.name?.trim();
  return {
    subject: "Your estimate from Precision Core Builders is ready",
    body: [
      first ? `Hi ${first},` : "Hello,",
      "",
      `Your estimate${project ? ` for ${project}` : ""} is ready to review. Sign in to your client portal and open Payments to see the full breakdown.`,
      "",
      "Questions? Reply to this message or call us — we're glad to walk through it.",
      "",
      "— Precision Core Builders",
    ].join("\n"),
  };
}

export async function notifyClientEstimateSent(
  est: EstimateForNotice
): Promise<EstimateNoticeResult> {
  const result: EstimateNoticeResult = { inApp: false, email: "no_address" };
  const client = est.clients;
  if (!client) return result;

  const { subject, body } = estimateReadyMessage(est);

  if (client.user_id) {
    try {
      const row = await notificationsRepo.insert({
        recipient_id: client.user_id,
        project_id: est.project_id ?? undefined,
        channel: "in_app",
        subject,
        body,
        status: "pending",
      });
      await notificationsRepo.markSent(row.id);
      result.inApp = true;
    } catch (err) {
      console.warn("[estimate-notice] in-app notification failed:", err);
    }
  }

  if (client.email) {
    const delivery = await sendEmail({ subject, text: body, to: client.email });
    result.email = delivery.ok
      ? "sent"
      : delivery.skipped
        ? "skipped"
        : "failed";
    if (result.email === "failed") {
      console.warn("[estimate-notice] email failed:", delivery.error);
    }
  }

  return result;
}
