/**
 * Admin authentication — simple email/password check against env vars.
 * No database or Supabase required.
 *
 * Required env vars (set in Netlify dashboard, server-side only):
 *   ADMIN_EMAIL         — Eric's login email
 *   ADMIN_PASSWORD      — Eric's login password
 *   ADMIN_SESSION_TOKEN — a random secret string returned as the session token
 *
 * On success returns { token: ADMIN_SESSION_TOKEN }.
 * The client stores the token in localStorage and sends it as a Bearer token
 * on subsequent API calls.
 */
import type { Handler } from "@netlify/functions";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let email: string;
  let password: string;
  try {
    const body = JSON.parse(event.body ?? "{}");
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const sessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";

  if (!adminEmail || !adminPassword || !sessionToken) {
    console.error(
      "[admin-auth] ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_SESSION_TOKEN not set"
    );
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "Admin credentials not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_TOKEN in Netlify environment variables.",
      }),
    };
  }

  // Small delay to slow brute-force attempts regardless of outcome
  await new Promise(r => setTimeout(r, 400));

  if (email !== adminEmail || password !== adminPassword) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Incorrect email or password." }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ token: sessionToken }),
  };
};
