/**
 * CookieConsent — minimal GDPR-compliant cookie consent banner.
 * Shown once on first visit, acceptance stored in localStorage.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "pcb-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash during initial render
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60] bg-card border border-border/60 shadow-xl shadow-black/30 p-5"
        >
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium mb-1">
                Cookie Notice
              </p>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mb-3">
                We use essential cookies to keep you logged in and remember your
                preferences. By continuing to use this site, you agree to our{" "}
                <a
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={accept}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold tracking-[0.12em] uppercase hover:bg-primary/90 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Accept
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-1.5 border border-border/60 text-muted-foreground text-[10px] font-bold tracking-[0.12em] uppercase hover:text-foreground transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
              aria-label="Close cookie notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
