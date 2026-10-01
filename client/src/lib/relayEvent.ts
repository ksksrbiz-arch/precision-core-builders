/**
 * relayAdminEvent — fire-and-forget platform event to the n8n relay.
 *
 * `/api/n8n-webhook` rejects unauthenticated browsers (it fails closed so
 * nobody can inject automation events), so admin pages must present their
 * session. Calling `fetch` bare from the page — as the pages used to — meant
 * every admin-triggered event (task complete, report published, milestone
 * billed, status change, shortage) was silently dropped with a 401/503 that the
 * `.catch(() => {})` could not see (an HTTP error is not a rejection).
 *
 * Failures are logged, never thrown: a dead automation backend must not break
 * the admin action that triggered the event.
 */
import { getAuthHeader } from "@/lib/authHeader";

export type RelayEvent = {
  event: string;
  payload?: Record<string, unknown>;
};

export async function relayAdminEvent(body: RelayEvent): Promise<void> {
  try {
    const res = await fetch("/api/n8n-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(
        `[relayAdminEvent] ${body.event} was not relayed (HTTP ${res.status})`
      );
    }
  } catch (err) {
    console.warn(`[relayAdminEvent] ${body.event} failed`, err);
  }
}
