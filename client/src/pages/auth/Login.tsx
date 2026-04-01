/**
 * Login page — Supabase auth with Google, Apple, GitHub OAuth + email magic link.
 * Matches the "Quiet Luxury" dark craft brand.
 */
import React from "react";
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Mail, Shield, Check } from "lucide-react";
import { useState } from "react";

/* ─── OAuth provider icons (inline SVG — no extra deps) ─────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

/* ─── Types ─────────────────────────────────────────────────────────── */
type OAuthProvider = "google" | "apple" | "github";
type Step = "idle" | "sent" | "oauth_loading";

const OAUTH_PROVIDERS: {
  id: OAuthProvider;
  label: string;
  icon: () => React.ReactElement;
  cls: string;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: GoogleIcon,
    cls: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: AppleIcon,
    cls: "bg-black text-white border border-black/80 hover:bg-black/85",
  },
  {
    id: "github",
    label: "Continue with GitHub",
    icon: GitHubIcon,
    cls: "bg-[#24292e] text-white border border-[#24292e] hover:bg-[#24292e]/85",
  },
];

const fadeUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── OAuth ──────────────────────────────────────────────────────── */
  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
    // On success Supabase redirects — no state update needed
  };

  /* ── Magic link ─────────────────────────────────────────────────── */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setMagicLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("sent");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Subtle background texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #C8A84B 0, #C8A84B 1px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[380px]">
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
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                <p className="text-sm font-semibold text-foreground mb-6 break-all">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground/60 font-light mb-6">
                  Click the link in the email to sign in. It expires in 60 minutes.
                </p>
                <button
                  onClick={() => { setStep("idle"); setEmail(""); setError(""); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Use a different email or method
                </button>
              </motion.div>

            ) : (
              /* ── Main login form ──────────────────────────────── */
              <motion.div
                key="login"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8"
              >
                {/* Header */}
                <div className="text-center mb-7">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] tracking-[0.3em] uppercase text-primary font-semibold"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Digital Foreman
                    </span>
                  </div>
                  <h1
                    className="text-xl font-semibold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Sign in to your dashboard
                  </h1>
                  <p className="text-xs text-muted-foreground font-light mt-1">
                    Choose your preferred sign-in method
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 px-4 py-3 border border-destructive/40 bg-destructive/10 text-xs text-destructive leading-relaxed"
                      role="alert"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OAuth buttons */}
                <div className="space-y-2.5 mb-6">
                  {OAUTH_PROVIDERS.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => handleOAuth(provider.id)}
                      disabled={!!oauthLoading || magicLoading}
                      className={`
                        w-full flex items-center justify-center gap-3
                        px-4 py-3 text-[12px] font-semibold tracking-wide
                        transition-all duration-200 min-h-[46px]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${provider.cls}
                      `}
                    >
                      {oauthLoading === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <provider.icon />
                      )}
                      {provider.label}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-border/60" />
                  <span
                    className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    or
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>

                {/* Magic link form */}
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Email Magic Link
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      placeholder="you@precisioncorebuilders.com"
                      className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={magicLoading || !email.trim() || !!oauthLoading}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[46px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {magicLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Send Magic Link
                        <ArrowRight className="h-3.5 w-3.5" />
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
                  <span>{import.meta.env.VITE_SUPABASE_URL ? "Connected" : "Not configured"}</span>
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
