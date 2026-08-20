/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
            if (routerName === "clients" && procName === "list") {
              return {
                useQuery: () => ({
                  data: {
                    data: [
                      {
                        id: 1,
                        user_id: "u1",
                        name: "Acme Co",
                        email: "a@acme.com",
                      },
                    ],
                  },
                }),
              };
            }
            if (routerName === "notifications" && procName === "adminList") {
              return {
                useQuery: () => ({
                  data: { data: [], total: 0 },
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
  const mod = await import("./NotificationsView");
  return mod.default;
}

describe("NotificationsView", () => {
  it("every compose-form field is retrievable by its accessible label", async () => {
    const NotificationsView = await loadPage();
    render(<NotificationsView />);
    fireEvent.click(screen.getByRole("button", { name: /new notification/i }));
    expect(screen.getByLabelText(/recipient/i)).toBeTruthy();
    expect(screen.getByLabelText(/related project/i)).toBeTruthy();
    expect(screen.getByLabelText(/subject/i)).toBeTruthy();
    expect(screen.getByLabelText(/message/i)).toBeTruthy();
  });

  it("the filter toolbar controls are labelled, not placeholder-only", async () => {
    const NotificationsView = await loadPage();
    render(<NotificationsView />);
    expect(screen.getByLabelText(/search notifications/i)).toBeTruthy();
    expect(screen.getByLabelText(/filter by status/i)).toBeTruthy();
    expect(screen.getByLabelText(/filter by channel/i)).toBeTruthy();
  });
});
