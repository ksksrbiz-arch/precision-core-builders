import { describe, expect, it } from "vitest";
import {
  dimensionText,
  labelAnchor,
  sceneSignature,
  tagElements,
  type SceneElement,
} from "./planScene";

const rect = (
  id: string,
  w: number,
  h: number,
  extra: Partial<SceneElement> = {}
): SceneElement => ({
  id,
  type: "rectangle",
  x: 0,
  y: 0,
  width: w,
  height: h,
  version: 1,
  ...extra,
});

describe("sceneSignature", () => {
  it("changes when an element is edited, added or removed", () => {
    const a = rect("a", 10, 10);
    const base = sceneSignature([a]);
    expect(sceneSignature([{ ...a, version: 2 }])).not.toBe(base);
    expect(sceneSignature([a, rect("b", 5, 5)])).not.toBe(base);
    expect(sceneSignature([])).not.toBe(base);
  });

  it("ignores deleted elements and is stable across identical scenes", () => {
    const a = rect("a", 10, 10);
    expect(sceneSignature([a, rect("gone", 1, 1, { isDeleted: true })])).toBe(
      sceneSignature([a])
    );
    expect(sceneSignature([a])).toBe(sceneSignature([{ ...a }]));
  });
});

describe("tagElements", () => {
  it("tags only the chosen elements and bumps their version", () => {
    const els = [rect("a", 10, 10), rect("b", 10, 10)];
    const out = tagElements(els, ["a"], { kind: "room", name: "Den" });
    expect(out[0]!.customData).toEqual({ pcb: { kind: "room", name: "Den" } });
    expect(out[0]!.version).toBe(2);
    expect(out[1]).toBe(els[1]); // untouched elements are the same object
    expect(sceneSignature(out)).not.toBe(sceneSignature(els));
  });

  it("preserves other customData and clears just the tag when asked", () => {
    const el = rect("a", 10, 10, {
      customData: { keep: 1, pcb: { kind: "room" } } as never,
    });
    const tagged = tagElements([el], ["a"], { kind: "wall" })[0]!;
    expect(tagged.customData).toEqual({ keep: 1, pcb: { kind: "wall" } });
    const cleared = tagElements([tagged], ["a"], null)[0]!;
    expect(cleared.customData).toEqual({ keep: 1 });
    const bare = tagElements([rect("b", 1, 1)], ["b"], null)[0]!;
    expect(bare.customData).toBeUndefined();
  });
});

describe("dimensionText", () => {
  it("reads a rectangle as W × H · area", () => {
    expect(dimensionText(rect("r", 400, 300), 20)).toBe(
      `20' 0" × 15' 0" · 300 sq ft`
    );
  });

  it("reads an open line as a length and a closed one as area + perimeter", () => {
    expect(
      dimensionText(
        {
          id: "l",
          type: "line",
          points: [
            [0, 0],
            [250, 0],
          ],
        },
        20
      )
    ).toBe(`12' 6"`);
    expect(
      dimensionText(
        {
          id: "p",
          type: "line",
          points: [
            [0, 0],
            [200, 0],
            [200, 100],
            [0, 100],
            [0, 0],
          ],
        },
        20
      )
    ).toBe(`50 sq ft · perimeter 30' 0"`);
  });

  it("returns null for things with no measurable geometry", () => {
    expect(dimensionText({ id: "t", type: "text" }, 20)).toBeNull();
  });
});

describe("labelAnchor", () => {
  it("centres above a rectangle", () => {
    expect(labelAnchor(rect("r", 100, 50, { x: 10, y: 100 }))).toEqual({
      x: 60,
      y: 76,
    });
  });

  it("uses the extent of a line's points", () => {
    expect(
      labelAnchor({
        id: "l",
        type: "line",
        x: 100,
        y: 200,
        points: [
          [0, 0],
          [80, 40],
        ],
      })
    ).toEqual({ x: 140, y: 176 });
  });
});
