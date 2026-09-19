/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

type QueryState = { data: unknown; isLoading: boolean; isError: boolean };

const projectsState: QueryState = {
  data: undefined,
  isLoading: true,
  isError: false,
};
const ledgerState: QueryState = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/lib/trpc", () => {
  const stub = (state: QueryState) => ({
    useQuery: () => ({
      data: state.data,
      isLoading: state.isLoading,
      isError: state.isError,
      refetch: vi.fn(),
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
          get(_t2, procName: string) {
            if (routerName === "projects" && procName === "list") {
              return stub(projectsState);
            }
            if (routerName === "ledger" && procName === "list") {
              return stub(ledgerState);
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

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: false, lastEvent: null }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/ledger", vi.fn()],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./LedgerView");
  return mod.default;
}

function setProjects(state: Partial<QueryState>) {
  Object.assign(projectsState, {
    data: undefined,
    isLoading: false,
    isError: false,
    ...state,
  });
}

function setLedger(state: Partial<QueryState>) {
  Object.assign(ledgerState, {
    data: undefined,
    isLoading: false,
    isError: false,
    ...state,
  });
}

const ONE_PROJECT = { data: [{ id: 1, name: "Maple Residence" }] };

describe("LedgerView", () => {
  it("shows a skeleton while projects are loading", async () => {
    setProjects({ isLoading: true });
    setLedger({});
    const LedgerView = await loadPage();
    const { container } = render(<LedgerView />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control when the ledger fails", async () => {
    setProjects({ data: ONE_PROJECT });
    setLedger({ isError: true });
    const LedgerView = await loadPage();
    const { container } = render(<LedgerView />);
    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "1" } });
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("offers a create-project CTA when there are no projects at all", async () => {
    setProjects({ data: { data: [] } });
    setLedger({});
    const LedgerView = await loadPage();
    const { container } = render(<LedgerView />);
    expect(screen.getAllByText(/no projects yet/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /create first project/i })
    ).toBeTruthy();
    // The impossible ask must be gone: no selector, no "select a project".
    expect(container.querySelector("select")).toBeNull();
    expect(screen.queryByText(/select a project above/i)).toBeNull();
  });

  it("keeps the select-a-project prompt when projects exist", async () => {
    setProjects({ data: ONE_PROJECT });
    setLedger({});
    const LedgerView = await loadPage();
    render(<LedgerView />);
    expect(
      screen.getAllByText(/select a project above/i).length
    ).toBeGreaterThan(0);
  });

  it("every interactive control has an accessible name", async () => {
    setProjects({ data: ONE_PROJECT });
    setLedger({ data: { data: [] } });
    const LedgerView = await loadPage();
    const { container } = render(<LedgerView />);
    const select = container.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "1" } });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });

  // Regression guard: GuideHelpButton returns null for an unknown guideId, so
  // a bad id disappears silently (a sibling page shipped guideId="vendors"
  // with no such guide). The shell header renders this page's help button
  // from the route, so the route must resolve to a real guide.
  it("has a real contextual guide for its route", async () => {
    vi.resetModules();
    const { getGuideByPath } = await import("@/lib/guides");
    const guide = getGuideByPath("/admin/ledger");
    expect(guide).toBeTruthy();
    expect(guide?.id).toBe("ledger");

    const { GuideHelpButton } = await import("@/components/GuideHelpButton");
    const { container } = render(<GuideHelpButton guideId="ledger" />);
    expect(container.querySelector("button")).toBeTruthy();
  });
});
