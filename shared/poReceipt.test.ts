import { describe, expect, it } from "vitest";
import { planReceipt, remainingReceipts, type PoLine } from "./poReceipt";

const lines = (): PoLine[] => [
  { id: 1, materialId: 10, quantity: 100, quantityReceived: 0 },
  { id: 2, materialId: 11, quantity: 20, quantityReceived: 0 },
  { id: 3, materialId: null, quantity: 5, quantityReceived: 0 },
];

describe("planReceipt", () => {
  it("records only what arrived and leaves the PO partial", () => {
    const plan = planReceipt(lines(), [{ itemId: 1, quantity: 40 }]);
    expect(plan).toEqual({
      ok: true,
      status: "partial",
      lines: [
        {
          itemId: 1,
          materialId: 10,
          delta: 40,
          newReceived: 40,
          complete: false,
        },
      ],
    });
  });

  it("is cumulative: a second receipt adds to the first", () => {
    const state = lines();
    state[0].quantityReceived = 40;
    const plan = planReceipt(state, [{ itemId: 1, quantity: 60 }]);
    expect(plan).toMatchObject({
      ok: true,
      lines: [{ delta: 60, newReceived: 100, complete: true }],
      // lines 2 and 3 still outstanding
      status: "partial",
    });
  });

  it("marks the PO received only when every line is complete", () => {
    const plan = planReceipt(lines(), remainingReceipts(lines()));
    expect(plan).toMatchObject({ ok: true, status: "received" });
    if (plan.ok) expect(plan.lines.every(l => l.complete)).toBe(true);
  });

  it("completes the PO on the receipt that finishes the last line", () => {
    const state = lines();
    state[0].quantityReceived = 100;
    state[1].quantityReceived = 20;
    const plan = planReceipt(state, [{ itemId: 3, quantity: 5 }]);
    expect(plan).toMatchObject({ ok: true, status: "received" });
  });

  it("refuses to over-receive a line", () => {
    const state = lines();
    state[1].quantityReceived = 15;
    const plan = planReceipt(state, [{ itemId: 2, quantity: 6 }]);
    expect(plan).toEqual({
      ok: false,
      error: "Can't receive 6 — only 5 still outstanding on that line.",
    });
  });

  it("rejects empty, non-positive, unknown and duplicate lines", () => {
    expect(planReceipt(lines(), [])).toMatchObject({ ok: false });
    expect(planReceipt(lines(), [{ itemId: 1, quantity: 0 }])).toMatchObject({
      ok: false,
    });
    expect(planReceipt(lines(), [{ itemId: 1, quantity: -3 }])).toMatchObject({
      ok: false,
    });
    expect(planReceipt(lines(), [{ itemId: 99, quantity: 1 }])).toMatchObject({
      ok: false,
      error: expect.stringMatching(/isn't part of this purchase order/),
    });
    expect(
      planReceipt(lines(), [
        { itemId: 1, quantity: 1 },
        { itemId: 1, quantity: 1 },
      ])
    ).toMatchObject({
      ok: false,
      error: expect.stringMatching(/more than once/),
    });
  });

  it("handles fractional quantities without float drift", () => {
    const state: PoLine[] = [
      { id: 1, materialId: null, quantity: 0.3, quantityReceived: 0.1 },
    ];
    const plan = planReceipt(state, [{ itemId: 1, quantity: 0.2 }]);
    expect(plan).toMatchObject({ ok: true, status: "received" });
  });

  it("ignores lines with no ordered quantity when deciding completion", () => {
    const state: PoLine[] = [
      { id: 1, materialId: 1, quantity: 4, quantityReceived: 0 },
      { id: 2, materialId: null, quantity: null, quantityReceived: 0 },
    ];
    expect(planReceipt(state, [{ itemId: 1, quantity: 4 }])).toMatchObject({
      ok: true,
      status: "received",
    });
  });
});

describe("remainingReceipts", () => {
  it("lists only lines with something outstanding", () => {
    const state = lines();
    state[0].quantityReceived = 100;
    state[1].quantityReceived = 5;
    expect(remainingReceipts(state)).toEqual([
      { itemId: 2, quantity: 15 },
      { itemId: 3, quantity: 5 },
    ]);
  });
});
