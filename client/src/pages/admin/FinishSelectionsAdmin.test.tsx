/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

const projectsState: {
  data: { id: number; name: string }[];
  isLoading: boolean;
} = {
  data: [{ id: 1, name: "The Hendricks Remodel" }],
  isLoading: false,
};

const setLocationMock = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/finish-selections", setLocationMock],
}));

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
                  data: { data: projectsState.data },
                  isLoading: projectsState.isLoading,
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

beforeEach(() => {
  projectsState.data = [{ id: 1, name: "The Hendricks Remodel" }];
  projectsState.isLoading = false;
  setLocationMock.mockClear();
});

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

  it("renders with zero projects and offers a create-project CTA", async () => {
    projectsState.data = [];
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    const { container } = render(<FinishSelectionsAdmin />);

    expect(container.querySelector('[data-slot="empty"]')).toBeTruthy();
    expect(screen.getByText(/no projects yet/i)).toBeTruthy();
    // The impossible instruction must be gone, along with the empty selector.
    expect(screen.queryByText(/select a project above/i)).toBeNull();
    expect(screen.queryByLabelText(/^project$/i)).toBeNull();

    const cta = screen.getByRole("button", { name: /create first project/i });
    fireEvent.click(cta);
    expect(setLocationMock).toHaveBeenCalledWith("/admin/projects/new");
  });

  it("keeps the select-a-project copy when projects exist", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    render(<FinishSelectionsAdmin />);
    expect(screen.getByText(/select a project above/i)).toBeTruthy();
    expect(screen.queryByText(/no projects yet/i)).toBeNull();
  });

  it("renders exactly one h1, from AdminPageHeader", async () => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    const { container } = render(<FinishSelectionsAdmin />);
    const headings = container.querySelectorAll("h1");
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toMatch(/finish selections/i);
  });

  it("gives every form field an accessible name from a real label", async () => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
    const FinishSelectionsAdmin = await loadPage();
    const { container } = render(<FinishSelectionsAdmin />);
    await selectProject();
    fireEvent.click(screen.getByRole("button", { name: /add selection/i }));

    const fields = container.querySelectorAll("input, select, textarea");
    expect(fields.length).toBeGreaterThanOrEqual(10);
    for (const field of Array.from(fields)) {
      const id = field.getAttribute("id");
      expect(id).toBeTruthy();
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label, `missing <label> for #${id}`).toBeTruthy();
      expect((label?.textContent ?? "").trim().length).toBeGreaterThan(0);
    }
  });
});
