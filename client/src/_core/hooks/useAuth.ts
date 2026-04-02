/**
 * useAuth — Unified auth hook supporting both Supabase and Auth0.
 *
 * Priority: Auth0 session takes precedence when available (signup flow),
 * otherwise falls back to Supabase session (existing admin/magic-link flow).
 */
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Auth0 hook — conditionally imported so it doesn't break when Auth0Provider
// is not mounted (e.g. missing env vars).
let useAuth0Hook: (() => {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessTokenSilently: () => Promise<string>;
  logout: (opts?: any) => void;
}) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth0React = await import("@auth0/auth0-react");
  useAuth0Hook = auth0React.useAuth0;
} catch {
  // Auth0 not available — Supabase-only mode
}

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  provider: "supabase" | "auth0";
};

function supabaseUserToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      null,
    role: (user.user_metadata?.role as "admin" | "user") ?? "user",
    provider: "supabase",
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Auth0 state (if available) ──────────────────────────────────
  let auth0User: AuthUser | null = null;
  let auth0Authenticated = false;
  let auth0Loading = false;
  let auth0GetToken: (() => Promise<string>) | null = null;
  let auth0Logout: ((opts?: any) => void) | null = null;

  if (useAuth0Hook) {
    try {
      const a0 = useAuth0Hook();
      auth0Loading = a0.isLoading;
      auth0Authenticated = a0.isAuthenticated;
      auth0GetToken = a0.getAccessTokenSilently;
      auth0Logout = a0.logout;

      if (a0.isAuthenticated && a0.user) {
        const roles: string[] =
          a0.user["https://pcb.app/roles"] ??
          a0.user.roles ??
          [];
        auth0User = {
          id: a0.user.sub ?? "",
          email: a0.user.email ?? "",
          name: a0.user.name ?? a0.user.nickname ?? null,
          role: roles.includes("admin") ? "admin" : "user",
          provider: "auth0",
        };
      }
    } catch {
      // Auth0Provider not in tree — ignore
    }
  }

  // ── Supabase state ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const supabaseUser: AuthUser | null = session?.user
    ? supabaseUserToAuthUser(session.user)
    : null;

  // ── Unified — Auth0 takes priority when authenticated ──────────
  const isStillLoading = loading || auth0Loading;
  const user: AuthUser | null = auth0User ?? supabaseUser;
  const isAuthenticated = auth0Authenticated || !!session;

  return {
    user,
    session,
    loading: isStillLoading,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    accessToken: session?.access_token ?? null,
    auth0GetToken,
    signOut: async () => {
      // Sign out from whichever provider is active
      if (auth0Authenticated && auth0Logout) {
        auth0Logout({ logoutParams: { returnTo: window.location.origin } });
      }
      if (session) {
        await supabase.auth.signOut();
      }
      window.location.href = "/";
    },
  };
}
