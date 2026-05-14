/**
 * Auth0 OAuth code-exchange — server-side.
 *
 * The browser kicks off the Authorization Code flow against Auth0,
 * which redirects back to `/auth/callback?code=...&state=...`.  The
 * callback page POSTs the `code` here so the client secret never has
 * to leave the server.
 *
 * Required env vars (set in the Netlify dashboard, server-side scope):
 *   AUTH0_DOMAIN          e.g. dev-pr1jfeygsxp2xggy.us.auth0.com
 *   AUTH0_CLIENT_ID       Auth0 application client id
 *   AUTH0_CLIENT_SECRET   Auth0 application client secret
 *   ADMIN_EMAIL           Eric's login email (must match the Auth0 user)
 *   ADMIN_SESSION_TOKEN   the platform session token returned on success
 *
 * Auth0 may set `AUTH0_*` automatically when the native Netlify
 * integration is enabled; the function reads the same names.
 *
 * On success returns `{ token: ADMIN_SESSION_TOKEN, email }`.  The
 * caller stores the token in localStorage under `ADMIN_SESSION_KEY` so
 * the rest of the platform sees a regular admin session (see
 * `client/src/_core/hooks/useAuth.ts`).
 */
import type { Handler } from "@netlify/functions";
import { checkOrigin, corsHeaders } from "./_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type UserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function normalizeAuth0Domain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.trim();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim();
  }
}

function firstNonEmptyEnv(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limit: 10 exchanges per minute per IP.  Higher than the
  // password endpoint because Auth0 has already done the heavy lifting.
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`auth0-exchange:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many sign-in attempts. Please wait a minute and try again.",
      }),
    };
  }

  let code: string;
  let redirectUri: string;
  try {
    const body = JSON.parse(event.body ?? "{}");
    code = typeof body.code === "string" ? body.code.trim() : "";
    redirectUri =
      typeof body.redirectUri === "string" ? body.redirectUri.trim() : "";
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  if (!code || !redirectUri) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing code or redirectUri" }),
    };
  }

  const domain = normalizeAuth0Domain(
    firstNonEmptyEnv(
      process.env.AUTH0_DOMAIN,
      process.env.AUTH0_ISSUER_BASE_URL,
      process.env.VITE_AUTH0_DOMAIN
    )
  );
  const clientId = firstNonEmptyEnv(
    process.env.AUTH0_CLIENT_ID,
    process.env.VITE_AUTH0_CLIENT_ID
  );
  const clientSecret = (process.env.AUTH0_CLIENT_SECRET ?? "").trim();
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const sessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";

  if (!domain || !clientId || !clientSecret) {
    console.error(
      "[auth0-exchange] Missing Auth0 config (expected AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL)"
    );
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "Auth0 is not configured. Set AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and either AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL in Netlify environment variables.",
      }),
    };
  }

  if (!adminEmail || !sessionToken) {
    console.error(
      "[auth0-exchange] ADMIN_EMAIL or ADMIN_SESSION_TOKEN not set"
    );
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "Admin session is not configured. Set ADMIN_EMAIL and ADMIN_SESSION_TOKEN in Netlify environment variables.",
      }),
    };
  }

  // 1. Exchange the authorization code for tokens (client secret stays
  //    server-side).
  let tokenJson: TokenResponse;
  try {
    const tokenRes = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    tokenJson = (await tokenRes.json()) as TokenResponse;
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("[auth0-exchange] token exchange failed:", tokenJson);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error:
            tokenJson.error_description ??
            tokenJson.error ??
            "Auth0 token exchange failed.",
        }),
      };
    }
  } catch (err) {
    console.error("[auth0-exchange] token request error:", err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Unable to reach Auth0." }),
    };
  }

  // 2. Fetch the verified user profile from Auth0.
  let userInfo: UserInfo;
  try {
    const userRes = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      console.error("[auth0-exchange] userinfo failed:", userRes.status);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Failed to load Auth0 profile." }),
      };
    }
    userInfo = (await userRes.json()) as UserInfo;
  } catch (err) {
    console.error("[auth0-exchange] userinfo error:", err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Unable to reach Auth0." }),
    };
  }

  const email = (userInfo.email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error:
          "Auth0 did not return an email address. Ensure the `email` scope is enabled.",
      }),
    };
  }

  if (userInfo.email_verified !== true) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error:
          "Please verify your Auth0 email before signing in to the dashboard.",
      }),
    };
  }

  // 3. Only the configured admin email may receive an admin session.
  //    Non-admin Auth0 users are rejected — extend this branch if/when
  //    client-portal users are added to the Auth0 tenant.
  if (email !== adminEmail) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: "This Auth0 account is not authorized to access the dashboard.",
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ token: sessionToken, email }),
  };
};
