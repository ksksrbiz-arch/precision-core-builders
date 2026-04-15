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

function getDateNum(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function dateToISO(date: Date): string {
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
  readOnly = false,
}: GanttChartProps) {
  const [tasks, setTasks] = useState<ScheduleItem[]>(items);
  const [chartData, setChartData] = useState<GanttBarData[]>([]);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  const dragRef = useRef<HTMLDivElement>(null);

  // Fetch schedule items from database (overrides prop items when available)
  const { data: dbItems, isLoading } = trpc.schedule.list.useQuery({
    projectId,
  });

  useEffect(() => {
    if (dbItems) {
      setTasks(dbItems as ScheduleItem[]);
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
      const MS_PER_DAY = 1000 * 60 * 60 * 24;
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

  // Drag-and-drop reschedule
  const handleBarMouseDown = (e: React.MouseEvent, taskId: number) => {
    if (readOnly) return;
    setDraggingTaskId(taskId);
    setDragStartPos(e.clientX);
  };

  useEffect(() => {
    if (draggingTaskId === null) return;

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingTaskId === null || !dragRef.current) return;

      const task = tasks.find(t => t.id === draggingTaskId);
      if (task?.planned_start && task?.planned_end) {
        const moved = e.clientX - dragStartPos;
        const dragDays = Math.round(moved / 5); // ~5px per day

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
              t.id === draggingTaskId
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

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
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

  return (
    <Card ref={dragRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Project Schedule</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
              <span>Weather-sensitive</span>
            </div>
            {!readOnly && (
              <span className="text-[10px]">Drag bars to reschedule</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
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
                tickFormatter={v => `Day ${v}`}
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
                style={{ cursor: readOnly ? "default" : "grab" }}
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

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs border-t border-border pt-4">
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
              <li>• Only tasks with dates are shown</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
