import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ToastProvider";
import {
  ChevronDown,
  Download,
  FileImage,
  FolderOpen,
  Grid3X3,
  HardHat,
  Layers,
  Pencil,
  Plus,
  Ruler,
  Save,
  Share2,
  Stamp,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Construction element library ──────────────────────────────────────────

type StampCategory = {
  name: string;
  icon: string;
  items: StampItem[];
};

type StampItem = {
  label: string;
  emoji: string;
  elements: any[];
};

const CONSTRUCTION_STAMPS: StampCategory[] = [
  {
    name: "Structural",
    icon: "🏗️",
    items: [
      {
        label: "Exterior Wall",
        emoji: "🧱",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 200,
            height: 16,
            backgroundColor: "#495057",
            strokeColor: "#212529",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 1,
          },
        ],
      },
      {
        label: "Interior Wall",
        emoji: "🔲",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 160,
            height: 10,
            backgroundColor: "#adb5bd",
            strokeColor: "#495057",
            strokeWidth: 1,
            fillStyle: "solid",
            roughness: 1,
          },
        ],
      },
      {
        label: "Load Bearing",
        emoji: "⬛",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 200,
            height: 20,
            backgroundColor: "#343a40",
            strokeColor: "#000000",
            strokeWidth: 3,
            fillStyle: "cross-hatch",
            roughness: 0,
          },
        ],
      },
      {
        label: "Column/Post",
        emoji: "🔳",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 24,
            height: 24,
            backgroundColor: "#495057",
            strokeColor: "#212529",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
        ],
      },
    ],
  },
  {
    name: "Openings",
    icon: "🚪",
    items: [
      {
        label: 'Door (36")',
        emoji: "🚪",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 36,
            height: 6,
            backgroundColor: "#f8f9fa",
            strokeColor: "#212529",
            strokeWidth: 1,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "line",
            x: 0,
            y: 6,
            points: [
              [0, 0],
              [36, -30],
            ],
            strokeColor: "#868e96",
            strokeWidth: 1,
            roughness: 1,
          },
        ],
      },
      {
        label: 'Window (48")',
        emoji: "🪟",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 48,
            height: 6,
            backgroundColor: "#d0ebff",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
        ],
      },
      {
        label: "Sliding Door",
        emoji: "↔️",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 72,
            height: 8,
            backgroundColor: "#d0ebff",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "line",
            x: 36,
            y: 0,
            points: [
              [0, 0],
              [0, 8],
            ],
            strokeColor: "#1971c2",
            strokeWidth: 1,
            roughness: 0,
          },
        ],
      },
    ],
  },
  {
    name: "Plumbing",
    icon: "🔧",
    items: [
      {
        label: "Sink",
        emoji: "🚰",
        elements: [
          {
            type: "ellipse",
            x: 0,
            y: 0,
            width: 30,
            height: 20,
            backgroundColor: "#e9ecef",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
        ],
      },
      {
        label: "Toilet",
        emoji: "🚽",
        elements: [
          {
            type: "ellipse",
            x: 0,
            y: 10,
            width: 24,
            height: 30,
            backgroundColor: "#e9ecef",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "rectangle",
            x: 2,
            y: 0,
            width: 20,
            height: 14,
            backgroundColor: "#e9ecef",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
        ],
      },
      {
        label: "Bathtub",
        emoji: "🛁",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 60,
            height: 30,
            backgroundColor: "#d0ebff",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
            roundness: { type: 3, value: 8 },
          },
        ],
      },
      {
        label: "Shower",
        emoji: "🚿",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            backgroundColor: "#d0ebff",
            strokeColor: "#1971c2",
            strokeWidth: 2,
            fillStyle: "hachure",
            roughness: 1,
          },
        ],
      },
    ],
  },
  {
    name: "Electrical",
    icon: "⚡",
    items: [
      {
        label: "Outlet",
        emoji: "🔌",
        elements: [
          {
            type: "ellipse",
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            backgroundColor: "transparent",
            strokeColor: "#e03131",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
        ],
      },
      {
        label: "Switch",
        emoji: "💡",
        elements: [
          {
            type: "ellipse",
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            backgroundColor: "transparent",
            strokeColor: "#e03131",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "text",
            x: 4,
            y: 1,
            text: "S",
            fontSize: 12,
            fontFamily: 1,
            strokeColor: "#e03131",
          },
        ],
      },
      {
        label: "Light Fixture",
        emoji: "💡",
        elements: [
          {
            type: "ellipse",
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            backgroundColor: "#fff3bf",
            strokeColor: "#e8590c",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "line",
            x: 4,
            y: 10,
            points: [
              [0, 0],
              [12, 0],
            ],
            strokeColor: "#e8590c",
            strokeWidth: 2,
            roughness: 0,
          },
          {
            type: "line",
            x: 10,
            y: 4,
            points: [
              [0, 0],
              [0, 12],
            ],
            strokeColor: "#e8590c",
            strokeWidth: 2,
            roughness: 0,
          },
        ],
      },
      {
        label: "Panel",
        emoji: "📦",
        elements: [
          {
            type: "rectangle",
            x: 0,
            y: 0,
            width: 20,
            height: 30,
            backgroundColor: "#ffe3e3",
            strokeColor: "#e03131",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "text",
            x: 3,
            y: 8,
            text: "P",
            fontSize: 14,
            fontFamily: 1,
            strokeColor: "#e03131",
          },
        ],
      },
    ],
  },
  {
    name: "Dimensions",
    icon: "📐",
    items: [
      {
        label: "Dim Line (horiz)",
        emoji: "↔️",
        elements: [
          {
            type: "line",
            x: 0,
            y: 0,
            points: [
              [0, 0],
              [120, 0],
            ],
            strokeColor: "#495057",
            strokeWidth: 1,
            roughness: 0,
          },
          {
            type: "line",
            x: 0,
            y: -6,
            points: [
              [0, 0],
              [0, 12],
            ],
            strokeColor: "#495057",
            strokeWidth: 1,
            roughness: 0,
          },
          {
            type: "line",
            x: 120,
            y: -6,
            points: [
              [0, 0],
              [0, 12],
            ],
            strokeColor: "#495057",
            strokeWidth: 1,
            roughness: 0,
          },
          {
            type: "text",
            x: 40,
            y: -20,
            text: "10'-0\"",
            fontSize: 14,
            fontFamily: 1,
            strokeColor: "#495057",
          },
        ],
      },
      {
        label: "Note Callout",
        emoji: "📝",
        elements: [
          {
            type: "diamond",
            x: 0,
            y: 0,
            width: 24,
            height: 24,
            backgroundColor: "#fff3bf",
            strokeColor: "#e8590c",
            strokeWidth: 2,
            fillStyle: "solid",
            roughness: 0,
          },
          {
            type: "text",
            x: 6,
            y: 4,
            text: "1",
            fontSize: 14,
            fontFamily: 1,
            strokeColor: "#e8590c",
          },
        ],
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────

export default function SitePlanBuilder() {
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const [exportToBlob, setExportToBlob] = useState<any>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [planName, setPlanName] = useState("Untitled Site Plan");
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [activeStampCategory, setActiveStampCategory] = useState<string | null>(
    null
  );
  const [showStampPanel, setShowStampPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const { data: savedPlans } = trpc.sitePlans.list.useQuery({});
  const createPlan = trpc.sitePlans.create.useMutation();
  const updatePlan = trpc.sitePlans.update.useMutation();
  const deletePlan = trpc.sitePlans.delete.useMutation();
  const utils = trpc.useUtils();

  // Dynamic import Excalidraw (it doesn't support SSR).
  // Load exportToBlob alongside so it's cached before the first save.
  useEffect(() => {
    let cancelled = false;
    import("@excalidraw/excalidraw").then(mod => {
      if (!cancelled) {
        setExcalidraw(() => mod.Excalidraw);
        setExportToBlob(() => mod.exportToBlob);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;
    setSaving(true);
    try {
      const elements = JSON.stringify(excalidrawAPI.getSceneElements());
      const appState = JSON.stringify(excalidrawAPI.getAppState());

      // Generate a small thumbnail via exportToBlob (pre-loaded alongside Excalidraw)
      let thumbnailDataUrl: string | undefined;
      if (exportToBlob) {
        try {
          const blob = await exportToBlob({
            elements: excalidrawAPI.getSceneElements(),
            appState: {
              ...excalidrawAPI.getAppState(),
              exportWithDarkMode: true,
              exportScale: 0.25,
            },
            files: excalidrawAPI.getFiles(),
            maxWidthOrHeight: 400,
          });
          thumbnailDataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (thumbErr) {
          // Thumbnail is optional — log but don't fail save if it errors
          console.warn("[SitePlanBuilder] Thumbnail generation failed:", thumbErr);
        }
      }

      if (activePlanId) {
        await updatePlan.mutateAsync({
          id: activePlanId,
          name: planName,
          elements,
          appState,
          ...(thumbnailDataUrl && { thumbnailDataUrl }),
        });
      } else {
        const created = await createPlan.mutateAsync({
          name: planName,
          elements,
          appState,
          ...(thumbnailDataUrl && { thumbnailDataUrl }),
        });
        setActivePlanId(created.id);
      }

      await utils.sitePlans.list.invalidate();
      addToast({ type: "success", title: "Saved", message: "Site plan saved." });
    } catch (err) {
      addToast({
        type: "error",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Could not save plan.",
      });
    } finally {
      setSaving(false);
    }
  }, [excalidrawAPI, exportToBlob, planName, activePlanId, createPlan, updatePlan, utils, addToast]);

  const handleLoadPlan = useCallback(
    async (planId: number, name: string) => {
      if (!excalidrawAPI) return;
      try {
        // Fetch full plan data (elements + appState) from the server
        const fullPlan = await utils.sitePlans.getById.fetch({ id: planId });
        const parsedElements = JSON.parse(fullPlan.elements ?? "[]");
        const parsedAppState = JSON.parse(fullPlan.app_state ?? "{}");
        excalidrawAPI.updateScene({
          elements: parsedElements,
          appState: parsedAppState,
        });
        setPlanName(name);
        setActivePlanId(planId);
        addToast({ type: "success", title: "Loaded", message: `Opened "${name}".` });
      } catch (err) {
        console.error("[SitePlanBuilder] Load plan failed:", err);
        addToast({ type: "error", title: "Load failed", message: "Could not load plan data." });
      }
    },
    [excalidrawAPI, utils, addToast]
  );

  const handleDeletePlan = useCallback(
    async (planId: number) => {
      try {
        await deletePlan.mutateAsync({ id: planId });
        if (activePlanId === planId) {
          setActivePlanId(null);
          setPlanName("Untitled Site Plan");
        }
        await utils.sitePlans.list.invalidate();
        addToast({ type: "success", title: "Deleted", message: "Plan deleted." });
      } catch (err) {
        addToast({
          type: "error",
          title: "Delete failed",
          message: err instanceof Error ? err.message : "Could not delete plan.",
        });
      }
    },
    [deletePlan, activePlanId, utils, addToast]
  );

  const handleExportPNG = useCallback(async () => {
    if (!excalidrawAPI) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: { ...excalidrawAPI.getAppState(), exportWithDarkMode: true },
        files: excalidrawAPI.getFiles(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [excalidrawAPI, planName]);

  const handleExportSVG = useCallback(async () => {
    if (!excalidrawAPI) return;
    try {
      const { exportToSvg } = await import("@excalidraw/excalidraw");
      const svg = await exportToSvg({
        elements: excalidrawAPI.getSceneElements(),
        appState: { ...excalidrawAPI.getAppState(), exportWithDarkMode: true },
        files: excalidrawAPI.getFiles(),
      });
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SVG export failed:", err);
    }
  }, [excalidrawAPI, planName]);

  const addStampToCanvas = useCallback(
    (stamp: StampItem) => {
      if (!excalidrawAPI) return;
      const appState = excalidrawAPI.getAppState();
      const centerX = appState.scrollX * -1 + appState.width / 2;
      const centerY = appState.scrollY * -1 + appState.height / 2;

      const newElements = stamp.elements.map((el: any, i: number) => ({
        ...el,
        x: centerX + (el.x || 0),
        y: centerY + (el.y || 0),
        id: `stamp-${Date.now()}-${i}`,
        seed: Math.floor(Math.random() * 100000),
      }));

      excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), ...newElements],
      });
    },
    [excalidrawAPI]
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] gap-3">
        {/* ── Top toolbar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2 mr-auto">
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur border border-border/50 rounded-lg px-3 py-1.5">
              <Pencil className="h-4 w-4 text-amber-500" />
              <Input
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 w-[200px] md:w-[280px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Stamp Library Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showStampPanel ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowStampPanel(!showStampPanel)}
                  className="gap-1.5"
                >
                  <Stamp className="h-4 w-4" />
                  <span className="hidden md:inline">Stamps</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Construction element library</TooltipContent>
            </Tooltip>

            {/* Grid Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (excalidrawAPI) {
                      const current = excalidrawAPI.getAppState();
                      excalidrawAPI.updateScene({
                        appState: { gridSize: current.gridSize ? null : 20 },
                      });
                    }
                  }}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle grid</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border/50 mx-1" />

            {/* Save */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span className="hidden md:inline">
                {saving ? "Saving..." : "Save"}
              </span>
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="hidden md:inline">Export</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG}>
                  <FileImage className="h-4 w-4 mr-2" /> Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG}>
                  <Layers className="h-4 w-4 mr-2" /> Export as SVG
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (excalidrawAPI) {
                      const data = JSON.stringify({
                        elements: excalidrawAPI.getSceneElements(),
                        appState: excalidrawAPI.getAppState(),
                      });
                      const blob = new Blob([data], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}.excalidraw`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Export as .excalidraw
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share with client</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Stamp Library Side Panel */}
          {showStampPanel && (
            <div className="w-56 shrink-0 bg-card/80 backdrop-blur border border-border/50 rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border/50">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HardHat className="h-3.5 w-3.5 text-amber-500" />
                  Construction Library
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {CONSTRUCTION_STAMPS.map(cat => (
                  <div key={cat.name}>
                    <button
                      onClick={() =>
                        setActiveStampCategory(
                          activeStampCategory === cat.name ? null : cat.name
                        )
                      }
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        activeStampCategory === cat.name
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50 text-foreground/80"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="font-medium">{cat.name}</span>
                      <ChevronDown
                        className={`h-3 w-3 ml-auto transition-transform ${
                          activeStampCategory === cat.name ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {activeStampCategory === cat.name && (
                      <div className="ml-2 mt-1 space-y-0.5">
                        {cat.items.map(stamp => (
                          <button
                            key={stamp.label}
                            onClick={() => addStampToCanvas(stamp)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-muted/80 transition-colors text-foreground/70 hover:text-foreground"
                          >
                            <span className="text-base">{stamp.emoji}</span>
                            <span>{stamp.label}</span>
                            <Plus className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Saved Plans */}
              <div className="border-t border-border/50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Saved Plans
                </h4>
                <div className="space-y-1">
                  {(savedPlans ?? []).length === 0 && (
                    <p className="text-[10px] text-muted-foreground/60 px-2 py-1">
                      No saved plans yet.
                    </p>
                  )}
                  {(savedPlans ?? []).map(plan => (
                    <div
                      key={plan.id}
                      className={`group flex items-center gap-1 rounded-md hover:bg-muted/50 transition-colors ${
                        activePlanId === plan.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <button
                        className="flex-1 text-left px-2 py-1.5 min-w-0"
                        onClick={() => handleLoadPlan(plan.id, plan.name)}
                      >
                        <p className={`text-xs font-medium truncate ${activePlanId === plan.id ? "text-primary" : ""}`}>
                          {plan.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(plan.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all mr-1 flex-shrink-0"
                        title="Delete plan"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {/* New plan button */}
                  <button
                    onClick={() => {
                      setActivePlanId(null);
                      setPlanName("Untitled Site Plan");
                      if (excalidrawAPI) {
                        excalidrawAPI.updateScene({ elements: [] });
                      }
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors mt-1 border border-dashed border-border/50"
                  >
                    <Plus className="h-3 w-3" /> New Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Excalidraw Canvas */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/50 bg-card/40"
          >
            {Excalidraw ? (
              <Excalidraw
                excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                theme="dark"
                initialData={{
                  appState: {
                    viewBackgroundColor: "#1a1a1a",
                    gridSize: 20,
                    currentItemStrokeColor: "#e9ecef",
                    currentItemBackgroundColor: "transparent",
                    currentItemFontFamily: 1,
                    currentItemFontSize: 16,
                    currentItemRoughness: 1,
                  },
                  elements: [
                    // Starter template: a basic room outline
                    {
                      type: "rectangle",
                      x: 200,
                      y: 150,
                      width: 400,
                      height: 300,
                      strokeColor: "#868e96",
                      backgroundColor: "transparent",
                      strokeWidth: 2,
                      fillStyle: "solid",
                      roughness: 1,
                      id: "starter-room",
                      seed: 12345,
                    },
                    {
                      type: "text",
                      x: 320,
                      y: 280,
                      text: "Living Room\n20' × 15'",
                      fontSize: 16,
                      fontFamily: 1,
                      strokeColor: "#868e96",
                      textAlign: "center",
                      id: "starter-label",
                      seed: 12346,
                    },
                    {
                      type: "text",
                      x: 180,
                      y: 80,
                      text: "✏️ Precision Core Builders — Site Plan",
                      fontSize: 20,
                      fontFamily: 1,
                      strokeColor: "#dee2e6",
                      id: "starter-title",
                      seed: 12347,
                    },
                  ],
                }}
                UIOptions={{
                  canvasActions: {
                    loadScene: true,
                    export: false, // We handle export ourselves
                    saveToActiveFile: false,
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Loading Excalidraw canvas...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom status bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-card/60 backdrop-blur border border-border/30 rounded-lg text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Grid: 20px
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Hand-drawn mode
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {excalidrawAPI
                ? `${excalidrawAPI.getSceneElements?.()?.length || 0} elements`
                : "—"}
            </span>
            <span className="text-amber-500/80">Precision Core Builders</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
