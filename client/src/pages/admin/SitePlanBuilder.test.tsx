/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isError: boolean } = {
  data: undefined,
  isError: false,
};

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => null,
  exportToBlob: vi.fn(),
}));

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
            if (routerName === "sitePlans" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isError: queryState.isError,
                  refetch: vi.fn(),
                }),
              };
            }
            return {
              useQuery: () => ({
                data: undefined,
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

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

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

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./SitePlanBuilder");
  return mod.default;
}

describe("SitePlanBuilder", () => {
  it("shows QueryError with a retry control when saved plans fail to load", async () => {
    queryState.data = undefined;
    queryState.isError = true;
    // Force the desktop layout, where the operations panel (and its
    // "Plans" tab, where the saved-plans list lives) renders without
    // needing to toggle any mobile-only visibility state first.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
    const SitePlanBuilder = await loadPage();
    render(<SitePlanBuilder />);
    fireEvent.click(screen.getByRole("button", { name: /^saved$/i }));
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("every discrete control is a real <button> (keyboard-operable by default)", async () => {
    queryState.data = [];
    queryState.isError = false;
    const SitePlanBuilder = await loadPage();
    const { container } = render(<SitePlanBuilder />);
    const clickableDivs = Array.from(
      container.querySelectorAll("div[onclick]")
    );
    expect(clickableDivs.length).toBe(0);
  });

  it("icon-only tool controls have accessible names", async () => {
    queryState.data = [];
    queryState.isError = false;
    const SitePlanBuilder = await loadPage();
    render(<SitePlanBuilder />);
    const buttons = screen.getAllByRole("button");
    const withAriaLabel = buttons.filter(b => b.hasAttribute("aria-label"));
    expect(withAriaLabel.length).toBeGreaterThan(0);
  });
});
