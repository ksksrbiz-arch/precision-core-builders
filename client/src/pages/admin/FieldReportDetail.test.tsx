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
  within,
} from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

const deleteMutateAsync = vi.fn(async (_input: unknown) => ({ success: true }));
const setLocationMock = vi.fn();

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "42" }),
  useLocation: () => ["/admin/field-reports/42", setLocationMock],
}));

vi.mock("@/lib/trpc", () => {
  const base = {
    useUtils: () =>
      new Proxy(
        {},
        {
          get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn() }) }),
        }
      ),
  };
  const trpcProxy = new Proxy(base, {
    get(target, routerName: string) {
      if (routerName in target) return (target as any)[routerName];
      return new Proxy(
        {},
        {
          get(_t2, procName: string) {
            if (routerName === "fieldReports" && procName === "getById") {
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
                mutateAsync:
                  routerName === "fieldReports" && procName === "delete"
                    ? deleteMutateAsync
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
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./FieldReportDetail");
  return mod.default;
}

describe("FieldReportDetail", () => {
  it("subscribes to realtime updates on the field_reports table, scoped to this report", async () => {
    queryState.data = {
      id: 42,
      status: "draft",
      report_date: "2026-08-01",
      summary: "Framing complete on the west wall.",
      tasks_completed: "[]",
      materials_used: "[]",
      issues_flagged: "[]",
      material_shortages: "[]",
      photo_urls: "[]",
      project_id: 1,
      projects: { id: 1, name: "The Hendricks Remodel" },
    };
    queryState.isLoading = false;
    queryState.isError = false;
    useRealtimeTableMock.mockClear();
    const FieldReportDetail = await loadPage();
    render(<FieldReportDetail />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "field_reports" })
    );
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const FieldReportDetail = await loadPage();
    render(<FieldReportDetail />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("deletes the report after confirmation and returns to the list", async () => {
    // fieldReports.delete existed server-side but nothing in the UI called it.
    queryState.data = {
      id: 42,
      status: "draft",
      report_date: "2026-08-01",
      summary: "Framing complete.",
      tasks_completed: "[]",
      materials_used: "[]",
      issues_flagged: "[]",
      material_shortages: "[]",
      photo_urls: "[]",
      project_id: 1,
      projects: { id: 1, name: "The Hendricks Remodel" },
    };
    queryState.isLoading = false;
    queryState.isError = false;
    deleteMutateAsync.mockClear();
    setLocationMock.mockClear();
    const FieldReportDetail = await loadPage();
    render(<FieldReportDetail />);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete field report" })
    );
    expect(deleteMutateAsync).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Delete report" })
    );

    await waitFor(() =>
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 42 })
    );
    await waitFor(() =>
      expect(setLocationMock).toHaveBeenCalledWith("/admin/field-reports")
    );
  });
});
