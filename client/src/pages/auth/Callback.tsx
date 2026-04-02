/**
 * Auth callback — handles magic link AND OAuth provider redirects.
 * Supabase processes the token from the URL hash/code, then we redirect
 * based on the role stored in public.users (set by DB trigger on first login).
 */
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type State = "loading" | "error";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
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
          // Trigger still running — wait and retry
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
        // Give up — default to portal
        didRedirect.current = true;
        setLocation("/portal");
      }
    }

    // Supabase handles token exchange from hash/PKCE automatically.
    // Listen for the SIGNED_IN event, then redirect by role.
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

    // Fallback: session already exists (e.g. refresh after partial redirect)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !didRedirect.current) {
        redirectByRole(data.session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation]);

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
            Signing you in…
          </p>
        </div>
      </motion.div>
    </div>
  );
}
