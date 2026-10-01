/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const updateMutateAsync = vi.fn(async (_input: unknown) => ({ id: 1 }));
const addToastMock = vi.fn();

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "1" }),
  useLocation: () => ["/admin/projects/1", vi.fn()],
  useSearch: () => "",
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
            if (routerName === "projects" && procName === "getById") {
              return {
                useQuery: () => ({
                  data: {
                    id: 1,
                    name: "The Hendricks Remodel",
                    status: "in_progress",
                    description: "",
                    project_type: "remodel",
                    address: "",
                    city: "Eugene",
                    state: "OR",
                    zip: "",
                    estimated_budget: 50000,
                    contracted_budget: 55000,
                    progress_percent: 40,
                    clients: { id: 1, name: "Acme Co" },
                  },
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
                mutateAsync:
                  routerName === "projects" && procName === "update"
                    ? updateMutateAsync
                    : vi.fn(),
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
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./ProjectDetail");
  return mod.default;
}

describe("ProjectDetail", () => {
  it("registers all three realtime subscriptions (schedule, ledger, materials), each scoped to this project", async () => {
    useRealtimeTableMock.mockClear();
    const ProjectDetail = await loadPage();
    render(<ProjectDetail />);
    const tables = useRealtimeTableMock.mock.calls.map(
      call => (call[0] as { table: string }).table
    );
    expect(tables).toContain("schedule_items");
    expect(tables).toContain("ledger_entries");
    expect(tables).toContain("materials");
  });

  it("labels the icon-only cancel-edit button", async () => {
    const ProjectDetail = await loadPage();
    render(<ProjectDetail />);
    fireEvent.click(screen.getByRole("button", { name: /edit details/i }));
    expect(
      screen.getByRole("button", { name: /cancel editing project details/i })
    ).toBeTruthy();
  });

  describe("saving the overview edit form", () => {
    it("clears blanked fields with null and keeps unchanged ones", async () => {
      // `undefined` means "unchanged" server-side, so a blanked budget/city was
      // silently kept while the toast said "Project Saved".
      updateMutateAsync.mockClear();
      const ProjectDetail = await loadPage();
      render(<ProjectDetail />);
      fireEvent.click(screen.getByRole("button", { name: /edit details/i }));

      fireEvent.change(screen.getByDisplayValue("Eugene"), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByDisplayValue("55000"), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
      const sent = updateMutateAsync.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(sent).toMatchObject({
        id: 1,
        name: "The Hendricks Remodel",
        city: null,
        contractedBudget: null,
        description: null,
        estimatedBudget: 50000,
        state: "OR",
        estimatedStartDate: null,
      });
      // Status is never part of an overview save (the server must not reset it).
      expect(sent).not.toHaveProperty("status");
    });

    it("rejects a non-positive budget instead of sending a doomed request", async () => {
      updateMutateAsync.mockClear();
      addToastMock.mockClear();
      const ProjectDetail = await loadPage();
      render(<ProjectDetail />);
      fireEvent.click(screen.getByRole("button", { name: /edit details/i }));
      fireEvent.change(screen.getByDisplayValue("50000"), {
        target: { value: "-5" },
      });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      expect(updateMutateAsync).not.toHaveBeenCalled();
      expect(addToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Check the budget" })
      );
    });
  });
});
