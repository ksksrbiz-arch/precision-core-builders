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

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

const createMutateAsync = vi.fn(async (_input: unknown) => ({ id: 9 }));
const updateMutateAsync = vi.fn(async (_input: unknown) => ({ id: 1 }));

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
                mutateAsync:
                  routerName === "subContractors" && procName === "create"
                    ? createMutateAsync
                    : routerName === "subContractors" && procName === "update"
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

describe("SubContractorsList create/edit", () => {
  const row = {
    id: 1,
    name: "Apex Framing",
    company: "Apex LLC",
    trade: "framing",
    phone: "541-555-0111",
    email: "apex@example.com",
    license_number: "CCB 123456",
    insurance_expiry: "2020-01-01T00:00:00",
    rating: 3,
    is_active: true,
    notes: "Reliable",
  };

  function renderList() {
    queryState.data = [row];
    queryState.isLoading = false;
    queryState.isError = false;
    return loadPage().then(Page => render(<Page />));
  }

  it("creates a sub without an email — a blank email is omitted, not sent as ''", async () => {
    // `z.string().email()` rejects "", so every sub without an email used to fail
    // to save even though only the name is marked required.
    createMutateAsync.mockClear();
    await renderList();
    fireEvent.click(screen.getByRole("button", { name: /add sub/i }));
    const nameInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "New Sub" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const sent = createMutateAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.name).toBe("New Sub");
    expect(sent.email).toBeUndefined();
    expect(sent.company).toBeUndefined();
  });

  it("edits an existing sub and sends null for cleared fields", async () => {
    updateMutateAsync.mockClear();
    await renderList();
    fireEvent.click(screen.getByRole("button", { name: "Edit Apex Framing" }));
    expect(screen.getByText("Edit Sub-Contractor")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("apex@example.com"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByDisplayValue("Reliable"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Rating"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByLabelText(/active — available/i));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0]).toMatchObject({
      id: 1,
      name: "Apex Framing",
      email: null,
      notes: null,
      company: "Apex LLC",
      trade: "framing",
      rating: 5,
      isActive: false,
    });
  });

  it("flags an expired insurance certificate on the card", async () => {
    await renderList();
    expect(screen.getByText(/insurance expired/i)).toBeTruthy();
  });
});
