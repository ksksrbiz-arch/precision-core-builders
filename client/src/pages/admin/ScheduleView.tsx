/**
 * ScheduleView — Weather-responsive project schedule with 7-day forecast overlay.
 * Calls /api/weather-schedule for Eugene OR forecast and task recommendations.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { GanttChart } from "@/components/GanttChart";
import { SkeletonCard } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useToast } from "@/components/ToastProvider";
import { TASK_TYPES, type TaskType } from "@/config/schedule";
import { useIsMobile } from "@/hooks/useMobile";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { fmtDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  CloudRain,
  Plus,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type WeatherDay = {
  date: string;
  description: string;
  tempHigh: number;
  tempLow: number;
  rainProbability: number;
  rainMm: number;
  willRain: boolean;
};

type WeatherData = {
  forecast: WeatherDay[];
  adjustments: Array<{
    taskId: number;
    taskTitle: string;
    taskType: string;
    plannedDate: string;
    recommendation: string;
    action: "defer" | "proceed";
  }>;
  alerts: string[];
};

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof Circle; label: string }
> = {
  pending: { color: "text-muted-foreground", icon: Circle, label: "Pending" },
  in_progress: { color: "text-primary", icon: Clock, label: "In Progress" },
  complete: { color: "text-green-400", icon: CheckCircle2, label: "Complete" },
  blocked: { color: "text-red-400", icon: AlertTriangle, label: "Blocked" },
  deferred: {
    color: "text-orange-400",
    icon: AlertTriangle,
    label: "Deferred",
  },
};

const TASK_COLORS: Record<string, string> = {
  roofing: "bg-red-400/15 text-red-300 border-red-400/30",
  outdoor: "bg-orange-400/15 text-orange-300 border-orange-400/30",
  painting: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  framing: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  electrical: "bg-purple-400/15 text-purple-300 border-purple-400/30",
  plumbing: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  cabinetry: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  flooring: "bg-green-400/15 text-green-300 border-green-400/30",
  drywall: "bg-gray-400/15 text-gray-300 border-gray-400/30",
  indoor: "bg-primary/10 text-primary border-primary/20",
  other: "bg-border/30 text-muted-foreground border-border/40",
};

function WeatherBar({ weather }: { weather: WeatherData }) {
  const days = weather.forecast.slice(0, 7);
  return (
    <div className="bg-card border border-border/60 p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          7-Day Eugene OR Forecast
        </p>
        {weather.alerts.length > 0 && (
          <span
            className="flex items-center gap-1.5 text-[10px] text-orange-400 border border-orange-400/30 bg-orange-400/10 px-2 py-1"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <CloudRain className="h-3 w-3" />
            {weather.alerts.length} Rain Alert
            {weather.alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="overflow-x-auto -mx-1">
        <div className="grid grid-cols-7 gap-2 min-w-[420px] px-1">
          {days.map(day => {
            const noonLocal = day.date + "T12:00:00";
            const label = fmtDate(noonLocal, { weekday: "short" });
            const md = fmtDate(noonLocal, {
              month: "numeric",
              day: "numeric",
            });
            return (
              <div
                key={day.date}
                className={`flex flex-col items-center p-2 border text-center ${
                  day.willRain
                    ? "border-orange-400/40 bg-orange-400/5"
                    : "border-border/40 bg-background/40"
                }`}
              >
                <p
                  className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {label}
                </p>
                <p className="text-[9px] text-muted-foreground/60 mb-2">{md}</p>
                {day.willRain ? (
                  <CloudRain className="h-5 w-5 text-orange-400 mb-1" />
                ) : (
                  <Sun className="h-5 w-5 text-primary/70 mb-1" />
                )}
                <p className="text-xs font-semibold text-foreground">
                  {Math.round(day.tempHigh)}°
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {Math.round(day.tempLow)}°
                </p>
                {day.rainProbability > 0 && (
                  <p className="text-[9px] text-orange-400 mt-1 font-semibold">
                    {Math.round(day.rainProbability)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ScheduleView() {
  const [, setLocation] = useLocation();
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    taskType: TaskType;
    plannedStartDate: string;
    plannedEndDate: string;
    notes: string;
  }>({
    title: "",
    taskType: "other",
    plannedStartDate: "",
    plannedEndDate: "",
    notes: "",
  });

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const {
    data: scheduleItems,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch,
  } = trpc.schedule.list.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );
  const lastStatusRef = useRef("");
  const updateStatus = useMutationWithToast(
    trpc.schedule.updateStatus.useMutation(),
    {
      success: "Task Updated",
      successMessage: "Task status updated.",
      error: "Update Failed",
      errorMessage: "Failed to update task status. Please try again.",
      onSuccess: () => {
        refetch();
        // Fire milestone_complete n8n event when task is marked complete
        if (lastStatusRef.current === "complete") {
          fetch("/api/n8n-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "milestone_complete",
              payload: { status: "complete" },
            }),
          }).catch(() => {});
          lastStatusRef.current = "";
        }
      },
    }
  );
  const updateTask = useMutationWithToast(trpc.schedule.update.useMutation(), {
    success: "Task Rescheduled",
    successMessage: "Task dates updated.",
    error: "Reschedule Failed",
    errorMessage: "Failed to update task dates. Please try again.",
    onSuccess: () => refetch(),
  });

  const createTask = useMutationWithToast(trpc.schedule.create.useMutation(), {
    success: "Task Created",
    successMessage: "Schedule task added.",
    error: "Create Failed",
    // Note: the list is refreshed via refetch() in onSuccess below. (A previous
    // `invalidate` here called trpc.useUtils() inside a callback — a Rules-of-
    // Hooks violation — and was redundant with the refetch.)
    onSuccess: (_data: any) => {
      setShowAddTask(false);
      setNewTask({
        title: "",
        taskType: "other",
        plannedStartDate: "",
        plannedEndDate: "",
        notes: "",
      });
      refetch();
    },
  });

  // Live updates: when another session changes a task in this project, repaint.
  useRealtimeTable({
    table: "schedule_items",
    onUpdate: payload => {
      if (!selectedProject) return;
      const row = (payload.new ?? payload.old) as {
        project_id?: number;
      } | null;
      if (row?.project_id !== selectedProject) return;
      refetch();
    },
  });

  const fetchWeather = async (projectId?: number) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const url = projectId
        ? `/api/weather-schedule?projectId=${projectId}`
        : "/api/weather-schedule";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      setWeatherError(String(err));
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedProject ?? undefined);
  }, [selectedProject]);

  // Auto-select first project
  useEffect(() => {
    if (projects?.data.length && !selectedProject) {
      setSelectedProject(projects.data[0].id);
    }
  }, [projects]);

  const deferredTaskIds = new Set(
    weather?.adjustments.filter(a => a.action === "defer").map(a => a.taskId) ??
      []
  );

  const filtered = (scheduleItems ?? []).filter(item =>
    filterStatus === "all" ? true : item.status === filterStatus
  );

  const cycleStatus = (current: string) => {
    const order = ["pending", "in_progress", "complete", "deferred"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    return next as any;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AdminPageHeader
          title="Weather Schedule"
          guideId="schedule"
          description="Smart scheduling with Eugene OR weather integration"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selectedProject && (
                <button
                  onClick={() => setShowAddTask(v => !v)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 min-h-11 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </button>
              )}
              <button
                onClick={() => fetchWeather(selectedProject ?? undefined)}
                disabled={weatherLoading}
                className="flex items-center gap-2 border border-border/60 text-muted-foreground px-3 py-2 min-h-11 text-[11px] font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${weatherLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          }
        />

        {/* Project selector */}
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            {projects?.data.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                  selectedProject === p.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Task Form */}
        {showAddTask && selectedProject && (
          <div className="bg-card border border-primary/30 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Add Schedule Task</p>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close add task form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <input
                value={newTask.title}
                onChange={e =>
                  setNewTask(t => ({ ...t, title: e.target.value }))
                }
                placeholder="Task title *"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 sm:col-span-2 lg:col-span-2"
              />
              <select
                value={newTask.taskType}
                onChange={e =>
                  setNewTask(t => ({
                    ...t,
                    taskType: e.target.value as TaskType,
                  }))
                }
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                {TASK_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newTask.plannedStartDate}
                onChange={e =>
                  setNewTask(t => ({ ...t, plannedStartDate: e.target.value }))
                }
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              />
              <input
                type="date"
                value={newTask.plannedEndDate}
                onChange={e =>
                  setNewTask(t => ({ ...t, plannedEndDate: e.target.value }))
                }
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              />
              <textarea
                value={newTask.notes}
                onChange={e =>
                  setNewTask(t => ({ ...t, notes: e.target.value }))
                }
                placeholder="Notes…"
                rows={1}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            <button
              onClick={() => {
                if (!newTask.title || !selectedProject) return;
                const isInspection = newTask.taskType === "inspection";
                createTask.mutate({
                  projectId: selectedProject,
                  title: newTask.title,
                  taskType: newTask.taskType,
                  plannedStart: newTask.plannedStartDate
                    ? new Date(newTask.plannedStartDate).toISOString()
                    : undefined,
                  plannedEnd: newTask.plannedEndDate
                    ? new Date(newTask.plannedEndDate).toISOString()
                    : undefined,
                  notes: newTask.notes || undefined,
                });
                // Fire inspection_scheduled n8n event
                if (isInspection) {
                  fetch("/api/n8n-webhook", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event: "inspection_scheduled",
                      payload: {
                        projectId: selectedProject,
                        title: newTask.title,
                        scheduledDate: newTask.plannedStartDate,
                      },
                    }),
                  }).catch(() => {});
                }
              }}
              disabled={!newTask.title || createTask.isPending}
              className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {createTask.isPending ? "Saving…" : "Add Task"}
            </button>
          </div>
        )}

        {/* Weather bar */}
        {weatherLoading && (
          <div className="bg-card border border-border/60 p-8 mb-5 flex items-center justify-center gap-3">
            <Spinner className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Fetching Eugene OR forecast…
            </span>
          </div>
        )}
        {weatherError && !weatherLoading && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn’t load the forecast</AlertTitle>
            <AlertDescription>
              <p>{weatherError}</p>
              <button
                onClick={() => fetchWeather(selectedProject ?? undefined)}
                className="mt-2 border border-border/60 px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        )}
        {weather && !weatherLoading && <WeatherBar weather={weather} />}

        {/* Rain alerts */}
        {weather &&
          weather.adjustments.filter(a => a.action === "defer").length > 0 && (
            <div className="bg-orange-400/5 border border-orange-400/30 p-4 mb-5">
              <p
                className="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                ⚠️ Weather Adjustments Recommended
              </p>
              <div className="space-y-2">
                {weather.adjustments
                  .filter(a => a.action === "defer")
                  .map(a => (
                    <div key={a.taskId} className="flex items-start gap-3">
                      <CloudRain className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.taskTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.recommendation}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateStatus.mutate({
                            id: a.taskId,
                            status: "deferred",
                          })
                        }
                        className="ml-auto text-[9px] px-2 py-1 border border-orange-400/40 text-orange-400 hover:bg-orange-400/10 transition-colors flex-shrink-0"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Defer
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Gantt Chart Visualization */}
        {selectedProject && (
          <div className="mb-6">
            <GanttChart
              projectId={selectedProject}
              items={scheduleItems ?? []}
              readOnly={false}
              onTaskUpdate={(taskId, startDate, endDate) => {
                updateTask.mutate({
                  id: taskId,
                  plannedStart: startDate.toISOString(),
                  plannedEnd: endDate.toISOString(),
                });
              }}
            />
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-0 border-b border-border/40 mb-5 overflow-x-auto">
          {[
            "all",
            "pending",
            "in_progress",
            "complete",
            "deferred",
            "blocked",
          ].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase whitespace-nowrap transition-colors ${
                filterStatus === s
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {s === "all" ? "All Tasks" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Schedule items */}
        {scheduleLoading && <SkeletonCard count={4} />}

        {!scheduleLoading && scheduleError && selectedProject && (
          <QueryError
            message="Something went wrong while loading this project’s schedule items."
            onRetry={() => refetch()}
          />
        )}

        {!scheduleLoading && !scheduleError && !selectedProject && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>No project selected</EmptyTitle>
              <EmptyDescription>
                Select a project above to view its weather-aware schedule.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!scheduleLoading &&
          !scheduleError &&
          selectedProject &&
          filtered.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Calendar />
                </EmptyMedia>
                <EmptyTitle>No schedule items found</EmptyTitle>
                <EmptyDescription>
                  {filterStatus === "all"
                    ? "This project doesn’t have any schedule tasks yet."
                    : "No tasks match the selected status filter."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <button
                  onClick={() =>
                    setLocation(`/admin/projects/${selectedProject}`)
                  }
                  className="text-[11px] text-primary border border-primary/40 px-4 py-2 tracking-wider uppercase hover:bg-primary/10 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  + Add in Project Detail
                </button>
              </EmptyContent>
            </Empty>
          )}

        <div className="space-y-2">
          {filtered.map(item => {
            const isDeferred = deferredTaskIds.has(item.id);
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const tagCls =
              TASK_COLORS[item.task_type ?? "other"] ?? TASK_COLORS.other;

            return (
              <div
                key={item.id}
                className={`bg-card border p-4 transition-colors ${
                  isDeferred
                    ? "border-orange-400/40 bg-orange-400/5"
                    : item.status === "complete"
                      ? "border-green-400/20 opacity-70"
                      : "border-border/60 hover:border-border/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status toggle — large touch target on mobile */}
                  <button
                    onClick={() => {
                      const nextStatus = cycleStatus(item.status);
                      lastStatusRef.current = nextStatus;
                      updateStatus.mutate({
                        id: item.id,
                        status: nextStatus,
                      });
                    }}
                    className={`shrink-0 transition-all active:scale-95 ${cfg.color} ${
                      isMobile
                        ? "h-11 w-11 flex items-center justify-center rounded-full border border-current/20 bg-current/5"
                        : "hover:scale-110"
                    }`}
                    title={
                      isMobile
                        ? undefined
                        : `Status: ${cfg.label} — click to advance`
                    }
                    aria-label={`Advance status from ${cfg.label}`}
                  >
                    <StatusIcon
                      className={isMobile ? "h-5 w-5" : "h-4.5 w-4.5"}
                    />
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p
                        className={`text-sm font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : "text-foreground"}`}
                      >
                        {item.title}
                      </p>
                      {isDeferred && (
                        <span
                          className="text-[8px] px-1.5 py-0.5 bg-orange-400/15 border border-orange-400/30 text-orange-400 font-bold tracking-widest uppercase"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          ⚠ Rain
                        </span>
                      )}
                      {item.is_outdoor && (
                        <span
                          className="text-[8px] px-1.5 py-0.5 bg-sky-400/10 border border-sky-400/20 text-sky-400 font-bold tracking-widest uppercase"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Outdoor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {item.planned_start && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {fmtDate(item.planned_start, {
                            month: "short",
                            day: "numeric",
                          })}
                          {item.planned_end &&
                            ` – ${fmtDate(item.planned_end, { month: "short", day: "numeric" })}`}
                        </span>
                      )}
                      {item.duration_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {item.duration_days}d
                        </span>
                      )}
                      {item.assigned_to && <span>{item.assigned_to}</span>}
                    </div>
                  </div>

                  {/* Badges — stacked on mobile */}
                  <div
                    className={`flex shrink-0 gap-1.5 ${isMobile ? "flex-col items-end" : "items-center"}`}
                  >
                    <span
                      className={`text-[9px] px-2 py-1 border font-semibold tracking-widest uppercase ${tagCls}`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {item.task_type?.replace("_", " ") ?? "other"}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-1 border font-semibold tracking-widest uppercase ${cfg.color} border-current/30`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
                {isMobile && (
                  <p className="text-[9px] text-muted-foreground/50 mt-2 text-center tracking-wide">
                    Tap status icon to advance
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats footer */}
        {scheduleItems && scheduleItems.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              {
                label: "Total",
                value: scheduleItems.length,
                color: "text-foreground",
              },
              {
                label: "Complete",
                value: scheduleItems.filter(i => i.status === "complete")
                  .length,
                color: "text-green-400",
              },
              {
                label: "In Progress",
                value: scheduleItems.filter(i => i.status === "in_progress")
                  .length,
                color: "text-primary",
              },
              {
                label: "Deferred",
                value: scheduleItems.filter(i => i.status === "deferred")
                  .length,
                color: "text-orange-400",
              },
            ].map(s => (
              <div
                key={s.label}
                className="bg-card border border-border/60 p-3 text-center"
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p
                  className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
