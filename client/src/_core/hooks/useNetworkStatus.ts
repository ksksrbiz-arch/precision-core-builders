/**
 * useNetworkStatus Hook — Detect online/offline and slow connections
 */

import { useEffect, useState, useCallback } from "react";

export type ConnectionSpeed = "4g" | "3g" | "2g" | "slow-4g" | "unknown";

export interface NetworkStatus {
  isOnline: boolean;
  speed: ConnectionSpeed;
  effectiveType: string;
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => getNetworkStatus());

  useEffect(() => {
    // Online/offline listeners
    const handleOnline = () => {
      setStatus(s => ({ ...s, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(s => ({ ...s, isOnline: false }));
    };

    // Connection change listener
    const handleConnectionChange = () => {
      setStatus(getNetworkStatus());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API (Chrome, Edge, newer browsers)
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, []);

  return status;
}

// ─── Helper to get current network status ───────────────────────────────────

function getNetworkStatus(): NetworkStatus {
  const isOnline = navigator.onLine;

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return {
      isOnline,
      speed: "unknown",
      effectiveType: "unknown",
      downlink: 0,
      rtt: 0,
    };
  }

  return {
    isOnline,
    speed: (connection.effectiveType as ConnectionSpeed) || "unknown",
    effectiveType: connection.effectiveType || "unknown",
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
  };
}

// ─── Hook to check if user is on slow connection ───────────────────────────

export function useIsSlowConnection(): boolean {
  const { speed } = useNetworkStatus();
  return speed === "2g" || speed === "3g" || speed === "slow-4g";
}

// ─── Hook to get time estimate based on connection ─────────────────────────

export function useEstimatedLoadTime(fileSizeKb: number): number {
  const { speed, downlink } = useNetworkStatus();

  // Estimate based on speed type
  const speedMap: Record<ConnectionSpeed, number> = {
    "4g": 100, // Mbps
    "3g": 10,
    "2g": 0.4,
    "slow-4g": 4,
    unknown: 50, // Default to average
  };

  const estimatedMbps = downlink || speedMap[speed];
  const estimatedSeconds = (fileSizeKb * 8) / (estimatedMbps * 1000);

  return Math.ceil(estimatedSeconds);
}

// ─── Hook for retry on reconnect ───────────────────────────────────────────

export function useRetryOnReconnect(
  callback: () => void,
  enabled: boolean = true
) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      setIsOnline(true);
      // Wait a moment for connection to stabilize
      setTimeout(() => callback(), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [callback, enabled]);

  return isOnline;
}

// ─── Hook to queue actions while offline ──────────────────────────────────

interface QueuedAction {
  id: string;
  action: () => Promise<void>;
  timestamp: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Add action to queue
  const enqueue = useCallback(
    (action: () => Promise<void>, id: string = `action-${Date.now()}`) => {
      setQueue(prev => [...prev, { id, action, timestamp: Date.now() }]);
      return id;
    },
    []
  );

  // Remove action from queue
  const dequeue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Process queue when online
  useEffect(() => {
    if (!isOnline || isProcessing || queue.length === 0) return;

    setIsProcessing(true);

    (async () => {
      for (const item of queue) {
        try {
          await item.action();
          dequeue(item.id);
        } catch (error) {
          console.error(`[OfflineQueue] Failed to process ${item.id}:`, error);
          // Leave in queue for retry
        }
      }
      setIsProcessing(false);
    })();
  }, [isOnline, queue, dequeue, isProcessing]);

  return {
    queue,
    enqueue,
    dequeue,
    isProcessing,
    queueLength: queue.length,
  };
}
