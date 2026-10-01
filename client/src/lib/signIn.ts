/**
 * Password sign-in for the login page — the only supported sign-in method.
 *
 * Kept out of the component so the rules (error wording, role resolution order,
 * clearing the legacy admin token) are unit-tested.
 */
import { ADMIN_SESSION_KEY } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "user";

/** Only `app_metadata` is tamper-proof; `user_metadata` is user-writable. */
export function roleFromMetadata(user: Pick<User, "app_metadata">): Role {
  return user.app_metadata?.role === "admin" ? "admin" : "user";
}

async function roleFromSyncApi(accessToken: string): Promise<Role | null> {
  try {
    const res = await fetch("/api/auth-sync-role", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { role?: string };
      if (data.role === "admin" || data.role === "user") return data.role;
    }
  } catch {
    // Fall through to the next role source.
  }
  return null;
}

async function roleFromProfile(userId: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!error && (data?.role === "admin" || data?.role === "user")) {
      return data.role;
    }
  } catch {
    // Fall through to metadata.
  }
  return null;
}

/** Where a freshly signed-in user belongs. */
export async function resolveRole(
  user: User,
  accessToken: string
): Promise<Role> {
  return (
    (await roleFromSyncApi(accessToken)) ??
    (await roleFromProfile(user.id)) ??
    roleFromMetadata(user)
  );
}

export function friendlySignInError(message: string | undefined): string {
  if (!message || message === "Invalid login credentials") {
    return "The email or password is incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email address hasn't been confirmed yet. Contact Precision Core Builders for help.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return message;
}

export type SignInResult =
  | { ok: true; destination: "/admin" | "/portal" }
  | { ok: false; error: string };

/** Sign in with email + password and work out where to send the user. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session) {
      return { ok: false, error: friendlySignInError(error?.message) };
    }

    try {
      // A Supabase session is the single source of truth; drop any legacy
      // admin-session token left in this browser.
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // Storage may be unavailable; the Supabase session is already persisted.
    }

    const role = await resolveRole(
      data.session.user,
      data.session.access_token
    );
    return { ok: true, destination: role === "admin" ? "/admin" : "/portal" };
  } catch {
    return {
      ok: false,
      error:
        "Unable to reach the sign-in service. Check your connection and try again.",
    };
  }
}
