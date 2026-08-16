/**
 * GanttChart Component — Task scheduling visualization with drag-and-drop
 *
 * Features:
 * - Horizontal task bars with date ranges (stacked bar chart: spacer + duration)
 * - Drag-and-drop task rescheduling via onTaskUpdate callback
 * - Click a task bar/row to open an edit dialog (onTaskEdit) — view-only in readOnly mode
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
import { useIsMobile } from "@/hooks/useMobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export interface GanttChartProps {
  projectId: number;
  items?: ScheduleItem[];
  onTaskUpdate?: (taskId: number, startDate: Date, endDate: Date) => void;
  /** Called with the full edited task when the user saves the edit dialog. */
  onTaskEdit?: (task: ScheduleItem) => void;
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

const STATUS_COLORS: Record<string, string> = {
  complete: "#10b981",
  in_progress: "#3b82f6",
  pending: "#8b7355",
  blocked: "#ef4444",
  deferred: "#f59e0b",
};

const STATUS_OPTIONS: ScheduleItem["status"][] = [
  "pending",
  "in_progress",
  "complete",
  "blocked",
  "deferred",
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Approximate pixels per day used for drag-to-reschedule sensitivity. */
const PIXELS_PER_DAY = 5;
/** Drag distance below which a press is treated as a click, not a drag. */
const CLICK_THRESHOLD_PX = 4;

function getDateNum(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Convert a date input (YYYY-MM-DD) to a full ISO datetime string, which the
 * schedule.update router requires (z.string().datetime()). Midday is used to
 * avoid off-by-one issues from UTC midnight shifting the local calendar day.
 */
function dateInputToISO(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Convert an ISO datetime (or YYYY-MM-DD) stored on a ScheduleItem back to the
 * YYYY-MM-DD value a <input type="date"> expects.
 */
function isoToDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function getBarColor(bar: GanttBarData): string {
  if (bar.weatherSensitive) return "#eab308";
  return STATUS_COLORS[bar.status] ?? "#8b7355";
}

export function GanttChart({
  projectId,
  items = [],
  onTaskUpdate,
  onTaskEdit,
  readOnly = false,
}: GanttChartProps) {
  const [tasks, setTasks] = useState<ScheduleItem[]>(items);
  const [chartData, setChartData] = useState<GanttBarData[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  // Track the press start so we can distinguish a click (no movement) from a
  // drag when the mouse is released. A click opens the edit dialog.
  const pressMovedRef = useRef(false);
  const [editingTask, setEditingTask] = useState<ScheduleItem | null>(null);
  const isMobile = useIsMobile();
  const dragRef = useRef<HTMLDivElement>(null);

  // Fetch schedule items from database (overrides prop items when available)
  const { data: dbItems, isLoading } = trpc.schedule.list.useQuery({
    projectId,
  });

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
    }
  }, [dbItems]);

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
      const taskStart = getDateNum(task.planned_start!);
      const taskEnd = getDateNum(task.planned_end!);
      const start = (taskStart - min) / MS_PER_DAY;
      const duration = Math.max(1, (taskEnd - taskStart) / MS_PER_DAY);

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

  const openEditDialog = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) setEditingTask(task);
  };

  // Drag-and-drop reschedule
  const handleBarMouseDown = (e: React.MouseEvent, taskId: number) => {
    if (readOnly) return;
    pressMovedRef.current = false;
    setDraggingTaskId(taskId);
    setDragStartPos(e.clientX);
  };

  useEffect(() => {
    if (draggingTaskId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragStartPos) > CLICK_THRESHOLD_PX) {
        pressMovedRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const moved = pressMovedRef.current;
      const wasDragging = draggingTaskId;
      // If the press never moved beyond the threshold, treat it as a click →
      // open the edit dialog instead of rescheduling.
      if (!moved && wasDragging !== null) {
        setDraggingTaskId(null);
        openEditDialog(wasDragging);
        return;
      }

      if (wasDragging === null || !dragRef.current) {
        setDraggingTaskId(null);
        return;
      }

      const task = tasks.find(t => t.id === wasDragging);
      if (task?.planned_start && task?.planned_end) {
        const delta = e.clientX - dragStartPos;
        const dragDays = Math.round(delta / PIXELS_PER_DAY);

        if (dragDays !== 0) {
          const newStart = new Date(task.planned_start);
          newStart.setDate(newStart.getDate() + dragDays);

          const newEnd = new Date(task.planned_end);
          newEnd.setDate(newEnd.getDate() + dragDays);

          if (onTaskUpdate) {
            onTaskUpdate(task.id, newStart, newEnd);
          }

          // Optimistic update
          setTasks(prev =>
            prev.map(t =>
              t.id === wasDragging
                ? {
                    ...t,
                    planned_start: dateToISO(newStart),
                    planned_end: dateToISO(newEnd),
                  }
                : t
            )
          );
        }
      }

      setDraggingTaskId(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingTaskId, dragStartPos, tasks, onTaskUpdate]);

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
  // Edit dialog is always wired so a click can open it; only the Save action
  // and the cursor affordance depend on readOnly.
  const interactive = !readOnly && !isMobile;

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
            {!readOnly && !isMobile && (
              <span className="text-[10px]">Drag bars to reschedule</span>
            )}
            {readOnly && (
              <span className="text-[10px]">Click a task to view details</span>
            )}
            {!readOnly && isMobile && (
              <span className="text-[10px]">Tap a task to edit</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isMobile ? (
          <ol className="space-y-3">
            {chartData.map(bar => {
              return (
                <li
                  key={bar.id}
                  className="border border-border/60 rounded p-3 flex gap-3 cursor-pointer hover:bg-accent/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit task ${bar.name}`}
                  onClick={() => openEditDialog(bar.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEditDialog(bar.id);
                    }
                  }}
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
              );
            })}
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
                      : interactive
                        ? "grab"
                        : "pointer",
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
              {!readOnly && <li>• Drag bars horizontally to reschedule</li>}
              <li>• Click a task to {readOnly ? "view" : "edit"} details</li>
              <li>• Only tasks with dates are shown</li>
            </ul>
          </div>
        </div>
      </CardContent>

      {/* Single controlled edit/view dialog for both desktop + mobile. */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          open={true}
          onOpenChange={o => setEditingTask(o ? editingTask : null)}
          readOnly={readOnly}
          onSave={onTaskEdit}
        />
      )}
    </Card>
  );
}

