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
 * The allowlist defaults to hard-coded production admins so the
 * site works the moment it's pushed to main. Additional emails may be
 * added via the optional `ADMIN_EMAILS` env var (comma-separated).
 *
 * Required env vars (server-side, Netlify dashboard):
 *   SUPABASE_URL                 — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (bypasses RLS for upsert)
 *   ADMIN_EMAIL (optional)       — primary admin email to allowlist
 *   ADMIN_EMAILS  (optional)     — extra allowlisted admin emails
 */
import { getAdminEmailSetWithDb } from "./_utils/adminEmails";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import { withGuards } from "./_lib/http";

export const handler = withGuards(
  { methods: ["POST"], auth: "none" },
  async ({ event, json, error }) => {
    const authHeader =
      event.headers["authorization"] ?? event.headers["Authorization"];
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return error(401, "Missing authorization token");
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error(
        "[auth-sync-role] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
      );
      return error(503, "Auth role sync is not configured on the server.");
    }

    // 1. Verify JWT and resolve user
    const { data: userData, error: userErr } =
      await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return error(401, "Invalid or expired token");
    }

    const authUser = userData.user;
    const email = (authUser.email ?? "").trim().toLowerCase();
    if (!email) {
      return error(400, "Authenticated user has no email");
    }

    const adminEmails = await getAdminEmailSetWithDb(supabase);
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
      return error(500, "Failed to read user record");
    }

    const existingRole =
      (existing?.role as "admin" | "user" | undefined) ?? null;

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
      return error(500, "Failed to sync user role");
    }

    // Also persist role in Supabase Auth metadata so the JWT carries the
    // role even when the client-side `public.users` read fails (e.g. RLS
    // not yet applied, table latency, or network hiccup).  `app_metadata`
    // is preferred because only the service role can write to it — the
    // user cannot escalate their own privileges.  We also mirror the value
    // into `user_metadata` so legacy fallback paths that read it continue
    // to work.
    try {
      await supabase.auth.admin.updateUserById(authUser.id, {
        app_metadata: { role: nextRole },
        user_metadata: { role: nextRole },
      });
    } catch (metaErr) {
      // Non-fatal — the public.users row was already written so the
      // primary role resolution path will still work.
      console.warn(
        "[auth-sync-role] failed to update auth metadata (non-fatal):",
        metaErr
      );
    }

    return json(200, { role: nextRole, email });
  }
);
