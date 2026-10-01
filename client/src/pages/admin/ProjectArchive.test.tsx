/**
 * @vitest-environment jsdom
 *
 * Project archive UI: archive from the detail page (confirm first), restore an
 * archived project, and the Active/Archived toggle on the list.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const state = {
  project: {} as Record<string, unknown>,
  listCalls: [] as unknown[],
  listData: { data: [] as unknown[], total: 0 },
};
const archiveMutate = vi.fn();
const unarchiveMutate = vi.fn();

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
}));
vi.mock("wouter", () => ({
  useParams: () => ({ id: "7" }),
  useLocation: () => ["/admin/projects/7", vi.fn()],
  useSearch: () => "",
}));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("./CommandCenter", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/lib/trpc", () => {
  const idle = {
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
  const utils = new Proxy(
    {},
    { get: () => new Proxy({}, { get: () => vi.fn() }) }
  );
  const trpc = new Proxy(
    { useUtils: () => utils },
    {
      get(target, router: string) {
        if (router in target) return (target as never)[router];
        return new Proxy(
          {},
          {
            get(_t, proc: string) {
              if (router === "projects" && proc === "getById")
                return {
                  useQuery: () => ({
                    data: state.project,
                    isLoading: false,
                    isError: false,
                    refetch: vi.fn(),
                  }),
                };
              if (router === "projects" && proc === "list")
                return {
                  useQuery: (input: unknown) => {
                    state.listCalls.push(input);
                    return {
                      data: state.listData,
                      isLoading: false,
                      isError: false,
                      refetch: vi.fn(),
                    };
                  },
                };
              if (router === "projects" && proc === "archive")
                return {
                  useMutation: () => ({
                    mutate: archiveMutate,
                    isPending: false,
                  }),
                };
              if (router === "projects" && proc === "unarchive")
                return {
                  useMutation: () => ({
                    mutate: unarchiveMutate,
                    isPending: false,
                  }),
                };
              return idle;
            },
          }
        );
      },
    }
  );
  return { trpc };
});

// useMutationWithToast just needs to hand `.mutate` through.
vi.mock("@/_core/hooks/useMutationWithToast", () => ({
  useMutationWithToast: (m: unknown) => m,
}));

const baseProject = {
  id: 7,
  name: "The Hendricks Remodel",
  status: "in_progress",
  city: "Eugene",
  state: "OR",
  clients: { id: 1, name: "Acme Co" },
};

beforeEach(() => {
  archiveMutate.mockReset();
  unarchiveMutate.mockReset();
  state.listCalls = [];
  state.listData = { data: [], total: 0 };
});
afterEach(cleanup);

describe("ProjectDetail — archive", () => {
  it("archives only after the confirm dialog", async () => {
    state.project = { ...baseProject, archived_at: null };
    const { default: ProjectDetail } = await import("./ProjectDetail");
    render(<ProjectDetail />);
    fireEvent.click(screen.getByRole("button", { name: /^archive$/i }));
    expect(archiveMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing is deleted/i)).toBeTruthy();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^archive$/i }));
    expect(archiveMutate).toHaveBeenCalledWith({ id: 7 });
  });

  it("shows an archived banner and a Restore action instead of Archive", async () => {
    state.project = { ...baseProject, archived_at: "2026-09-30T10:00:00Z" };
    const { default: ProjectDetail } = await import("./ProjectDetail");
    render(<ProjectDetail />);
    expect(screen.getByRole("status").textContent).toMatch(/archived/i);
    expect(screen.queryByRole("button", { name: /^archive$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(unarchiveMutate).toHaveBeenCalledWith({ id: 7 });
  });
});

describe("ProjectsList — Active / Archived", () => {
  it("hides archived projects by default and requests only archived on toggle", async () => {
    const { default: ProjectsList } = await import("./ProjectsList");
    render(<ProjectsList />);
    expect(
      (state.listCalls.at(-1) as { archived?: string }).archived
    ).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: /^archived$/i }));
    expect((state.listCalls.at(-1) as { archived?: string }).archived).toBe(
      "only"
    );
    expect(screen.getByText(/no archived projects/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^active$/i }));
    expect(
      (state.listCalls.at(-1) as { archived?: string }).archived
    ).toBeUndefined();
  });
});
