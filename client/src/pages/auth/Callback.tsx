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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type State = "loading" | "error" | "notice";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>("loading");
  const [statusMessage, setStatusMessage] = useState("");
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
      setState("error");
      setStatusMessage(decodeURIComponent(oauthError).replace(/\+/g, " "));
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
        setLocation("/auth/login");
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

    return () => subscription.unsubscribe();
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
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {isNotice ? "Sign In" : "Try Again"}
          </a>
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
