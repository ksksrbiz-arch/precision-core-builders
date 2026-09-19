/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: { data: [{ id: 1, name: "Acme Co" }] },
  isLoading: false,
  isError: false,
};

const setLocation = vi.fn();

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

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/projects/new", setLocation],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./ProjectNew");
  return mod.default;
}

function withClients() {
  queryState.data = { data: [{ id: 1, name: "Acme Co" }] };
  queryState.isLoading = false;
  queryState.isError = false;
}

function submitButton() {
  return screen
    .getAllByRole("button")
    .find(b => b.textContent?.trim() === "Create Project") as HTMLButtonElement;
}

describe("ProjectNew", () => {
  it("every LabeledInput field is retrievable by its accessible label, not just visual proximity", async () => {
    withClients();
    const ProjectNew = await loadPage();
    render(<ProjectNew />);
    // These are the two required fields, and the ones most critical to get
    // right — a screen-reader user must be able to find them by label.
    expect(screen.getByLabelText(/^client/i)).toBeTruthy();
    expect(screen.getByLabelText(/project name/i)).toBeTruthy();
  });

  it("the submit button starts disabled until required fields are filled", async () => {
    withClients();
    const ProjectNew = await loadPage();
    render(<ProjectNew />);
    const submit = submitButton();
    expect(submit).toBeDefined();
    expect(submit.disabled).toBe(true);
    // The disabled button must explain itself, not just grey out.
    expect(
      screen.getByText(/select a client and enter a project name/i)
    ).toBeTruthy();
  });

  it("renders with an EMPTY clients list and offers a path to create one", async () => {
    // Exactly tomorrow's state: zero clients in the database.
    queryState.data = { data: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const ProjectNew = await loadPage();
    render(<ProjectNew />);

    expect(screen.getByText(/no clients yet/i)).toBeTruthy();
    const cta = screen
      .getAllByRole("button")
      .find(b => /add your first client/i.test(b.textContent ?? ""));
    expect(cta).toBeDefined();

    // The dead "Select a client…" dropdown is gone.
    expect(screen.queryByText(/select a client…/i)).toBeNull();

    // Create is disabled, and says why.
    expect(submitButton().disabled).toBe(true);
    expect(
      screen.getByText(/add a client before creating a project/i)
    ).toBeTruthy();

    cta!.click();
    expect(setLocation).toHaveBeenCalledWith("/admin/clients");
  });

  it("shows a skeleton while clients are loading", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const ProjectNew = await loadPage();
    const { container } = render(<ProjectNew />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control when the clients query fails", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const ProjectNew = await loadPage();
    render(<ProjectNew />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });
});
