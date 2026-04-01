/**
 * MapView — Google Maps wrapper with graceful degradation.
 * When VITE_FRONTEND_FORGE_API_KEY is not set, renders a static
 * placeholder with the Eugene OR address and a Google Maps link.
 *
 * Usage:
 *   <MapView initialCenter={{ lat: 44.0521, lng: -123.0868 }} initialZoom={13} />
 */
/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";
import { MapPin, ExternalLink } from "lucide-react";

declare global {
  interface Window { google?: typeof google; }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY as string | undefined;
const FORGE_BASE_URL =
  (import.meta.env.VITE_FRONTEND_FORGE_API_URL as string | undefined) ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

function loadMapScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => { resolve(); script.remove(); };
    script.onerror = () => reject(new Error("Maps script failed to load"));
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  /** Label shown in the fallback placeholder */
  fallbackLabel?: string;
}

// ── Static placeholder shown when API key is absent ──────────────────────────
function MapPlaceholder({
  center,
  label,
  className,
}: {
  center: google.maps.LatLngLiteral;
  label?: string;
  className?: string;
}) {
  const mapsUrl = `https://www.google.com/maps?q=${center.lat},${center.lng}`;
  return (
    <div
      className={cn(
        "w-full h-[500px] border border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <div className="h-12 w-12 border border-primary/30 flex items-center justify-center">
        <MapPin className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-0.5">
          {label ?? "Eugene, OR"}
        </p>
        <p className="text-xs text-muted-foreground">
          {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </p>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] text-primary border border-primary/40 px-3 py-1.5 hover:bg-primary/10 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        <ExternalLink className="h-3 w-3" />
        Open in Google Maps
      </a>
      {!API_KEY && (
        <p className="text-[9px] text-muted-foreground/50 mt-1 text-center max-w-[200px]">
          Add VITE_FRONTEND_FORGE_API_KEY to enable the interactive map
        </p>
      )}
    </div>
  );
}

// ── Main MapView ──────────────────────────────────────────────────────────────
export function MapView({
  className,
  initialCenter = { lat: 44.0521, lng: -123.0868 },
  initialZoom = 12,
  onMapReady,
  fallbackLabel,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  // If no API key is configured, render the static placeholder
  if (!API_KEY) {
    return (
      <MapPlaceholder
        center={initialCenter}
        label={fallbackLabel}
        className={className}
      />
    );
  }

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
      if (!mapContainer.current) return;
      map.current = new window.google!.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      onMapReady?.(map.current);
    } catch (err) {
      console.warn("[MapView] Failed to initialize Google Maps:", err);
      if (mapContainer.current) {
        mapContainer.current.innerHTML = "";
        const ph = document.createElement("div");
        ph.textContent = "Map unavailable";
        ph.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted-foreground);font-size:0.875rem;";
        mapContainer.current.appendChild(ph);
      }
    }
  });

  useEffect(() => { init(); }, [init]);

  return <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />;
}

// Default export for legacy imports
export default MapView;
