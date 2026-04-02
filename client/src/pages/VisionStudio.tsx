import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import {
  Camera,
  Upload,
  Loader2,
  HardHat,
  Shield,
  Package,
  AlertTriangle,
  Eye,
  DollarSign,
  ArrowLeft,
  ImageIcon,
  X,
  Copy,
  CheckCircle2,
} from "lucide-react";

type AnalysisMode =
  | "progress"
  | "safety"
  | "material"
  | "defect"
  | "general"
  | "estimate";

interface AnalysisResult {
  analysis: string;
  mode: AnalysisMode;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: string;
}

const MODES: {
  id: AnalysisMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  {
    id: "general",
    label: "General Analysis",
    icon: <Eye className="h-4 w-4" />,
    desc: "Full comprehensive review",
  },
  {
    id: "progress",
    label: "Progress Check",
    icon: <HardHat className="h-4 w-4" />,
    desc: "Completion % by phase",
  },
  {
    id: "safety",
    label: "Safety Inspection",
    icon: <Shield className="h-4 w-4" />,
    desc: "OSHA & hazard review",
  },
  {
    id: "material",
    label: "Material ID",
    icon: <Package className="h-4 w-4" />,
    desc: "Identify materials & brands",
  },
  {
    id: "defect",
    label: "Defect Detection",
    icon: <AlertTriangle className="h-4 w-4" />,
    desc: "Quality & damage check",
  },
  {
    id: "estimate",
    label: "Cost Estimate",
    icon: <DollarSign className="h-4 w-4" />,
    desc: "Rough cost ballpark",
  },
];

export default function VisionStudio() {
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("general");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20MB.");
      return;
    }
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Strip data URL prefix for API
      const base64 = dataUrl.split(",")[1];
      setImage(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/.netlify/functions/vision-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mode, mediaType: "image/jpeg" }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyResult = () => {
    if (result?.analysis) {
      navigator.clipboard.writeText(result.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h1
              className="text-sm font-bold tracking-wider uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Vision Studio
            </h1>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            AI-Powered
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Construction Site Intelligence
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a construction photo and get instant AI-powered analysis —
            progress tracking, safety inspection, material identification, and
            more.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Upload + Mode */}
          <div className="space-y-4">
            {/* Upload Zone */}
            {!imagePreview ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[240px] flex flex-col items-center justify-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Drop an image here or tap to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, WebP, GIF — up to 20MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-border/40">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="w-full max-h-[360px] object-contain bg-black/5"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {/* Analysis Mode */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Analysis Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all text-xs ${
                      mode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/40 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.icon}
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-[10px] opacity-70">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyze}
              disabled={!image || loading}
              className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Analyze Photo
                </>
              )}
            </button>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="min-h-[300px]">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-border/20 rounded-lg bg-muted/30">
                <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload a photo and select an analysis mode to get started.
                </p>
              </div>
            )}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-border/20 rounded-lg">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium">
                  Analyzing with Claude Vision...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This typically takes 5–15 seconds
                </p>
              </div>
            )}
            {result && (
              <div className="border border-border/40 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {MODES.find(m => m.id === result.mode)?.label ??
                        "Analysis"}
                    </span>
                  </div>
                  <button
                    onClick={copyResult}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {result.analysis}
                  </div>
                </div>
                <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{result.model}</span>
                  <span>
                    {result.usage.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
