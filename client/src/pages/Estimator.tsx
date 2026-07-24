/**
 * Public-facing AI Project Estimator — no auth required.
 * Multi-step form → AI cost estimate → lead capture.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { SITE } from "@/const";
import { TextReveal } from "@/components/ui/TextReveal";
import {
  PROJECT_TYPES,
  MATERIALS_OPTIONS,
  TIMELINE_WEEKS,
} from "@/config/projects";
import { formatCurrency } from "@/lib/formatters";
import { useSEO } from "@/hooks/useSEO";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";

function estimateTimeline(
  projectType: string,
  complexity: "low" | "medium" | "high"
): string | null {
  const base = TIMELINE_WEEKS[projectType];
  if (!base) return null;
  const factor = complexity === "high" ? 1.25 : complexity === "low" ? 0.85 : 1;
  const low = Math.max(1, Math.round(base[0] * factor));
  const high = Math.max(low + 1, Math.round(base[1] * factor));
  return `${low}–${high} weeks`;
}

/** Animated currency figure — eases from 0 to value on mount (result reveal). */
function CountCurrency({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const duration = 1300;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <span aria-hidden className="tabular-nums">
      {formatCurrency(display)}
    </span>
  );
}

type Step = 1 | 2 | 3 | 4;
type EstimateResult = {
  estimatedLow: number;
  estimatedMid: number;
  estimatedHigh: number;
  laborCost: number;
  materialsCost: number;
  permitsCost: number;
  contingency: number;
  aiReasoning: string;
};

