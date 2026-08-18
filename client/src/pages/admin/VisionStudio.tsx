/**
 * Admin Vision Studio.
 *
 * Uploads a construction site photo and runs it through the
 * `/.netlify/functions/vision-studio` endpoint in one of six analysis
 * modes. The endpoint is a Netlify Function (not tRPC), so it is called
 * with raw `fetch` — failures are routed through the shared client error
 * helpers in `@/_core/apiError` so the copy matches the rest of the admin.
 */
import { AdminPageHeader } from "@/components/AdminPageHeader";
import DashboardLayout from "@/components/DashboardLayout";
import { QueryError } from "@/components/QueryError";
import { SkeletonCard } from "@/components/Skeletons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  classifyError,
  getErrorRecoverySuggestion,
} from "@/_core/apiError";
import { getAuthHeader } from "@/lib/authHeader";
import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  DollarSign,
  Eye,
  HardHat,
  History,
  ImageIcon,
  Loader2,
  Package,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type AnalysisMode =
  "progress" | "safety" | "material" | "defect" | "general" | "estimate";

interface AnalysisResult {
  id: string;
  analysis: string;
  mode: AnalysisMode;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: string;
  imagePreview: string;
}

/** Error surfaced to the operator, already classified + humanised. */
interface StudioError {
  message: string;
  suggestion: string;
}

// Media types accepted by the OpenRouter vision model.
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MODES: {
  id: AnalysisMode;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: <Eye className="h-3.5 w-3.5" />,
    color: "text-blue-500",
  },
  {
    id: "progress",
    label: "Progress",
    icon: <HardHat className="h-3.5 w-3.5" />,
    color: "text-amber-500",
  },
  {
    id: "safety",
    label: "Safety",
    icon: <Shield className="h-3.5 w-3.5" />,
    color: "text-red-500",
  },
  {
    id: "material",
    label: "Material",
    icon: <Package className="h-3.5 w-3.5" />,
    color: "text-green-500",
  },
  {
    id: "defect",
    label: "Defect",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-orange-500",
  },
  {
    id: "estimate",
    label: "Estimate",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    color: "text-emerald-500",
  },
];

/** Turns any thrown value into the classified pair we render. */
function toStudioError(err: unknown): StudioError {
  const apiError = classifyError(err);
  return {
    message: apiError.message,
    suggestion: getErrorRecoverySuggestion(apiError),
  };
}

