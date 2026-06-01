/**
 * QueryError — inline error banner for failed tRPC/React Query requests.
 *
 * Admin list and dashboard views previously rendered a blank or empty state
 * when a query failed, giving no signal that anything went wrong. Drop this in
 * the `isError` branch to surface the failure and offer a retry.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

export function QueryError({
  message = "Something went wrong while loading this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-card border border-red-400/30 p-8 text-center">
      <div className="flex justify-center mb-3">
        <div className="h-10 w-10 bg-red-400/10 border border-red-400/30 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
      </div>
      <p className="text-sm text-foreground font-medium mb-1">Unable to load</p>
      <p className="text-xs text-muted-foreground font-light mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border/60 text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}
