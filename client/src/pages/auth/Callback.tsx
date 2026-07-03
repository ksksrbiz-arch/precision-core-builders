/**
 * Auth callback — handles magic link AND OAuth provider redirects.
 * Supabase processes the token from the URL hash/code, then we redirect
 * based on the role stored in public.users (set by DB trigger on first login).
 */
import { ASSETS } from "@/const";
import { ADMIN_SESSION_KEY } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type State = "loading" | "error";

/** How long to wait before declaring the sign-in attempt timed out. */
const SIGN_IN_TIMEOUT_MS = 20_000;

/** Errors that are recoverable by requesting a new magic link. */
function isResendableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("invalid or has expired") ||
    lower.includes("otp_expired") ||
    lower.includes("token_hash") ||
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
  // Expired / consumed OTP — single-use link already clicked or timed out.
  if (
    lower.includes("invalid or has expired") ||
    lower.includes("otp_expired") ||
    lower.includes("already been used")
  ) {
    return "Your sign-in link has expired or was already used. Links are single-use and valid for one hour.";
  }
  // PKCE verifier missing — link opened in a different browser/device.
  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("invalid exchange")
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
          didRedirect.current = true; // prevent timeout from overriding
          setState("error");
          setStatusMessage(
            "Your sign-in link could not be verified. This usually happens when the link is opened in a different browser or device than where it was requested. Please request a new link below."
          );
          setResendable(true);
        } else if (!didRedirect.current) {
          didRedirect.current = true;
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
    // Use didRedirect.current (a ref) rather than reading `state` from the
    // closure, which would always reflect the "loading" value captured at
    // effect creation time and cannot detect errors set later.
    const timeout = setTimeout(() => {
      if (!didRedirect.current) {
        didRedirect.current = true; // prevent further state changes
        setState("error");
        setStatusMessage(
          "Sign-in is taking longer than expected. Please request a new magic link."
        );
        setResendable(true);
      }
    }, SIGN_IN_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // run once on mount; including setState/setStatusMessage/setResendable
    // would make no difference (they're stable) but would obscure the intent.
  }, [setLocation]);

  if (state === "error") {
    const Icon = AlertCircle;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20"
        >
          <div className="h-12 w-12 border flex items-center justify-center mx-auto mb-5 border-destructive/40 bg-destructive/10">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Sign-in failed
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
            {statusMessage ||
              "Something went wrong during sign-in. Please try again."}
          </p>
          <div className="flex flex-col gap-2">
            {resendable && (
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
              className={cn(
                "inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-colors",
                resendable
                  ? "bg-card border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/85"
              )}
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Back to Login
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
