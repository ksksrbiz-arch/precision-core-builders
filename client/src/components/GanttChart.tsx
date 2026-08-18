/**
 * GanttChart Component — Task scheduling visualization with drag-and-drop
 *
 * Features:
 * - Horizontal task bars with date ranges (stacked bar chart: spacer + duration)
 * - Drag-and-drop task rescheduling via onTaskUpdate callback
 * - Weather-sensitive task highlighting
 * - Real-time updates via Supabase
 * - Mobile responsive
 */

import { useEffect, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CloudRain } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/useMobile";
import {
  STATUS_COLORS,
  dateToISO,
  dragDaysFromPixels,
  getBarColor as barColorFor,
  getDateNum,
  shiftTaskDates,
  toBarOffsets,
} from "@/lib/ganttMath";

// ScheduleItem matches the Supabase schedule_items column names returned by
// the scheduleRouter.list query.
export interface ScheduleItem {
  id: number;
  project_id: number;
  title: string;
  status: "pending" | "in_progress" | "complete" | "blocked" | "deferred";
  weather_sensitive: boolean;
  planned_start?: string | null;
  planned_end?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

/** Partial updates accepted by the task edit modal / save callback. */
export type ScheduleTaskPatch = {
  title?: string;
  status?: ScheduleItem["status"];
  plannedStart?: string;
  plannedEnd?: string;
  assignedTo?: string | null;
  notes?: string | null;
  weatherSensitive?: boolean;
};

export interface GanttChartProps {
  projectId: number;
  items?: ScheduleItem[];
  /** Called when a task bar is drag-rescheduled (dates only). */
  onTaskUpdate?: (taskId: number, startDate: Date, endDate: Date) => void;
  /** Called when the edit modal saves field changes. */
  onTaskSave?: (taskId: number, updates: ScheduleTaskPatch) => void;
  readOnly?: boolean;
}

interface GanttBarData {
  id: number;
  name: string;
  /** Days offset from the earliest task start (spacer). */
  start: number;
  /** Duration in days (the colored portion). */
  duration: number;
  status: string;
  weatherSensitive: boolean;
  startDate: string;
  endDate: string;
}

function getBarColor(bar: GanttBarData): string {
  return barColorFor(bar.status, bar.weatherSensitive);
}

export function GanttChart({
  projectId,
  items = [],
  onTaskUpdate,
  onTaskSave,
  readOnly = false,
}: GanttChartProps) {
  const [tasks, setTasks] = useState<ScheduleItem[]>(items);
  const [chartData, setChartData] = useState<GanttBarData[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  const [editingTask, setEditingTask] = useState<ScheduleItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    status: ScheduleItem["status"];
    plannedStart: string;
    plannedEnd: string;
    assignedTo: string;
    notes: string;
    weatherSensitive: boolean;
  }>({
    title: "",
    status: "pending",
    plannedStart: "",
    plannedEnd: "",
    assignedTo: "",
    notes: "",
    weatherSensitive: false,
  });
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();
  const dragRef = useRef<HTMLDivElement>(null);
  /** Tracks whether the pointer moved enough to count as a drag (vs click). */
  const movedRef = useRef(false);

  // Fetch schedule items from database (overrides prop items when available)
  const { data: dbItems, isLoading } = trpc.schedule.list.useQuery({
    projectId,
  });

  // Prefer live query results; fall back to prop items (tests / parent-driven)
  useEffect(() => {
    if (dbItems) {
      // Map Supabase row fields to the ScheduleItem interface.
      const mapped: ScheduleItem[] = (dbItems as any[]).map(row => ({
        id: row.id,
        project_id: row.project_id,
        title: row.title ?? "",
        status: row.status ?? "pending",
        weather_sensitive: !!row.weather_sensitive,
        planned_start: row.planned_start ?? null,
        planned_end: row.planned_end ?? null,
        assigned_to: row.assigned_to ?? null,
        notes: row.notes ?? null,
      }));
      setTasks(mapped);
    } else if (items.length > 0) {
      setTasks(items);
    }
  }, [dbItems, items]);

  // Rebuild chart data whenever tasks change
  useEffect(() => {
    const withDates = tasks.filter(t => t.planned_start && t.planned_end);
    if (withDates.length === 0) {
      setChartData([]);
      return;
    }

    const timestamps = withDates.flatMap(t => [
      getDateNum(t.planned_start!),
      getDateNum(t.planned_end!),
    ]);
    const min = Math.min(...timestamps);

    const data: GanttBarData[] = withDates.map(task => {
      const { start, duration } = toBarOffsets(
        task.planned_start!,
        task.planned_end!,
        min
      );

      return {
        id: task.id,
        name: task.title,
        start,
        duration,
        status: task.status,
        weatherSensitive: task.weather_sensitive,
        startDate: task.planned_start!,
        endDate: task.planned_end!,
      };
    });

    setChartData(data);
  }, [tasks]);

  const openTaskEditor = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setEditingTask(task);
    setEditForm({
      title: task.title,
      status: task.status,
      plannedStart: task.planned_start ? task.planned_start.slice(0, 10) : "",
      plannedEnd: task.planned_end ? task.planned_end.slice(0, 10) : "",
      assignedTo: task.assigned_to ?? "",
      notes: task.notes ?? "",
      weatherSensitive: !!task.weather_sensitive,
    });
  };

