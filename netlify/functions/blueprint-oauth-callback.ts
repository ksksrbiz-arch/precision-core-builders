/**
 * Netlify Function: blueprint-oauth-callback
 *
 * Endpoint: /.netlify/functions/blueprint-oauth-callback
 *
 * Receives the OAuth redirect from blueprint.am after the user authorises
 * the Precision Core Builders app:
 *
 *   1. Verify the signed `state` parameter (CSRF + user binding).
 *   2. Exchange `code` for an access/refresh token pair at
 *      `${BLUEPRINT_API_BASE_URL}/oauth/token`.
 *   3. Persist the tokens encrypted into `blueprint_connections` for the
 *      PCB user whose id is embedded in state.
 *   4. Redirect the browser back to the pre-saved returnTo path.
 *
 * If any step fails, the browser is redirected with a `blueprint_error`
 * query string so the UI can show a friendly message.
 */
import type { Handler } from "@netlify/functions";
import { ENV } from "../../server/_core/env";
import {
  encryptSecret,
  OAUTH_STATE_EXPIRY_MS,
  verifyState,
} from "../../server/_core/crypto";
import { requireSupabaseAdmin } from "../../server/_core/supabase";
import { checkRateLimit, getClientIp } from "./_utils/rateLimiter";

function parseState(
  state: string
): { ok: true; uid: string; returnTo: string } | { ok: false } {
  if (!state) return { ok: false };
  const [raw, sig] = state.split(".");
  if (!raw || !sig) return { ok: false };
  if (!verifyState(raw, sig)) return { ok: false };
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as { uid?: string; returnTo?: string; iat?: number };
    if (!payload.uid) return { ok: false };
    if (payload.iat && Date.now() - payload.iat > OAUTH_STATE_EXPIRY_MS) {
      return { ok: false };
    }
    return {
      ok: true,
      uid: payload.uid,
      returnTo: payload.returnTo ?? "/admin/blueprint",
    };
  } catch {
    return { ok: false };
  }
}

function redirect(location: string) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
    body: "",
  };
}

function errorRedirect(returnTo: string, reason: string) {
  const base = returnTo.startsWith("/") ? returnTo : "/admin/blueprint";
  const sep = base.includes("?") ? "&" : "?";
  return redirect(`${base}${sep}blueprint_error=${encodeURIComponent(reason)}`);
}

export const handler: Handler = async event => {
  // Rudimentary rate-limit to discourage callback bombardment.
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`bp-oauth-cb:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return { statusCode: 429, body: "Too Many Requests" };
  }

  const params = event.queryStringParameters ?? {};
  const code = params.code;
  const state = params.state ?? "";
  const providerError = params.error;

  const parsed = parseState(state);
  const returnTo = parsed.ok ? parsed.returnTo : "/admin/blueprint";

  if (providerError) {
    return errorRedirect(returnTo, providerError);
  }
  if (!code) {
    return errorRedirect(returnTo, "missing_code");
  }
  if (!parsed.ok) {
    return errorRedirect(returnTo, "invalid_state");
  }
  if (!ENV.blueprintClientId || !ENV.blueprintClientSecret) {
    return errorRedirect(returnTo, "not_configured");
  }

  // Exchange authorization code for tokens.
  const redirectUri = `${ENV.siteUrl || ""}/.netlify/functions/blueprint-oauth-callback`;
  let tokenResponse: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    user_id?: string;
    email?: string;
  };
  try {
    const resp = await fetch(`${ENV.blueprintApiBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: ENV.blueprintClientId,
        client_secret: ENV.blueprintClientSecret,
      }),
    });
    if (!resp.ok) {
      console.error(
        "[blueprint-oauth-callback] token exchange failed:",
        resp.status,
        await resp.text().catch(() => "")
      );
      return errorRedirect(returnTo, "token_exchange_failed");
    }
    tokenResponse = await resp.json();
  } catch (err) {
    console.error("[blueprint-oauth-callback] token request error:", err);
    return errorRedirect(returnTo, "network_error");
  }

  if (!tokenResponse.access_token) {
    return errorRedirect(returnTo, "no_access_token");
  }

  // Persist tokens encrypted.
  try {
    const accessTokenEnc = encryptSecret(tokenResponse.access_token);
    const refreshTokenEnc = tokenResponse.refresh_token
      ? encryptSecret(tokenResponse.refresh_token)
      : null;
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    const db = requireSupabaseAdmin();
    const { error } = await db.from("blueprint_connections").upsert(
      {
        user_id: parsed.uid,
        auth_method: "oauth",
        provider_user_id: tokenResponse.user_id ?? null,
        provider_email: tokenResponse.email ?? null,
        access_token_enc: accessTokenEnc,
        refresh_token_enc: refreshTokenEnc,
        api_key_enc: null,
        expires_at: expiresAt,
        scopes: tokenResponse.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error(
        "[blueprint-oauth-callback] persistence failed:",
        error.message
      );
      return errorRedirect(returnTo, "connection_save_failed");
    }
  } catch (err) {
    console.error("[blueprint-oauth-callback] unexpected error:", err);
    return errorRedirect(returnTo, "server_error");
  }

  const sep = returnTo.includes("?") ? "&" : "?";
  return redirect(`${returnTo}${sep}blueprint_connected=1`);
};
