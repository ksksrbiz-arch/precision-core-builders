/**
 * Login page — password auth primary, magic link as fallback.
 * Quiet Luxury design matching PCB brand.
 */
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Lock,
  Mail,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type AuthMode = "password" | "magicLink";
type Step = "form" | "sent";

export default function AuthLogin() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : authError.message,
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    setLocation("/admin");
  };

  const handleMagicLink = async (e: React.FormEvent) => {
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

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setPassword("");
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
                  <Check className="h-7 w-7 text-primary" />
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
                    setStep("form");
                    setError("");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : mode === "password" ? (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-8"
              >
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

                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="you@precisioncorebuilders.com"
                        className="w-full pl-10 pr-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                      <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[48px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-[10px] text-muted-foreground/60 text-center font-light leading-relaxed">
                  Forgot your password? Switch to magic link and we'll email you a sign-in link.
                </p>

                <div className="mt-5 pt-5 border-t border-border/40 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode("magicLink")}
                    className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Prefer a magic link? Email it instead
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40">
                  <Shield className="h-3 w-3" />
                  <span>Secured by Supabase</span>
                </div>
              </motion.div>
            ) : (
              /* Magic link form */
              <motion.div
                key="magicLink"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="p-8"
              >
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
                    Magic link sign in
                  </h1>
                </div>

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

                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email-ml"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                      <input
                        id="email-ml"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="you@precisioncorebuilders.com"
                        className="w-full pl-10 pr-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                      />
                    </div>
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
                        Send Magic Link
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-border/40 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode("password")}
                    className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Use password instead
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40">
                  <Shield className="h-3 w-3" />
                  <span>Secured by Supabase</span>
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