  // Drag-and-drop reschedule, or click-to-edit when pointer barely moved
  const handleBarMouseDown = (e: React.MouseEvent, taskId: number) => {
    setDraggingTaskId(taskId);
    setDragStartPos(e.clientX);
    movedRef.current = false;
  };

  useEffect(() => {
    if (draggingTaskId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragStartPos) > 4) {
        movedRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingTaskId === null) return;

      const task = tasks.find(t => t.id === draggingTaskId);
      const moved = e.clientX - dragStartPos;
      const wasClick = !movedRef.current && Math.abs(moved) <= 4;

      if (wasClick) {
        openTaskEditor(draggingTaskId);
      } else if (!readOnly && task?.planned_start && task?.planned_end) {
        const dragDays = dragDaysFromPixels(moved);
        const shifted = shiftTaskDates(
          task.planned_start,
          task.planned_end,
          dragDays
        );
        if (shifted) {
          if (onTaskUpdate) {
            onTaskUpdate(task.id, shifted.start, shifted.end);
          }

          // Optimistic update
          setTasks(prev =>
            prev.map(t =>
              t.id === draggingTaskId
                ? {
                    ...t,
                    planned_start: shifted.startISO,
                    planned_end: shifted.endISO,
                  }
                : t
            )
          );
        }
      }

      setDraggingTaskId(null);
      movedRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingTaskId, dragStartPos, tasks, onTaskUpdate, readOnly]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const bar = payload[0].payload as GanttBarData;
    return (
      <div className="bg-popover border border-border p-2 text-xs rounded shadow-lg">
        <p className="font-semibold text-foreground">{bar.name}</p>
        <p className="text-muted-foreground">
          {new Date(bar.startDate).toLocaleDateString()}
        </p>
        <p className="text-muted-foreground">
          {new Date(bar.endDate).toLocaleDateString()}
        </p>
        <p className="text-muted-foreground capitalize">
          {bar.status.replace("_", " ")}
        </p>
        {bar.weatherSensitive && (
          <p className="text-yellow-500 text-[10px] flex items-center gap-1 mt-1">
            <CloudRain className="h-3 w-3" />
            Weather-sensitive
          </p>
        )}
      </div>
    );
  };

  const closeEditor = () => {
    setEditingTask(null);
    setSaving(false);
  };

  const handleSave = () => {
    if (!editingTask || readOnly) return;
    if (!editForm.title.trim()) return;

    const updates: ScheduleTaskPatch = {
      title: editForm.title.trim(),
      status: editForm.status,
      plannedStart: editForm.plannedStart
        ? new Date(editForm.plannedStart).toISOString()
        : undefined,
      plannedEnd: editForm.plannedEnd
        ? new Date(editForm.plannedEnd).toISOString()
        : undefined,
      assignedTo: editForm.assignedTo.trim() || null,
      notes: editForm.notes.trim() || null,
      weatherSensitive: editForm.weatherSensitive,
    };

    setSaving(true);

    // Optimistic local update so the chart/list reflect immediately
    setTasks(prev =>
      prev.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              title: updates.title ?? t.title,
              status: updates.status ?? t.status,
              planned_start: updates.plannedStart ?? t.planned_start,
              planned_end: updates.plannedEnd ?? t.planned_end,
              assigned_to: updates.assignedTo ?? t.assigned_to,
              notes: updates.notes ?? t.notes,
              weather_sensitive:
                updates.weatherSensitive ?? t.weather_sensitive,
            }
          : t
      )
    );

    if (onTaskSave) {
      onTaskSave(editingTask.id, updates);
    }
    closeEditor();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading schedule…</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No dated tasks</p>
            <p className="text-xs text-muted-foreground/70">
              Set planned start and end dates on tasks to see the Gantt chart.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(300, chartData.length * 44);

  return (
    <Card ref={dragRef}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Project Schedule</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
              <span>Weather-sensitive</span>
            </div>
            {!isMobile && (
              <span className="text-[10px]">
                {readOnly
                  ? "Click a bar to view details"
                  : "Click to edit · Drag to reschedule"}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isMobile ? (
          <ol className="space-y-3">
            {chartData.map(bar => (
              <li
                key={bar.id}
                role="button"
                tabIndex={0}
                onClick={() => openTaskEditor(bar.id)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openTaskEditor(bar.id);
                  }
                }}
                className="border border-border/60 rounded p-3 flex gap-3 cursor-pointer hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
              >
                <span
                  className="mt-1 inline-block h-3 w-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: getBarColor(bar) }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground break-words">
                    {bar.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(bar.startDate).toLocaleDateString()} –{" "}
                    {new Date(bar.endDate).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground capitalize">
                      {bar.status.replace("_", " ")}
                    </span>
                    {bar.weatherSensitive && (
                      <span className="text-[11px] text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                        <CloudRain className="h-3 w-3" /> Weather
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 180, bottom: 10 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `Day ${Math.round(Math.max(0, v))}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />

                {/* Transparent spacer pushes each bar to its start offset */}
                <Bar dataKey="start" stackId="gantt" fill="transparent" />

                {/* Colored duration bar */}
                <Bar
                  dataKey="duration"
                  stackId="gantt"
                  radius={[2, 2, 2, 2]}
                  style={{
                    cursor: readOnly
                      ? "pointer"
                      : draggingTaskId
                        ? "grabbing"
                        : "grab",
                  }}
                  onMouseDown={(data: any, _idx: number, e: React.MouseEvent) =>
                    handleBarMouseDown(e, data.id)
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry)}
                      opacity={draggingTaskId === entry.id ? 0.6 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-border pt-4">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Status</p>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground capitalize">
                  {status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Notes</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Yellow bars: Weather-sensitive tasks</li>
              <li>• Click a bar to {readOnly ? "view" : "edit"} details</li>
              {!readOnly && <li>• Drag bars horizontally to reschedule</li>}
              <li>• Only tasks with dates are shown</li>
            </ul>
          </div>
        </div>
      </CardContent>

      {/* Task edit / view dialog (BOT-2) */}
      <Dialog
        open={!!editingTask}
        onOpenChange={open => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{readOnly ? "Task details" : "Edit task"}</DialogTitle>
            <DialogDescription>
              {readOnly
                ? "View-only schedule item details."
                : "Update title, status, dates, assignee, or notes."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="gantt-task-title"
                className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Title
              </label>
              <input
                id="gantt-task-title"
                value={editForm.title}
                onChange={e =>
                  setEditForm(f => ({ ...f, title: e.target.value }))
                }
                disabled={readOnly}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 disabled:opacity-60"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="gantt-task-status"
                className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Status
              </label>
              <select
                id="gantt-task-status"
                value={editForm.status}
                onChange={e =>
                  setEditForm(f => ({
                    ...f,
                    status: e.target.value as ScheduleItem["status"],
                  }))
                }
                disabled={readOnly}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-60"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="complete">Complete</option>
                <option value="blocked">Blocked</option>
                <option value="deferred">Deferred</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label
                  htmlFor="gantt-task-start"
                  className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Start
                </label>
                <input
                  id="gantt-task-start"
                  type="date"
                  value={editForm.plannedStart}
                  onChange={e =>
                    setEditForm(f => ({ ...f, plannedStart: e.target.value }))
                  }
                  disabled={readOnly}
                  className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-60"
                />
              </div>
              <div className="grid gap-1.5">
                <label
                  htmlFor="gantt-task-end"
                  className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  End
                </label>
                <input
                  id="gantt-task-end"
                  type="date"
                  value={editForm.plannedEnd}
                  onChange={e =>
                    setEditForm(f => ({ ...f, plannedEnd: e.target.value }))
                  }
                  disabled={readOnly}
                  className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="gantt-task-assignee"
                className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Assignee
              </label>
              <input
                id="gantt-task-assignee"
                value={editForm.assignedTo}
                onChange={e =>
                  setEditForm(f => ({ ...f, assignedTo: e.target.value }))
                }
                disabled={readOnly}
                placeholder="Name or role"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 disabled:opacity-60"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="gantt-task-notes"
                className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Notes
              </label>
              <textarea
                id="gantt-task-notes"
                value={editForm.notes}
                onChange={e =>
                  setEditForm(f => ({ ...f, notes: e.target.value }))
                }
                disabled={readOnly}
                rows={3}
                placeholder="Optional notes…"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-y disabled:opacity-60"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editForm.weatherSensitive}
                onChange={e =>
                  setEditForm(f => ({
                    ...f,
                    weatherSensitive: e.target.checked,
                  }))
                }
                disabled={readOnly}
                className="h-4 w-4 accent-primary"
              />
              <span>Weather-sensitive</span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={closeEditor}
              className="px-4 py-2 border border-border text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editForm.title.trim()}
                className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
