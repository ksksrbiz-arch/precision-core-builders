/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

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
            if (
              routerName === "blueprint" &&
              procName === "getConnectionStatus"
            ) {
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

vi.stubEnv("VITE_FEATURE_BLUEPRINT", "true");

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./BlueprintTools");
  return mod.default;
}

describe("BlueprintTools", () => {
  it("shows a loading state while connection status is pending", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const BlueprintTools = await loadPage();
    render(<BlueprintTools />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const BlueprintTools = await loadPage();
    render(<BlueprintTools />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("shows the not-connected state with an accessible connect action when disconnected", async () => {
    queryState.data = { connected: false, connection: null };
    queryState.isLoading = false;
    queryState.isError = false;
    const BlueprintTools = await loadPage();
    render(<BlueprintTools />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
