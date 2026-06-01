/**
 * TrustBar — trust signals used across home, service pages, and portfolio.
 * CCB license, insured, years experience, local badges.
 *
 * Mobile: horizontal snap-scroll with fade-right edge hint.
 * Tablet+: centered flex wrap.
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
      className={`border-y border-border/50 bg-card/50 py-4 ${className}`}
      aria-label="Credentials and trust signals"
    >
      <div className="container">
        <div
          className="
            flex items-center gap-6 overflow-x-auto scrollbar-none snap-x
            edge-fade-right
            md:flex-wrap md:justify-center md:overflow-visible
            md:[-webkit-mask-image:none] md:[mask-image:none]
            lg:justify-between
          "
        >
          {SIGNALS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="group flex items-center gap-2.5 flex-shrink-0 snap-start"
            >
              <div
                className="relative h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-sm transition-all duration-300 group-hover:shadow-[0_0_18px_-4px_rgba(200,168,75,0.55)]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(200,168,75,0.55), rgba(200,168,75,0.12)) border-box",
                  border: "1px solid transparent",
                  backgroundClip: "padding-box, border-box",
                  backgroundOrigin: "border-box",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-[1px] rounded-[2px] bg-card/80"
                />
                <Icon className="relative h-4 w-4 text-primary" aria-hidden />
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
