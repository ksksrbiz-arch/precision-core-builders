// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Calendar } from "./calendar";
import { Facebook, Github } from "./brand-icons";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("major dependency upgrade compatibility", () => {
  it("preserves both social brand icons", () => {
    const { container } = render(
      <>
        <Facebook />
        <Github />
      </>
    );
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.querySelectorAll("path")).toHaveLength(3);
  });

  it("renders the calendar grid and selects a day", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2026, 9, 1)}
        onSelect={onSelect}
      />
    );
    expect(
      container
        .querySelector(".rdp-month_grid")
        ?.classList.contains("border-collapse")
    ).toBe(true);
    const day = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[data-day]")
    ).find(
      button =>
        button.dataset.day === new Date(2026, 9, 15).toLocaleDateString()
    );
    expect(day).toBeDefined();
    fireEvent.click(day!);
    expect(onSelect.mock.calls[0][0]).toEqual(new Date(2026, 9, 15));
  });

  it.each(["horizontal", "vertical"] as const)(
    "preserves %s panel orientation",
    direction => {
      const { container } = render(
        <ResizablePanelGroup direction={direction}>
          <ResizablePanel>A</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>B</ResizablePanel>
        </ResizablePanelGroup>
      );
      expect(
        container
          .querySelector("[data-slot=resizable-panel-group]")
          ?.getAttribute("data-panel-group-direction")
      ).toBe(direction);
      expect(
        screen.getByRole("separator").getAttribute("aria-orientation")
      ).toBe(direction === "horizontal" ? "vertical" : "horizontal");
      expect(screen.getByText("A")).toBeDefined();
      expect(screen.getByText("B")).toBeDefined();
    }
  );
});
