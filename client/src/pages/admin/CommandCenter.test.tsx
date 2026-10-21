/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

let statsData: unknown = undefined;
let notLiveTables: string[] = [];
let queryErrors: string[] = [];
let authReady = true;
const refetches = new Map<string, ReturnType<typeof vi.fn>>();
const queryOptions = new Map<string, { enabled?: boolean }>();
const realtimeCallbacks = new Map<string, () => void>();
const chartData: unknown[] = [];
const createLead = vi.fn();
let createOptions: { onError?: () => void; onSuccess?: () => unknown } = {};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    isAuthenticated: true,
    isAdmin: authReady,
  }),
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: ({
    table,
    onUpdate,
  }: {
    table: string;
    onUpdate: () => void;
  }) => {
    realtimeCallbacks.set(table, onUpdate);
    return { isLive: !notLiveTables.includes(table), lastEvent: null };
  },
}));

vi.mock("recharts", async importOriginal => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    BarChart: (props: React.ComponentProps<typeof actual.BarChart>) => {
      chartData.push(props.data);
      return <actual.BarChart {...props} />;
    },
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

vi.mock("@/lib/trpc", () => {
  const procedure = (key: string) => ({
    useQuery: (_input: unknown, options: { enabled?: boolean } = {}) => {
      queryOptions.set(key, options);
      if (!refetches.has(key)) refetches.set(key, vi.fn());
      return {
        data: key === "projects.stats" ? statsData : undefined,
        isLoading: false,
        isError: queryErrors.includes(key),
        refetch: refetches.get(key),
      };
    },
    useMutation: (options = {}) => {
      if (key === "leads.create") createOptions = options;
      return {
        mutate: key === "leads.create" ? createLead : vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
    },
  });
  const base = {
    useUtils: () =>
      new Proxy(
        {},
        { get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn() }) }) }
      ),
  };
  const trpcProxy = new Proxy(base, {
    get(target, routerName: string) {
      if (routerName in target) return (target as any)[routerName];
      return new Proxy(
        {},
        {
          get: (_t, procName: string) => procedure(`${routerName}.${procName}`),
        }
      );
    },
  });
  return { trpc: trpcProxy };
});

vi.mock("@/components/OpsCopilot", () => ({ default: () => null }));
vi.mock("@/components/AIChatBox", () => ({ default: () => null }));

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
  statsData = undefined;
  queryErrors = [];
  authReady = true;
  refetches.clear();
  queryOptions.clear();
  realtimeCallbacks.clear();
  chartData.length = 0;
  createLead.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

