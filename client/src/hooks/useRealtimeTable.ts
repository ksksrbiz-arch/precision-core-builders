/**
 * useRealtimeTable — Supabase Realtime subscription for live table changes.
 * Wires postgres_changes on the given table to a callback.
 * Returns: { isLive, lastEvent }
 */
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

type UseRealtimeOptions = {
  table: string;
  onUpdate?: (payload: RealtimePayload) => void;
};

export function useRealtimeTable({ table, onUpdate }: UseRealtimeOptions) {
  const [isLive, setIsLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimePayload | null>(null);
  // Keep callback ref stable so the subscription doesn't re-subscribe on every
  // render while still always calling the latest version of onUpdate.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);

  return { isLive, lastEvent };
}
