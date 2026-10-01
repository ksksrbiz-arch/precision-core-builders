/**
 * @vitest-environment jsdom
 *
 * Geometry check for the dependency connectors: they are computed from each
 * successor bar's rect plus the day offsets, so this renders the real chart
 * (recharts at a fixed size) and asserts every link starts at its
 * predecessor's actual right edge and ends at its successor's left edge, at
 * row centres.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { cloneElement } from "react";
import type { ScheduleItem } from "./GanttChart";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    schedule: {
      list: { useQuery: () => ({ data: undefined, isLoading: false }) },
    },
  },
}));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 900, height: 300 }),
  };
});

afterEach(cleanup);

const item = (o: Partial<ScheduleItem>): ScheduleItem => ({
  id: 1,
  project_id: 1,
  title: "A",
  status: "pending",
  weather_sensitive: false,
  planned_start: "2026-03-01",
  planned_end: "2026-03-05",
  ...o,
});

type Rect = { x: number; y: number; w: number; h: number };

function barRects(container: HTMLElement): Rect[] {
  return [...container.querySelectorAll(".recharts-bar-rectangle path")]
    .filter(p => p.getAttribute("x") !== null)
    .map(p => ({
      x: Number(p.getAttribute("x")),
      y: Number(p.getAttribute("y")),
      w: Number(p.getAttribute("width")),
      h: Number(p.getAttribute("height")),
    }));
}

function endpoints(d: string) {
  const nums = [...d.matchAll(/[MHV](-?[\d.]+)(?:,(-?[\d.]+))?/g)];
  const start = nums[0];
  const last = nums[nums.length - 1];
  // Last command is always `H<x2>`; the one before it `V<y2>`.
  const x2 = Number(last[1]);
  const y2 = Number([...nums].reverse().find(m => d[m.index!] === "V")![1]);
  return { x1: Number(start[1]), y1: Number(start[2]), x2, y2 };
}

describe("dependency connectors (real chart geometry)", () => {
  async function renderChart(items: ScheduleItem[]) {
    const { GanttChart } = await import("./GanttChart");
    return render(<GanttChart projectId={1} items={items} />);
  }

  it("runs from the predecessor's right edge to the successor's left edge, at row centres", async () => {
    const { container } = await renderChart([
      item({ id: 1, title: "A" }),
      item({
        id: 2,
        title: "B",
        planned_start: "2026-03-10",
        planned_end: "2026-03-12",
        depends_on: "1",
      }),
      item({
        id: 3,
        title: "C",
        planned_start: "2026-03-14",
        planned_end: "2026-03-18",
        depends_on: "2",
      }),
    ]);
    const bars = barRects(container);
    expect(bars).toHaveLength(3);
    const links = [
      ...container.querySelectorAll('[data-testid="dependency-link"]'),
    ];
    expect(links).toHaveLength(2);

    const check = (link: Element, pred: Rect, succ: Rect) => {
      const e = endpoints(link.querySelector("path")!.getAttribute("d")!);
      expect(e.x1).toBeCloseTo(pred.x + pred.w, 1);
      expect(e.y1).toBeCloseTo(pred.y + pred.h / 2, 1);
      expect(e.x2).toBeCloseTo(succ.x, 1);
      expect(e.y2).toBeCloseTo(succ.y + succ.h / 2, 1);
      expect(link.getAttribute("data-conflict")).toBe("false");
    };
    check(links[0], bars[0], bars[1]);
    check(links[1], bars[1], bars[2]);
  });

  it("marks a link red when the successor starts before its predecessor ends", async () => {
    const { container } = await renderChart([
      item({
        id: 1,
        title: "A",
        planned_start: "2026-03-01",
        planned_end: "2026-03-10",
      }),
      item({
        id: 2,
        title: "B",
        planned_start: "2026-03-05",
        planned_end: "2026-03-08",
        depends_on: "1",
      }),
    ]);
    const link = container.querySelector('[data-testid="dependency-link"]')!;
    expect(link.getAttribute("data-conflict")).toBe("true");
    expect(link.querySelector("path")!.getAttribute("stroke")).toBe("#ef4444");
  });

  it("ignores predecessors that aren't on the chart (no dates / deleted)", async () => {
    const { container } = await renderChart([
      item({ id: 1, title: "A", planned_start: null, planned_end: null }),
      item({ id: 2, title: "B", depends_on: "1,99" }),
    ]);
    expect(
      container.querySelectorAll('[data-testid="dependency-link"]')
    ).toHaveLength(0);
  });
});
