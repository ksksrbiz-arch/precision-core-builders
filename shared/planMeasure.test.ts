import { describe, expect, it } from "vitest";
import {
  DEFAULT_PX_PER_FT,
  classifyStamp,
  computeTakeoff,
  effectiveScale,
  formatFeetInches,
  formatSqFt,
  gridSizeFor,
  isClosedPolygon,
  measureElement,
  parseLength,
  polygonArea,
  polylineLength,
  readTag,
  referenceLengthPx,
  scaleFromReference,
  scaleStampElement,
  type PlanElement,
} from "./planMeasure";

const rect = (
  id: string,
  w: number,
  h: number,
  pcb?: Record<string, unknown>
): PlanElement => ({
  id,
  type: "rectangle",
  width: w,
  height: h,
  customData: pcb ? { pcb: pcb as never } : null,
});

describe("scale", () => {
  it("derives px/ft from a reference line", () => {
    expect(scaleFromReference(240, 12)).toBe(20);
    expect(scaleFromReference(0, 12)).toBeNull();
    expect(scaleFromReference(100, 0)).toBeNull();
    expect(scaleFromReference(100, -3)).toBeNull();
    expect(scaleFromReference(NaN, 3)).toBeNull();
    // Absurd scales are refused rather than stored.
    expect(scaleFromReference(1, 1000)).toBeNull();
  });

  it("falls back to the default for a missing or garbage scale", () => {
    expect(effectiveScale(null)).toBe(DEFAULT_PX_PER_FT);
    expect(effectiveScale("20")).toBe(DEFAULT_PX_PER_FT);
    expect(effectiveScale(0)).toBe(DEFAULT_PX_PER_FT);
    expect(effectiveScale(NaN)).toBe(DEFAULT_PX_PER_FT);
    expect(effectiveScale(32.5)).toBe(32.5);
  });

  it("sizes the snap grid from the scale", () => {
    expect(gridSizeFor(20, 1)).toBe(20);
    expect(gridSizeFor(20, 0.5)).toBe(10);
    expect(gridSizeFor(1, 0.1)).toBe(1);
  });
});

describe("geometry", () => {
  it("measures polylines and polygons", () => {
    expect(polylineLength([])).toBe(0);
    expect(
      polylineLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ])
    ).toBe(5);
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ])
    ).toBe(100);
    // Winding order doesn't matter.
    expect(
      polygonArea([
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ])
    ).toBe(100);
    expect(polygonArea([{ x: 0, y: 0 }])).toBe(0);
  });

  it("measures a rectangle at scale", () => {
    // 400×300 px at 20 px/ft → 20' × 15' = 300 sq ft
    const m = measureElement(rect("r", 400, 300), 20)!;
    expect(m.widthFt).toBe(20);
    expect(m.heightFt).toBe(15);
    expect(m.areaSqFt).toBe(300);
    expect(m.perimeterFt).toBe(70);
    expect(m.lengthFt).toBe(20);
  });

  it("scales area quadratically", () => {
    const at20 = measureElement(rect("r", 400, 300), 20)!.areaSqFt;
    const at40 = measureElement(rect("r", 400, 300), 40)!.areaSqFt;
    expect(at40).toBe(at20 / 4);
  });

  it("measures an open line as a run and a closed line as a polygon", () => {
    const open: PlanElement = {
      id: "l",
      type: "line",
      width: 200,
      height: 0,
      points: [
        [0, 0],
        [200, 0],
      ],
    };
    const o = measureElement(open, 20)!;
    expect(o.shape).toBe("line");
    expect(o.lengthFt).toBe(10);
    expect(o.areaSqFt).toBe(0);

    const closed: PlanElement = {
      id: "p",
      type: "line",
      width: 200,
      height: 100,
      points: [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100],
        [0, 0],
      ],
    };
    expect(isClosedPolygon(closed)).toBe(true);
    const c = measureElement(closed, 20)!;
    expect(c.shape).toBe("polygon");
    expect(c.areaSqFt).toBe(50); // 10' × 5'
    expect(c.perimeterFt).toBe(30);
  });

  it("a nearly-closed polygon snaps shut; a wide gap does not", () => {
    const base = (end: [number, number]): PlanElement => ({
      id: "p",
      type: "line",
      points: [[0, 0], [100, 0], [100, 100], end],
    });
    expect(isClosedPolygon(base([2, 1]))).toBe(true);
    expect(isClosedPolygon(base([50, 50]))).toBe(false);
  });

  it("measures an ellipse", () => {
    const m = measureElement(
      { id: "e", type: "ellipse", width: 200, height: 200 },
      20
    )!;
    // circle of 10' diameter
    expect(m.areaSqFt).toBeCloseTo(Math.PI * 25, 1);
    expect(m.perimeterFt).toBeCloseTo(Math.PI * 10, 1);
  });

  it("ignores elements with no geometry we read", () => {
    expect(measureElement({ id: "t", type: "text" }, 20)).toBeNull();
    expect(
      measureElement({ id: "l", type: "line", points: [[0, 0]] }, 20)
    ).toBeNull();
  });
});

