/**
 * Plan measurement — turns Excalidraw geometry into real-world quantities.
 *
 * The site-plan canvas works in pixels. This module is the single place that
 * converts them to feet / square feet, formats and parses lengths the way a
 * builder writes them (12' 6"), and rolls a drawing up into a takeoff.
 *
 * It is pure and shared on purpose: the browser uses it for live readouts and
 * the SERVER uses it to compute the takeoff from the stored plan, so a
 * quantity that reaches an estimate is never one the client merely asserted.
 * Quantities only — dollars stay in `shared/estimating/basis.ts`.
 */

/** 1 foot per 20px grid square, matching the canvas default grid. */
export const DEFAULT_PX_PER_FT = 20;

export type Pt = { x: number; y: number };

export type PlanKind = "room" | "wall" | "door" | "window" | "fixture";
export type WallType = "exterior" | "interior" | "load-bearing";

/** What the builder stamps onto an element via `customData.pcb`. */
export type PlanTag = {
  kind: PlanKind;
  /** Room name, or fixture label. */
  name?: string;
  wallType?: WallType;
};

/** The slice of an Excalidraw element this module reads. */
export type PlanElement = {
  id: string;
  type: string;
  width?: number;
  height?: number;
  points?: readonly (readonly [number, number])[];
  isDeleted?: boolean;
  customData?: { pcb?: Partial<PlanTag> } | null;
};

const KINDS: readonly PlanKind[] = [
  "room",
  "wall",
  "door",
  "window",
  "fixture",
];
const WALL_TYPES: readonly WallType[] = [
  "exterior",
  "interior",
  "load-bearing",
];

/** Round to 2 decimals so float noise never reaches a quantity or a test. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isValidScale(pxPerFt: unknown): pxPerFt is number {
  return (
    typeof pxPerFt === "number" &&
    Number.isFinite(pxPerFt) &&
    pxPerFt >= 0.5 &&
    pxPerFt <= 5000
  );
}

/** A stored/garbage scale falls back to the default rather than poisoning math. */
export function effectiveScale(pxPerFt: unknown): number {
  return isValidScale(pxPerFt) ? pxPerFt : DEFAULT_PX_PER_FT;
}

export const pxToFt = (px: number, pxPerFt: number) => px / pxPerFt;
export const pxToSqFt = (px2: number, pxPerFt: number) =>
  px2 / (pxPerFt * pxPerFt);

export const distance = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

export function polylineLength(points: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1]!, points[i]!);
  }
  return total;
}

