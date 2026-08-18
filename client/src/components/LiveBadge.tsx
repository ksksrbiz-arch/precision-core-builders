/**
 * LiveBadge — the realtime connection indicator shared by every admin and
 * portal page that subscribes via `useRealtimeTable`.
 *
 * Usage:
 *   const { isLive } = useRealtimeTable({ table: "projects", ... });
 *   <LiveBadge isLive={isLive} />
 */
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type LiveBadgeProps = {
  /** Realtime subscription state, straight from `useRealtimeTable`. */
  isLive: boolean;
  className?: string;
};

export function LiveBadge({ isLive, className }: LiveBadgeProps) {
  const label = isLive ? "Live" : "Reconnecting";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={
        isLive ? "Realtime updates live" : "Realtime updates reconnecting"
      }
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 border",
        "text-[10px] font-bold tracking-[0.18em] uppercase",
        isLive
          ? "border-green-500/30 bg-green-500/10 text-green-600"
          : "border-border/40 bg-muted/20 text-muted-foreground/60",
        className
      )}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      {isLive ? (
        <Wifi className="h-3 w-3" aria-hidden="true" />
      ) : (
        <WifiOff className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

export default LiveBadge;