describe("formatting", () => {
  it("formats feet and inches to the nearest inch", () => {
    expect(formatFeetInches(12.5)).toBe(`12' 6"`);
    expect(formatFeetInches(0)).toBe(`0' 0"`);
    expect(formatFeetInches(10 + 11.6 / 12)).toBe(`11' 0"`); // rolls up
    expect(formatFeetInches(NaN)).toBe("—");
  });

  it("formats square feet", () => {
    expect(formatSqFt(1234.4)).toBe("1,234 sq ft");
    expect(formatSqFt(NaN)).toBe("—");
  });
});

describe("parseLength", () => {
  it.each([
    ["12", 12],
    ["12.5", 12.5],
    ["12'", 12],
    [`12' 6"`, 12.5],
    ["12'6", 12.5],
    ["12 ft 6 in", 12.5],
    ["12ft", 12],
    [`150"`, 12.5],
    ["150 in", 12.5],
    ["  8' 3\" ", 8.25],
    ["12’ 6”", 12.5], // typographic marks from a phone keyboard
    [".5", 0.5],
  ])("parses %s", (input, feet) => {
    expect(parseLength(input)).toBeCloseTo(feet as number, 6);
  });

  it.each(["", "abc", "0", "-5", `0' 0"`, "12 meters", "1.2.3", `'6"`])(
    "rejects %j",
    input => {
      expect(parseLength(input)).toBeNull();
    }
  );
});

describe("tags", () => {
  it("reads a valid tag and drops malformed ones", () => {
    expect(
      readTag(rect("a", 1, 1, { kind: "room", name: " Kitchen " }))
    ).toEqual({ kind: "room", name: "Kitchen" });
    expect(readTag(rect("a", 1, 1, { kind: "bogus" }))).toBeNull();
    expect(readTag(rect("a", 1, 1))).toBeNull();
    expect(
      readTag(rect("a", 1, 1, { kind: "wall", wallType: "nope" }))
    ).toEqual({ kind: "wall" });
  });

  it("classifies library stamps", () => {
    expect(classifyStamp("Structural", "Exterior Wall")).toEqual({
      kind: "wall",
      wallType: "exterior",
    });
    expect(classifyStamp("Structural", "Interior Wall")?.wallType).toBe(
      "interior"
    );
    expect(classifyStamp("Structural", "Load Bearing")?.wallType).toBe(
      "load-bearing"
    );
    expect(classifyStamp("Structural", "Column/Post")).toBeNull();
    expect(classifyStamp("Openings", 'Window (48")')?.kind).toBe("window");
    expect(classifyStamp("Openings", "Sliding Door")?.kind).toBe("door");
    expect(classifyStamp("Plumbing", "Sink")).toEqual({
      kind: "fixture",
      name: "Sink",
    });
    expect(classifyStamp("Dimensions", "Note Callout")).toBeNull();
  });
});

