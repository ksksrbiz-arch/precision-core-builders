import DashboardLayout from "@/components/DashboardLayout";
import { getAuthHeader } from "@/lib/authHeader";
import { useState, useCallback, useRef } from "react";
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
  ImageIcon,
  X,
  Copy,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
} from "lucide-react";

type AnalysisMode =
  | "progress"
  | "safety"
  | "material"
  | "defect"
  | "general"
  | "estimate";

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

export default function VisionStudioAdmin() {
  const [image, setImage] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("general");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError(
        "Unsupported format. Use JPEG, PNG, WebP, or GIF (HEIC photos must be converted first)."
      );
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20MB.");
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
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");

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
      setError(err instanceof Error ? err.message : "Analysis failed");
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
      navigator.clipboard.writeText(activeResult.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded flex items-center justify-center">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Vision Studio
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-powered construction photo analysis
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            {history.length} analyses
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Upload + Controls */}
          <div className="space-y-4">
            {/* Upload */}
            {!imagePreview ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[180px] flex flex-col items-center justify-center gap-2"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium">Drop image or tap</p>
                <p className="text-[10px] text-muted-foreground">Up to 20MB</p>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-border/40">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-[200px] object-contain bg-black/5"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-1.5 right-1.5 h-6 w-6 bg-background/80 backdrop-blur rounded-full flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
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

            {/* Mode Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 min-h-20 px-2 py-3 rounded-md border text-xs font-semibold transition-all active:scale-95 ${
                    mode === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className={mode === m.id ? "text-primary" : m.color}>
                    {m.icon}
                  </span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Custom Prompt */}
            <div>
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showCustom ? "rotate-180" : ""}`}
                />
                Custom prompt (optional)
              </button>
              {showCustom && (
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Override the default prompt..."
                  rows={3}
                  className="w-full text-xs bg-background border border-border/40 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary/40"
                />
              )}
            </div>

            {/* Analyze */}
            <button
              onClick={analyze}
              disabled={!image || loading}
              className="w-full h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  Analyze
                </>
              )}
            </button>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
                {error}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  History
                </h3>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {history.map(r => (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all ${
                        activeResult?.id === r.id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/20 hover:border-border/40"
                      }`}
                      onClick={() => setActiveResult(r)}
                    >
                      <img
                        src={r.imagePreview}
                        alt=""
                        className="h-8 w-8 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">
                          {MODES.find(m => m.id === r.mode)?.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(r.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteResult(r.id);
                        }}
                        className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-red-500 shrink-0 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Active Result (2/3 width) */}
          <div className="lg:col-span-2 min-h-[400px]">
            {!activeResult && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-border/20 rounded-lg bg-muted/20">
                <ImageIcon className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload a site photo and run an analysis.
                </p>
              </div>
            )}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-border/20 rounded-lg">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium">
                  Analyzing with Claude Vision...
                </p>
              </div>
            )}
            {activeResult && !loading && (
              <div className="border border-border/40 rounded-lg overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {MODES.find(m => m.id === activeResult.mode)?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(activeResult.timestamp).toLocaleString()}
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
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {activeResult.analysis}
                  </div>
                </div>
                <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
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
