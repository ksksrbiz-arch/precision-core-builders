/**
 * PWA Install Prompt — Shows a banner when the app can be installed.
 * Dismissible. Remembers dismissal for 14 days.
 */
import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pcb-pwa-dismiss";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  }, []);

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-card border border-primary/20 rounded-lg shadow-2xl shadow-black/50 p-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Digital Foreman</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to home screen for instant access. Works offline.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors rounded"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS Safari Install Instructions — since iOS doesn't fire beforeinstallprompt
 */
export function IOSInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandalone = (navigator as any).standalone === true;
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);

    if (isIOS && !isInStandalone && isSafari) {
      const dismissed = localStorage.getItem("pcb-ios-hint");
      if (!dismissed) {
        setTimeout(() => setShow(true), 3000);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-card border border-primary/20 rounded-lg shadow-2xl shadow-black/50 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tap the <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-foreground font-medium">Share</span> button
              in Safari, then scroll down and tap
              <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-foreground font-medium ml-1">Add to Home Screen</span>.
            </p>
          </div>
          <button
            onClick={() => {
              setShow(false);
              localStorage.setItem("pcb-ios-hint", "1");
            }}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
