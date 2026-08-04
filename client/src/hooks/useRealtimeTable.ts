/**
 * useRealtimeTable — Supabase Realtime subscription for live table changes.
 * Wires postgres_changes on the given table to a callback.
 * Returns: { isLive, lastEvent }
 */
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
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

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`realtime-${table}`)
        .on(
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
          setIsLive(status === "SUBSCRIBED");
        });
    } catch (err) {
      // Realtime failures should never crash the page — log and continue
      // with isLive=false so consumers fall back to polling/manual refresh.
      console.warn(`[useRealtimeTable] subscribe failed for "${table}":`, err);
      setIsLive(false);
    }

    return () => {
      if (!channel) return;
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn(
          `[useRealtimeTable] removeChannel failed for "${table}":`,
          err
        );
      }
    };
  }, [enabled, table]);

  return { isLive, lastEvent };
}
