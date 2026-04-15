/**
 * useAuth — Supabase session management for client-side auth.
 * Provides user, loading state, sign-in/out helpers.
 *
 * Dev Mode: When VITE_DEV_MODE=true and the dev bypass is active
 * (localStorage key `pcb_dev_active`), returns a mock admin user so the
 * admin dashboard is accessible without a live Supabase connection.
 */
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
};

/** Key used to persist the dev bypass flag across page loads. */
export const DEV_BYPASS_KEY = "pcb_dev_active";

/** Static mock admin injected in dev mode when Supabase is not configured. */
export const DEV_MOCK_USER: AuthUser = {
  id: "dev-admin-local",
  email: "dev@precisioncorebuilders.com",
  name: "Dev Admin",
  role: "admin",
};

function isDevModeEnabled(): boolean {
  return import.meta.env.VITE_DEV_MODE === "true";
}

function isDevBypassActive(): boolean {
  return isDevModeEnabled() && localStorage.getItem(DEV_BYPASS_KEY) === "true";
}

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
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether the dev bypass is currently active (re-evaluates on mount)
  const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    // Check dev bypass first
    if (isDevBypassActive()) {
      setDevBypass(true);
      setLoading(false);
      return;
    }

    // Hydrate from existing Supabase session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If dev bypass is active, return the mock admin user
  if (devBypass) {
    return {
      user: DEV_MOCK_USER,
      session: null,
      loading: false,
      isAuthenticated: true,
      isAdmin: true,
      accessToken: "dev-admin-token",
      signOut: () => {
        localStorage.removeItem(DEV_BYPASS_KEY);
        window.location.href = "/";
      },
    };
  }

  const user: AuthUser | null = session?.user
    ? supabaseUserToAuthUser(session.user)
    : null;

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    isAdmin: user?.role === "admin",
    accessToken: session?.access_token ?? null,
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
    },
  };
}
