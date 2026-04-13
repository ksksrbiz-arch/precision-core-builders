/**
 * useSessionTimeout — Auto-logout after inactivity, with warning
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";

interface SessionTimeoutOptions {
  warningMinutes?: number; // Show warning this many minutes before timeout
  timeoutMinutes?: number; // Total session duration
  checkIntervalMs?: number; // How often to check inactivity
}

const DEFAULT_OPTIONS: Required<SessionTimeoutOptions> = {
  warningMinutes: 5,
  timeoutMinutes: 60,
  checkIntervalMs: 30000, // Check every 30s
};

export function useSessionTimeout(options: SessionTimeoutOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastActivityRef = useRef(Date.now());

  // Reset activity timer on user interaction
  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
      setTimeRemaining(null);

      // Clear existing timeouts
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

      // Set warning timeout
      const warningMs = (opts.timeoutMinutes - opts.warningMinutes) * 60 * 1000;
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        addToast({
          type: "warning",
          title: "Session Expiring Soon",
          message: `You'll be logged out in ${opts.warningMinutes} minutes due to inactivity.`,
          duration: 0,
          action: {
            label: "Stay Logged In",
            onClick: () => {
              lastActivityRef.current = Date.now();
              setShowWarning(false);
            },
          },
        });
      }, warningMs);

      // Set logout timeout
      const logoutMs = opts.timeoutMinutes * 60 * 1000;
      inactivityTimeoutRef.current = setTimeout(() => {
        signOut();
        addToast({
          type: "info",
          title: "Session Ended",
          message: "You were logged out due to inactivity.",
          duration: 5000,
        });
      }, logoutMs);
    };

    // Attach listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Initialize timers

    // Update countdown display
    const countdownInterval = setInterval(() => {
      if (showWarning) {
        const elapsed = Date.now() - lastActivityRef.current;
        const totalMs = opts.timeoutMinutes * 60 * 1000;
        const remaining = Math.max(0, totalMs - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000)); // In seconds
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      clearInterval(countdownInterval);
    };
  }, [user, opts, addToast, signOut]);

  return {
    showWarning,
    timeRemaining,
    dismissWarning: () => {
      setShowWarning(false);
      lastActivityRef.current = Date.now();
    },
  };
}
