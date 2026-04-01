/**
 * useAuth — Supabase session management for client-side auth.
 * Provides user, loading state, sign-in/out helpers.
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

  useEffect(() => {
    // Hydrate from existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

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
