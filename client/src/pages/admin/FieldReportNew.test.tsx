/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
                  data: {
                    data: [
                      {
                        id: 1,
                        name: "The Hendricks Remodel",
                        city: "Eugene",
                        state: "OR",
                        status: "in_progress",
                      },
                    ],
                  },
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

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/field-reports/new", vi.fn()],
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
  const mod = await import("./FieldReportNew");
  return mod.default;
}

describe("FieldReportNew", () => {
  it("renders the project-select step with accessible project options", async () => {
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    expect(
      screen.getByRole("button", { name: /the hendricks remodel/i })
    ).toBeTruthy();
  });

  it("every interactive control at the select step has an accessible name", async () => {
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
