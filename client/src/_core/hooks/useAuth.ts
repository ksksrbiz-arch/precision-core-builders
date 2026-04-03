/**
 * useAuth — Supabase-only auth hook.
 * Clean, simple, no Auth0 complexity.
 */
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  provider: "supabase";
};

function toAuthUser(user: User): AuthUser {
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
  const [dbRole, setDbRole] = useState<"admin" | "user" | null>(null);

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

  // Fetch role from users table to supplement user_metadata
  useEffect(() => {
    if (!session?.user?.id) {
      setDbRole(null);
      return;
    }

    supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.role) setDbRole(data.role as "admin" | "user");
      });
  }, [session?.user?.id]);

  const user: AuthUser | null = session?.user
    ? {
        ...toAuthUser(session.user),
        // DB role takes priority over metadata
        role: dbRole ?? toAuthUser(session.user).role,
      }
    : null;

  const isAuthenticated = !!session;

  return {
    user,
    session,
    loading,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    accessToken: session?.access_token ?? null,
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    },
  };
}
