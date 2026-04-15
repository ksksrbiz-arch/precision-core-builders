/**
 * Login page — email magic link only (OAuth coming once provider creds are set).
 * Clean "Quiet Luxury" design matching PCB brand.
 *
 * Dev Mode: When VITE_DEV_MODE=true, shows a "Developer Access" panel with
 * one-click dev login and displays credentials for use with Supabase auth.
 */
import { ASSETS } from "@/const";
import { DEV_BYPASS_KEY, DEV_MOCK_USER } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  Loader2,
  Lock,
  Mail,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Step = "idle" | "sent";

// Dev credentials — DEV_EMAIL matches the mock user; password is read from
// the VITE_DEV_PASSWORD env var so it never ends up hardcoded in the bundle.
// Both are only used in dev builds (VITE_DEV_MODE=true).
const DEV_EMAIL = DEV_MOCK_USER.email;
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD as string | undefined;

const IS_DEV = import.meta.env.VITE_DEV_MODE === "true";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setStep("sent");
    }
  };

  /**
   * Dev bypass login — tries Supabase password auth first (if configured and
   * VITE_DEV_PASSWORD is set), then falls back to the local mock session
   * stored in localStorage.
   */
  const handleDevLogin = async () => {
    setDevLoading(true);
    setError("");

    // Try real Supabase password auth when a password is provided via env
    if (DEV_PASSWORD) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });

      if (!authError) {
        // Supabase auth succeeded — navigate to admin
        setDevLoading(false);
        setLocation("/admin");
        return;
      }
    }

    // Supabase not configured or no password set — activate mock bypass
    localStorage.setItem(DEV_BYPASS_KEY, "true");
    setDevLoading(false);
    // Force a full reload so useAuth picks up the localStorage flag
    window.location.href = "/admin";
  };

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
        aria-hidden
      />

      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card border border-border/60 shadow-xl shadow-black/20"
        >
          <AnimatePresence mode="wait">
            {/* Sent state */}
            {step === "sent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-8 text-center"
              >
                <div className="h-14 w-14 border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h1
                  className="text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Check your email
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-1 font-light">
                  Magic link sent to
                </p>
                <p className="text-sm font-semibold text-foreground mb-5 break-all">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground/60 font-light mb-6">
                  Click the link to sign in. It expires in 60 minutes.
                </p>
                <button
                  onClick={() => {
                    setStep("idle");
                    setEmail("");
                    setError("");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              /* Login form */
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-8"
              >
                {/* Header */}
                <div className="text-center mb-7">
                  <span
                    className="block text-[9px] tracking-[0.3em] uppercase text-primary font-semibold mb-1.5"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Digital Foreman
                  </span>
                  <h1
                    className="text-xl font-semibold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Sign in to your dashboard
                  </h1>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 px-4 py-3 border border-destructive/40 bg-destructive/10 text-xs text-destructive"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="you@precisioncorebuilders.com"
                      className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[48px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Send Magic Link <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Trust */}
                <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40">
                  <Shield className="h-3 w-3" />
                  <span>Secured by Supabase</span>
                  <span className="text-border">·</span>
                  <Check className="h-3 w-3 text-green-500/70" />
                  <span>
                    {import.meta.env.VITE_SUPABASE_URL
                      ? "Connected"
                      : "Not configured"}
                  </span>
                </div>

                {/* ── Developer Access Panel (dev mode only) ────────────── */}
                {IS_DEV && (
                  <div className="mt-5 border border-amber-500/30 bg-amber-500/5">
                    <button
                      type="button"
                      onClick={() => setDevOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase font-semibold text-amber-400/80 hover:text-amber-400 transition-colors"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Code2 className="h-3 w-3" />
                        Developer Access
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${devOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {devOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Credential display */}
                            <div className="bg-black/30 border border-amber-500/20 p-3 font-mono text-[10px] space-y-1">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-amber-400/60 shrink-0" />
                                <span className="text-amber-300/80 select-all">
                                  {DEV_EMAIL}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Lock className="h-3 w-3 text-amber-400/60 shrink-0" />
                                <span className="text-amber-300/80 select-all">
                                  {DEV_PASSWORD
                                    ? DEV_PASSWORD
                                    : "(set VITE_DEV_PASSWORD)"}
                                </span>
                              </div>
                            </div>

                            <p className="text-[9px] text-amber-400/50 leading-relaxed">
                              Activates admin bypass. Set{" "}
                              <code>VITE_DEV_PASSWORD</code> in your{" "}
                              <code>.env.local</code> to enable Supabase
                              password auth. Without it, clicking the button
                              injects a local mock admin session. Never set{" "}
                              <code>VITE_DEV_MODE=true</code> in production.
                            </p>

                            <button
                              type="button"
                              onClick={handleDevLogin}
                              disabled={devLoading}
                              className="w-full flex items-center justify-center gap-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase hover:bg-amber-500/20 disabled:opacity-50 transition-all min-h-[40px]"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              {devLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Code2 className="h-3.5 w-3.5" />
                                  Login as Dev Admin
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-5 tracking-wider">
          Precision Core Builders · CCB #246527 · Eugene, OR
        </p>
      </div>
    </div>
  );
}
