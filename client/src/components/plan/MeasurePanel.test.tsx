/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MeasurePanel } from "./MeasurePanel";
import type { SceneElement } from "@/lib/planScene";

afterEach(cleanup);

const line = (id: string, px: number): SceneElement => ({
  id,
  type: "line",
  x: 0,
  y: 0,
  width: px,
  height: 0,
  points: [
    [0, 0],
    [px, 0],
  ],
});

const rect = (
  id: string,
  w: number,
  h: number,
  pcb?: Record<string, unknown>
): SceneElement => ({
  id,
  type: "rectangle",
  x: 0,
  y: 0,
  width: w,
  height: h,
  customData: pcb ? { pcb: pcb as never } : null,
});

function setup(props: Partial<React.ComponentProps<typeof MeasurePanel>> = {}) {
  const handlers = {
    onScaleChange: vi.fn(),
    onSnapChange: vi.fn(),
    onTag: vi.fn(),
    onAddLabel: vi.fn(),
  };
  render(
    <MeasurePanel
      elements={[]}
      selectedIds={[]}
      scalePxPerFt={null}
      snap="1ft"
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe("MeasurePanel — scale", () => {
  it("says when the plan is uncalibrated and when it is calibrated", () => {
    setup();
    expect(screen.getByTestId("scale-status").textContent).toMatch(
      /not calibrated/i
    );
    cleanup();
    setup({ scalePxPerFt: 19.2 });
    expect(screen.getByTestId("scale-status").textContent).toMatch(
      /calibrated — 1 ft = 19\.2px/i
    );
  });

  it("calibrates from a selected line and a typed real length", () => {
    const h = setup({ elements: [line("l", 240)], selectedIds: ["l"] });
    fireEvent.change(screen.getByLabelText(/real length/i), {
      target: { value: `12' 6"` },
    });
    fireEvent.click(screen.getByRole("button", { name: /set scale/i }));
    expect(h.onScaleChange).toHaveBeenCalledWith(240 / 12.5);
  });

  it("Enter submits, and a bad length shows an error without changing scale", () => {
    const h = setup({ elements: [line("l", 240)], selectedIds: ["l"] });
    const input = screen.getByLabelText(/real length/i);
    fireEvent.change(input, { target: { value: "twelve" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("alert").textContent).toMatch(/enter a length/i);
    expect(h.onScaleChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(h.onScaleChange).toHaveBeenCalledWith(24);
  });

  it("can't calibrate with nothing (or a non-line) selected", () => {
    setup({ elements: [], selectedIds: [] });
    expect(
      (screen.getByLabelText(/real length/i) as HTMLInputElement).disabled
    ).toBe(true);
    expect(screen.getByText(/select one line/i)).toBeTruthy();
  });

  it("offers a reset only once calibrated", () => {
    const h = setup({ scalePxPerFt: 30 });
    fireEvent.click(
      screen.getByRole("button", { name: /reset to 1 grid square/i })
    );
    expect(h.onScaleChange).toHaveBeenCalledWith(null);
    cleanup();
    setup();
    expect(screen.queryByRole("button", { name: /reset to 1 grid/i })).toBe(
      null
    );
  });

  it("reports snap changes", () => {
    const h = setup();
    fireEvent.change(screen.getByLabelText(/snap increment/i), {
      target: { value: "6in" },
    });
    expect(h.onSnapChange).toHaveBeenCalledWith("6in");
  });
});

describe("MeasurePanel — selection", () => {
  it("reads out a rectangle's real size and area", () => {
    setup({ elements: [rect("r", 400, 300)], selectedIds: ["r"] });
    expect(screen.getByTestId("selection-readout").textContent).toContain(
      `20' 0" × 15' 0" · 300 sq ft`
    );
  });

  it("the readout follows the scale", () => {
    setup({
      elements: [rect("r", 400, 300)],
      selectedIds: ["r"],
      scalePxPerFt: 40,
    });
    expect(screen.getByTestId("selection-readout").textContent).toContain(
      `10' 0" × 7' 6" · 75 sq ft`
    );
  });

  it("tags the selection, carrying a typed room name", () => {
    const h = setup({ elements: [rect("r", 400, 300)], selectedIds: ["r"] });
    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: " Kitchen " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^room$/i }));
    expect(h.onTag).toHaveBeenCalledWith(["r"], {
      kind: "room",
      name: "Kitchen",
    });
    fireEvent.click(screen.getByRole("button", { name: /exterior wall/i }));
    expect(h.onTag).toHaveBeenLastCalledWith(["r"], {
      kind: "wall",
      wallType: "exterior",
    });
    fireEvent.click(screen.getByRole("button", { name: /clear marking/i }));
    expect(h.onTag).toHaveBeenLastCalledWith(["r"], null);
  });

  it("shows how an element is currently marked", () => {
    setup({
      elements: [rect("r", 100, 10, { kind: "wall", wallType: "interior" })],
      selectedIds: ["r"],
    });
    expect(screen.getByText(/marked as interior wall/i)).toBeTruthy();
  });

  it("adds a dimension label for a single measurable selection only", () => {
    const h = setup({ elements: [rect("r", 400, 300)], selectedIds: ["r"] });
    fireEvent.click(
      screen.getByRole("button", { name: /add dimension label/i })
    );
    expect(h.onAddLabel).toHaveBeenCalledWith("r");
    cleanup();
    setup({
      elements: [rect("a", 10, 10), rect("b", 10, 10)],
      selectedIds: ["a", "b"],
    });
    expect(screen.getByText(/2 shapes selected/i)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /add dimension label/i })
    ).toBeNull();
  });
});

describe("MeasurePanel — takeoff", () => {
  const els = [
    rect("r1", 400, 300, { kind: "room", name: "Living" }),
    rect("w1", 200, 16, { kind: "wall", wallType: "exterior" }),
    rect("d1", 36, 8, { kind: "door" }),
    rect("d2", 36, 8, { kind: "door" }),
    rect("n1", 36, 8, { kind: "window" }),
    rect("f1", 10, 10, { kind: "fixture", name: "Sink" }),
  ];

  it("totals what's marked", () => {
    setup({ elements: els });
    const t = within(screen.getByTestId("takeoff"));
    expect(t.getByText(/floor area · 300 sq ft/i)).toBeTruthy();
    expect(t.getByText("Living")).toBeTruthy();
    expect(t.getByText(/walls · 10' 0"/i)).toBeTruthy();
    expect(t.getByText(/2 doors · 1 window$/i)).toBeTruthy();
    expect(t.getByText("× 1")).toBeTruthy();
  });

  it("warns that quantities use the default scale until calibrated", () => {
    setup({ elements: els });
    expect(screen.getByText(/default scale\. calibrate/i)).toBeTruthy();
    cleanup();
    setup({ elements: els, scalePxPerFt: 20 });
    expect(screen.queryByText(/default scale\. calibrate/i)).toBeNull();
  });

  it("guides an empty drawing", () => {
    setup({ elements: [rect("x", 100, 100)] }); // untagged
    expect(screen.queryByTestId("takeoff")).toBeNull();
    expect(screen.getByText(/nothing marked yet/i)).toBeTruthy();
  });

  it("flags marked shapes it couldn't measure", () => {
    setup({
      elements: [
        {
          id: "t",
          type: "text",
          x: 0,
          y: 0,
          customData: { pcb: { kind: "room" } },
        },
        rect("r", 200, 200, { kind: "room", name: "A" }),
      ],
    });
    expect(
      screen.getByText(/1 marked shape couldn't be measured/i)
    ).toBeTruthy();
  });
});