interface TaskEditDialogProps {
  task: ScheduleItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  onSave?: (task: ScheduleItem) => void;
}

/**
 * Edit/view dialog for a single schedule task. Shows title, status, planned
 * dates, assignee, and notes. In readOnly mode the fields are read-only and no
 * Save action is rendered. On Save, emits the full edited ScheduleItem via
 * onSave (ScheduleView wires this to schedule.update).
 */
function TaskEditDialog({
  task,
  open,
  onOpenChange,
  readOnly = false,
  onSave,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<ScheduleItem["status"]>(task.status);
  const [plannedStart, setPlannedStart] = useState(
    isoToDateInput(task.planned_start)
  );
  const [plannedEnd, setPlannedEnd] = useState(
    isoToDateInput(task.planned_end)
  );
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");

  // Re-seed local form state whenever a different task is opened.
  useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setPlannedStart(isoToDateInput(task.planned_start));
    setPlannedEnd(isoToDateInput(task.planned_end));
    setAssignedTo(task.assigned_to ?? "");
    setNotes(task.notes ?? "");
  }, [task]);

  const handleSave = () => {
    const edited: ScheduleItem = {
      ...task,
      title: title.trim() || task.title,
      status,
      planned_start: dateInputToISO(plannedStart) ?? task.planned_start ?? null,
      planned_end: dateInputToISO(plannedEnd) ?? task.planned_end ?? null,
      assigned_to: assignedTo.trim() || null,
      notes: notes.trim() || null,
    };
    onSave?.(edited);
    onOpenChange(false);
  };

  const inputId = (key: string) => `gantt-task-${key}-${task.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="gantt-task-dialog-desc"
      >
        <DialogHeader>
          <DialogTitle>{readOnly ? "Task details" : "Edit task"}</DialogTitle>
          <DialogDescription id="gantt-task-dialog-desc">
            {readOnly
              ? "Viewing task details (read-only)."
              : "Update the task fields and save your changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor={inputId("title")}>Title</Label>
            <Input
              id={inputId("title")}
              value={title}
              readOnly={readOnly}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={inputId("status")}>Status</Label>
            <Select
              value={status}
              onValueChange={v => setStatus(v as ScheduleItem["status"])}
              disabled={readOnly}
            >
              <SelectTrigger id={inputId("status")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={inputId("start")}>Planned start</Label>
              <Input
                id={inputId("start")}
                type="date"
                value={plannedStart}
                readOnly={readOnly}
                onChange={e => setPlannedStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={inputId("end")}>Planned end</Label>
              <Input
                id={inputId("end")}
                type="date"
                value={plannedEnd}
                readOnly={readOnly}
                onChange={e => setPlannedEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={inputId("assignee")}>Assignee</Label>
            <Input
              id={inputId("assignee")}
              value={assignedTo}
              readOnly={readOnly}
              placeholder="Unassigned"
              onChange={e => setAssignedTo(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={inputId("notes")}>Notes</Label>
            <Textarea
              id={inputId("notes")}
              value={notes}
              readOnly={readOnly}
              placeholder="No notes"
              rows={3}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && <Button onClick={handleSave}>Save changes</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
