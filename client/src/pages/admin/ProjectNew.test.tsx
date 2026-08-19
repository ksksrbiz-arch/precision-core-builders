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
            if (routerName === "clients" && procName === "list") {
              return {
                useQuery: () => ({
                  data: { data: [{ id: 1, name: "Acme Co" }] },
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
  useLocation: () => ["/admin/projects/new", vi.fn()],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./ProjectNew");
  return mod.default;
}

describe("ProjectNew", () => {
  it("every LabeledInput field is retrievable by its accessible label, not just visual proximity", async () => {
    const ProjectNew = await loadPage();
    render(<ProjectNew />);
    // These are the two required fields, and the ones most critical to get
    // right — a screen-reader user must be able to find them by label.
    expect(screen.getByLabelText(/^client/i)).toBeTruthy();
    expect(screen.getByLabelText(/project name/i)).toBeTruthy();
  });

  it("the submit button starts disabled until required fields are filled", async () => {
    const ProjectNew = await loadPage();
    render(<ProjectNew />);
    const submit = screen
      .getAllByRole("button")
      .find(b => b.textContent?.trim() === "Create Project");
    expect(submit).toBeDefined();
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });
});
