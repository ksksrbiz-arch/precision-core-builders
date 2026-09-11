/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const setLocation = vi.fn();

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/training", setLocation],
}));

import Training from "./Training";
import { TOTAL_TRAINING_STEPS, TRAINING_MODULES } from "./training-data";

beforeEach(() => {
  localStorage.clear();
  setLocation.mockClear();
});
afterEach(cleanup);

describe("Training", () => {
  it("renders exactly one h1, before any h2", () => {
    const { container } = render(<Training />);
    const headings = Array.from(container.querySelectorAll("h1, h2"));
    expect(headings[0].tagName).toBe("H1");
    expect(headings.filter(h => h.tagName === "H1").length).toBe(1);
  });

  it("renders every module", () => {
    render(<Training />);
    for (const m of TRAINING_MODULES) {
      expect(screen.getByText(m.title)).toBeTruthy();
    }
  });

  it("starts at zero steps complete", () => {
    render(<Training />);
    expect(
      screen.getByText(`0 of ${TOTAL_TRAINING_STEPS} steps complete`)
    ).toBeTruthy();
  });

  it("checking a step advances the count and persists it", () => {
    render(<Training />);
    const first = TRAINING_MODULES[0];
    fireEvent.click(screen.getByLabelText(first.steps[0].action));
    expect(
      screen.getByText(`1 of ${TOTAL_TRAINING_STEPS} steps complete`)
    ).toBeTruthy();
    expect(localStorage.getItem("pcb.training.progress.v1")).toContain(
      `${first.id}:0`
    );
  });

  it("restores saved progress on mount", () => {
    const first = TRAINING_MODULES[0];
    localStorage.setItem(
      "pcb.training.progress.v1",
      JSON.stringify({
        completedSteps: [`${first.id}:0`],
        completedModules: [],
      })
    );
    render(<Training />);
    expect(
      screen.getByText(`1 of ${TOTAL_TRAINING_STEPS} steps complete`)
    ).toBeTruthy();
  });

  it("'Start over' clears progress", () => {
    render(<Training />);
    const first = TRAINING_MODULES[0];
    fireEvent.click(screen.getByLabelText(first.steps[0].action));
    fireEvent.click(screen.getByRole("button", { name: /start over/i }));
    expect(
      screen.getByText(`0 of ${TOTAL_TRAINING_STEPS} steps complete`)
    ).toBeTruthy();
  });

  it("marking a lesson done is reversible", () => {
    render(<Training />);
    const buttons = screen.getAllByRole("button", {
      name: /mark this lesson done/i,
    });
    fireEvent.click(buttons[0]);
    expect(
      screen.getAllByRole("button", { name: /mark not done/i }).length
    ).toBe(1);
  });

  it("'Open the screen' navigates to the module's admin route", () => {
    render(<Training />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /open the screen/i })[0]
    );
    expect(setLocation).toHaveBeenCalledWith(TRAINING_MODULES[0].path);
  });

  it("every interactive control has an accessible name", () => {
    const { container } = render(<Training />);
    for (const el of Array.from(container.querySelectorAll("button, a"))) {
      // A control is named by aria-label, its own text, or an associated
      // <label for="…"> (how the Radix checkbox buttons get their name).
      const labelled = el.id
        ? container.querySelector(`label[for="${el.id}"]`)
        : null;
      const name =
        el.getAttribute("aria-label") ||
        el.textContent?.trim() ||
        labelled?.textContent?.trim() ||
        "";
      expect(name.length, el.outerHTML.slice(0, 120)).toBeGreaterThan(0);
    }
  });
});
