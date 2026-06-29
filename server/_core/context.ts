/**
 * tRPC context — verifies the bearer token from the Authorization header.
 * Works for both local dev (Express) and Netlify Functions.
 *
 * Verification is delegated to the canonical `verifyToken` foundation module
 * (admin session token, dev bypass, and Supabase JWT). Any verification
 * failure — missing/invalid token, or unconfigured auth — maps to an
 * anonymous (public) request, i.e. `user: null`.
 */
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { extractBearer, verifyToken } from "./auth/verifyToken";
import type { VerifiedRole } from "./auth/verifyToken";

export type UserRole = VerifiedRole;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type TrpcContext = {
  req?: CreateExpressContextOptions["req"];
  res?: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

/**
 * Extract and verify the bearer token from the Authorization header.
 * Returns the authenticated user or null for public routes.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const token = extractBearer(
    opts.req.headers as Record<string, string | undefined>
  );

  if (!token) {
    return { req: opts.req, res: opts.res, user: null };
  }

  const result = await verifyToken(token);
  if (!result.ok) {
    // A failed/invalid/unconfigured verification is an anonymous request.
    return { req: opts.req, res: opts.res, user: null };
  }

  return { req: opts.req, res: opts.res, user: result.user };
}
