/**
 * Auth0 helper — initiates the OAuth 2.0 Authorization Code flow.
 *
 * The client secret stays server-side in the Netlify Function
 * `auth0-exchange`; the browser only needs the public domain and client
 * ID (both injected via Vite env vars).  A random `state` nonce is
 * generated per attempt and stashed in `sessionStorage` so the callback
 * page can detect CSRF attempts.
 */

const AUTH0_STATE_KEY = "pcb_auth0_state";
const AUTH0_RETURN_TO_KEY = "pcb_auth0_return_to";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as
  | string
  | undefined;

/**
 * True when the browser bundle was built with Auth0 credentials.  The
 * login page hides the "Continue with Auth0" button when this is false
 * so we never render a broken control.
 */
export const isAuth0Configured = Boolean(auth0Domain && auth0ClientId);

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Read (and clear) the `state` nonce stored when login was initiated.
 * Used by the callback page to verify the redirect came from us.
 */
export function consumeAuth0State(): string | null {
  try {
    const value = sessionStorage.getItem(AUTH0_STATE_KEY);
    sessionStorage.removeItem(AUTH0_STATE_KEY);
    return value;
  } catch {
    return null;
  }
}

/**
 * Read (and clear) the post-login return path stored when login was
 * initiated.  Defaults to `/admin` for admin users.
 */
export function consumeAuth0ReturnTo(): string {
  try {
    const value = sessionStorage.getItem(AUTH0_RETURN_TO_KEY);
    sessionStorage.removeItem(AUTH0_RETURN_TO_KEY);
    return value || "/admin";
  } catch {
    return "/admin";
  }
}

/**
 * Redirect the browser to Auth0's `/authorize` endpoint to start the
 * OAuth Authorization Code flow.  After the user signs in, Auth0
 * redirects back to `${origin}/auth/callback?code=...&state=...`.
 */
export function beginAuth0Login(returnTo: string = "/admin"): void {
  if (!isAuth0Configured) {
    throw new Error(
      "Auth0 is not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID."
    );
  }

  const state = randomNonce();
  try {
    sessionStorage.setItem(AUTH0_STATE_KEY, state);
    sessionStorage.setItem(AUTH0_RETURN_TO_KEY, returnTo);
  } catch {
    // sessionStorage is required so the callback page can verify the
    // OAuth `state` parameter (CSRF protection).  If it's unavailable
    // (private-browsing modes, storage quota, etc.) refuse to begin
    // rather than start an unverifiable flow.
    throw new Error(
      "Auth0 sign-in requires session storage. Please enable it (or disable private browsing) and try again."
    );
  }

  const redirectUri = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: auth0ClientId as string,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
  });

  window.location.assign(
    `https://${auth0Domain}/authorize?${params.toString()}`
  );
}
