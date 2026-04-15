/**
 * /dev-login — Instant developer access from any browser or device.
 *
 * This page auto-triggers authentication on mount so it can be bookmarked
 * on mobile or opened in any browser. No manual steps required.
 *
 * Auth strategy (in order):
 *   1. Supabase signInWithPassword (real JWT — works cross-browser/device).
 *   2. localStorage mock session (single-browser fallback when Supabase is
 *      not configured with a dev password).
 *
 * Only accessible when VITE_DEV_MODE=true. Renders a 404 otherwise.
 */
import { ASSETS } from "@/const";
import { DEV_BYPASS_KEY, DEV_MOCK_USER } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

const IS_DEV = import.meta.env.VITE_DEV_MODE === "true";
const DEV_EMAIL = DEV_MOCK_USER.email;
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD as string | undefined;

type State = "loading" | "success" | "error";

export default function DevLogin() {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [authMethod, setAuthMethod] = useState<"supabase" | "mock" | null>(
    null
  );

  useEffect(() => {
    if (!IS_DEV) {
      setState("error");
      setErrorMsg(
        "Developer mode is disabled. Set VITE_DEV_MODE=true to enable."
      );
      return;
    }
    attemptLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attemptLogin() {
    setState("loading");
    setErrorMsg("");

    // ── Strategy 1: Supabase password auth (cross-browser, real JWT) ──────
    if (DEV_PASSWORD) {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });

      if (!error) {
        setAuthMethod("supabase");
        setState("success");
        // Short pause so the success state is visible before redirect
        setTimeout(() => {
          window.location.href = "/admin";
        }, 800);
        return;
      }
    }

    // ── Strategy 2: localStorage mock (single-browser fallback) ───────────
    localStorage.setItem(DEV_BYPASS_KEY, "true");
    setAuthMethod("mock");
    setState("success");
    setTimeout(() => {
      window.location.href = "/admin";
    }, 800);
  }

  // ── Guard: dev mode disabled ─────────────────────────────────────────────
  if (!IS_DEV && state !== "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-light">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #C8A84B 0, #C8A84B 1px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[380px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-10 w-auto"
            fetchPriority="high"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card border border-amber-500/30 shadow-xl shadow-black/20"
        >
          <div className="p-8 text-center space-y-6">
            {/* Header */}
            <div>
              <div className="h-14 w-14 border border-amber-500/40 bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-7 w-7 text-amber-400" />
              </div>
              <span
                className="block text-[9px] tracking-[0.3em] uppercase text-amber-400/70 font-semibold mb-1"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Developer Access
              </span>
              <h1
                className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {state === "loading" && "Signing in…"}
                {state === "success" && "Signed in!"}
                {state === "error" && "Access denied"}
              </h1>
            </div>

            {/* State: loading */}
            {state === "loading" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm text-muted-foreground font-light">
                  {DEV_PASSWORD
                    ? "Authenticating with Supabase…"
                    : "Activating local dev session…"}
                </p>
              </div>
            )}

            {/* State: success */}
            {state === "success" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm text-muted-foreground font-light">
                  {authMethod === "supabase"
                    ? "Authenticated via Supabase — works on any browser."
                    : "Local mock session active — this browser only."}
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Redirecting to admin…
                </p>
              </div>
            )}

            {/* State: error */}
            {state === "error" && (
              <div className="flex flex-col items-center gap-4 py-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {errorMsg}
                </p>
                {IS_DEV && (
                  <button
                    type="button"
                    onClick={attemptLogin}
                    className="flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 px-6 py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-amber-500/20 transition-all min-h-[52px] min-w-[180px] justify-center"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Manual retry button (loading state safety net for slow connections) */}
            {state === "loading" && IS_DEV && (
              <p className="text-[10px] text-muted-foreground/40">
                Taking too long?{" "}
                <button
                  type="button"
                  onClick={attemptLogin}
                  className="underline hover:text-amber-400 transition-colors"
                >
                  Tap to retry
                </button>
              </p>
            )}
          </div>

          {/* Info footer */}
          <div className="border-t border-border/30 px-6 py-4 bg-black/10">
            <div className="flex flex-col gap-1 font-mono text-[10px] text-muted-foreground/40">
              <div className="flex items-center justify-between">
                <span>User</span>
                <span className="text-amber-400/60 select-all">{DEV_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auth</span>
                <span className="text-amber-400/60">
                  {DEV_PASSWORD ? "Supabase (cross-browser)" : "Mock (local)"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-5 tracking-wider">
          Precision Core Builders · CCB #246527 · Eugene, OR
        </p>
      </div>
    </div>
  );
}
