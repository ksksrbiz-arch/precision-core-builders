/**
 * Public-facing AI Project Estimator — no auth required.
 * Multi-step form → Gemini AI cost estimate → lead capture.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { useState } from "react";

const PROJECT_TYPES = [
  { id: "new-home", label: "New Home Build", icon: "🏠" },
  { id: "full-remodel", label: "Full Remodel", icon: "🔨" },
  { id: "kitchen", label: "Kitchen Remodel", icon: "🍳" },
  { id: "bathroom", label: "Bathroom Remodel", icon: "🚿" },
  { id: "addition", label: "Home Addition", icon: "📐" },
  { id: "adu", label: "ADU / Second Unit", icon: "🏡" },
  { id: "outdoor", label: "Outdoor / Deck", icon: "🌿" },
  { id: "roofing", label: "Roofing", icon: "🏗️" },
  { id: "restoration", label: "Restoration", icon: "🔧" },
  { id: "cabinets", label: "Custom Cabinets", icon: "🪵" },
];

const MATERIALS_OPTIONS = [
  "Premium fixtures and hardware",
  "Custom cabinetry",
  "Hardwood flooring",
  "Tile and stone",
  "High-end countertops (quartz/granite)",
  "Energy-efficient windows",
  "Smart home integration",
  "Premium appliances",
];

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
          squareFootage: sqft ? parseInt(sqft) : undefined,
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

  const submitLead = async () => {
    const formData = new FormData();
    formData.append("form-name", "estimator-lead");
    formData.append("name", leadName);
    formData.append("email", leadEmail);
    formData.append("phone", leadPhone);
    formData.append("projectType", projectType);
    formData.append("complexity", complexity);
    formData.append("sqft", sqft);
    formData.append("estimatedMid", String(result?.estimatedMid ?? 0));

    // 1. Submit to Netlify Forms for CRM
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as any).toString(),
    });

    // 2. Fire lead_captured n8n event (non-blocking)
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
  };

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <>
      {/* Netlify form registration lives in client/index.html so the
          build-time HTML scanner can detect it (SPA bundles are invisible
          to that scanner). */}
      <SiteNav />
      <MobileCTABar />
      <main className="pt-[68px] min-h-screen">
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
              What will your
              <br />
              <em className="text-primary italic">project cost?</em>
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
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= s ? "bg-primary" : "bg-border/60"}`}
                />
              ))}
            </div>
          )}

          {/* Step 1: Project type */}
          {step === 1 && (
            <div>
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
                    className={`p-4 border text-left transition-all ${
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
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div>
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
            </div>
          )}

          {/* Step 3: Materials */}
          {step === 3 && (
            <div>
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
                    className={`p-3 border text-left text-sm transition-all flex items-center gap-3 ${
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
            </div>
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
                      >
                        {fmt(value)}
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
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/40">
                  {[
                    { label: "Labor", value: result.laborCost },
                    { label: "Materials", value: result.materialsCost },
                    { label: "Permits", value: result.permitsCost },
                    { label: "Contingency", value: result.contingency },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">
                        {fmt(value)}
                      </span>
                    </div>
                  ))}
                </div>
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
                  <div className="space-y-3">
                    <input
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                      placeholder="Your name *"
                      className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={leadEmail}
                        onChange={e => setLeadEmail(e.target.value)}
                        placeholder="Email *"
                        type="email"
                        className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                      />
                      <input
                        value={leadPhone}
                        onChange={e => setLeadPhone(e.target.value)}
                        placeholder="Phone"
                        type="tel"
                        className="w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                      />
                    </div>
                    <button
                      onClick={submitLead}
                      disabled={!leadName || !leadEmail}
                      className="w-full py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Request Free On-Site Estimate{" "}
                      <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
                    </button>
                    <p className="text-[10px] text-center text-muted-foreground/50">
                      No obligation · {SITE.license}
                    </p>
                  </div>
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