export default function VisionStudioAdmin() {
  const [image, setImage] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("general");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StudioError | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(
        toStudioError(
          new ApiError("Please upload an image file.", "validation", 400, false)
        )
      );
      return;
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError(
        toStudioError(
          new ApiError(
            "Unsupported format. Use JPEG, PNG, WebP, or GIF (HEIC photos must be converted first).",
            "validation",
            400,
            false
          )
        )
      );
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError(
        toStudioError(
          new ApiError("Image must be under 20MB.", "validation", 400, false)
        )
      );
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImage(dataUrl.split(",")[1]);
      setMediaType(file.type);
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

    try {
      const payload: Record<string, string> = {
        image,
        mode,
        mediaType,
      };
      if (customPrompt.trim()) payload.customPrompt = customPrompt.trim();

      const resp = await fetch("/.netlify/functions/vision-studio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new ApiError(
          data?.error || `HTTP ${resp.status}: Analysis failed`,
          undefined,
          resp.status,
          resp.status >= 500
        );
      }

      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        analysis: data.analysis,
        mode: data.mode,
        model: data.model,
        usage: data.usage,
        timestamp: data.timestamp,
        imagePreview: imagePreview!,
      };

      setHistory(prev => [result, ...prev]);
      setActiveResult(result);
    } catch (err: unknown) {
      setError(toStudioError(err));
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setMediaType("image/jpeg");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteResult = (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
    if (activeResult?.id === id) setActiveResult(null);
  };

  const copyResult = () => {
    if (activeResult?.analysis) {
      navigator.clipboard?.writeText(activeResult.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Vision Studio"
          guideId="vision-studio"
          description="AI-powered construction photo analysis — progress, safety, materials, defects and rough estimates from a single site photo."
          actions={
            <span
              className="px-3 py-2 border border-border/60 text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {history.length} {history.length === 1 ? "Analysis" : "Analyses"}
            </span>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Upload + Controls */}
          <div className="space-y-4">
            {/* Upload */}
            {!imagePreview ? (
              <button
                type="button"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload a site photo"
                className="w-full border-2 border-dashed border-border/60 p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[180px] flex flex-col items-center justify-center gap-2"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">Drop image or tap</span>
                <span className="text-[10px] text-muted-foreground">
                  JPEG, PNG, WebP or GIF up to 20MB
                </span>
              </button>
            ) : (
              <div className="relative overflow-hidden border border-border/60 bg-card">
                <img
                  src={imagePreview}
                  alt="Selected site photo preview"
                  className="w-full max-h-[200px] object-contain bg-black/5"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove selected photo"
                  className="absolute top-1.5 right-1.5 h-8 w-8 bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center hover:text-primary transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="vision-file"
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Site photo file"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {/* Mode Selection */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Analysis Mode
              </p>
              <div
                role="group"
                aria-label="Analysis mode"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                    aria-label={`${m.label} analysis mode`}
                    className={`flex flex-col items-center justify-center gap-1.5 min-h-20 px-2 py-3 border text-xs font-semibold transition-colors ${
                      mode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className={mode === m.id ? "text-primary" : m.color}>
                      {m.icon}
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <button
                type="button"
                onClick={() => setShowCustom(!showCustom)}
                aria-expanded={showCustom}
                aria-controls="vision-custom-prompt"
                aria-label="Toggle custom prompt"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showCustom ? "rotate-180" : ""}`}
                />
                Custom prompt (optional)
              </button>
              {showCustom && (
                <>
                  <Label
                    htmlFor="vision-custom-prompt"
                    className="sr-only"
                  >
                    Custom prompt
                  </Label>
                  <textarea
                    id="vision-custom-prompt"
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Override the default prompt..."
                    rows={3}
                    className="w-full text-xs bg-input border border-border/60 px-3 py-2 resize-none focus:outline-none focus:border-primary/60"
                  />
                </>
              )}
            </div>

            {/* Analyze */}
            <button
              type="button"
              onClick={analyze}
              disabled={!image || loading}
              aria-label="Analyze photo"
              className="w-full min-h-11 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  Analyze
                </>
              )}
            </button>

            {/* History */}
            <div>
              <h2
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                History
              </h2>
              {!history.length ? (
                <Empty className="bg-card border border-border/60 p-6 md:p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <History />
                    </EmptyMedia>
                    <EmptyTitle>No analyses yet</EmptyTitle>
                    <EmptyDescription>
                      Every analysis you run this session is kept here so you can
                      jump back between shots.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {history.map(r => (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 p-2 border transition-colors ${
                        activeResult?.id === r.id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <img
                        src={r.imagePreview}
                        alt=""
                        className="h-8 w-8 object-cover shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveResult(r)}
                        aria-label={`View ${MODES.find(m => m.id === r.mode)?.label} analysis from ${new Date(
                          r.timestamp
                        ).toLocaleTimeString()}`}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className="block text-[10px] font-medium truncate">
                          {MODES.find(m => m.id === r.mode)?.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(r.timestamp).toLocaleTimeString()}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteResult(r.id)}
                        aria-label={`Delete ${MODES.find(m => m.id === r.mode)?.label} analysis`}
                        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-500 shrink-0 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Active Result */}
          <div className="lg:col-span-2 min-h-[400px]">
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Analyzing photo…
                </p>
                <SkeletonCard count={4} />
              </div>
            ) : error ? (
              <div role="alert">
                <QueryError
                  message={`${error.message} ${error.suggestion}`}
                  onRetry={image ? () => void analyze() : undefined}
                />
              </div>
            ) : !activeResult ? (
              <Empty className="bg-card border border-border/60 h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImageIcon />
                  </EmptyMedia>
                  <EmptyTitle>No analysis yet</EmptyTitle>
                  <EmptyDescription>
                    Upload a site photo, pick an analysis mode, and Vision Studio
                    will read the shot for progress, safety, materials, defects
                    or a rough estimate.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Choose a photo"
                    className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Upload className="h-3.5 w-3.5" /> Choose A Photo
                  </button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="border border-border/60 bg-card overflow-hidden h-full flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {MODES.find(m => m.id === activeResult.mode)?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {new Date(activeResult.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyResult}
                    aria-label="Copy analysis to clipboard"
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
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {activeResult.analysis}
                  </div>
                </div>
                <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{activeResult.model}</span>
                  <span>
                    {(activeResult.usage?.totalTokens ?? 0).toLocaleString()}{" "}
                    tokens
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
