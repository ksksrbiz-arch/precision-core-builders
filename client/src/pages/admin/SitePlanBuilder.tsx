import "@excalidraw/excalidraw/index.css";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/QueryError";
import { SkeletonList } from "@/components/Skeletons";
import { trpc } from "@/lib/trpc";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useToast } from "@/components/ToastProvider";
import { useIsMobile } from "@/hooks/useMobile";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
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
  X,
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

const MOBILE_BREAKPOINT = 900;
const DESKTOP_BREAKPOINT = 1280;
const OPERATIONS_CATEGORY_GRID_CLASS = "grid-cols-[148px_1fr]";

/**
 * Shared visible-focus treatment for the hand-rolled buttons in the
 * operations panel. The canvas itself is pointer-driven, so these discrete
 * controls carry the keyboard story: every one of them is a real <button>
 * (tab-reachable, Enter/Space activated) and must show where focus landed.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
    CONSTRUCTION_STAMPS[0]?.name ?? null
  );
  const [operationsTab, setOperationsTab] = useState<"library" | "plans">(
    "library"
  );
  const [showStampPanel, setShowStampPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile && !isTablet;

  const {
    data: savedPlans,
    isError: savedPlansError,
    refetch: refetchSavedPlans,
  } = trpc.sitePlans.list.useQuery({});
  const createPlan = trpc.sitePlans.create.useMutation();
  const updatePlan = trpc.sitePlans.update.useMutation();
  const deletePlan = trpc.sitePlans.delete.useMutation();
  const utils = trpc.useUtils();

  // Live updates: only refreshes the saved-plans sidebar list, never the
  // active Excalidraw canvas (which is mutated explicitly via
  // handleLoadPlan), so it's safe without a dirty-edit guard.
  useRealtimeTable({
    table: "site_plans",
    onUpdate: () => refetchSavedPlans(),
  });

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewportMode = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width < DESKTOP_BREAKPOINT);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (isDesktop || isTablet) {
      setShowStampPanel(true);
    } else if (isMobile) {
      setShowStampPanel(false);
    }
  }, [isDesktop, isMobile, isTablet]);

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
          console.warn(
            "[SitePlanBuilder] Thumbnail generation failed:",
            thumbErr
          );
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
      addToast({
        type: "success",
        title: "Saved",
        message: "Site plan saved.",
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Could not save plan.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    excalidrawAPI,
    exportToBlob,
    planName,
    activePlanId,
    createPlan,
    updatePlan,
    utils,
    addToast,
  ]);

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
        addToast({
          type: "success",
          title: "Loaded",
          message: `Opened "${name}".`,
        });
      } catch (err) {
        console.error("[SitePlanBuilder] Load plan failed:", err);
        addToast({
          type: "error",
          title: "Load failed",
          message: "Could not load plan data.",
        });
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
        addToast({
          type: "success",
          title: "Deleted",
          message: "Plan deleted.",
        });
      } catch (err) {
        addToast({
          type: "error",
          title: "Delete failed",
          message:
            err instanceof Error ? err.message : "Could not delete plan.",
        });
      }
    },
    [deletePlan, activePlanId, utils, addToast]
  );

  const handleCreatePlan = useCallback(() => {
    setActivePlanId(null);
    setPlanName("Untitled Site Plan");
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements: [] });
    }
    if (isMobile) setShowStampPanel(false);
  }, [excalidrawAPI, isMobile]);

  const handleToggleGrid = useCallback(() => {
    if (!excalidrawAPI) return;
    const current = excalidrawAPI.getAppState();
    excalidrawAPI.updateScene({
      appState: { gridSize: current.gridSize ? null : 20 },
    });
  }, [excalidrawAPI]);

  const handleToggleOperations = useCallback(() => {
    if (isDesktop) return;
    setShowStampPanel(prev => !prev);
  }, [isDesktop]);

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

  const handleExportExcalidraw = useCallback(() => {
    if (!excalidrawAPI) return;
    const data = JSON.stringify({
      elements: excalidrawAPI.getSceneElements(),
      appState: excalidrawAPI.getAppState(),
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}.excalidraw`;
    a.click();
    URL.revokeObjectURL(url);
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

  const activeCategory =
    CONSTRUCTION_STAMPS.find(cat => cat.name === activeStampCategory) ??
    CONSTRUCTION_STAMPS[0];
  const isOperationsVisible = isDesktop || showStampPanel;
  const operationsPanelClassName = isDesktop
    ? "absolute right-3 top-3 bottom-3 z-20 w-[360px] bg-card/95 border border-border/60 rounded-xl shadow-xl flex flex-col"
    : isTablet
      ? "absolute right-3 top-3 bottom-3 z-30 w-[340px] bg-card/95 border border-border/60 rounded-xl shadow-2xl flex flex-col"
      : "absolute inset-x-0 bottom-0 z-30 max-h-[72%] bg-card border-t border-border/60 rounded-t-2xl shadow-2xl flex flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]";

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2 sm:gap-3 h-[calc(100dvh-10rem)] sm:h-[calc(100vh-2rem)]">
        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur border border-border/50 rounded-lg px-3 py-2">
            <Pencil className="h-4 w-4 text-amber-500 shrink-0" />
            <Input
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              aria-label="Site plan name"
              className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 w-full"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Button
              variant={isOperationsVisible ? "default" : "outline"}
              onClick={handleToggleOperations}
              disabled={isDesktop}
              aria-pressed={isOperationsVisible}
              className="h-10 gap-2"
            >
              <HardHat className="h-4 w-4" />
              Operations
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-10 gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCreatePlan}
              className="h-10 gap-2"
              aria-label="Create new site plan"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-2 justify-between"
                  aria-label="More site plan actions"
                >
                  More
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportPNG}>
                  <FileImage className="mr-2 h-4 w-4" />
                  Export PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG}>
                  <Layers className="mr-2 h-4 w-4" />
                  Export SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcalidraw}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excalidraw
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Canvas</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleToggleGrid}>
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Toggle grid
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div
            ref={containerRef}
            className="h-full rounded-xl overflow-hidden border border-border/50 bg-card/40"
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
                    export: false,
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

          {isOperationsVisible && !isDesktop && (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[1px]"
              aria-label="Close operations panel backdrop"
              onClick={() => setShowStampPanel(false)}
            />
          )}

          {isOperationsVisible && (
            <aside className={operationsPanelClassName}>
              <div className="px-3 pt-3 pb-2 border-b border-border/50 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HardHat className="h-3.5 w-3.5 text-amber-500" />
                  Operations
                </h3>
                {!isDesktop && (
                  <button
                    onClick={() => setShowStampPanel(false)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Close operations panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="px-3 py-2 border-b border-border/50 flex gap-2">
                <Button
                  variant={operationsTab === "library" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => setOperationsTab("library")}
                  aria-pressed={operationsTab === "library"}
                >
                  <Stamp className="h-4 w-4 mr-1.5" />
                  Library
                </Button>
                <Button
                  variant={operationsTab === "plans" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => setOperationsTab("plans")}
                  aria-pressed={operationsTab === "plans"}
                >
                  <FolderOpen className="h-4 w-4 mr-1.5" />
                  Saved
                </Button>
              </div>

              {operationsTab === "library" ? (
                isMobile ? (
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {CONSTRUCTION_STAMPS.map(cat => (
                      <div key={cat.name}>
                        <button
                          onClick={() => setActiveStampCategory(cat.name)}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                            activeCategory?.name === cat.name
                              ? "bg-primary/12 text-primary border border-primary/30"
                              : "hover:bg-muted/60 text-foreground/80 border border-transparent"
                          }`}
                          aria-pressed={activeCategory?.name === cat.name}
                        >
                          <span>{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </button>
                        {activeCategory?.name === cat.name && (
                          <div className="mt-1 space-y-1 pl-1">
                            {cat.items.map(stamp => (
                              <button
                                key={stamp.label}
                                onClick={() => {
                                  addStampToCanvas(stamp);
                                  setShowStampPanel(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-muted/80 transition-colors text-foreground/80 hover:text-foreground active:bg-muted border border-transparent hover:border-border/40"
                                aria-label={`Add ${stamp.label}`}
                              >
                                <span className="text-base">{stamp.emoji}</span>
                                <span className="truncate">{stamp.label}</span>
                                <Plus className="h-3.5 w-3.5 ml-auto" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`flex-1 min-h-0 grid ${OPERATIONS_CATEGORY_GRID_CLASS}`}
                  >
                    <div className="overflow-y-auto p-2 space-y-1 border-r border-border/40">
                      {CONSTRUCTION_STAMPS.map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => setActiveStampCategory(cat.name)}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                            activeCategory?.name === cat.name
                              ? "bg-primary/12 text-primary border border-primary/30"
                              : "hover:bg-muted/60 text-foreground/80 border border-transparent"
                          }`}
                          aria-pressed={activeCategory?.name === cat.name}
                        >
                          <span>{cat.icon}</span>
                          <span className="font-medium truncate">
                            {cat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1.5">
                      {activeCategory?.items.map(stamp => (
                        <button
                          key={stamp.label}
                          onClick={() => addStampToCanvas(stamp)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-muted/80 transition-colors text-foreground/80 hover:text-foreground active:bg-muted border border-transparent hover:border-border/40"
                          aria-label={`Add ${stamp.label}`}
                        >
                          <span className="text-base">{stamp.emoji}</span>
                          <span className="truncate">{stamp.label}</span>
                          <Plus className="h-3.5 w-3.5 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {savedPlansError ? (
                    <QueryError
                      message="We couldn't load your saved site plans. Check your connection and try again."
                      onRetry={() => refetchSavedPlans()}
                    />
                  ) : (
                    (savedPlans ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        No saved plans yet.
                      </p>
                    )
                  )}
                  {(savedPlans ?? []).map(plan => (
                    <div
                      key={plan.id}
                      className={`group flex items-center gap-1 rounded-md border transition-colors ${
                        activePlanId === plan.id
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/20 border-border/40 hover:bg-muted/50"
                      }`}
                    >
                      <button
                        className="flex-1 text-left px-3 py-2 min-w-0"
                        onClick={() => {
                          handleLoadPlan(plan.id, plan.name);
                          if (isMobile) setShowStampPanel(false);
                        }}
                      >
                        <p
                          className={`text-sm font-medium truncate ${activePlanId === plan.id ? "text-primary" : ""}`}
                        >
                          {plan.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Updated{" "}
                          {new Date(plan.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={deletePlan.isPending}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-muted/80 transition-all mr-1 flex-shrink-0 rounded disabled:opacity-50"
                            title="Delete plan"
                            aria-label={`Delete ${plan.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete “{plan.name}”?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the site plan and its
                              drawing. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePlan(plan.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  <button
                    onClick={handleCreatePlan}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors mt-1 border border-dashed border-border/60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Plan
                  </button>
                </div>
              )}
            </aside>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-card/60 backdrop-blur border border-border/30 rounded-lg text-[11px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              <span>Grid: 20px</span>
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              Hand-drawn mode
            </span>
          </div>
          <span>
            {excalidrawAPI
              ? `${excalidrawAPI.getSceneElements?.()?.length || 0} elements`
              : "—"}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
