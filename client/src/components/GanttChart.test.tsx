/**
 * @vitest-environment jsdom
 *
 * Tests for GanttChart — verifies that the schedule visualization renders its
 * empty state gracefully, surfaces task labels for dated items, and reflects
 * the input dates in the rendered output. The drag-day math lives in
 * non-exported helpers, so it is exercised indirectly via the rendered bars
 * rather than by refactoring the source.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ScheduleItem } from "./GanttChart";

// trpc's useQuery is the only heavy dependency GanttChart pulls in; stub it so
// the component renders from its prop `items` in jsdom without a live client.
const listUseQueryMock = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    schedule: {
      list: {
        useQuery: () => listUseQueryMock(),
      },
    },
  },
}));

// Force the desktop (chart) layout by default; the mobile branch swaps to a
// list. Individual tests can override the return value.
const useIsMobileMock = vi.fn();
vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

// Recharts' ResponsiveContainer measures the DOM (zero-sized in jsdom, so it
// renders nothing). Render children at a fixed size so the bars/labels appear.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

async function loadGantt() {
  return await import("./GanttChart");
}

function makeItem(overrides: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: 1,
    project_id: 1,
    title: "Foundation pour",
    status: "pending",
    weather_sensitive: false,
    planned_start: "2026-03-01",
    planned_end: "2026-03-05",
    assigned_to: null,
    notes: null,
    ...overrides,
  };
}

describe("GanttChart", () => {
  beforeEach(() => {
    listUseQueryMock.mockReset();
    listUseQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    useIsMobileMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a loading state while the query is in flight", async () => {
    listUseQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { GanttChart } = await loadGantt();
    render(<GanttChart projectId={1} />);
    expect(screen.getByText("Loading schedule…")).toBeTruthy();
  });

  it("renders the empty state when there are no items", async () => {
    const { GanttChart } = await loadGantt();
    render(<GanttChart projectId={1} items={[]} />);
    expect(screen.getByText("No dated tasks")).toBeTruthy();
  });

  it("renders the empty state when items have no dates", async () => {
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, planned_start: null, planned_end: null }),
      makeItem({ id: 2, planned_start: "2026-03-01", planned_end: null }),
    ];
    // Should not throw and should fall back to the empty state.
    expect(() =>
      render(<GanttChart projectId={1} items={items} />)
    ).not.toThrow();
    expect(screen.getByText("No dated tasks")).toBeTruthy();
  });

  it("renders task labels for dated items (mobile list view)", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, title: "Excavation" }),
      makeItem({
        id: 2,
        title: "Framing",
        planned_start: "2026-03-10",
        planned_end: "2026-03-20",
      }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    expect(screen.getByText("Excavation")).toBeTruthy();
    expect(screen.getByText("Framing")).toBeTruthy();
    expect(screen.getByText("Project Schedule")).toBeTruthy();
  });

  it("reflects the input dates in the rendered mobile rows", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({
        id: 1,
        title: "Roofing",
        planned_start: "2026-04-01",
        planned_end: "2026-04-08",
      }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    // The row prints the localized start/end dates derived from the input.
    const start = new Date("2026-04-01").toLocaleDateString();
    const end = new Date("2026-04-08").toLocaleDateString();
    expect(screen.getByText(new RegExp(start))).toBeTruthy();
    expect(screen.getByText(new RegExp(end))).toBeTruthy();
  });

  it("flags weather-sensitive tasks in the mobile view", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, title: "Concrete slab", weather_sensitive: true }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    expect(screen.getByText("Weather")).toBeTruthy();
  });

  it("prefers database items over prop items when the query resolves", async () => {
    listUseQueryMock.mockReturnValue({
      data: [
        {
          id: 99,
          project_id: 1,
          title: "DB task",
          status: "in_progress",
          weather_sensitive: false,
          planned_start: "2026-05-01",
          planned_end: "2026-05-04",
        },
      ],
      isLoading: false,
    });
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    render(
      <GanttChart projectId={1} items={[makeItem({ title: "Prop task" })]} />
    );
    expect(screen.getByText("DB task")).toBeTruthy();
    expect(screen.queryByText("Prop task")).toBeNull();
  });
});
