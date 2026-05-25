/**
 * Auth callback — handles magic link AND OAuth provider redirects.
 * Supabase processes the token from the URL hash/code, then we redirect
 * based on the role stored in public.users (set by DB trigger on first login).
 */
import { ASSETS } from "@/const";
import { ADMIN_SESSION_KEY } from "@/_core/hooks/useAuth";
import { consumeAuth0ReturnTo, consumeAuth0State } from "@/lib/auth0";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type State = "loading" | "error" | "notice";

/** Errors that are recoverable by requesting a new magic link. */
function isResendableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("invalid or has expired") ||
    lower.includes("otp_expired") ||
    lower.includes("token_hash") ||
    lower.includes("has expired") ||
    lower.includes("already been used") ||
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("invalid exchange") ||
    lower.includes("could not be verified")
  );
}

/** Map raw Supabase error strings to user-friendly text. */
function friendlyMagicLinkError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid or has expired") ||
    lower.includes("otp_expired") ||
    lower.includes("has expired")
  ) {
    return "Your sign-in link has expired or was already used. Links are single-use and valid for one hour.";
  }
  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("invalid exchange") ||
    lower.includes("already been used")
  ) {
    return "Your sign-in link could not be verified. This usually happens when the link is opened in a different browser than where it was requested.";
  }
  if (lower.includes("redirect") || lower.includes("not allowed")) {
    return "Sign-in was blocked by a redirect URL configuration. Please contact support or request a new link.";
  }
  return raw;
}

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [resendable, setResendable] = useState(false);
  const didRedirect = useRef(false);

  useEffect(() => {
    // Check for error in URL (OAuth errors come back as query params or hash)
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const oauthError =
      url.searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      url.searchParams.get("error") ??
      hashParams.get("error");

    if (oauthError) {
      const decoded = decodeURIComponent(oauthError).replace(/\+/g, " ");
      const friendly = friendlyMagicLinkError(decoded);
      setState("error");
      setStatusMessage(friendly);
      setResendable(isResendableError(decoded));
      return;
    }

    const auth0VerificationStatus = url.searchParams.get("success");
    const auth0VerificationMessage = url.searchParams.get("message");
    if (auth0VerificationStatus || auth0VerificationMessage) {
      const message = auth0VerificationMessage
        ? decodeURIComponent(auth0VerificationMessage).replace(/\+/g, " ")
        : "";
      if (auth0VerificationStatus === "false") {
        setState("error");
        setStatusMessage(
          message ||
            "Auth0 could not verify your email. Please return to the sign-in page, check your inbox, or request a new verification email from Auth0."
        );
      } else {
        setState("notice");
        setStatusMessage(
          message
            ? `${message} Please sign in again to continue.`
            : "Your email is verified. Please sign in again to continue."
        );
      }
      return;
    }

    /**
     * Auth0 Authorization Code flow.  Auth0 redirects back with
     * `?code=...&state=...` in the query string (no hash).  When we see
     * those params, swap them for an admin session token via the
     * `auth0-exchange` Netlify Function.  The expected `state` was
     * stashed in sessionStorage by `beginAuth0Login`, so we can detect
     * (and reject) cross-site forgeries before contacting the server.
     */
    const auth0Code = url.searchParams.get("code");
    const auth0State = url.searchParams.get("state");
    if (auth0Code && auth0State && !didRedirect.current) {
      const expectedState = consumeAuth0State();
      const returnTo = consumeAuth0ReturnTo();

      if (!expectedState || expectedState !== auth0State) {
        setState("error");
        setStatusMessage(
          "Sign-in could not be verified (state mismatch). Please try again."
        );
        return;
      }

      didRedirect.current = true;
      (async () => {
        try {
          const res = await fetch("/api/auth0-exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: auth0Code,
              redirectUri: `${window.location.origin}/auth/callback`,
            }),
          });
          const data = (await res.json()) as {
            token?: string;
            error?: string;
          };
          if (!res.ok || !data.token) {
            didRedirect.current = false;
            setState("error");
            setStatusMessage(data.error ?? "Auth0 sign-in failed.");
            return;
          }
          try {
            localStorage.setItem(ADMIN_SESSION_KEY, data.token);
          } catch {
            // Fall through — useAuth will recover on next load.
          }
          setLocation(returnTo);
        } catch {
          didRedirect.current = false;
          setState("error");
          setStatusMessage(
            "Unable to reach the sign-in service. Check your connection and try again."
          );
        }
      })();
      return;
    }

    /**
     * Resolve the user's role and navigate.
     *
     * Primary path: POST the access token to `/api/auth-sync-role`. The
     * server uses the service role key to upsert `public.users` with the
     * correct role (admin allowlist defaults to Eric + the platform admin
     * email; see netlify/functions/auth-sync-role.ts). This makes the
     * magic-link flow work end-to-end without any manual SQL editor step
     * in Supabase.
     *
     * Fallback: if the function is unreachable (e.g. dev without service
     * role configured), read the role directly from `public.users` using
     * the user's own session; if that also fails we send them to /portal.
     */
    async function redirectByRole(accessToken: string, userId: string) {
      if (didRedirect.current) return;

      let role: "admin" | "user" | null = null;

      // 1. Server-side sync (preferred — also writes the row).
      try {
        const res = await fetch("/api/auth-sync-role", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { role?: string };
          if (data.role === "admin" || data.role === "user") {
            role = data.role;
          }
        }
      } catch {
        // Network / function unavailable — fall through to direct read.
      }

      // 2. Fallback: direct read from public.users (in case the function
      //    failed but the row was set by another path, e.g. the DB trigger).
      if (!role) {
        for (let attempt = 1; attempt <= 3 && !role; attempt += 1) {
          try {
            const { data: profile, error } = await supabase
              .from("users")
              .select("role")
              .eq("id", userId)
              .maybeSingle();
            if (!error && profile?.role) {
              if (profile.role === "admin" || profile.role === "user") {
                role = profile.role;
              }
            }
          } catch {
            // ignore and retry
          }
          if (!role && attempt < 3) {
            await new Promise(r => setTimeout(r, 600 * attempt));
          }
        }
      }

      // Clear any stale admin-session token so the fresh Supabase session
      // is the single source of truth in useAuth (mirrors Login.tsx).
      try {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      } catch {
        // Ignore storage failures.
      }

      didRedirect.current = true;
      setLocation(role === "admin" ? "/admin" : "/portal");
    }

    // Supabase handles token exchange from hash/PKCE automatically.
    // Listen for the SIGNED_IN event, then redirect by role.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await redirectByRole(session.access_token, session.user.id);
      } else if (event === "SIGNED_OUT") {
        // If a ?code= was present in the URL it means the PKCE code exchange
        // failed (e.g. the link was opened in a different browser than the
        // one that requested it, so the verifier is missing from localStorage).
        // Show an actionable error instead of silently bouncing to /auth/login.
        if (url.searchParams.get("code") && !didRedirect.current) {
          setState("error");
          setStatusMessage(
            "Your sign-in link could not be verified. This usually happens when the link is opened in a different browser or device than where it was requested. Please request a new link below."
          );
          setResendable(true);
        } else if (!didRedirect.current) {
          setLocation("/auth/login");
        }
      } else if (event === "TOKEN_REFRESHED" && session) {
        await redirectByRole(session.access_token, session.user.id);
      }
    });

    // Fallback: session already exists (e.g. refresh after partial redirect)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !didRedirect.current) {
        redirectByRole(data.session.access_token, data.session.user.id);
      }
    });

    // Safety-net timeout: if nothing has happened after 20 s the exchange
    // silently failed.  Show an actionable error so the user isn't stuck.
    const timeout = setTimeout(() => {
      if (!didRedirect.current && state === "loading") {
        setState("error");
        setStatusMessage(
          "Sign-in is taking longer than expected. Please request a new magic link."
        );
        setResendable(true);
      }
    }, 20_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  if (state === "error" || state === "notice") {
    const isNotice = state === "notice";
    const Icon = isNotice ? CheckCircle2 : AlertCircle;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20"
        >
          <div
            className={`h-12 w-12 border flex items-center justify-center mx-auto mb-5 ${
              isNotice
                ? "border-primary/40 bg-primary/10"
                : "border-destructive/40 bg-destructive/10"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                isNotice ? "text-primary" : "text-destructive"
              }`}
            />
          </div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isNotice ? "Email verified" : "Sign-in failed"}
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
            {statusMessage ||
              "Something went wrong during sign-in. Please try again."}
          </p>
          <div className="flex flex-col gap-2">
            {!isNotice && resendable && (
              <a
                href="/auth/resend"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Request New Link
              </a>
            )}
            <a
              href="/auth/login"
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                !isNotice && resendable
                  ? "bg-card border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/85"
              }`}
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {isNotice ? "Sign In" : "Back to Login"}
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-5"
      >
        <img
          src={ASSETS.logo}
          alt="Precision Core Builders"
          className="h-8 w-auto opacity-60"
        />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-light">
            Signing you in…
          </p>
        </div>
      </motion.div>
    </div>
  );
}
