/**
 * useRealtimeTable — Supabase Realtime subscription for live table changes.
 * Wires postgres_changes on the given table to a callback.
 * Returns: { isLive, lastEvent }
 *
 * Reconnection: when the channel reports a recoverable error status
 * (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) the hook tears the channel down
 * immediately and resubscribes with exponential backoff (1s → 2s → 4s …
 * capped at 30s, plus a small jitter). `isLive` is driven false the moment a
 * recoverable status is observed and only flips back to true on a fresh
 * `SUBSCRIBED`, so consumers can rely on `isLive === false` to mean
 * "reconnecting or unavailable" and fall back to polling/manual refresh.
 * A successful `SUBSCRIBED` resets the backoff.
 */
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

type UseRealtimeOptions = {
  table: string;
  enabled?: boolean;
  onUpdate?: (payload: RealtimePayload) => void;
};

// Backoff tuning. Base doubles each attempt (1s, 2s, 4s, …) up to a hard cap.
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 30_000;
// Jitter window added to every delay to avoid reconnect storms when many
// clients drop a shared connection simultaneously.
const BACKOFF_JITTER_MS = 500;

// Statuses that indicate the channel is gone and should be re-established.
const RECOVERABLE_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

/**
 * Compute the next reconnect delay for a given attempt index (0-based),
 * following the BOT-1 schedule: 1s → 2s → 4s … capped at 30s, + jitter.
 * Exported so the backoff curve is unit-testable without a React tree.
 */
export function nextReconnectDelay(attempt: number): number {
  const exponential = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  const jitter = Math.random() * BACKOFF_JITTER_MS;
  return exponential + jitter;
}

export function useRealtimeTable({
  table,
  enabled = true,
  onUpdate,
}: UseRealtimeOptions) {
  const [isLive, setIsLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimePayload | null>(null);
  // Keep callback ref stable so the subscription doesn't re-subscribe on every
  // render while still always calling the latest version of onUpdate.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // The active channel is held in a ref so the subscribe callback (which is
  // attached synchronously but may fire much later) can always reach the
  // channel that owns the current subscription lifecycle.
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Pending reconnect timer — cleared on unmount or when a fresh subscription
  // establishes itself, so stale resubscribes can't race a teardown.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Backoff attempt counter for the current subscription lifecycle. Reset to 0
  // whenever a channel reaches SUBSCRIBED.
  const attemptRef = useRef(0);
  // Guards the effect body against work scheduled after unmount/teardown.
  const disposedRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const removeActiveChannel = useCallback(
    (reason: string) => {
      if (!channelRef.current) return;
      try {
        supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.warn(
          `[useRealtimeTable] removeChannel failed for "${table}" (${reason}):`,
          err
        );
      }
      channelRef.current = null;
    },
    [table]
  );

  useEffect(() => {
    disposedRef.current = false;
    attemptRef.current = 0;

    if (!enabled) {
      setIsLive(false);
      return;
    }

    // Skip realtime wiring entirely when Supabase isn't configured (e.g.
    // dev-bypass mode with no env vars). Attempting to subscribe against a
    // placeholder URL causes the realtime client to throw synchronously,
    // which would otherwise bubble up to the app's ErrorBoundary.
    if (!isSupabaseConfigured) {
      setIsLive(false);
      return;
    }

    // Build (or rebuild) the channel + subscription. Pulled into a named
    // function so the recoverable-status path can re-invoke it after a backoff
    // delay without re-running the whole effect.
    const subscribe = () => {
      if (disposedRef.current) return;
      // Tear down any channel from a previous attempt before creating a fresh
      // one — a lingering errored channel would otherwise leak and double-fire.
      removeActiveChannel("resubscribe");
      clearReconnectTimer();

      try {
        // Assign channelRef *before* subscribe() so a synchronous status
        // callback can tear the channel down immediately on error.
        const channel = supabase.channel(`realtime-${table}`);
        channelRef.current = channel;

        channel
          .on(
            // Supabase Realtime client types don't model postgres_changes
            // cleanly here; keep the cast local and do not spread `any`.
            "postgres_changes" as any,
            { event: "*", schema: "public", table },
            (payload: any) => {
              const event: RealtimePayload = {
                eventType: payload.eventType,
                table: payload.table,
                new: payload.new ?? null,
                old: payload.old ?? null,
              };
              setLastEvent(event);
              onUpdateRef.current?.(event);
            }
          )
          .subscribe(status => {
            if (disposedRef.current) return;

            if (status === "SUBSCRIBED") {
              // Live and healthy: reset the backoff curve for next time.
              attemptRef.current = 0;
              clearReconnectTimer();
              setIsLive(true);
              return;
            }

            if (RECOVERABLE_STATUSES.has(status)) {
              // Channel is gone — drop it immediately (only if this callback
              // still owns the active channel), mark not-live, and schedule a
              // resubscribe with backoff + jitter.
              setIsLive(false);
              if (channelRef.current === channel) {
                removeActiveChannel(status);
              }
              const attempt = attemptRef.current;
              const delay = nextReconnectDelay(attempt);
              attemptRef.current = attempt + 1;
              clearReconnectTimer();
              console.warn(
                `[useRealtimeTable] "${table}" ${status}; reconnect in ${Math.round(delay)}ms (attempt ${attempt + 1})`
              );
              reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                subscribe();
              }, delay);
              return;
            }

            // Any other status is treated as inert: not live, no resubscribe.
            setIsLive(false);
          });
      } catch (err) {
        // Realtime failures should never crash the page — log and continue
        // with isLive=false so consumers fall back to polling/manual refresh.
        console.warn(
          `[useRealtimeTable] subscribe failed for "${table}":`,
          err
        );
        channelRef.current = null;
        setIsLive(false);
      }
    };

    subscribe();

    return () => {
      disposedRef.current = true;
      clearReconnectTimer();
      removeActiveChannel("unmount");
    };
  }, [enabled, table, clearReconnectTimer, removeActiveChannel]);

  return { isLive, lastEvent };
}
