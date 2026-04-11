/**
 * Error Pages — 404, 500, and Offline error pages
 */

import { AlertTriangle, Home, RefreshCw, Wifi } from "lucide-react";
import { useLocation } from "wouter";

// ─── 404 Not Found ─────────────────────────────────────────────────────────

export function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-muted-foreground/30 mb-4">
          404
        </div>

        <h1
          className="text-3xl font-semibold text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Page Not Found
        </h1>

        <p className="text-muted-foreground font-light mb-8 leading-relaxed">
          We couldn't find that page. It may have been moved or deleted.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <Home className="h-3.5 w-3.5" />
            Go Home
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-4 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 500 Server Error ──────────────────────────────────────────────────────

export function ServerError({ error }: { error?: Error }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-red-400/10 border border-red-400/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
        </div>

        <h1
          className="text-3xl font-semibold text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Server Error
        </h1>

        <p className="text-muted-foreground font-light mb-4 leading-relaxed">
          Something went wrong on our end. We're working to fix it.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <div className="bg-card border border-red-400/20 p-3 mb-4 text-left text-xs text-red-400 overflow-auto max-h-40 font-mono">
            <p className="font-semibold mb-1">Error:</p>
            <p>{error.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
          <a
            href="/"
            className="flex-1 px-4 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Offline / No Internet ────────────────────────────────────────────────

export function OfflineError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
            <Wifi className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <h1
          className="text-3xl font-semibold text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          No Internet
        </h1>

        <p className="text-muted-foreground font-light mb-8 leading-relaxed">
          You're offline. Some features are limited. Once you reconnect, you'll
          be able to sync all your changes.
        </p>

        <div className="bg-card border border-amber-400/30 p-4 mb-8 text-left text-sm text-muted-foreground">
          <p className="font-semibold mb-2">You can still:</p>
          <ul className="space-y-1 text-xs">
            <li>✓ Record voice memos (queue to send later)</li>
            <li>✓ View cached data</li>
            <li>✓ Write notes</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Check Connection
        </button>
      </div>
    </div>
  );
}

// ─── Network Timeout ───────────────────────────────────────────────────────

export function NetworkTimeout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-orange-400/10 border border-orange-400/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
          </div>
        </div>

        <h1
          className="text-3xl font-semibold text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Connection Timeout
        </h1>

        <p className="text-muted-foreground font-light mb-8 leading-relaxed">
          The server is taking too long to respond. Check your connection or try
          again in a moment.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
          <a
            href="/"
            className="flex-1 px-4 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 hover:text-primary transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
