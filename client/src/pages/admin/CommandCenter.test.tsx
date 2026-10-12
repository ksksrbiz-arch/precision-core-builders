/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let statsData: unknown = undefined;
let notLiveTables: string[] = [];

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ loading: false, isAuthenticated: true, isAdmin: true }),
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: ({ table }: { table: string }) => ({
    isLive: !notLiveTables.includes(table),
    lastEvent: null,
  }),
}));

vi.mock("recharts", async importOriginal => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

vi.mock("@/lib/trpc", () => {
  const passthrough = () => ({
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
  });
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
          get: (_t, procName: string) =>
            routerName === "projects" && procName === "stats"
              ? {
                  useQuery: () => ({
                    data: statsData,
                    isLoading: false,
                    isError: false,
                    refetch: vi.fn(),
                  }),
                }
              : passthrough(),
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

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", vi.fn()],
}));

Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView || (() => {});

afterEach(() => {
  cleanup();
  notLiveTables = [];
});

async function loadPage() {
  vi.resetModules();
  const mod = await import("./CommandCenter");
  return mod.default;
}

describe("CommandCenter", () => {
  it("KPI stat grid steps down before the desktop breakpoint (grid-cols-2 md:grid-cols-4)", async () => {
    const CommandCenter = await loadPage();
    const { container } = render(<CommandCenter />);
    const statsGrid = container.querySelector(
      ".grid.grid-cols-2.md\\:grid-cols-4"
    );
    expect(statsGrid).toBeTruthy();
  });

  describe("Live badge", () => {
    it.each(["projects", "ledger_entries", "materials", "field_reports"])(
      "shows Reconnecting when only the %s channel is down",
      async table => {
        notLiveTables = [table];
        const CommandCenter = await loadPage();
        render(<CommandCenter />);
        expect(
          screen.getByLabelText("Realtime updates reconnecting")
        ).toBeTruthy();
      }
    );

    it("shows Live when every channel is subscribed", async () => {
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getByLabelText("Realtime updates live")).toBeTruthy();
    });
  });

  describe("KPI accuracy", () => {
    it("charts a lone punch-list project instead of 'No project data yet'", async () => {
      statsData = {
        total: 1,
        byStatus: {
          lead: 0,
          estimateSent: 0,
          contracted: 0,
          active: 0,
          punchList: 1,
          complete: 0,
          onHold: 0,
        },
        totalEstimated: 0,
        totalActual: 0,
        costedBasis: 0,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.queryByText("No project data yet")).toBeNull();
    });

    it("renders a multi-million pipeline as $2.4M, not $2400k", async () => {
      statsData = {
        total: 1,
        byStatus: { lead: 1, contracted: 0, active: 0, complete: 0 },
        totalEstimated: 2_400_000,
        totalActual: 0,
        costedBasis: 0,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getAllByText("$2.4M").length).toBeGreaterThan(0);
      expect(screen.queryByText("$2400k")).toBeNull();
    });

    it("uses lining numerals on the KPI value so '1' isn't drawn like 'I'", async () => {
      statsData = {
        total: 1,
        byStatus: { lead: 1, contracted: 0, active: 0, complete: 0 },
        totalEstimated: 0,
        totalActual: 0,
        costedBasis: 0,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      const kpi = screen.getAllByText("1").find(el => el.tagName === "P");
      expect(kpi?.className).toContain("lining-nums");
    });
  });

  describe("Gross Margin card", () => {
    const base = {
      total: 3,
      byStatus: { lead: 1, active: 2, contracted: 0, complete: 0 },
    };

    it("compares logged costs only against the projects that have costs", async () => {
      // $1.05M quoted across the portfolio, but only $300k of it belongs to the
      // projects with logged costs ($100k). Old math: (1.05M - 100k)/1.05M = 90.5%
      // "on track". Like-for-like: (300k - 100k)/300k = 66.7%.
      statsData = {
        ...base,
        totalEstimated: 1_050_000,
        totalActual: 100_000,
        costedBasis: 300_000,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getByText("66.7%")).toBeTruthy();
      expect(screen.queryByText("90.5%")).toBeNull();
      expect(screen.getByText(/on projects with logged costs/i)).toBeTruthy();
    });

    it("shows an em dash and a prompt when no costs are logged yet", async () => {
      statsData = {
        ...base,
        totalEstimated: 500_000,
        totalActual: 0,
        costedBasis: 0,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getByText("Log actual costs")).toBeTruthy();
    });

    it("turns red when logged costs exceed the budget they belong to", async () => {
      statsData = {
        ...base,
        totalEstimated: 500_000,
        totalActual: 120_000,
        costedBasis: 100_000,
      };
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getByText("Review project costs")).toBeTruthy();
      expect(screen.getByText("-20.0%").className).toContain("text-red-400");
    });
  });
});
