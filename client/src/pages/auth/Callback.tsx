/**
 * Auth callback — handles magic link, OAuth provider, AND Auth0 redirects.
 * Supabase processes tokens from URL hash/PKCE; Auth0 SDK handles its own
 * code exchange. We redirect based on role once either provider resolves.
 */
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth0 } from "@auth0/auth0-react";

type State = "loading" | "error";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const didRedirect = useRef(false);

  // ── Auth0 state — useAuth0 throws if Auth0Provider is not mounted ─
  let auth0User: any = null;
  let auth0Authenticated = false;
  let auth0Loading = false;
  let auth0Error: Error | undefined;

  try {
    const a0 = useAuth0();
    auth0User = a0.user;
    auth0Authenticated = a0.isAuthenticated;
    auth0Loading = a0.isLoading;
    auth0Error = a0.error;
  } catch {
    // Auth0Provider not in tree — Supabase-only mode
  }

  // ── Auth0 → Supabase bridge ──────────────────────────────────────
  let auth0GetToken: (() => Promise<string>) | null = null;
  try {
    const a0hook = useAuth0();
    auth0GetToken = a0hook.getAccessTokenSilently;
  } catch {}

  useEffect(() => {
    if (auth0Error) {
      setState("error");
      setErrorMsg(auth0Error.message);
      return;
    }

    if (!auth0Authenticated || !auth0User || didRedirect.current) return;

    // Bridge Auth0 session → Supabase session
    (async () => {
      try {
        // Get Auth0 access token
        const auth0Token = auth0GetToken ? await auth0GetToken() : null;
        if (!auth0Token) {
          // Fallback: redirect using Auth0 roles only
          didRedirect.current = true;
          const roles: string[] =
            auth0User["https://pcb.app/roles"] ?? auth0User.roles ?? [];
          setLocation(roles.includes("admin") ? "/admin" : "/portal");
          return;
        }

        // Call bridge function to create Supabase session
        const res = await fetch("/api/auth0-bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth0Token }),
        });

        const data = await res.json();

        if (data.bridged && data.access_token && data.refresh_token) {
          // Set the Supabase session from bridge tokens
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

          // Wait for session to propagate, then redirect by role
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            didRedirect.current = true;
            const { data: profile } = await supabase
              .from("users")
              .select("role")
              .eq("id", sessionData.session.user.id)
              .single();
            setLocation(profile?.role === "admin" ? "/admin" : "/portal");
            return;
          }
        }

        // Fallback: redirect using Auth0 roles
        didRedirect.current = true;
        const roles: string[] =
          auth0User["https://pcb.app/roles"] ?? auth0User.roles ?? [];
        setLocation(roles.includes("admin") ? "/admin" : "/portal");
      } catch (err: any) {
        console.error("[Auth0 Bridge]", err);
        // Still redirect — just without Supabase session
        didRedirect.current = true;
        const roles: string[] =
          auth0User["https://pcb.app/roles"] ?? auth0User.roles ?? [];
        setLocation(roles.includes("admin") ? "/admin" : "/portal");
      }
    })();
  }, [auth0Authenticated, auth0User, auth0Error, setLocation]);

  // ── Supabase redirect handling ───────────────────────────────────
  useEffect(() => {
    // If Auth0 already handled the redirect, skip Supabase
    if (auth0Authenticated || auth0Loading) return;

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
      setErrorMsg(decodeURIComponent(oauthError).replace(/\+/g, " "));
      return;
    }

    /**
     * Reads role from public.users and navigates.
     * Retries once — the DB trigger may not have fired yet on first login.
     */
    async function redirectByRole(userId: string, attempt = 1) {
      if (didRedirect.current) return;

      try {
        const { data: profile, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .single();

        if (error && attempt < 3) {
          await new Promise(r => setTimeout(r, 600 * attempt));
          return redirectByRole(userId, attempt + 1);
        }

        didRedirect.current = true;
        setLocation(profile?.role === "admin" ? "/admin" : "/portal");
      } catch {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 600 * attempt));
          return redirectByRole(userId, attempt + 1);
        }
        didRedirect.current = true;
        setLocation("/portal");
      }
    }

    // Listen for Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await redirectByRole(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setLocation("/auth/login");
      } else if (event === "TOKEN_REFRESHED" && session) {
        await redirectByRole(session.user.id);
      }
    });

    // Fallback: session already exists
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !didRedirect.current) {
        redirectByRole(data.session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, auth0Authenticated, auth0Loading]);

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20"
        >
          <div className="h-12 w-12 border border-destructive/40 bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Sign-in failed
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
            {errorMsg ||
              "Something went wrong during sign-in. Please try again."}
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Try Again
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
            Signing you in&hellip;
          </p>
        </div>
      </motion.div>
    </div>
  );
}
