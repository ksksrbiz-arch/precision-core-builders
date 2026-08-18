/**
 * @vitest-environment jsdom
 *
 * Tests for the admin Analytics page — the page previously rendered its five
 * Recharts panels while every query was still in flight, so the first
 * assertion here pins the loading skeleton. The rest cover the other two legs
 * of the state triad (error + empty) and the accessible names of the
 * interactive controls in the populated state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setLocationMock = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/admin/analytics", setLocationMock],
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/AdminPageHeader", () => ({
  AdminPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/AiUsagePanel", () => ({
  default: () => <div data-testid="ai-usage" />,
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
}));

// Recharts measures its container, which jsdom reports as 0x0 — swap the
// responsive wrapper for a fixed-size box so the charts mount.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

type QueryState = {
  data?: unknown;
  isLoading: boolean;
  isError: boolean;
};

const pending: QueryState = {
  data: undefined,
  isLoading: true,
  isError: false,
};
const failed: QueryState = { data: undefined, isLoading: false, isError: true };

const refetchMocks = {
  stats: vi.fn(),
  list: vi.fn(),
  profitability: vi.fn(),
  weeklyStats: vi.fn(),
  materials: vi.fn(),
};

const state = {
  stats: pending,
  list: pending,
  profitability: pending,
  weeklyStats: pending,
  materials: pending,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ projects: { invalidate: vi.fn() } }),
    projects: {
      stats: {
        useQuery: () => ({ ...state.stats, refetch: refetchMocks.stats }),
      },
      list: { useQuery: () => ({ ...state.list, refetch: refetchMocks.list }) },
      profitabilitySummary: {
        useQuery: () => ({
          ...state.profitability,
          refetch: refetchMocks.profitability,
        }),
      },
    },
    fieldReports: {
      weeklyStats: {
        useQuery: () => ({
          ...state.weeklyStats,
          refetch: refetchMocks.weeklyStats,
        }),
      },
    },
    materials: {
      list: {
        useQuery: () => ({
          ...state.materials,
          refetch: refetchMocks.materials,
        }),
      },
    },
  },
}));

const emptyTotals = {
  contracted: 0,
  estimated: 0,
  actualCost: 0,
  profit: 0,
  basis: 0,
  marginPct: 0,
};

const loaded = (data: unknown): QueryState => ({
  data,
  isLoading: false,
  isError: false,
});

function setEmptyData() {
  state.stats = loaded({
    total: 0,
    totalEstimated: 0,
    totalActual: 0,
    byStatus: { lead: 0, contracted: 0, active: 0, complete: 0 },
  });
  state.list = loaded({ data: [], total: 0 });
  state.profitability = loaded({ projects: [], totals: emptyTotals });
  state.weeklyStats = loaded([]);
  state.materials = loaded({ data: [], total: 0 });
}

function setPopulatedData() {
  state.stats = loaded({
    total: 4,
    totalEstimated: 800000,
    totalActual: 600000,
    byStatus: { lead: 1, contracted: 1, active: 1, complete: 1 },
  });
  state.list = loaded({
    data: [
      {
        id: 1,
        name: "Riverbend Residence",
        estimated_budget: 500000,
        actual_cost: 400000,
      },
    ],
    total: 1,
  });
  state.profitability = loaded({
    projects: [
      {
        id: 1,
        name: "Riverbend Residence",
        status: "active",
        contracted: 500000,
        estimated: 500000,
        actualCost: 400000,
        basis: 500000,
        profit: 100000,
        marginPct: 20,
        variance: 100000,
        hasData: true,
      },
    ],
    totals: {
      contracted: 500000,
      estimated: 500000,
      actualCost: 400000,
      profit: 100000,
      basis: 500000,
      marginPct: 20,
    },
  });
  state.weeklyStats = loaded([
    { week: "W1", reports: 3, issues: 1 },
    { week: "W2", reports: 5, issues: 0 },
  ]);
  state.materials = loaded({
    data: [
      {
        id: 9,
        name: "White Oak Flooring",
        vendor_name: "Cascade Supply",
        quantity_received: 2,
        quantity_needed: 10,
        unit: "boxes",
      },
    ],
    total: 7,
  });
}

async function loadAnalytics() {
  return (await import("./Analytics")).default;
}

describe("Analytics", () => {
  beforeEach(() => {
    Object.values(refetchMocks).forEach(m => m.mockReset());
    state.stats = pending;
    state.list = pending;
    state.profitability = pending;
    state.weeklyStats = pending;
    state.materials = pending;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a loading skeleton while the queries are pending", async () => {
    const Analytics = await loadAnalytics();
    const { container } = render(<Analytics />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0
    );
    // None of the chart panels should mount before the data arrives.
    expect(screen.queryByText("Project Pipeline")).toBeNull();
    expect(screen.queryByText("Total Projects")).toBeNull();
  });

  it("still shows the skeleton when only one query is pending", async () => {
    setPopulatedData();
    state.materials = pending;
    const Analytics = await loadAnalytics();
    const { container } = render(<Analytics />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText("Project Pipeline")).toBeNull();
  });

  it("renders QueryError with a working retry when a query fails", async () => {
    setPopulatedData();
    state.profitability = failed;
    const Analytics = await loadAnalytics();
    render(<Analytics />);

    expect(screen.getByText("Unable to load")).toBeTruthy();
    const retry = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(retry);

    expect(refetchMocks.stats).toHaveBeenCalled();
    expect(refetchMocks.profitability).toHaveBeenCalled();
    expect(refetchMocks.materials).toHaveBeenCalled();
  });

  it("renders the empty state when there is nothing to analyze", async () => {
    setEmptyData();
    const Analytics = await loadAnalytics();
    render(<Analytics />);

    expect(screen.getByText("No analytics yet")).toBeTruthy();
    const cta = screen.getByRole("button", {
      name: /create your first project/i,
    });
    await userEvent.click(cta);
    expect(setLocationMock).toHaveBeenCalledWith("/admin/projects/new");
  });

  it("renders the dashboard with accessible names on every control", async () => {
    setPopulatedData();
    const Analytics = await loadAnalytics();
    const { container } = render(<Analytics />);

    expect(screen.getByText("Total Projects")).toBeTruthy();
    expect(screen.getByText("Project Pipeline")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Order more White Oak Flooring" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /view all 7 shortages/i })
    ).toBeTruthy();

    for (const button of Array.from(container.querySelectorAll("button"))) {
      const name =
        button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
