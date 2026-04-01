/**
 * useAuth — Phase 1 stub.
 * Phase 2 replaces this with @supabase/supabase-js session management.
 */
import { trpc } from "@/lib/trpc";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
};

export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: (meQuery.data as AuthUser | null) ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
    isAdmin: (meQuery.data as AuthUser | null)?.role === "admin",
    refresh: () => meQuery.refetch(),
  };
}
