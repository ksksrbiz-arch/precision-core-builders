/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

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
            if (routerName === "subContractors" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isLoading: queryState.isLoading,
                  isError: queryState.isError,
                  refetch: vi.fn(),
                }),
              };
            }
            if (routerName === "projects" && procName === "list") {
              return {
                useQuery: () => ({
                  data: {
                    data: [
                      {
                        id: 1,
                        name: "The Hendricks Remodel",
                        address: "123 Oak St",
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

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./SubContractorsList");
  return mod.default;
}

describe("SubContractorsList briefing dialog", () => {
  it("opens as a real dialog (role=dialog) rather than a bare overlay div", async () => {
    queryState.data = [
      {
        id: 1,
        name: "Apex Framing",
        trade: "Framing",
        phone: null,
        email: null,
        rating: null,
      },
    ];
    queryState.isLoading = false;
    queryState.isError = false;
    const SubContractorsList = await loadPage();
    render(<SubContractorsList />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /send briefing/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes on Escape (focus-trap/keyboard behavior from Radix, not hand-rolled)", async () => {
    queryState.data = [
      {
        id: 1,
        name: "Apex Framing",
        trade: "Framing",
        phone: null,
        email: null,
        rating: null,
      },
    ];
    queryState.isLoading = false;
    queryState.isError = false;
    const SubContractorsList = await loadPage();
    render(<SubContractorsList />);
    fireEvent.click(screen.getByRole("button", { name: /send briefing/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires a project to be selected before a briefing can be sent (no more hardcoded project)", async () => {
    queryState.data = [
      {
        id: 1,
        name: "Apex Framing",
        trade: "Framing",
        phone: null,
        email: null,
        rating: null,
      },
    ];
    queryState.isLoading = false;
    queryState.isError = false;
    const SubContractorsList = await loadPage();
    render(<SubContractorsList />);
    fireEvent.click(screen.getByRole("button", { name: /send briefing/i }));
    const dialog = screen.getByRole("dialog");
    const submit = Array.from(dialog.querySelectorAll("button")).find(
      b => b.textContent?.trim() === "Send Briefing"
    );
    expect(submit).toBeDefined();
    expect(submit?.disabled).toBe(true);
  });
});
