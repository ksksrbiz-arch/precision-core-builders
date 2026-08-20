/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
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
            if (routerName === "projects" && procName === "list") {
              return {
                useQuery: () => ({
                  data: { data: [{ id: 1, name: "The Hendricks Remodel" }] },
                }),
              };
            }
            if (routerName === "finishSelections" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isLoading: queryState.isLoading,
                  isError: queryState.isError,
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
  const mod = await import("./FinishSelectionsAdmin");
  return mod.default;
}

async function selectProject() {
  const select = screen.getByDisplayValue(/select a project/i);
  fireEvent.change(select, { target: { value: "1" } });
}

describe("FinishSelectionsAdmin", () => {
  it("shows a skeleton (house pattern) while loading, not plain text", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    const { container } = render(<FinishSelectionsAdmin />);
    await selectProject();
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows the house Empty component (not plain text) when there are no selections", async () => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    const { container } = render(<FinishSelectionsAdmin />);
    await selectProject();
    expect(container.querySelector('[data-slot="empty"]')).toBeTruthy();
    expect(screen.getByText(/no selections yet/i)).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    render(<FinishSelectionsAdmin />);
    await selectProject();
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
