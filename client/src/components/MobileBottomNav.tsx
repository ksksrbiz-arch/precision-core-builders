/**
 * MobileBottomNav — Persistent bottom navigation for mobile admin.
 * 5 most-used actions, always accessible with thumb reach.
 */
import {
  ClipboardList,
  HardHat,
  Mic,
  Pencil,
  Package,
} from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";

const MOBILE_NAV = [
  { icon: HardHat,        label: "Home",     path: "/admin" },
  { icon: ClipboardList,  label: "Projects",  path: "/admin/projects" },
  { icon: Mic,            label: "Report",    path: "/admin/field-reports/new", accent: true },
  { icon: Pencil,         label: "Plans",     path: "/admin/site-plans" },
  { icon: Package,        label: "Materials", path: "/admin/materials" },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Only show in admin on mobile
  if (!isMobile || !location.startsWith("/admin")) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {MOBILE_NAV.map((item) => {
          const isActive = item.path === "/admin"
            ? location === "/admin"
            : location.startsWith(item.path);
          const Icon = item.icon;

          if (item.accent) {
            // Center action button — larger, gold
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="flex flex-col items-center justify-center -mt-4"
                aria-label={item.label}
              >
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-semibold text-primary mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 active:scale-95 transition-transform ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label={item.label}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
