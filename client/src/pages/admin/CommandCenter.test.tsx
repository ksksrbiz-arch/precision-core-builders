/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ loading: false, isAuthenticated: true, isAdmin: true }),
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
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
      return new Proxy({}, { get: () => passthrough() });
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

afterEach(cleanup);

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
});
