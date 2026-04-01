/**
 * Login page — Supabase email magic link auth.
 * Redirects to /auth/callback after email verification.
 */
import { ASSETS } from "@/const";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Shield } from "lucide-react";
import { useState } from "react";

type Step = "email" | "sent" | "error";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      setStep("error");
    } else {
      setStep("sent");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card border border-border/60 p-8"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={ASSETS.logo} alt="Precision Core Builders" className="h-10 w-auto" />
          </div>

          {step === "sent" ? (
            <div className="text-center">
              <div className="h-14 w-14 border border-primary/40 flex items-center justify-center mx-auto mb-5">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                We sent a magic link to <strong className="text-foreground">{email}</strong>.
                Click the link to sign in — no password needed.
              </p>
              <button
                onClick={() => { setStep("email"); setEmail(""); }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-1 text-center" style={{ fontFamily: "var(--font-heading)" }}>
                Digital Foreman
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-7 font-light">
                Sign in to your Precision Core Builders dashboard
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
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
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@precisioncorebuilders.com"
                    className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                </div>

                {step === "error" && (
                  <p className="text-xs text-destructive" role="alert">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-primary/90 disabled:opacity-50 transition-all hover:gap-3 min-h-[48px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Send Magic Link <ArrowRight className="h-3.5 w-3.5" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-2 text-[10px] text-muted-foreground/50 justify-center">
                <Shield className="h-3 w-3" />
                <span>Secured by Supabase · {import.meta.env.VITE_SUPABASE_URL ? "Connected" : "Not configured"}</span>
              </div>
            </>
          )}
        </motion.div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-5">
          Precision Core Builders · CCB #246527
        </p>
      </div>
    </div>
  );
}