describe("Command Center audit regressions", () => {
  async function openLeadPanel() {
    const CommandCenter = await loadPage();
    render(<CommandCenter />);
    fireEvent.click(
      screen.getByRole("button", { name: /AI Lead Intelligence/ })
    );
    fireEvent.change(screen.getByLabelText("Lead name"), {
      target: { value: "Remodel inquiry" },
    });
  }

  it.each([
    ["projects.list", "Couldn't load recent projects."],
    ["fieldReports.list", "Couldn't load recent field reports."],
    ["materials.list", "Couldn't load material shortages."],
    ["fieldReports.weeklyStats", "Couldn't load field report activity."],
  ])(
    "surfaces %s failures and retries the failed query",
    async (key, message) => {
      queryErrors = [key];
      const CommandCenter = await loadPage();
      render(<CommandCenter />);
      expect(screen.getByText(message)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      expect(refetches.get(key)).toHaveBeenCalledOnce();
    }
  );

  it("doesn't label failed metrics as an empty workspace", async () => {
    queryErrors = ["projects.stats"];
    const CommandCenter = await loadPage();
    render(<CommandCenter />);
    expect(screen.getByText("Project metrics unavailable")).toBeTruthy();
    expect(screen.getByText("Budget metrics unavailable")).toBeTruthy();
    expect(screen.queryByText("No project data yet")).toBeNull();
  });

  it("retains sub-$500 amounts in the budget chart", async () => {
    statsData = {
      total: 1,
      byStatus: {},
      totalEstimated: 250,
      totalActual: 125,
    };
    const CommandCenter = await loadPage();
    render(<CommandCenter />);
    expect(chartData).toContainEqual([
      { name: "Estimated", value: 0.25 },
      { name: "Actual", value: 0.125 },
    ]);
  });

  it("gates the lead board query until admin auth is ready", async () => {
    authReady = false;
    const CommandCenter = await loadPage();
    render(<CommandCenter />);
    expect(queryOptions.get("leads.list")).toMatchObject({ enabled: false });
  });

  it("shows an unavailable board with a retry instead of implying it is empty", async () => {
    queryErrors = ["leads.list"];
    await openLeadPanel();
    expect(
      screen.getByText("Couldn't load the prioritization board.")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(refetches.get("leads.list")).toHaveBeenCalledOnce();
  });

  it.each([
    [429, "Rate limit reached. Please wait before scoring another lead."],
    [503, "AI scoring service is temporarily unavailable. Please try again."],
  ])(
    "doesn't invent a low-priority score for HTTP %s (even with a non-JSON body)",
    async (status, message) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("unavailable", { status }))
      );
      await openLeadPanel();
      fireEvent.click(screen.getByRole("button", { name: "Score This Lead" }));
      expect((await screen.findByRole("alert")).textContent).toBe(message);
      expect(screen.queryByText("Next Action")).toBeNull();
      expect(createLead).not.toHaveBeenCalled();
    }
  );

  it("rejects malformed success responses without crashing or saving a lead", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ score: 999, reasoning: "bad result" })
        )
    );
    await openLeadPanel();
    fireEvent.click(screen.getByRole("button", { name: "Score This Lead" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "temporarily unavailable"
    );
    expect(createLead).not.toHaveBeenCalled();
    expect(screen.queryByText("999")).toBeNull();
  });

  it("persists a valid score, but clearly reports a subsequent save failure", async () => {
    const score = {
      score: 85,
      priority: "urgent",
      reasoning: "Detailed project",
      suggestedAction: "Call the lead",
      estimatedValue: null,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(score)));
    await openLeadPanel();
    fireEvent.click(screen.getByRole("button", { name: "Score This Lead" }));
    await waitFor(() =>
      expect(createLead).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Remodel inquiry", ...score })
      )
    );
    act(() => createOptions.onError?.());
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be saved"
    );
    expect(screen.getByText("Call the lead")).toBeTruthy();
  });

  it("aborts a pending score on unmount and never persists its late response", async () => {
    let resolveResponse!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    const CommandCenter = await loadPage();
    const { unmount } = render(<CommandCenter />);
    fireEvent.click(
      screen.getByRole("button", { name: /AI Lead Intelligence/ })
    );
    fireEvent.change(screen.getByLabelText("Lead name"), {
      target: { value: "Inquiry" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Score This Lead" }));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveResponse(
        Response.json({
          score: 85,
          priority: "urgent",
          reasoning: "Details",
          suggestedAction: "Call",
          estimatedValue: null,
        })
      );
      await pending;
    });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("doesn't submit whitespace-only names", async () => {
    await openLeadPanel();
    fireEvent.change(screen.getByLabelText("Lead name"), {
      target: { value: "   " },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Score This Lead",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      screen
        .getByLabelText("Project type (remodel, new build…)")
        .getAttribute("maxlength")
    ).toBe("120");
  });

  it("restarts the realtime flash for a new event and cleans its timer on unmount", async () => {
    const CommandCenter = await loadPage();
    vi.useFakeTimers();
    const { unmount } = render(<CommandCenter />);
    act(() => realtimeCallbacks.get("projects")?.());
    act(() => vi.advanceTimersByTime(1000));
    act(() => realtimeCallbacks.get("projects")?.());
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByLabelText("Realtime updates live").className).toContain(
      "ring-1"
    );
    const timerCount = vi.getTimerCount();
    unmount();
    expect(vi.getTimerCount()).toBeLessThan(timerCount);
  });
});
