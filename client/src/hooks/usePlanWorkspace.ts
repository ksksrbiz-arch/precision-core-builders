/**
 * Layout state for the site-plan drawing workspace.
 *
 * The builder is used on an Android tablet in the field, so the canvas — not
 * the app chrome — gets the screen:
 *   - "focus" mode takes over the whole viewport (no app sidebar/header);
 *     it's the default on touch devices and anything narrower than a desktop;
 *   - the tools panel is DOCKED beside (landscape) or below (portrait) the
 *     canvas instead of floating over the drawing.
 */
import { useCallback, useEffect, useState } from "react";

/** At or above this width the panel docks to the side; below, to the bottom. */
export const SIDE_DOCK_MIN_WIDTH = 900;
/** Below this width focus mode is on by default (it's a desktop-only luxury to leave it off). */
export const FOCUS_DEFAULT_MAX_WIDTH = 1280;
export const FOCUS_STORAGE_KEY = "pcb_plan_focus";

export type Dock = "side" | "bottom";

export const dockFor = (width: number): Dock =>
  width >= SIDE_DOCK_MIN_WIDTH ? "side" : "bottom";

export const defaultFocus = (coarsePointer: boolean, width: number): boolean =>
  coarsePointer || width < FOCUS_DEFAULT_MAX_WIDTH;

function readStoredFocus(): boolean | null {
  try {
    const v = localStorage.getItem(FOCUS_STORAGE_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null; // storage can be blocked (private mode, kiosk) — fall back
  }
}

function isCoarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

const viewportWidth = () =>
  typeof window === "undefined" ? 1280 : window.innerWidth;

export function usePlanWorkspace() {
  const [width, setWidth] = useState(viewportWidth);
  const [focus, setFocusState] = useState<boolean>(
    () => readStoredFocus() ?? defaultFocus(isCoarsePointer(), viewportWidth())
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // In focus mode the page must not scroll or pull-to-refresh underneath the
  // drawing: on Android Chrome, dragging down at the top of the page reloads it
  // and takes unsaved work with it.
  useEffect(() => {
    if (!focus) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
    };
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    return () => {
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [focus]);

  const setFocus = useCallback((next: boolean) => {
    setFocusState(next);
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // The choice still holds for this visit.
    }
  }, []);

  return { width, dock: dockFor(width), focus, setFocus };
}