/** Shoelace area; the polygon is implicitly closed. Always non-negative. */
export function polygonArea(points: readonly Pt[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Scale from a reference: a line the builder drew over a known real length.
 * Returns null for anything that can't produce a sane scale.
 */
export function scaleFromReference(
  referencePx: number,
  realFeet: number
): number | null {
  if (!(referencePx > 0) || !(realFeet > 0)) return null;
  const scale = referencePx / realFeet;
  return isValidScale(scale) ? scale : null;
}

/** 12.5 → 12' 6"  ·  nearest inch, rolling 11' 11.6" up to 12' 0". */
export function formatFeetInches(feet: number): string {
  if (!Number.isFinite(feet)) return "—";
  const sign = feet < 0 ? "-" : "";
  const totalInches = Math.round(Math.abs(feet) * 12);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${sign}${ft}' ${inch}"`;
}

export function formatSqFt(sqft: number): string {
  if (!Number.isFinite(sqft)) return "—";
  return `${Math.round(sqft).toLocaleString("en-US")} sq ft`;
}

/**
 * Parse a length the way it's written on a job: `12`, `12.5`, `12'`,
 * `12' 6"`, `12'6`, `12 ft 6 in`, `150"`, `150 in`. Bare numbers are feet.
 * Returns feet, or null when it isn't a positive length.
 */
export function parseLength(input: string): number | null {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[′’]/g, "'")
    .replace(/[″”]/g, '"');
  if (!s) return null;

  const num = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
  const ftIn = new RegExp(
    `^${num}\\s*(?:'|ft|feet|foot)\\s*(?:${num}\\s*(?:"|in|inch|inches)?)?$`
  ).exec(s);
  if (ftIn) {
    const feet = parseFloat(ftIn[1]!);
    const inches = ftIn[2] !== undefined ? parseFloat(ftIn[2]) : 0;
    const total = feet + inches / 12;
    return total > 0 ? total : null;
  }

  const inOnly = new RegExp(`^${num}\\s*(?:"|in|inch|inches)$`).exec(s);
  if (inOnly) {
    const total = parseFloat(inOnly[1]!) / 12;
    return total > 0 ? total : null;
  }

  const bare = new RegExp(`^${num}$`).exec(s);
  if (bare) {
    const total = parseFloat(bare[1]!);
    return total > 0 ? total : null;
  }
  return null;
}

/** Excalidraw `gridSize` (px) so snapping lands on `incrementFt` at this scale. */
export function gridSizeFor(pxPerFt: number, incrementFt: number): number {
  return Math.max(1, Math.round(pxPerFt * incrementFt));
}

// ── Geometry of a single element ───────────────────────────────────────────

export type ElementMeasure = {
  shape: "line" | "rect" | "polygon" | "ellipse";
  /** Open path length, or the longest side of a rectangle (a wall's run). */
  lengthFt: number;
  perimeterFt: number;
  widthFt: number;
  heightFt: number;
  areaSqFt: number;
};

const CLOSE_TOLERANCE_PX = 4;

function pointsOf(el: PlanElement): Pt[] {
  return (el.points ?? []).map(([x, y]) => ({ x, y }));
}

export function isClosedPolygon(el: PlanElement): boolean {
  if (el.type !== "line") return false;
  const pts = pointsOf(el);
  if (pts.length < 4) return false;
  return distance(pts[0]!, pts[pts.length - 1]!) <= CLOSE_TOLERANCE_PX;
}

/** Real-world measure of one element, or null if it has no geometry we read. */
export function measureElement(
  el: PlanElement,
  pxPerFt: number
): ElementMeasure | null {
  const s = effectiveScale(pxPerFt);
  const w = el.width ?? 0;
  const h = el.height ?? 0;

  if (el.type === "rectangle") {
    return {
      shape: "rect",
      lengthFt: round2(pxToFt(Math.max(w, h), s)),
      perimeterFt: round2(pxToFt(2 * (w + h), s)),
      widthFt: round2(pxToFt(w, s)),
      heightFt: round2(pxToFt(h, s)),
      areaSqFt: round2(pxToSqFt(w * h, s)),
    };
  }

  if (el.type === "ellipse") {
    const a = w / 2;
    const b = h / 2;
    // Ramanujan's approximation for the perimeter.
    const perimeter =
      Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    return {
      shape: "ellipse",
      lengthFt: round2(pxToFt(Math.max(w, h), s)),
      perimeterFt: round2(pxToFt(perimeter, s)),
      widthFt: round2(pxToFt(w, s)),
      heightFt: round2(pxToFt(h, s)),
      areaSqFt: round2(pxToSqFt(Math.PI * a * b, s)),
    };
  }

  if (el.type === "line" || el.type === "arrow") {
    const pts = pointsOf(el);
    if (pts.length < 2) return null;
    const closed = isClosedPolygon(el);
    const run = polylineLength(pts);
    return {
      shape: closed ? "polygon" : "line",
      lengthFt: round2(pxToFt(run, s)),
      perimeterFt: round2(pxToFt(run, s)),
      widthFt: round2(pxToFt(w, s)),
      heightFt: round2(pxToFt(h, s)),
      areaSqFt: closed ? round2(pxToSqFt(polygonArea(pts), s)) : 0,
    };
  }

  return null;
}

/**
 * Pixel length a calibration line spans: the run of a line/arrow, or the
 * longest side of a rectangle. Null when the element can't act as a reference.
 */
export function referenceLengthPx(el: PlanElement): number | null {
  if (el.type === "line" || el.type === "arrow") {
    const pts = pointsOf(el);
    return pts.length >= 2 ? polylineLength(pts) : null;
  }
  if (el.type === "rectangle") {
    const longest = Math.max(el.width ?? 0, el.height ?? 0);
    return longest > 0 ? longest : null;
  }
  return null;
}

/**
 * Resize a library stamp (designed at the default scale) for a calibrated
 * canvas, so a "10 ft wall" is still 10 ft after the plan is rescaled. Text
 * size is left alone — labels shouldn't balloon with the drawing.
 */
export function scaleStampElement<
  T extends {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: readonly (readonly [number, number])[];
  },
>(el: T, pxPerFt: number): T {
  const k = effectiveScale(pxPerFt) / DEFAULT_PX_PER_FT;
  if (k === 1) return el;
  const out: T = { ...el };
  if (el.x !== undefined) out.x = el.x * k;
  if (el.y !== undefined) out.y = el.y * k;
  if (el.width !== undefined) out.width = el.width * k;
  if (el.height !== undefined) out.height = el.height * k;
  if (el.points) {
    out.points = el.points.map(([px, py]) => [px * k, py * k] as const);
  }
  return out;
}

// ── Tags ───────────────────────────────────────────────────────────────────

/** Read and sanitise `customData.pcb`; anything malformed is "untagged". */
export function readTag(el: PlanElement): PlanTag | null {
  const raw = el.customData?.pcb;
  if (!raw || typeof raw !== "object") return null;
  if (!KINDS.includes(raw.kind as PlanKind)) return null;
  const tag: PlanTag = { kind: raw.kind as PlanKind };
  if (typeof raw.name === "string" && raw.name.trim()) {
    tag.name = raw.name.trim().slice(0, 80);
  }
  if (raw.wallType && WALL_TYPES.includes(raw.wallType as WallType)) {
    tag.wallType = raw.wallType as WallType;
  }
  return tag;
}

/** Tag a library stamp from its category + label (the library is code, not data). */
export function classifyStamp(category: string, label: string): PlanTag | null {
  const l = label.toLowerCase();
  if (category === "Structural") {
    if (l.includes("exterior")) return { kind: "wall", wallType: "exterior" };
    if (l.includes("interior")) return { kind: "wall", wallType: "interior" };
    if (l.includes("load")) return { kind: "wall", wallType: "load-bearing" };
    return null; // columns/posts aren't wall runs
  }
  if (category === "Openings") {
    return l.includes("window")
      ? { kind: "window", name: label }
      : { kind: "door", name: label };
  }
  if (category === "Plumbing" || category === "Electrical") {
    return { kind: "fixture", name: label };
  }
  return null;
}

// ── Takeoff ────────────────────────────────────────────────────────────────

export type TakeoffRoom = {
  id: string;
  name: string;
  areaSqFt: number;
  perimeterFt: number;
};

export type TakeoffWall = {
  wallType: WallType | "unspecified";
  count: number;
  lengthFt: number;
};

export type Takeoff = {
  scalePxPerFt: number;
  rooms: TakeoffRoom[];
  totalFloorAreaSqFt: number;
  walls: TakeoffWall[];
  totalWallFt: number;
  doors: number;
  windows: number;
  fixtures: { name: string; count: number }[];
  /** Tagged elements whose geometry couldn't be measured (e.g. a room drawn as text). */
  unmeasured: number;
};

const WALL_ORDER: readonly (WallType | "unspecified")[] = [
  "exterior",
  "load-bearing",
  "interior",
  "unspecified",
];

/**
 * Roll a drawing up into quantities. Only elements the builder tagged count —
 * an untagged scribble never inflates the numbers.
 */
export function computeTakeoff(
  elements: readonly PlanElement[],
  pxPerFt: unknown
): Takeoff {
  const scale = effectiveScale(pxPerFt);
  const rooms: TakeoffRoom[] = [];
  const wallAcc = new Map<WallType | "unspecified", TakeoffWall>();
  const fixtureAcc = new Map<string, number>();
  let doors = 0;
  let windows = 0;
  let unmeasured = 0;

  for (const el of elements) {
    if (el.isDeleted) continue;
    const tag = readTag(el);
    if (!tag) continue;

    if (tag.kind === "door") {
      doors++;
      continue;
    }
    if (tag.kind === "window") {
      windows++;
      continue;
    }
    if (tag.kind === "fixture") {
      const name = tag.name ?? "Fixture";
      fixtureAcc.set(name, (fixtureAcc.get(name) ?? 0) + 1);
      continue;
    }

    const m = measureElement(el, scale);
    if (tag.kind === "room") {
      if (!m || m.areaSqFt <= 0) {
        unmeasured++;
        continue;
      }
      rooms.push({
        id: el.id,
        name: tag.name ?? `Room ${rooms.length + 1}`,
        areaSqFt: m.areaSqFt,
        perimeterFt: m.perimeterFt,
      });
    } else if (tag.kind === "wall") {
      if (!m || m.lengthFt <= 0) {
        unmeasured++;
        continue;
      }
      const key = tag.wallType ?? "unspecified";
      const cur = wallAcc.get(key) ?? { wallType: key, count: 0, lengthFt: 0 };
      cur.count++;
      cur.lengthFt = round2(cur.lengthFt + m.lengthFt);
      wallAcc.set(key, cur);
    }
  }

  const walls = WALL_ORDER.flatMap(k => {
    const w = wallAcc.get(k);
    return w ? [w] : [];
  });

  return {
    scalePxPerFt: scale,
    rooms,
    totalFloorAreaSqFt: round2(rooms.reduce((n, r) => n + r.areaSqFt, 0)),
    walls,
    totalWallFt: round2(walls.reduce((n, w) => n + w.lengthFt, 0)),
    doors,
    windows,
    fixtures: [...fixtureAcc.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    unmeasured,
  };
}
