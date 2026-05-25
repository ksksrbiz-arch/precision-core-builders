/**
 * Sync the caller's role in `public.users` based on an allowlist of admin
 * emails. Called by the auth callback page right after a successful magic
 * link sign-in so the user lands on the correct dashboard without any
 * manual SQL editor work in Supabase.
 *
 * Flow:
 *   1. Verify the Supabase JWT in the Authorization header.
 *   2. Resolve the user's email.
 *   3. If the email is on the admin allowlist, upsert `public.users` with
 *      role='admin'. Otherwise upsert with role='user' (only if no row
 *      exists yet — never silently downgrades an existing admin).
 *   4. Return { role } so the client can redirect appropriately.
 *
 * The allowlist defaults to the two hard-coded production admins so the
 * site works the moment it's pushed to main. Additional emails may be
 * added via the optional `ADMIN_EMAILS` env var (comma-separated).
 *
 * Required env vars (server-side, Netlify dashboard):
 *   SUPABASE_URL                 — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (bypasses RLS for upsert)
 *   ADMIN_EMAIL (optional)       — primary admin email to allowlist
 *   ADMIN_EMAILS  (optional)     — extra allowlisted admin emails
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { getAdminEmailSet } from "./_utils/adminEmails";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

  const authHeader =
    event.headers["authorization"] ?? event.headers["Authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Missing authorization token" }),
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error(
      "[auth-sync-role] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
    );
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: "Auth role sync is not configured on the server.",
      }),
    };
  }

  // 1. Verify JWT and resolve user
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Invalid or expired token" }),
    };
  }

  const authUser = userData.user;
  const email = (authUser.email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Authenticated user has no email" }),
    };
  }

  const adminEmails = getAdminEmailSet();
  const isAdminEmail = adminEmails.has(email);

  // 2. Look up any existing public.users row so we don't downgrade admins
  //    who aren't currently on the allowlist (e.g. legacy accounts).
  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingErr) {
    console.error(
      "[auth-sync-role] failed to read existing user row:",
      existingErr
    );
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to read user record" }),
    };
  }

  const existingRole = (existing?.role as "admin" | "user" | undefined) ?? null;

  let nextRole: "admin" | "user";
  if (isAdminEmail) {
    nextRole = "admin";
  } else if (existingRole === "admin") {
    nextRole = "admin"; // preserve existing admin
  } else {
    nextRole = "user";
  }

  // 3. Upsert public.users row. Service role bypasses RLS.
  const name =
    (authUser.user_metadata?.name as string | undefined) ??
    (authUser.user_metadata?.full_name as string | undefined) ??
    null;

  const { error: upsertErr } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      email,
      name,
      role: nextRole,
      last_signed_in: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertErr) {
    console.error("[auth-sync-role] upsert failed:", upsertErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to sync user role" }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ role: nextRole, email }),
  };
};
