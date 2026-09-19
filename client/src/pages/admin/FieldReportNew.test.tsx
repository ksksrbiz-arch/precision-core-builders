/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

type ProjectRow = {
  id: number;
  name: string;
  city: string;
  state: string;
  status: string;
};

const queryState: {
  projects: ProjectRow[];
  isLoading: boolean;
  isError: boolean;
} = {
  projects: [],
  isLoading: false,
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
            if (routerName === "projects" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.isLoading
                    ? undefined
                    : { data: queryState.projects },
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

beforeEach(() => {
  queryState.projects = [
    {
      id: 1,
      name: "The Hendricks Remodel",
      city: "Eugene",
      state: "OR",
      status: "in_progress",
    },
  ];
  queryState.isLoading = false;
  queryState.isError = false;
});

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

  it("shows a project a lead-status project in the selectable list", async () => {
    queryState.projects = [
      {
        id: 7,
        name: "Fresh Lead Project",
        city: "Springfield",
        state: "OR",
        status: "lead",
      },
    ];
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    expect(
      screen.getByRole("button", { name: /fresh lead project/i })
    ).toBeTruthy();
  });

  it("excludes completed projects from the selectable list", async () => {
    queryState.projects = [
      {
        id: 8,
        name: "Finished Job",
        city: "Eugene",
        state: "OR",
        status: "complete",
      },
    ];
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    expect(screen.queryByText(/finished job/i)).toBeNull();
    expect(screen.getByText(/no projects to report on yet/i)).toBeTruthy();
  });

  it("renders an empty-state CTA when there are zero projects", async () => {
    queryState.projects = [];
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    expect(screen.getByText(/no projects to report on yet/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /create a project first/i })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /continue to recording/i })
    ).toBeNull();
  });

  it("renders a loading skeleton while projects are loading", async () => {
    queryState.isLoading = true;
    queryState.projects = [];
    const FieldReportNew = await loadPage();
    render(<FieldReportNew />);
    expect(screen.queryByText(/no projects to report on yet/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /continue to recording/i })
    ).toBeNull();
  });
});
