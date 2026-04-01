/**
 * useRealtimeProjects — Supabase Realtime subscription for live project changes.
 * Wires postgres_changes on the projects table to a callback.
 * Returns: { isLive, lastEvent }
 */
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

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
          onUpdate?.(event);
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);

  return { isLive, lastEvent };
}