describe("computeTakeoff", () => {
  const els: PlanElement[] = [
    rect("r1", 400, 300, { kind: "room", name: "Living" }), // 300 sf
    rect("r2", 200, 200, { kind: "room" }), // 100 sf, auto-named
    rect("w1", 200, 16, { kind: "wall", wallType: "exterior" }), // 10 ft
    rect("w2", 16, 300, { kind: "wall", wallType: "exterior" }), // 15 ft
    rect("w3", 160, 10, { kind: "wall", wallType: "interior" }), // 8 ft
    rect("w4", 100, 10, { kind: "wall" }), // 5 ft unspecified
    rect("d1", 36, 8, { kind: "door", name: "Door" }),
    rect("d2", 36, 8, { kind: "door", name: "Door" }),
    rect("n1", 36, 8, { kind: "window", name: "Window" }),
    rect("f1", 10, 10, { kind: "fixture", name: "Sink" }),
    rect("f2", 10, 10, { kind: "fixture", name: "Sink" }),
    rect("f3", 10, 10, { kind: "fixture", name: "Toilet" }),
    rect("untagged", 9999, 9999), // must not count
    { ...rect("gone", 400, 300, { kind: "room" }), isDeleted: true },
    { id: "txt", type: "text", customData: { pcb: { kind: "room" } } },
  ];

  it("rolls everything up", () => {
    const t = computeTakeoff(els, 20);
    expect(t.rooms.map(r => [r.name, r.areaSqFt])).toEqual([
      ["Living", 300],
      ["Room 2", 100],
    ]);
    expect(t.totalFloorAreaSqFt).toBe(400);
    expect(t.walls).toEqual([
      { wallType: "exterior", count: 2, lengthFt: 25 },
      { wallType: "interior", count: 1, lengthFt: 8 },
      { wallType: "unspecified", count: 1, lengthFt: 5 },
    ]);
    expect(t.totalWallFt).toBe(38);
    expect(t.doors).toBe(2);
    expect(t.windows).toBe(1);
    expect(t.fixtures).toEqual([
      { name: "Sink", count: 2 },
      { name: "Toilet", count: 1 },
    ]);
    expect(t.unmeasured).toBe(1); // the tagged-but-textual "room"
  });

  it("is driven by the scale, and falls back safely on a bad one", () => {
    expect(computeTakeoff(els, 40).totalFloorAreaSqFt).toBe(100);
    expect(computeTakeoff(els, null).scalePxPerFt).toBe(DEFAULT_PX_PER_FT);
    expect(computeTakeoff(els, -1).totalFloorAreaSqFt).toBe(400);
  });

  it("an empty drawing yields an empty takeoff", () => {
    const t = computeTakeoff([], 20);
    expect(t.rooms).toEqual([]);
    expect(t.totalFloorAreaSqFt).toBe(0);
    expect(t.walls).toEqual([]);
    expect(t.fixtures).toEqual([]);
  });
});

describe("calibration + stamps", () => {
  it("finds the pixel length of a reference element", () => {
    expect(
      referenceLengthPx({
        id: "l",
        type: "line",
        points: [
          [0, 0],
          [30, 40],
        ],
      })
    ).toBe(50);
    expect(referenceLengthPx(rect("r", 100, 10))).toBe(100);
    expect(referenceLengthPx(rect("r", 10, 100))).toBe(100);
    expect(referenceLengthPx({ id: "t", type: "text" })).toBeNull();
    expect(referenceLengthPx(rect("r", 0, 0))).toBeNull();
  });

  it("scales stamp geometry with the plan scale, leaving text size alone", () => {
    const el = {
      x: 10,
      y: 20,
      width: 100,
      height: 10,
      fontSize: 16,
      points: [
        [0, 0],
        [50, 50],
      ] as const,
    };
    expect(scaleStampElement(el, 20)).toBe(el); // default scale: untouched
    const doubled = scaleStampElement(el, 40);
    expect(doubled).toMatchObject({
      x: 20,
      y: 40,
      width: 200,
      height: 20,
      fontSize: 16,
    });
    expect(doubled.points).toEqual([
      [0, 0],
      [100, 100],
    ]);
    // A wall stamp keeps its real length after rescaling.
    const wall = rect("w", 200, 16);
    const scaled = scaleStampElement(
      { width: wall.width, height: wall.height },
      40
    );
    expect(
      measureElement({ id: "w", type: "rectangle", ...scaled }, 40)!.lengthFt
    ).toBe(measureElement(wall, 20)!.lengthFt);
  });
});
