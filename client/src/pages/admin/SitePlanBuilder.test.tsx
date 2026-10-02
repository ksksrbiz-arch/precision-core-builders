/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const queryState: { data: unknown; isError: boolean } = {
  data: undefined,
  isError: false,
};

/** What the (mocked) canvas was given, and what the page asked of it. */
const canvas = vi.hoisted(() => ({
  props: null as null | {
    onChange?: (els: unknown[], appState: unknown) => void;
    excalidrawAPI?: (api: unknown) => void;
  },
  scene: [] as any[],
  updateScene: null as null | ((arg: any) => void),
  mutations: [] as { proc: string; input: any }[],
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: (props: any) => {
    canvas.props = props;
    return null;
  },
  exportToBlob: vi.fn(),
  convertToExcalidrawElements: (els: any[]) => els,
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
            if (routerName === "sitePlans" && procName === "list") {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isError: queryState.isError,
                  refetch: vi.fn(),
                }),
              };
            }
            return {
              useQuery: () => ({
                data: undefined,
                isError: false,
                refetch: vi.fn(),
              }),
              useMutation: () => ({
                mutate: vi.fn(),
                mutateAsync: vi.fn(async (input: unknown) => {
                  canvas.mutations.push({ proc: procName, input });
                  return { id: 99 };
                }),
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

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
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

async function loadPage() {
  vi.resetModules();
  const mod = await import("./SitePlanBuilder");
  return mod.default;
}

describe("SitePlanBuilder", () => {
  it("shows QueryError with a retry control when saved plans fail to load", async () => {
    queryState.data = undefined;
    queryState.isError = true;
    // Force the desktop layout, where the operations panel (and its
    // "Plans" tab, where the saved-plans list lives) renders without
    // needing to toggle any mobile-only visibility state first.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
    const SitePlanBuilder = await loadPage();
    render(<SitePlanBuilder />);
    fireEvent.click(screen.getByRole("button", { name: /^saved$/i }));
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("every discrete control is a real <button> (keyboard-operable by default)", async () => {
    queryState.data = [];
    queryState.isError = false;
    const SitePlanBuilder = await loadPage();
    const { container } = render(<SitePlanBuilder />);
    const clickableDivs = Array.from(
      container.querySelectorAll("div[onclick]")
    );
    expect(clickableDivs.length).toBe(0);
  });

  it("icon-only tool controls have accessible names", async () => {
    queryState.data = [];
    queryState.isError = false;
    const SitePlanBuilder = await loadPage();
    render(<SitePlanBuilder />);
    const buttons = screen.getAllByRole("button");
    const withAriaLabel = buttons.filter(b => b.hasAttribute("aria-label"));
    expect(withAriaLabel.length).toBeGreaterThan(0);
  });

  it("renders exactly one <h1> and doesn't crash on empty data", async () => {
    queryState.data = [];
    queryState.isError = false;
    const SitePlanBuilder = await loadPage();
    const { container } = render(<SitePlanBuilder />);
    const headings = container.querySelectorAll("h1");
    expect(headings.length).toBe(1);
  });

  it("side panels use a responsive width class, not only a fixed pixel width", async () => {
    queryState.data = [];
    queryState.isError = false;
    // Desktop viewport so the operations panel renders.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
    const SitePlanBuilder = await loadPage();
    const { container } = render(<SitePlanBuilder />);
    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(aside!.className).toMatch(/w-full/);
    expect(aside!.className).toMatch(/sm:w-\[360px\]/);
  });
});

// ── Measuring, scale and unsaved-work protection ─────────────────────────

const line = (id: string, px: number, version = 1) => ({
  id,
  type: "line",
  x: 0,
  y: 0,
  width: px,
  height: 0,
  version,
  points: [
    [0, 0],
    [px, 0],
  ],
});

/** Mount the page with a fake canvas API the page can drive. */
async function mountWithCanvas(initial: any[] = []) {
  canvas.mutations = [];
  canvas.scene = initial;
  const updateScene = vi.fn((arg: any) => {
    if (arg.elements) {
      canvas.scene = arg.elements;
      // Real Excalidraw reports every scene change through onChange.
      act(() => {
        canvas.props!.onChange!(arg.elements, { selectedElementIds: {} });
      });
    }
  });
  const api = {
    getSceneElements: () => canvas.scene,
    getAppState: () => ({ scrollX: 0, scrollY: 0, width: 800, height: 600 }),
    getFiles: () => ({}),
    updateScene,
  };
  queryState.data = [];
  queryState.isError = false;
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1280,
  });
  const Page = await loadPage();
  render(<Page />);
  // The page dynamic-imports the (mocked) canvas, then renders it.
  await waitFor(() => expect(canvas.props).not.toBeNull());
  act(() => {
    canvas.props!.excalidrawAPI!(api);
    canvas.props!.onChange!(canvas.scene, { selectedElementIds: {} });
  });
  const emit = (els: any[], selected: string[] = []) => {
    canvas.scene = els;
    act(() => {
      canvas.props!.onChange!(els, {
        selectedElementIds: Object.fromEntries(selected.map(i => [i, true])),
      });
    });
  };
  return { api, updateScene, emit };
}

describe("SitePlanBuilder — measure + unsaved work", () => {
  it("opens the Measure tab with the scale controls", async () => {
    await mountWithCanvas();
    fireEvent.click(screen.getByRole("button", { name: /^measure$/i }));
    expect(screen.getByTestId("scale-status").textContent).toMatch(
      /not calibrated/i
    );
    expect(screen.getByTestId("footer-scale").textContent).toMatch(/default/i);
  });

  it("calibrating from a selected line updates the scale and grid, and marks the plan unsaved", async () => {
    const { emit, updateScene } = await mountWithCanvas([line("l", 240)]);
    expect(screen.queryByTestId("unsaved-indicator")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^measure$/i }));
    emit([line("l", 240)], ["l"]);
    fireEvent.change(screen.getByLabelText(/real length/i), {
      target: { value: "12' 6\"" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set scale/i }));
    expect(screen.getByTestId("footer-scale").textContent).toMatch(/19\.2px/);
    // 1 ft snap at 19.2 px/ft → 19px grid
    expect(updateScene).toHaveBeenCalledWith({ appState: { gridSize: 19 } });
    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
  });

  it("editing the drawing shows 'Unsaved changes'; viewport-only changes don't", async () => {
    const { emit } = await mountWithCanvas([line("l", 240)]);
    emit([line("l", 240)]); // same versions (e.g. scroll/zoom)
    expect(screen.queryByTestId("unsaved-indicator")).toBeNull();
    emit([line("l", 240, 2)]); // edited
    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
  });

  it("saving sends the scale and clears the unsaved flag", async () => {
    const { emit } = await mountWithCanvas([line("l", 240)]);
    fireEvent.click(screen.getByRole("button", { name: /^measure$/i }));
    emit([line("l", 240)], ["l"]);
    fireEvent.change(screen.getByLabelText(/real length/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set scale/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(canvas.mutations.some(m => m.proc === "create")).toBe(true)
    );
    const create = canvas.mutations.find(m => m.proc === "create")!;
    expect(create.input.scalePxPerFt).toBe(20);
    await waitFor(() =>
      expect(screen.queryByTestId("unsaved-indicator")).toBeNull()
    );
  });

  it("re-saving sends the scale only when it changed since the last save", async () => {
    const { emit } = await mountWithCanvas([line("l", 240)]);
    fireEvent.click(screen.getByRole("button", { name: /^measure$/i }));
    emit([line("l", 240)], ["l"]);
    fireEvent.change(screen.getByLabelText(/real length/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set scale/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(canvas.mutations.filter(m => m.proc === "create")).toHaveLength(1)
    );

    // Edit the drawing only → update goes out without a scale.
    emit([line("l", 240, 2)], ["l"]);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(canvas.mutations.filter(m => m.proc === "update")).toHaveLength(1)
    );
    const first = canvas.mutations.filter(m => m.proc === "update")[0]!;
    expect(first.input.id).toBe(99);
    expect(first.input).not.toHaveProperty("scalePxPerFt");

    // Recalibrate → the next update carries the new scale.
    fireEvent.change(screen.getByLabelText(/real length/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set scale/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(canvas.mutations.filter(m => m.proc === "update")).toHaveLength(2)
    );
    expect(
      canvas.mutations.filter(m => m.proc === "update")[1]!.input.scalePxPerFt
    ).toBe(24);
  });

  it("an uncalibrated save sends no scale (so the default applies)", async () => {
    await mountWithCanvas([line("l", 240)]);
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(canvas.mutations.some(m => m.proc === "create")).toBe(true)
    );
    expect(
      canvas.mutations.find(m => m.proc === "create")!.input
    ).not.toHaveProperty("scalePxPerFt");
  });

  it("New with unsaved work asks first; Keep editing leaves the canvas alone", async () => {
    const { emit, updateScene } = await mountWithCanvas([line("l", 240)]);
    emit([line("l", 240, 2)]);
    updateScene.mockClear();
    fireEvent.click(
      screen.getByRole("button", { name: /create new site plan/i })
    );
    expect(screen.getByText(/discard unsaved changes\?/i)).toBeTruthy();
    expect(updateScene).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /keep editing/i }));
    expect(updateScene).not.toHaveBeenCalled();
    expect(screen.getByTestId("unsaved-indicator")).toBeTruthy();
  });

  it("New with unsaved work proceeds after Discard changes", async () => {
    const { emit, updateScene } = await mountWithCanvas([line("l", 240)]);
    emit([line("l", 240, 2)]);
    fireEvent.click(
      screen.getByRole("button", { name: /create new site plan/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({ elements: [] })
    );
    await waitFor(() =>
      expect(screen.queryByTestId("unsaved-indicator")).toBeNull()
    );
  });

  it("New with nothing to lose doesn't ask", async () => {
    const { updateScene } = await mountWithCanvas([line("l", 240)]);
    fireEvent.click(
      screen.getByRole("button", { name: /create new site plan/i })
    );
    expect(screen.queryByText(/discard unsaved changes\?/i)).toBeNull();
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({ elements: [] })
    );
  });

  it("warns on tab close only while there are unsaved changes", async () => {
    const { emit } = await mountWithCanvas([line("l", 240)]);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    emit([line("l", 240, 2)]);
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("marking a selection as a room tags it on the canvas (version bumped)", async () => {
    const rect = {
      id: "r",
      type: "rectangle",
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      version: 1,
    };
    const { emit, updateScene } = await mountWithCanvas([rect]);
    fireEvent.click(screen.getByRole("button", { name: /^measure$/i }));
    emit([rect], ["r"]);
    fireEvent.click(screen.getByRole("button", { name: /^room$/i }));
    const call = updateScene.mock.calls.at(-1)![0];
    expect(call.elements[0].customData).toEqual({ pcb: { kind: "room" } });
    expect(call.elements[0].version).toBe(2);
  });
});
