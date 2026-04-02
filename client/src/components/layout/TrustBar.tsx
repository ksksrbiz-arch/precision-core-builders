/**
 * TrustBar — trust signals used across home, service pages, and portfolio.
 * CCB license, insured, years experience, local badges.
 */
import { Award, Clock, MapPin, Shield, ThumbsUp } from "lucide-react";

const SIGNALS = [
  { icon: Shield, label: "Oregon Licensed", value: "CCB #246527" },
  { icon: Award, label: "Licensed & Insured", value: "Fully Covered" },
  { icon: Clock, label: "Experience", value: "20+ Years" },
  { icon: MapPin, label: "Local to Eugene", value: "Since 2004" },
  {
    icon: ThumbsUp,
    label: "Customer Satisfaction",
    value: "50+ Happy Clients",
  },
] as const;

export function TrustBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`border-y border-border/50 bg-card/50 py-4 overflow-x-auto ${className}`}
    >
      <div className="container">
        <div className="flex items-center justify-between gap-6 min-w-max sm:min-w-0 sm:flex-wrap sm:justify-center lg:justify-between">
          {SIGNALS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 flex-shrink-0"
            >
              <div className="h-7 w-7 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              </div>
              <div>
                <div
                  className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 leading-none mb-0.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {label}
                </div>
                <div
                  className="text-[11px] font-bold tracking-wide text-foreground leading-none"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
