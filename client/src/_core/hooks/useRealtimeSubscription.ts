/**
 * useRealtimeSubscription Hook — Real-time updates via Supabase Realtime
 *
 * Subscribes to database table changes (INSERT, UPDATE, DELETE) and provides
 * live refresh of data across all components. Integrated with tRPC query
 * invalidation for seamless UI updates.
 *
 * Usage:
 *   const { data, isLoading } = useRealtimeSubscription('projects', { user_id: userId });
 *   const scheduleUpdates = useRealtimeSubscription('schedule_items', { project_id: projectId });
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

export interface RealtimeOptions {
  table: string;
  filter?: Record<string, any>;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export interface UseRealtimeResult<T> {
  data: T[];
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Real-time subscription hook for Supabase tables
 * Auto-invalidates related tRPC queries on changes
 */
export function useRealtimeSubscription<T = any>(
  table: string,
  filter?: Record<string, any>,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
): UseRealtimeResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  const unsubscribeRef = useRef<any>(null);

  // Build filter condition for Supabase
  const buildFilter = useCallback((): string => {
    if (!filter) return "";
    return Object.entries(filter)
      .map(([key, value]) => `${key}.eq.${value}`)
      .join("and");
  }, [filter]);

  // Fetch initial data
  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from(table).select("*");

      // Apply filters
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError);
        return;
      }

      setData(fetchedData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [table, filter]);

  // Set up real-time subscription
  useEffect(() => {
    refetch();

    // Subscribe to changes
    const subscription = supabase
      .channel(`${table}:${buildFilter() || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
          filter: buildFilter() || undefined,
        },
        payload => {
          setData(prev => [...prev, payload.new as T]);
          onInsert?.(payload);
          // Invalidate related tRPC queries
          queryClient.invalidateQueries({ queryKey: [table] });
          setIsConnected(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: table,
          filter: buildFilter() || undefined,
        },
        payload => {
          setData(prev =>
            prev.map((item: any) =>
              item.id === payload.new.id ? payload.new : item
            )
          );
          onUpdate?.(payload);
          queryClient.invalidateQueries({ queryKey: [table] });
          setIsConnected(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: table,
          filter: buildFilter() || undefined,
        },
        payload => {
          setData(prev =>
            prev.filter((item: any) => item.id !== payload.old.id)
          );
          onDelete?.(payload);
          queryClient.invalidateQueries({ queryKey: [table] });
          setIsConnected(true);
        }
      )
      .subscribe(status => {
        setIsConnected(status === "SUBSCRIBED");
      });

    subscriptionRef.current = subscription;
    unsubscribeRef.current = () => {
      supabase.removeChannel(subscription);
    };

    return () => {
      unsubscribeRef.current?.();
    };
  }, [table, buildFilter, refetch, onInsert, onUpdate, onDelete, queryClient]);

  return {
    data,
    isLoading,
    isConnected,
    error,
    refetch,
  };
}

/**
 * Specialized hook for projects (most common use case)
 */
export function useRealtimeProjects(filters?: {
  user_id?: string;
  status?: string;
}) {
  return useRealtimeSubscription("projects", filters);
}

/**
 * Specialized hook for schedule items
 */
export function useRealtimeSchedule(projectId: number) {
  return useRealtimeSubscription("schedule_items", { project_id: projectId });
}

/**
 * Specialized hook for field reports
 */
export function useRealtimeFieldReports(projectId?: number) {
  return useRealtimeSubscription(
    "field_reports",
    projectId ? { project_id: projectId } : undefined
  );
}

/**
 * Specialized hook for materials/procurement
 */
export function useRealtimeMaterials(projectId: number) {
  return useRealtimeSubscription("materials", { project_id: projectId });
}

/**
 * Specialized hook for client communications
 */
export function useRealtimeMessages(projectId: number) {
  return useRealtimeSubscription("client_communications", {
    project_id: projectId,
  });
}

/**
 * Specialized hook for billing/invoices
 */
export function useRealtimeInvoices(clientId: string) {
  return useRealtimeSubscription("invoices", { client_id: clientId });
}

/**
 * Hook to track connection status globally
 * Displays notification if real-time connection drops
 */
export function useRealtimeStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
