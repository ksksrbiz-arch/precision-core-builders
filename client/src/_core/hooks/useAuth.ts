/**
 * useAuth — session management for client-side auth.
 * Provides user, loading state, sign-in/out helpers.
 *
 * Priority order:
 *  1. Dev bypass (VITE_DEV_MODE=true + localStorage flag)
 *  2. Admin session token (stored by admin-auth Netlify Function after
 *     email/password login — no database required)
 *  3. Supabase session (for portal clients, if Supabase is configured)
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
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

/**
 * Key used to store the admin session token returned by the admin-auth
 * Netlify Function after a successful email/password login.
 */
export const ADMIN_SESSION_KEY = "pcb_admin_session";

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

export function getStoredAdminSessionToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

async function supabaseUserToAuthUser(user: User): Promise<AuthUser> {
  let role: "admin" | "user" =
    (user.user_metadata?.role as "admin" | "user") ?? "user";

  try {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && (profile?.role === "admin" || profile?.role === "user")) {
      role = profile.role;
    }
  } catch {
    // Fall back to role embedded in auth metadata when profile lookup fails.
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name:
      user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      null,
    role,
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether the dev bypass is currently active (re-evaluates on mount)
  const [devBypass, setDevBypass] = useState(false);
  // Admin session token stored by the admin-auth function after login
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check dev bypass
    if (isDevBypassActive()) {
      setDevBypass(true);
      setLoading(false);
      return;
    }

    // 2. Check admin session token (simple credential-based auth, no DB)
    const token = getStoredAdminSessionToken();
    if (token) {
      setAdminToken(token);
      setLoading(false);
      return;
    }

    // 3. Fall back to Supabase session (for portal clients)
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isEffectActive = true;
    let latestRequestId = 0;

    const syncSession = async (nextSession: Session | null) => {
      const thisRequestId = ++latestRequestId;
      setSession(nextSession);

      if (!nextSession) {
        if (!isEffectActive || thisRequestId !== latestRequestId) return;
        setUser(null);
        setLoading(false);
        return;
      }

      const nextUser = await supabaseUserToAuthUser(nextSession.user);
      if (!isEffectActive || thisRequestId !== latestRequestId) return;
      setUser(nextUser);
      setLoading(false);
    };

    // Hydrate from existing Supabase session
    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void syncSession(newSession);
    });

    return () => {
      isEffectActive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Path 1: dev bypass
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

  // Path 2: admin session token
  if (adminToken) {
    const adminUser: AuthUser = {
      id: "admin",
      email: "admin@precisioncorebuilders.com",
      name: "Eric Tadlock",
      role: "admin",
    };
    return {
      user: adminUser,
      session: null,
      loading: false,
      isAuthenticated: true,
      isAdmin: true,
      accessToken: adminToken,
      signOut: () => {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.href = "/";
      },
    };
  }

  // Path 3: Supabase session (portal clients)
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
