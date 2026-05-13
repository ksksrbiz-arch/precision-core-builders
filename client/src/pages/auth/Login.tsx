/**
 * Login page — Auth0 is the primary sign-in method.
 * Quiet Luxury design matching PCB brand.
 *
 * Password login remains as an admin fallback and calls the admin-auth
 * Netlify Function which validates credentials against ADMIN_EMAIL /
 * ADMIN_PASSWORD env vars (no database).
 */
import { ASSETS } from "@/const";
import { ADMIN_SESSION_KEY } from "@/_core/hooks/useAuth";
import { beginAuth0Login, isAuth0Configured } from "@/lib/auth0";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  KeyRound,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      // Store admin session token and redirect to dashboard.
      // Trade-off: localStorage is accessible to JS (XSS risk), but the
      // entire app is served from the same Netlify origin with a strict CSP,
      // so XSS vectors are already blocked at the transport/header level.
      localStorage.setItem(ADMIN_SESSION_KEY, data.token as string);
      setLocation("/admin");
    } catch {
      setError(
        "Unable to reach the sign-in service. Check your connection and try again."
      );
      setLoading(false);
    }
  };

  const handleAuth0SignIn = () => {
    setError("");
    try {
      beginAuth0Login("/admin");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start Auth0 sign-in."
      );
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
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

            {isAuth0Configured && (
              <button
                type="button"
                onClick={handleAuth0SignIn}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 transition-all hover:gap-3 min-h-[48px]"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Continue with Auth0
              </button>
            )}

            <div className="mt-5 pt-5 border-t border-border/40 flex items-center gap-3">
              <span className="h-px flex-1 bg-border/40" />
              <span
                className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground/50"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {isAuth0Configured ? "Fallback" : "Admin Sign In"}
              </span>
              <span className="h-px flex-1 bg-border/40" />
            </div>

            <form onSubmit={handlePasswordSignIn} className="mt-4 space-y-4">
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
                    onChange={e => {
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
                    onChange={e => {
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
                className="w-full flex items-center justify-center gap-2 bg-card border border-border/80 text-foreground py-3.5 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50 transition-all min-h-[48px]"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In with Password
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40">
              <Shield className="h-3 w-3" />
              <span>Secured login</span>
            </div>
          </motion.div>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-5 tracking-wider">
          Precision Core Builders · CCB #246527 · Eugene, OR
        </p>
      </div>
    </div>
  );
}
