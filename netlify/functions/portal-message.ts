/**
 * Portal Message — POST /api/portal-message
 *
 * Lets a portal client send a message straight to Eric when the assistant
 * can't answer (invoices, change requests, scheduling). Files an in-app
 * notification to every admin, tagged with the client's name and project so
 * Eric has context. Authenticated; scoped to the caller's own client record.
 */
import type { Handler } from "@netlify/functions";
import { db } from "../../server/db";
import { verifyAuth } from "./_utils/authGuard";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";

const MAX_MESSAGE_LEN = 2000;

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

  const auth = await verifyAuth(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  // Rate limit: 5 messages per 5 minutes per user.
  const rl = checkRateLimit(`portal-message:${auth.user.id}`, {
    maxRequests: 5,
    windowMs: 5 * 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "You've sent several messages — please wait a few minutes.",
      }),
    };
  }

  const body = JSON.parse(event.body ?? "{}") as { message?: string };
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE_LEN);
  if (message.length < 2) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Please enter a message." }),
    };
  }

  if (!db) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Messaging is unavailable right now." }),
    };
  }

  try {
    // Resolve the sender's client record + most relevant project for context.
    const { data: clientRows } = await db
      .from("clients")
      .select("id,name")
      .eq("user_id", auth.user.id);
    const clientName =
      clientRows?.[0]?.name ?? auth.user.email ?? "Portal client";
    const clientIds = (clientRows ?? []).map(c => c.id as number);

    let projectId: number | null = null;
    let projectName: string | null = null;
    if (clientIds.length > 0) {
      const { data: projectRows } = await db
        .from("projects")
        .select("id,name")
        .in("client_id", clientIds)
        .order("updated_at", { ascending: false })
        .limit(1);
      projectId = (projectRows?.[0]?.id as number) ?? null;
      projectName = (projectRows?.[0]?.name as string) ?? null;
    }

    // Find admins to notify.
    const { data: admins } = await db
      .from("users")
      .select("id")
      .eq("role", "admin");
    const adminIds = (admins ?? []).map(a => a.id as string).filter(Boolean);

    if (adminIds.length === 0) {
      console.warn("[portal-message] no admin recipients found");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, delivered: 0 }),
      };
    }

    const subject = `Portal message from ${clientName}${
      projectName ? ` — ${projectName}` : ""
    }`;
    const fullBody = `${clientName} sent a message via the project portal${
      projectName ? ` (${projectName})` : ""
    }:\n\n${message}`;

    const rows = adminIds.map(id => ({
      recipient_id: id,
      project_id: projectId,
      channel: "in_app" as const,
      status: "sent" as const,
      subject,
      body: fullBody,
      sent_at: new Date().toISOString(),
    }));

    const { error } = await db.from("notifications").insert(rows);
    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, delivered: rows.length }),
    };
  } catch (err) {
    console.error("[portal-message]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Couldn't send your message. Please try again or call us.",
      }),
    };
  }
};