export default function Estimator() {
  useSEO({
    title: "Free Project Estimator — Get a Cost Estimate",
    description:
      "Get an instant AI-powered construction cost estimate for your project. Precision Core Builders serves Eugene, Springfield, and Lane County, Oregon. No obligation.",
    canonical: "https://precision-core.netlify.app/estimator",
  });

  const [step, setStep] = useState<Step>(1);
  const [projectType, setProjectType] = useState("");
  const [sqft, setSqft] = useState("");
  const [complexity, setComplexity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [materials, setMaterials] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState("");
  // Lead form
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [leadError, setLeadError] = useState("");

  const toggleMaterial = (m: string) =>
    setMaterials(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );

  const runEstimate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/estimate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          squareFootage: (() => {
            const n = Number.parseInt(sqft, 10);
            return Number.isFinite(n) ? n : undefined;
          })(),
          complexity,
          materials,
          location: "Eugene, OR",
          additionalNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            "Too many requests. Please wait a minute and try again."
          );
        }
        throw new Error(
          "Unable to generate estimate right now. Please try again shortly."
        );
      }
      setResult(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submitLead = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!leadName || !leadEmail || leadSending) return;
    setLeadSending(true);
    setLeadError("");

    const formData = new FormData();
    formData.append("form-name", "estimator-lead");
    formData.append("name", leadName);
    formData.append("email", leadEmail);
    formData.append("phone", leadPhone);
    formData.append("projectType", projectType);
    formData.append("complexity", complexity);
    formData.append("sqft", sqft);
    formData.append("estimatedMid", String(result?.estimatedMid ?? 0));

    try {
      // 1. Submit to Netlify Forms for CRM — verify it was accepted.
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData as any).toString(),
      });
      if (!res.ok) throw new Error(`Form submission failed (${res.status})`);

      // 2. Fire lead_captured n8n event (non-blocking).
      fetch("/api/n8n-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "lead_captured",
          payload: {
            name: leadName,
            email: leadEmail,
            phone: leadPhone,
            projectType,
            complexity,
            squareFootage: sqft,
            estimatedMid: result?.estimatedMid,
            estimatedLow: result?.estimatedLow,
            estimatedHigh: result?.estimatedHigh,
            source: "estimator",
          },
        }),
      }).catch(() => {});

      setLeadSent(true);
    } catch {
      setLeadError(
        `We couldn't submit that just now. Please call Eric directly at ${SITE.phone}, or try again in a moment.`
      );
    } finally {
      setLeadSending(false);
    }
  };

  return (
    <>
      {/* Netlify form registration lives in client/index.html so the
          build-time HTML scanner can detect it (SPA bundles are invisible
          to that scanner). */}
      <SiteNav />
      <MobileCTABar />
      <main id="main-content" className="pt-[68px] min-h-screen">
        <div className="container py-16 sm:py-24 max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span
              className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              AI Project Estimator
            </span>
            <h1
              className="text-4xl sm:text-5xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <TextReveal
                text="What will your"
                className="block"
                delay={0.1}
                stagger={0.08}
              />
              <TextReveal
                text="project cost?"
                className="block"
                wordClassName="text-primary italic"
                delay={0.4}
                stagger={0.08}
              />
            </h1>
            <p className="text-muted-foreground font-light text-lg">
              Get a real estimate for Eugene, OR construction — powered by local
              market data.
            </p>
          </motion.div>

          {/* Progress */}
          {step < 4 && (
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= s ? "progress-gold" : "bg-border/60"}`}
                />
              ))}
            </div>
          )}

          {/* Step 1: Project type */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2
                className="text-xl font-semibold mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                What type of project?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {PROJECT_TYPES.map(pt => (
                  <button
                    key={pt.id}
                    onClick={() => setProjectType(pt.id)}
                    className={`p-4 border text-left transition-all press-scale ${
                      projectType === pt.id
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{pt.icon}</span>
                    <span className="text-sm font-medium">{pt.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => projectType && setStep(2)}
                disabled={!projectType}
                className="w-full py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Next: Project Details →
              </button>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2
                className="text-xl font-semibold mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Project details
              </h2>
              <div className="space-y-5 mb-6">
                <div>
                  <label
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Square Footage (approximate)
                  </label>
                  <input
                    type="number"
                    value={sqft}
                    onChange={e => setSqft(e.target.value)}
                    placeholder="e.g. 1200"
                    min="50"
                    max="10000"
                    className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-3 font-medium"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Finish Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["low", "medium", "high"] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setComplexity(c)}
                        className={`py-3 text-center border text-sm font-medium transition-all ${
                          complexity === c
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {c === "low"
                          ? "Builder Grade"
                          : c === "medium"
                            ? "Mid-Range"
                            : "Premium"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any special requirements, existing conditions, or specific features…"
                    className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Next: Materials →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Materials */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Material preferences
              </h2>
              <p className="text-sm text-muted-foreground font-light mb-5">
                Select any that apply (optional)
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mb-6">
                {MATERIALS_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMaterial(m)}
                    className={`p-3 border text-left text-sm transition-all press-scale flex items-center gap-3 ${
                      materials.includes(m)
                        ? "border-primary bg-primary/10"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 border flex-shrink-0 flex items-center justify-center ${
                        materials.includes(m)
                          ? "border-primary bg-primary"
                          : "border-border/60"
                      }`}
                    >
                      {materials.includes(m) && (
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    {m}
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-sm text-destructive mb-4">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  ← Back
                </button>
                <button
                  onClick={runEstimate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Estimating…
                    </>
                  ) : (
                    <>Get Estimate →</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <div className="space-y-5">
              {/* Cost range */}
              <div className="bg-card border border-border/60 p-6">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Estimated Project Cost
                </p>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    {
                      label: "Conservative",
                      value: result.estimatedLow,
                      cls: "text-muted-foreground",
                    },
                    {
                      label: "Expected",
                      value: result.estimatedMid,
                      cls: "text-primary text-3xl!",
                    },
                    {
                      label: "Premium",
                      value: result.estimatedHigh,
                      cls: "text-muted-foreground",
                    },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="text-center">
                      <p
                        className={`text-xl sm:text-2xl font-bold mb-1 ${cls}`}
                        aria-label={formatCurrency(value)}
                      >
                        <CountCurrency value={value} />
                      </p>
                      <p
                        className="text-[10px] tracking-widest uppercase text-muted-foreground"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const parts = [
                    {
                      label: "Labor",
                      value: result.laborCost,
                      color: "#c8a84b",
                    },
                    {
                      label: "Materials",
                      value: result.materialsCost,
                      color: "#a89060",
                    },
                    {
                      label: "Permits",
                      value: result.permitsCost,
                      color: "#7a9e4c",
                    },
                    {
                      label: "Contingency",
                      value: result.contingency,
                      color: "#d4a574",
                    },
                  ];
                  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
                  const timeline = estimateTimeline(projectType, complexity);
                  return (
                    <div className="pt-4 border-t border-border/40">
                      <p
                        className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2.5"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Where it goes
                      </p>
                      {/* Stacked proportion bar */}
                      <div
                        className="flex h-2.5 w-full overflow-hidden rounded-full bg-border/40"
                        role="img"
                        aria-label={parts
                          .map(
                            p =>
                              `${p.label} ${Math.round(
                                (p.value / total) * 100
                              )} percent`
                          )
                          .join(", ")}
                      >
                        {parts.map((p, pi) => (
                          <motion.div
                            key={p.label}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(p.value / total) * 100}%`,
                            }}
                            transition={{
                              duration: 0.8,
                              delay: 0.35 + pi * 0.12,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{ backgroundColor: p.color }}
                          />
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
                        {parts.map(p => (
                          <div
                            key={p.label}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span
                                aria-hidden
                                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.label}
                            </span>
                            <span className="text-foreground font-medium tabular-nums">
                              {formatCurrency(p.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {timeline && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40 text-sm">
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">
                            Typical timeline:
                          </span>
                          <span className="text-foreground font-semibold">
                            {timeline}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* AI reasoning */}
              <div className="bg-card border border-border/60 p-5">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Estimate Basis
                </p>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {result.aiReasoning}
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-3 font-light">
                  Based on current Eugene, OR market data. Actual costs may
                  vary. Free on-site estimate available.
                </p>
              </div>

              {/* Prominent disclaimer — set expectations before the ask */}
              <div className="flex items-start gap-3 border border-amber-500/40 bg-amber-500/10 p-4 rounded-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <span className="font-semibold">
                    This is a ballpark, not a quote.
                  </span>{" "}
                  Real pricing depends on site conditions, finishes, and scope.
                  Eric confirms every number with a free on-site visit.
                </p>
              </div>

              {/* Lead capture */}
              {!leadSent ? (
                <div className="bg-card border border-border/60 p-6">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Get a Detailed Quote
                  </p>
                  <p className="text-sm text-muted-foreground font-light mb-4">
                    Ready for a real, on-site estimate? Eric will come to you —
                    free.
                  </p>
                  <form onSubmit={submitLead} className="space-y-3">
                    <input
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      placeholder="Your name *"
                      required
                      autoComplete="name"
                      className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={leadEmail}
                        onChange={e => setLeadEmail(e.target.value)}
                        placeholder="Email *"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                      />
                      <input
                        value={leadPhone}
                        onChange={e => setLeadPhone(e.target.value)}
                        placeholder="Phone"
                        type="tel"
                        autoComplete="tel"
                        className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!leadName || !leadEmail || leadSending}
                      className="w-full py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {leadSending ? (
                        "Sending…"
                      ) : (
                        <>
                          Request Free On-Site Estimate{" "}
                          <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
                        </>
                      )}
                    </button>
                    {leadError && (
                      <p className="text-xs text-destructive text-center">
                        {leadError}
                      </p>
                    )}
                    <p className="text-[10px] text-center text-muted-foreground/50">
                      No obligation · {SITE.license}
                    </p>
                  </form>
                </div>
              ) : (
                <div className="bg-card border border-border/60 p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                  <p
                    className="font-semibold mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Request received.
                  </p>
                  <p className="text-sm text-muted-foreground font-light">
                    Eric will be in touch within one business day.
                  </p>
                  <a
                    href={SITE.phoneHref}
                    className="block mt-4 text-primary text-sm hover:underline"
                  >
                    {SITE.phone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
