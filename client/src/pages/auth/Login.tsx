/**
 * Login page — email + password is the only sign-in method.
 *
 * Magic-link and social (Facebook) sign-in were removed: neither is configured
 * to work for this site, and leaving dead options on the page sent people into
 * flows that failed. Old magic-link URLs (/auth/callback, /auth/resend) now
 * redirect here (see client/public/_redirects).
 */
import { ASSETS } from "@/const";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signInWithPassword } from "@/lib/signIn";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;
    if (!isSupabaseConfigured) {
      setError("Sign-in is not configured yet. Please contact support.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await signInWithPassword(email, password);
    if (result.ok) {
      setLocation(result.destination);
      return;
    }
    setError(result.error);
    setLoading(false);
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors";
  const labelClass =
    "block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
          className="bg-card border border-border/60 shadow-xl shadow-black/20 p-8"
        >
          <div className="text-center mb-7">
            <span
              className="block text-[9px] tracking-[0.3em] uppercase text-primary font-semibold mb-1.5"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Secure Account Access
            </span>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Sign in to Precision Core
            </h1>
            <p className="mt-3 text-sm text-muted-foreground font-light leading-relaxed">
              Enter your email and password.
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className={labelClass}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@precisioncorebuilders.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className={labelClass}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[48px]"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {loading ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-label="Signing in"
                />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 text-[10px] text-muted-foreground/50">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Admin and client portal access
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Secured login
            </span>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-5 tracking-wider">
          Precision Core Builders · CCB #246527 · Eugene, OR
        </p>
      </div>
    </div>
  );
}
