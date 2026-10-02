/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  FOCUS_STORAGE_KEY,
  defaultFocus,
  dockFor,
  usePlanWorkspace,
} from "./usePlanWorkspace";

function setWidth(w: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: w,
  });
}

function mockPointer(coarse: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: coarse && query.includes("coarse"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.overscrollBehavior = "";
  document.body.style.overflow = "";
  mockPointer(false);
});
afterEach(cleanup);

describe("dockFor", () => {
  it.each([
    [412, "bottom"], // phone
    [600, "bottom"], // 8" tablet, portrait
    [800, "bottom"], // 10" tablet, portrait
    [899, "bottom"],
    [900, "side"],
    [960, "side"], // 8" tablet, landscape
    [1280, "side"], // 10" tablet, landscape
    [1500, "side"],
  ])("%ipx → %s", (w, dock) => {
    expect(dockFor(w)).toBe(dock);
  });
});

describe("defaultFocus", () => {
  it("is on for touch devices at any width, and for anything below desktop", () => {
    expect(defaultFocus(true, 1920)).toBe(true);
    expect(defaultFocus(false, 1279)).toBe(true);
    expect(defaultFocus(false, 800)).toBe(true);
  });
  it("is off for a desktop mouse at full width", () => {
    expect(defaultFocus(false, 1280)).toBe(false);
    expect(defaultFocus(false, 1920)).toBe(false);
  });
});

describe("usePlanWorkspace", () => {
  it("starts in focus mode on a tablet and docks by width", () => {
    setWidth(1280);
    mockPointer(true);
    const { result } = renderHook(() => usePlanWorkspace());
    expect(result.current.focus).toBe(true);
    expect(result.current.dock).toBe("side");
  });

  it("re-docks when the tablet rotates", () => {
    setWidth(1280);
    const { result } = renderHook(() => usePlanWorkspace());
    expect(result.current.dock).toBe("side");
    act(() => {
      setWidth(800);
      window.dispatchEvent(new Event("orientationchange"));
    });
    expect(result.current.dock).toBe("bottom");
    act(() => {
      setWidth(1280);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.dock).toBe("side");
  });

  it("remembers the builder's choice and it beats the default", () => {
    setWidth(1920);
    const first = renderHook(() => usePlanWorkspace());
    expect(first.result.current.focus).toBe(false);
    act(() => first.result.current.setFocus(true));
    expect(localStorage.getItem(FOCUS_STORAGE_KEY)).toBe("1");
    first.unmount();
    const second = renderHook(() => usePlanWorkspace());
    expect(second.result.current.focus).toBe(true);

    localStorage.setItem(FOCUS_STORAGE_KEY, "0");
    setWidth(600);
    const third = renderHook(() => usePlanWorkspace());
    expect(third.result.current.focus).toBe(false);
  });

  it("locks page scroll / pull-to-refresh only while in focus mode, and restores it", () => {
    setWidth(800);
    const { result, unmount } = renderHook(() => usePlanWorkspace());
    expect(result.current.focus).toBe(true);
    expect(document.documentElement.style.overscrollBehavior).toBe("none");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => result.current.setFocus(false));
    expect(document.documentElement.style.overscrollBehavior).toBe("");
    expect(document.body.style.overflow).toBe("");
    act(() => result.current.setFocus(true));
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("survives blocked storage", () => {
    setWidth(1920);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePlanWorkspace());
    expect(result.current.focus).toBe(false);
    expect(() => act(() => result.current.setFocus(true))).not.toThrow();
    expect(result.current.focus).toBe(true);
    vi.restoreAllMocks();
  });
});
