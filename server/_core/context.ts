import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type UserRole = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

/**
 * Phase 1: No auth yet — user is always null.
 * Phase 2: Replace this with Supabase JWT verification.
 */
export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
