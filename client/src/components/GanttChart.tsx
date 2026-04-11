/**
 * GanttChart Component — Task scheduling visualization with drag-and-drop
 *
 * Features:
 * - Horizontal task bars with date ranges
 * - Drag-and-drop task reordering
 * - Weather-dependent task highlighting
 * - Task dependencies visualization
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
  Cell as RechartsCell,
} from "recharts";
import { AlertTriangle, Cloud, CloudRain, Droplets } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ScheduleItem {
  id: number;
  project_id: number;
  task_name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "in_progress" | "completed" | "blocked";
  weather_dependent: boolean;
  assigned_to?: string;
  dependencies?: number[];
  notes?: string;
}

export interface GanttChartProps {
  projectId: number;
  items?: ScheduleItem[];
  onTaskUpdate?: (taskId: number, startDate: Date, endDate: Date) => void;
  weatherForecast?: WeatherData;
  readOnly?: boolean;
}

interface WeatherData {
  date: string;
  condition: "clear" | "cloudy" | "rainy" | "stormy";
  temperature: number;
  precipitation: number;
}

interface GanttBarData {
  id: number;
  name: string;
  start: number;
  duration: number;
  status: string;
  weatherDependent: boolean;
  startDate: string;
  endDate: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  planned: "#8b7355",
  blocked: "#ef4444",
};

function getDateNum(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function GanttChart({
  projectId,
  items = [],
  onTaskUpdate,
  weatherForecast,
  readOnly = false,
}: GanttChartProps) {
  const [tasks, setTasks] = useState<ScheduleItem[]>(items);
  const [chartData, setChartData] = useState<GanttBarData[]>([]);
  const [minDate, setMinDate] = useState<number>(0);
  const [maxDate, setMaxDate] = useState<number>(0);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number>(0);
  const dragRef = useRef<HTMLDivElement>(null);

  // Fetch schedule items from database
  const { data: dbItems, isLoading } = trpc.schedule.list.useQuery({
    projectId,
  });

  useEffect(() => {
    if (dbItems) {
      setTasks(dbItems);
    }
  }, [dbItems]);

  // Build chart data from tasks
  useEffect(() => {
    if (tasks.length === 0) return;

    const dates = tasks.flatMap(t => [
      getDateNum(t.start_date),
      getDateNum(t.end_date),
    ]);
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const totalDays = (max - min) / (1000 * 60 * 60 * 24);

    setMinDate(min);
    setMaxDate(max);

    const data = tasks.map(task => {
      const taskStart = getDateNum(task.start_date);
      const start = (taskStart - min) / (1000 * 60 * 60 * 24);
      const duration =
        (getDateNum(task.end_date) - taskStart) / (1000 * 60 * 60 * 24);

      return {
        id: task.id,
        name: task.task_name,
        start,
        duration,
        status: task.status,
        weatherDependent: task.weather_dependent,
        startDate: task.start_date,
        endDate: task.end_date,
      };
    });

    setChartData(data);
  }, [tasks]);

  // Handle drag-and-drop on bar
  const handleBarMouseDown = (e: React.MouseEvent, taskId: number) => {
    if (readOnly) return;
    setDraggingTaskId(taskId);
    setDragStartPos(e.clientX);
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (draggingTaskId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const moved = e.clientX - dragStartPos;
      const dragDistance = moved / 100; // pixels to days conversion
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingTaskId === null || !dragRef.current) return;

      const task = tasks.find(t => t.id === draggingTaskId);
      if (!task) return;

      const moved = e.clientX - dragStartPos;
      const dragDays = Math.round(moved / 5); // ~5px per day

      if (dragDays !== 0) {
        const newStart = new Date(task.start_date);
        newStart.setDate(newStart.getDate() + dragDays);

        const newEnd = new Date(task.end_date);
        newEnd.setDate(newEnd.getDate() + dragDays);

        // Update via tRPC
        if (onTaskUpdate) {
          onTaskUpdate(task.id, newStart, newEnd);
        }

        // Optimistic update
        setTasks(
          tasks.map(t =>
            t.id === draggingTaskId
              ? {
                  ...t,
                  start_date: dateToISO(newStart),
                  end_date: dateToISO(newEnd),
                }
              : t
          )
        );
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
    if (!active || !payload) return null;
    const data = payload[0].payload as GanttBarData;
    return (
      <div className="bg-popover border border-border p-2 text-xs rounded shadow-lg">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-muted-foreground">{data.startDate}</p>
        <p className="text-muted-foreground">{data.endDate}</p>
        <p className="text-muted-foreground capitalize">
          {data.status.replace("_", " ")}
        </p>
        {data.weatherDependent && (
          <p className="text-yellow-600 text-[10px] flex items-center gap-1 mt-1">
            <CloudRain className="h-3 w-3" />
            Weather-dependent
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No tasks scheduled</p>
            <p className="text-xs text-muted-foreground/70">
              Create schedule items to visualize project timeline
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={dragRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Project Schedule</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
              <span>Weather-dependent</span>
            </div>
            {!readOnly && (
              <span className="text-[10px]">Drag to reschedule</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <ResponsiveContainer
            width="100%"
            height={Math.max(300, tasks.length * 40)}
          >
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 200, bottom: 60 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="duration"
                fill="#8b7355"
                shape={
                  <g>
                    {chartData.map((bar, idx) => (
                      <g key={idx}>
                        <rect
                          x={bar.start * 30}
                          y={idx * 40}
                          width={bar.duration * 30}
                          height={30}
                          fill={
                            bar.weatherDependent
                              ? "#eab308"
                              : STATUS_COLORS[bar.status] || "#8b7355"
                          }
                          opacity={0.8}
                          stroke={
                            draggingTaskId === bar.id ? "#000" : "transparent"
                          }
                          strokeWidth={draggingTaskId === bar.id ? 2 : 0}
                          style={{ cursor: !readOnly ? "grab" : "default" }}
                          onMouseDown={e => handleBarMouseDown(e, bar.id)}
                        />
                      </g>
                    ))}
                  </g>
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-t border-border pt-4">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Status</p>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-muted-foreground capitalize">
                  {status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-foreground">Notes</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Yellow bars: Weather-dependent tasks</li>
              <li>• Drag to reschedule (if editable)</li>
              <li>• Updated in real-time from database</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
