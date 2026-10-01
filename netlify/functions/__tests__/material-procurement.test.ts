/**
 * material-procurement — shortage detection and PO drafting.
 *
 * Quantities can arrive as numeric strings from the database. Comparing
 * `"9.00" < "12.00"` is lexicographic and says false, which silently dropped
 * real shortages; the function must compare numerically.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_utils/authGuard", () => ({
  verifyAdmin: vi.fn(async () => ({
    ok: true,
    user: { id: "admin", email: "a@x.com", role: "admin" },
  })),
  verifyAuth: vi.fn(),
}));

let materials: Array<Record<string, unknown>> = [];
const poInserts: Array<Record<string, unknown>> = [];
const materialUpdates: Array<{ id: unknown; patch: Record<string, unknown> }> =
  [];

function from(table: string) {
  const state: { op: string; patch?: Record<string, unknown>; payload?: any } =
    { op: "select" };
  const b: any = {
    select() {
      return b;
    },
    eq(col: string, val: unknown) {
      if (state.op === "update" && table === "materials" && col === "id") {
        materialUpdates.push({ id: val, patch: state.patch! });
      }
      return b;
    },
    insert(payload: any) {
      state.op = "insert";
      state.payload = payload;
      if (table === "purchase_orders") poInserts.push(payload);
      return b;
    },
    update(patch: Record<string, unknown>) {
      state.op = "update";
      state.patch = patch;
      return b;
    },
    single() {
      return Promise.resolve({ data: { id: poInserts.length }, error: null });
    },
    then(resolve: (v: unknown) => void) {
      if (table === "materials" && state.op === "select") {
        resolve({ data: materials, error: null });
      } else {
        resolve({ data: [], error: null });
      }
    },
  };
  return b;
}

vi.mock("../../../server/_core/supabase", () => ({
  getSupabaseAdmin: () => ({ from }),
}));

async function run(body: object) {
  vi.resetModules();
  const { handler } = await import("../material-procurement");
  const res = await handler(
    {
      httpMethod: "POST",
      headers: {
        origin: "https://precision-core.netlify.app",
        authorization: "Bearer t",
      },
      body: JSON.stringify(body),
    } as never,
    {} as never
  );
  return { statusCode: res!.statusCode, body: JSON.parse(res!.body as string) };
}

beforeEach(() => {
  materials = [];
  poInserts.length = 0;
  materialUpdates.length = 0;
});

describe("material-procurement", () => {
  it("requires a projectId", async () => {
    expect((await run({})).statusCode).toBe(400);
  });

  it("detects a shortage when quantities are numeric STRINGS (9 < 12)", async () => {
    materials = [
      {
        id: 1,
        name: "2x6 PT",
        quantity_needed: "12.00",
        quantity_ordered: "9.00",
        unit_price_current: "8.50",
        vendor_name: "Pro Build",
        unit: "ea",
      },
    ];
    const { statusCode, body } = await run({ projectId: 7 });
    expect(statusCode).toBe(200);
    expect(body.shortagesFound).toBe(1);
    expect(body.purchaseOrders).toHaveLength(1);
    // Short by 3 @ $8.50 — arithmetic, not string concatenation.
    expect(body.purchaseOrders[0].items[0].quantity).toBe(3);
    expect(body.purchaseOrders[0].total).toBeCloseTo(25.5);
  });

  it("does not flag fully-ordered, zero-need or unset materials", async () => {
    materials = [
      { id: 1, name: "A", quantity_needed: "10", quantity_ordered: "10" },
      { id: 2, name: "B", quantity_needed: 0, quantity_ordered: 0 },
      { id: 3, name: "C", quantity_needed: null, quantity_ordered: null },
      { id: 4, name: "D", quantity_needed: 5, quantity_ordered: "12" },
    ];
    const { body } = await run({ projectId: 7 });
    expect(body.shortagesFound).toBe(0);
    expect(body.purchaseOrders).toEqual([]);
  });

  it("groups shortages per vendor into separate POs", async () => {
    materials = [
      {
        id: 1,
        name: "A",
        quantity_needed: 5,
        quantity_ordered: 0,
        vendor_name: "V1",
        unit_price_current: 2,
      },
      {
        id: 2,
        name: "B",
        quantity_needed: 5,
        quantity_ordered: 1,
        vendor_name: "V2",
        unit_price_current: 3,
      },
      {
        id: 3,
        name: "C",
        quantity_needed: 2,
        quantity_ordered: 0,
        vendor_name: "V1",
        unit_price_current: 1,
      },
    ];
    const { body } = await run({ projectId: 7 });
    const byVendor = Object.fromEntries(
      body.purchaseOrders.map((po: any) => [po.vendor, po])
    );
    expect(Object.keys(byVendor).sort()).toEqual(["V1", "V2"]);
    expect(byVendor.V1.items).toHaveLength(2);
    expect(byVendor.V1.total).toBe(12); // 5*2 + 2*1
    expect(byVendor.V2.total).toBe(12); // 4*3
  });
});
