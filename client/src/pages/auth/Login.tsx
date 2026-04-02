/**
 * Login page — email/password + magic link + Google OAuth.
 * Clean "Quiet Luxury" design matching PCB brand.
 * Admin users get role-aware redirect via Callback.
 */
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

type Mode = "password" | "magic-link";
type Step = "idle" | "sent";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("password");
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearError = () => error && setError("");

  /* ── Password sign-in ───────────────────────────────────────────── */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    clearError();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      // Redirect handled by auth state change — go to callback
      window.location.href = "/auth/callback";
    }
  };

  /* ── Magic link sign-in ─────────────────────────────────────────── */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    clearError();

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

  /* ── Google OAuth ───────────────────────────────────────────────── */
  const handleGoogle = async () => {
    setLoading(true);
    clearError();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (authError) setError(authError.message);
  };

  /* ── Password reset ─────────────────────────────────────────────── */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email first, then click forgot password.");
      return;
    }
    setLoading(true);
    clearError();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback` },
    );
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setStep("sent");
    }
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

      <div className="relative w-full max-w-[400px]">
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
            {/* ── Sent confirmation ──────────────────────────────── */}
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
                  {mode === "magic-link"
                    ? "Magic link sent to"
                    : "Password reset link sent to"}
                </p>
                <p className="text-sm font-semibold text-foreground mb-5 break-all">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground/60 font-light mb-6">
                  Click the link to{" "}
                  {mode === "magic-link" ? "sign in" : "reset your password"}.
                  It expires in 60 minutes.
                </p>
                <button
                  onClick={() => {
                    setStep("idle");
                    setEmail("");
                    setPassword("");
                    setError("");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              /* ── Login form ──────────────────────────────────── */
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-8"
              >
                {/* Header */}
                <div className="text-center mb-6">
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

                {/* Google OAuth */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 border border-border/60 bg-background hover:bg-accent/50 py-3 text-sm font-medium transition-colors disabled:opacity-50 mb-4 min-h-[48px]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
                    or
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>

                {/* Mode tabs */}
                <div className="flex mb-4 border border-border/40 bg-background/50">
                  <button
                    onClick={() => {
                      setMode("password");
                      clearError();
                    }}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
                      mode === "password"
                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Lock className="h-3 w-3 inline mr-1.5 -mt-px" />
                    Password
                  </button>
                  <button
                    onClick={() => {
                      setMode("magic-link");
                      clearError();
                    }}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-[0.14em] uppercase transition-colors ${
                      mode === "magic-link"
                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Sparkles className="h-3 w-3 inline mr-1.5 -mt-px" />
                    Magic Link
                  </button>
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

                <form
                  onSubmit={
                    mode === "password"
                      ? handlePasswordSubmit
                      : handleMagicLink
                  }
                  className="space-y-3"
                >
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError();
                        }}
                        placeholder="you@precisioncorebuilders.com"
                        className="w-full pl-10 pr-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password (conditional) */}
                  <AnimatePresence>
                    {mode === "password" && (
                      <motion.div
                        key="password-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label
                            htmlFor="password"
                            className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-medium"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-[10px] text-primary/70 hover:text-primary transition-colors"
                          >
                            Forgot?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required={mode === "password"}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              clearError();
                            }}
                            placeholder="Enter your password"
                            className="w-full pl-10 pr-10 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !email.trim() ||
                      (mode === "password" && !password)
                    }
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[48px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "password" ? (
                      <>
                        Sign In <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Send Magic Link <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Trust footer */}
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
