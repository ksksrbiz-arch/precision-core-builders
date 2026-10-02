/**
 * Pure helpers over an Excalidraw scene for the site-plan Measure panel.
 *
 * Kept free of any Excalidraw import so they're unit-testable and so the
 * (lazy-loaded, SSR-hostile) canvas bundle stays out of the dependency graph.
 */
import {
  formatFeetInches,
  formatSqFt,
  measureElement,
  type PlanElement,
  type PlanTag,
} from "@shared/planMeasure";

/** An Excalidraw element, as much as we touch. */
export type SceneElement = PlanElement & {
  x: number;
  y: number;
  version?: number;
  versionNonce?: number;
  updated?: number;
};

/**
 * Cheap change signature: count + summed element versions. Excalidraw bumps an
 * element's `version` on every edit, so this changes when (and only when) the
 * drawing does — not on scroll/zoom/selection — which makes it the "dirty" test.
 */
export function sceneSignature(elements: readonly SceneElement[]): string {
  let live = 0;
  let versions = 0;
  for (const el of elements) {
    if (el.isDeleted) continue;
    live++;
    versions += el.version ?? 0;
  }
  return `${live}:${versions}`;
}

/** Stamp (or clear, with `null`) the `pcb` tag on the given elements. */
export function tagElements(
  elements: readonly SceneElement[],
  ids: readonly string[],
  tag: PlanTag | null
): SceneElement[] {
  const wanted = new Set(ids);
  return elements.map(el => {
    if (!wanted.has(el.id)) return el;
    const { pcb: _drop, ...rest } = el.customData ?? {};
    const customData = tag ? { ...rest, pcb: tag } : rest;
    return {
      ...el,
      customData: Object.keys(customData).length ? customData : undefined,
      // Excalidraw only repaints/persists an element whose version moved.
      version: (el.version ?? 0) + 1,
      versionNonce: Math.floor(Math.random() * 2 ** 31),
      updated: Date.now(),
    } as SceneElement;
  });
}

/** Human readout for one element: "20' 0" × 15' 0" · 300 sq ft". */
export function dimensionText(el: PlanElement, pxPerFt: number): string | null {
  const m = measureElement(el, pxPerFt);
  if (!m) return null;
  if (m.shape === "rect" || m.shape === "ellipse") {
    return `${formatFeetInches(m.widthFt)} × ${formatFeetInches(m.heightFt)} · ${formatSqFt(m.areaSqFt)}`;
  }
  if (m.shape === "polygon") {
    return `${formatSqFt(m.areaSqFt)} · perimeter ${formatFeetInches(m.perimeterFt)}`;
  }
  return formatFeetInches(m.lengthFt);
}

/** Where a dimension label sits: centred above the element's bounding box. */
export function labelAnchor(el: SceneElement): { x: number; y: number } {
  let minX = el.x;
  let maxX = el.x + (el.width ?? 0);
  let minY = el.y;
  if (el.points && el.points.length) {
    const xs = el.points.map(p => el.x + p[0]);
    const ys = el.points.map(p => el.y + p[1]);
    minX = Math.min(...xs);
    maxX = Math.max(...xs);
    minY = Math.min(...ys);
  }
  return { x: (minX + maxX) / 2, y: minY - 24 };
}
