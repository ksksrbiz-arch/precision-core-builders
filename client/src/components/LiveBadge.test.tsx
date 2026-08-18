/**
 * @vitest-environment jsdom
 *
 * Tests for LiveBadge — asserts the two realtime states render distinct
 * accessible text so screen-reader users can tell a live subscription from
 * a dropped one.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { LiveBadge } from "./LiveBadge";

afterEach(() => {
  cleanup();
});

describe("LiveBadge", () => {
  it("announces a live subscription", () => {
    render(<LiveBadge isLive />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Realtime updates live");
    expect(badge.textContent).toContain("Live");
  });

  it("announces a dropped subscription distinctly", () => {
    render(<LiveBadge isLive={false} />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe(
      "Realtime updates reconnecting"
    );
    expect(badge.textContent).toContain("Reconnecting");
  });

  it("uses a polite live region so updates are not disruptive", () => {
    render(<LiveBadge isLive />);
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it("styles the two states differently", () => {
    const { container: live } = render(<LiveBadge isLive />);
    const liveClass = live.querySelector("[role=status]")!.className;
    cleanup();
    const { container: down } = render(<LiveBadge isLive={false} />);
    const downClass = down.querySelector("[role=status]")!.className;
    expect(liveClass).not.toBe(downClass);
    expect(liveClass).toContain("green");
  });

  it("merges caller classes", () => {
    render(<LiveBadge isLive className="ml-auto" />);
    expect(screen.getByRole("status").className).toContain("ml-auto");
  });
});
