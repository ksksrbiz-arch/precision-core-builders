/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

window.matchMedia =
  window.matchMedia ||
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const queryState: {
  projects: Array<{ id: number; name: string }>;
  scheduleItems: unknown[];
} = {
  projects: [{ id: 1, name: "The Hendricks Remodel" }],
  scheduleItems: [],
};

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
}));

vi.mock("@/components/GanttChart", () => ({ GanttChart: () => null }));

vi.mock("@/lib/trpc", () => {
  const base = {
    useUtils: () =>
      new Proxy({}, { get: () => new Proxy({}, { get: () => vi.fn() }) }),
  };
  const trpcProxy = new Proxy(base, {
    get(target, routerName: string) {
      if (routerName in target) return (target as any)[routerName];
      return new Proxy(
        {},
        {
          get(_t2, procName: string) {
            if (routerName === "projects" && procName === "list") {
              return {
                useQuery: () => ({
                  data: { data: queryState.projects },
                }),
              };
            }
            if (routerName === "schedule" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.scheduleItems,
                  isLoading: false,
                  isError: false,
                  refetch: vi.fn(),
                }),
              };
            }
            return {
              useQuery: () => ({
                data: undefined,
                isLoading: false,
                isError: false,
                refetch: vi.fn(),
              }),
              useMutation: () => ({
                mutate: vi.fn(),
                mutateAsync: vi.fn(),
                isPending: false,
              }),
            };
          },
        }
      );
    },
  });
  return { trpc: trpcProxy };
});

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./ScheduleView");
  return mod.default;
}

const DEFAULT_ITEMS = [
  {
    id: 1,
    title: "Framing",
    status: "complete",
    planned_start: "2026-01-01",
    planned_end: "2026-01-05",
  },
  {
    id: 2,
    title: "Roofing",
    status: "in_progress",
    planned_start: "2026-01-06",
    planned_end: "2026-01-10",
  },
];

beforeEach(() => {
  queryState.projects = [{ id: 1, name: "The Hendricks Remodel" }];
  queryState.scheduleItems = DEFAULT_ITEMS;
});

describe("ScheduleView", () => {
  it("stats footer grid steps down on narrow screens (grid-cols-2 sm:grid-cols-4)", async () => {
    const ScheduleView = await loadPage();
    const { container } = render(<ScheduleView />);
    const statsGrid = container.querySelector(
      ".grid.grid-cols-2.sm\\:grid-cols-4"
    );
    expect(statsGrid).toBeTruthy();
  });

  it("week grid does not force a 420px floor on phone widths", async () => {
    const ScheduleView = await loadPage();
    const { container } = render(<ScheduleView />);
    expect(container.querySelector(".min-w-\\[420px\\]")).toBeNull();
  });

  it("renders with zero projects and offers a create-project CTA", async () => {
    queryState.projects = [];
    queryState.scheduleItems = [];
    const ScheduleView = await loadPage();
    render(<ScheduleView />);
    expect(screen.getAllByText(/no projects yet/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /create first project/i })
    ).toBeTruthy();
    expect(screen.queryByText(/select a project above/i)).toBeNull();
  });

  it("does not show the no-projects copy when projects exist", async () => {
    queryState.projects = [{ id: 7, name: "Riverbend Kitchen" }];
    queryState.scheduleItems = [];
    const ScheduleView = await loadPage();
    render(<ScheduleView />);
    expect(screen.queryByText(/no projects yet/i)).toBeNull();
  });
});
