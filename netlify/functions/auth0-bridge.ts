/**
 * Auth0 → Supabase Bridge
 *
 * After Auth0 authenticates a user, the frontend calls this function with the
 * Auth0 access token. We verify the token with Auth0's /userinfo endpoint,
 * then create/update the user in Supabase and return a Supabase session.
 *
 * Flow:
 *   1. Frontend Auth0 SDK completes login → gets Auth0 access token
 *   2. Frontend POSTs { auth0Token } to /api/auth0-bridge
 *   3. This function fetches Auth0 /userinfo to verify & get user details
 *   4. Uses Supabase admin to create/find user & generate session
 *   5. Returns { access_token, refresh_token } for the Supabase client
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAuth0UserInfo(
  accessToken: string,
  domain: string
): Promise<{
  sub: string;
  email: string;
  name?: string;
  nickname?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: any;
} | null> {
  try {
    const res = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const auth0Domain =
    process.env.VITE_AUTH0_DOMAIN ??
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN ??
    "";

  if (!auth0Domain) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Auth0 domain not configured" }),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Supabase admin not configured" }),
    };
  }

  let auth0Token: string;
  try {
    const body = JSON.parse(event.body ?? "{}");
    auth0Token = body.auth0Token;
    if (!auth0Token) throw new Error("missing token");
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing auth0Token in request body" }),
    };
  }

  // Step 1: Verify Auth0 token by fetching userinfo
  const userInfo = await fetchAuth0UserInfo(auth0Token, auth0Domain);
  if (!userInfo || !userInfo.email) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid Auth0 token or missing email" }),
    };
  }

  // Step 2: Check if user already exists in Supabase auth
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email === userInfo.email
  );

  let supabaseUserId: string;

  if (existingUser) {
    // User exists — update metadata
    supabaseUserId = existingUser.id;
    await admin.auth.admin.updateUserById(supabaseUserId, {
      user_metadata: {
        name: userInfo.name ?? userInfo.nickname ?? existingUser.user_metadata?.name,
        avatar_url: userInfo.picture ?? existingUser.user_metadata?.avatar_url,
        auth0_sub: userInfo.sub,
        provider: "auth0",
      },
    });
  } else {
    // Create new user with a random password (they auth via Auth0)
    const randomPw =
      "Auth0!" +
      Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(36))
        .join("")
        .slice(0, 24);

    const { data: newUser, error: createErr } =
      await admin.auth.admin.createUser({
        email: userInfo.email,
        email_confirm: true,
        password: randomPw,
        user_metadata: {
          name: userInfo.name ?? userInfo.nickname ?? userInfo.email.split("@")[0],
          avatar_url: userInfo.picture,
          auth0_sub: userInfo.sub,
          provider: "auth0",
        },
      });

    if (createErr || !newUser.user) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Failed to create Supabase user",
          detail: createErr?.message,
        }),
      };
    }
    supabaseUserId = newUser.user.id;
  }

  // Step 3: Generate a magic link token to create a real Supabase session
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userInfo.email,
      options: {
        redirectTo: process.env.URL
          ? `${process.env.URL}/auth/callback`
          : "https://precision-core.netlify.app/auth/callback",
      },
    });

  if (linkErr || !linkData) {
    // Fallback: return user info so frontend can work in Auth0-only mode
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        supabaseUserId,
        email: userInfo.email,
        bridged: false,
        message: "User synced but session generation unavailable",
      }),
    };
  }

  // Extract the token from the magic link
  const linkUrl = new URL(
    linkData.properties?.action_link ?? ""
  );
  const token_hash = linkUrl.searchParams.get("token_hash") ?? linkUrl.hash?.slice(1);

  // Step 4: Verify the OTP to get real session tokens
  const { data: verifyData, error: verifyErr } = await admin.auth.verifyOtp({
    token_hash: linkData.properties?.hashed_token ?? "",
    type: "magiclink",
  });

  if (verifyErr || !verifyData.session) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        supabaseUserId,
        email: userInfo.email,
        bridged: false,
        message: "User synced but session tokens unavailable",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      expires_in: verifyData.session.expires_in,
      supabaseUserId: verifyData.session.user.id,
      email: verifyData.session.user.email,
      bridged: true,
    }),
  };
};
