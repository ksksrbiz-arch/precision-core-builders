/**
 * NetworkStatus — Shows a banner when offline.
 * Construction sites have spotty signal. Eric needs to know.
 */
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      // Show "back online" briefly then hide
      setTimeout(() => setShowBanner(false), 2000);
    };
    const goOffline = () => {
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (!navigator.onLine) {
      setOnline(false);
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[200] transition-all duration-300 ${
        online
          ? "bg-emerald-600/90 translate-y-0"
          : "bg-red-600/90 translate-y-0"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-center gap-2 py-2 px-4">
        {online ? (
          <p className="text-xs font-semibold text-white">Back online — syncing data</p>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-white" />
            <p className="text-xs font-semibold text-white">
              No connection — cached data available
            </p>
          </>
        )}
      </div>
    </div>
  );
}
