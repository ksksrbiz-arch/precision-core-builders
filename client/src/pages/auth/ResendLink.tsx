/**
 * Resend Login Link — For users who didn't receive their magic link
 * Uses same Supabase OTP flow as Login.tsx
 */

import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Step = "idle" | "sent" | "error";

export default function ResendLoginLink() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCount, setResendCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Prevent spam
    if (resendCount >= 3) {
      setError(
        "Too many attempts. Please wait 30 minutes before trying again."
      );
      setStep("error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      setLoading(false);

      if (authError) {
        setError(authError.message);
        setStep("error");
      } else {
        setResendCount(prev => prev + 1);
        setStep("sent");
      }
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to send login link"
      );
      setStep("error");
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

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <img
            src={ASSETS.logo}
            alt="Precision Core"
            className="h-8 mx-auto mb-6 opacity-90"
          />
          <h1
            className="text-2xl font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Resend Login Link
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-2">
            Didn't receive the magic link? We'll send it again.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Idle state - form */}
          {step === "idle" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
                />

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold hover:bg-primary/85 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Login Link
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className="bg-red-400/10 border border-red-400/30 p-3 mb-6 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="bg-card border border-border/60 p-4 mb-6 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold mb-2">Check:</p>
                <ul className="space-y-1.5">
                  <li>✓ Your email inbox (not spam folder)</li>
                  <li>✓ That you're using the correct email</li>
                  <li>✓ Wait a few minutes if it's delayed</li>
                </ul>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <p>
                  Remember your account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/auth/login")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* Success state */}
          {step === "sent" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 bg-green-400/10 border border-green-400/30 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
              </div>

              <h2
                className="text-xl font-semibold text-foreground mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Check Your Email
              </h2>

              <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
                We've sent a new login link to{" "}
                <span className="font-semibold text-foreground">{email}</span>
              </p>

              <div className="bg-card border border-green-400/30 p-4 mb-6 text-sm text-muted-foreground">
                <p className="font-semibold mb-2 text-green-400">Next steps:</p>
                <ol className="space-y-2 text-xs text-left">
                  <li>1. Open the email from Precision Core</li>
                  <li>2. Click the "Sign in" button</li>
                  <li>3. You'll be logged in to your account</li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground/60 mb-6">
                Link expires in 24 hours. If still having issues, contact
                support.
              </p>

              <button
                onClick={() => {
                  setStep("idle");
                  setEmail("");
                  setError("");
                }}
                className="text-primary text-sm hover:underline font-semibold"
              >
                Try a different email
              </button>
            </motion.div>
          )}

          {/* Error state */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 bg-red-400/10 border border-red-400/30 flex items-center justify-center">
                  <ShieldAlert className="h-6 w-6 text-red-400" />
                </div>
              </div>

              <h2
                className="text-xl font-semibold text-foreground mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {resendCount >= 3 ? "Too Many Attempts" : "Unable to Send Link"}
              </h2>

              <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
                {error}
              </p>

              <div className="space-y-2">
                {resendCount < 3 && (
                  <button
                    onClick={() => {
                      setStep("idle");
                      setError("");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/85 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Request New Link
                  </button>
                )}
                <a
                  href="/auth/login"
                  className="block text-center px-4 py-2 border border-border/60 text-muted-foreground text-sm font-semibold hover:border-primary/40 transition-colors"
                >
                  Back to Sign In
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
