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

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

const getByIdInvalidate = vi.fn();

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "42" }),
  useLocation: () => ["/admin/clients/42", vi.fn()],
}));

vi.mock("@/lib/trpc", () => {
  const base = {
    useUtils: () =>
      new Proxy(
        {},
        {
          get: () =>
            new Proxy({}, { get: () => ({ invalidate: getByIdInvalidate }) }),
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
            if (routerName === "clients" && procName === "getById") {
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
  const mod = await import("./ClientDetail");
  return mod.default;
}

const client = {
  id: 42,
  name: "Hendricks Household",
  email: "hendricks@example.com",
  phone: null,
  address: null,
  city: null,
  state: null,
  zip: null,
  notes: null,
  lead_source: null,
  created_at: "2026-08-01T00:00:00.000Z",
  projects: [],
};

function setState(next: Partial<typeof queryState>) {
  queryState.data = next.data;
  queryState.isLoading = next.isLoading ?? false;
  queryState.isError = next.isError ?? false;
}

describe("ClientDetail", () => {
  it("renders the loading skeleton without crashing when data is undefined", async () => {
    setState({ data: undefined, isLoading: true });
    const ClientDetail = await loadPage();
    const { container } = render(<ClientDetail />);
    expect(container.textContent).not.toContain("undefined");
  });

  it("shows a not-found empty state with a way back when the client is missing", async () => {
    setState({ data: undefined, isLoading: false });
    const ClientDetail = await loadPage();
    render(<ClientDetail />);
    expect(screen.getByText(/client not found/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /back to clients/i })
    ).toBeTruthy();
  });

  it("renders a client with no projects and no optional fields", async () => {
    setState({ data: client, isLoading: false });
    const ClientDetail = await loadPage();
    render(<ClientDetail />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Hendricks Household"
    );
    expect(
      screen.getByText(/no projects associated with this client/i)
    ).toBeTruthy();
  });

  it("shows QueryError with a retry control on error", async () => {
    setState({ data: undefined, isLoading: false, isError: true });
    const ClientDetail = await loadPage();
    render(<ClientDetail />);
    expect(screen.getByText(/unable to load/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /try again|retry/i })
    ).toBeTruthy();
  });

  it("scopes the realtime clients subscription to this client", async () => {
    setState({ data: client, isLoading: false });
    useRealtimeTableMock.mockClear();
    getByIdInvalidate.mockClear();
    const ClientDetail = await loadPage();
    render(<ClientDetail />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "clients" })
    );
    const opts = useRealtimeTableMock.mock.calls[0][0] as {
      onUpdate: (payload: unknown) => void;
    };
    opts.onUpdate({ new: { id: 7 }, old: null });
    expect(getByIdInvalidate).not.toHaveBeenCalled();
    opts.onUpdate({ new: { id: 42 }, old: null });
    expect(getByIdInvalidate).toHaveBeenCalledWith({ id: 42 });
  });

  it("gives the icon-only edit button an accessible name", async () => {
    setState({ data: client, isLoading: false });
    const ClientDetail = await loadPage();
    render(<ClientDetail />);
    expect(screen.getByRole("button", { name: "Edit client" })).toBeTruthy();
  });
});
