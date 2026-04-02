/**
 * Session cookie helpers for local dev Express server.
 * On Netlify, auth is handled by Supabase JWTs — no cookies needed.
 */
import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  if (!forwarded) return false;
  const protos = Array.isArray(forwarded) ? forwarded : forwarded.split(",");
  return protos.some(p => p.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
