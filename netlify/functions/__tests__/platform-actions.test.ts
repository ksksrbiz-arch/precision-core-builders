/**
 * Handler tests for platform-actions, focused on the demo-data seeder.
 *
 * The seeder previously inserted columns from an old schema
 * (`start_date`, `budget`, `weather`, `hours_worked`, `quantity`,
 * `unit_cost`, `status`, `vendor`, …) that no longer exist on
 * `drizzle/schema.ts`. Since there is no live database in this
 * environment, these tests assert — column by column — that every insert
 * call uses only real, current column names for its table, so a
 * regression back to stale columns fails here instead of at seed time
 * against a real Supabase project.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAdminToken = vi.fn();
vi.mock("../../../server/_core/auth/verifyToken", () => ({
  verifyAdminToken: (...args: unknown[]) => verifyAdminToken(...args),
}));

vi.mock("../../../server/_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// ─── Fluent Supabase mock ──────────────────────────────────────────────────
// Records every insert payload per table so assertions can check exact
// column names, and returns fake rows with sequential ids so downstream
// `.select().single()` / `.find()` calls (e.g. the PO referencing a
// material id) keep working.

type Row = Record<string, unknown>;

const insertsByTable: Record<string, Row[]> = {};
let nextId = 1;

function withIds(rows: Row[]): Row[] {
  return rows.map(row => ({ id: nextId++, ...row }));
}

function makeQueryBuilder(table: string) {
  const builder: {
    _insertedRows: Row[];
    select: (...args: unknown[]) => typeof builder;
    eq: (...args: unknown[]) => typeof builder;
    like: (...args: unknown[]) => typeof builder;
    in: (...args: unknown[]) => typeof builder;
    limit: (...args: unknown[]) => Promise<{ data: Row[]; error: null }>;
    insert: (payload: Row | Row[]) => typeof builder;
    delete: () => typeof builder;
    single: () => Promise<{ data: Row; error: null }>;
    then: (
      resolve: (v: { data: Row[]; error: null; count: number }) => void
    ) => void;
  } = {
    _insertedRows: [],
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    like() {
      return builder;
    },
    in() {
      return builder;
    },
    async limit() {
      // Only used by the "already seeded" lookup — always report none found
      // so the seeder proceeds and its inserts can be inspected.
      return { data: [], error: null };
    },
    insert(payload: Row | Row[]) {
      const rows = withIds(Array.isArray(payload) ? payload : [payload]);
      insertsByTable[table] = [...(insertsByTable[table] ?? []), ...rows];
      builder._insertedRows = rows;
      return builder;
    },
    delete() {
      return builder;
    },
    async single() {
      return { data: builder._insertedRows[0], error: null };
    },
    then(resolve) {
      resolve({ data: builder._insertedRows, error: null, count: 0 });
    },
  };
  return builder;
}

const supabaseMock = {
  from: (table: string) => makeQueryBuilder(table),
};

const getSupabaseAdmin = vi.fn(() => supabaseMock);
vi.mock("../../../server/_core/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

function mockEvent(body: unknown) {
  return {
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify(body),
  };
}

async function callAction(action: string, params?: Record<string, unknown>) {
  vi.resetModules();
  const { handler } = await import("../platform-actions");
  const response = await handler(
    mockEvent({
      action,
      params,
      adminToken: "admin-setup-token-change-me",
    }) as never,
    {} as never
  );
  return {
    statusCode: response!.statusCode,
    body: JSON.parse(response!.body as string),
  };
}

beforeEach(() => {
  for (const key of Object.keys(insertsByTable)) delete insertsByTable[key];
  nextId = 1;
  getSupabaseAdmin.mockReturnValue(supabaseMock);
  verifyAdminToken.mockResolvedValue({
    ok: true,
    user: {
      id: "admin-1",
      email: "eric@example.com",
      name: "Eric",
      role: "admin",
    },
  });
  vi.stubEnv("SETUP_ADMIN_TOKEN", "admin-setup-token-change-me");
});

describe("seed-demo-data — schema-correct inserts", () => {
  it("inserts a client with only current `clients` columns", async () => {
    const { statusCode, body } = await callAction("seed-demo-data");
    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);

    const validClientColumns = new Set([
      "id",
      "userId",
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zip",
      "notes",
      "leadSource",
      "createdAt",
      "updatedAt",
      // snake_case wire columns as sent to the Supabase client
      "user_id",
      "lead_source",
      "created_at",
      "updated_at",
    ]);

    const [client] = insertsByTable["clients"];
    expect(client).toBeDefined();
    for (const key of Object.keys(client)) {
      expect(validClientColumns.has(key)).toBe(true);
    }
    expect(client.name).toBeTruthy();
    expect(client.email).toBeTruthy();
  });

  it("inserts a project using estimatedBudget/contractedBudget dates, never `budget`/`start_date`/`estimated_completion`", async () => {
    await callAction("seed-demo-data");

    const [project] = insertsByTable["projects"];
    expect(project).toBeDefined();

    // The exact bug that shipped: old column names that no longer exist.
    expect(project).not.toHaveProperty("budget");
    expect(project).not.toHaveProperty("start_date");
    expect(project).not.toHaveProperty("estimated_completion");

    // Current schema column names (snake_case on the wire).
    expect(project).toHaveProperty("client_id");
    expect(project).toHaveProperty("status", "in_progress");
    expect(project).toHaveProperty("estimated_start_date");
    expect(project).toHaveProperty("estimated_end_date");
    expect(
      "estimated_budget" in project || "contracted_budget" in project
    ).toBe(true);

    // Status must be one FieldReportNew.tsx treats as reportable (it only
    // excludes "complete").
    expect(project.status).not.toBe("complete");
  });

  it("inserts field reports using issuesFlagged/materialShortages/tasksCompleted, never weather/hours_worked/crew_size/issues", async () => {
    await callAction("seed-demo-data");

    const reports = insertsByTable["field_reports"];
    expect(reports.length).toBeGreaterThanOrEqual(2);

    for (const report of reports) {
      expect(report).not.toHaveProperty("weather");
      expect(report).not.toHaveProperty("hours_worked");
      expect(report).not.toHaveProperty("crew_size");
      expect(report).not.toHaveProperty("materials_used_list");
      expect(report).not.toHaveProperty("issues");

      expect(report).toHaveProperty("project_id");
      expect(report).toHaveProperty("report_date");
      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("tasks_completed");
      expect(report).toHaveProperty("issues_flagged");
      expect(report).toHaveProperty("material_shortages");
    }

    // At least one report should demonstrate the shortage-flagging field
    // actually being used with real content.
    expect(reports.some(r => typeof r.material_shortages === "string")).toBe(
      true
    );
  });

  it("inserts materials using quantityNeeded/unitPriceCurrent/vendorName/isShortage, never quantity/unit_cost/status/vendor", async () => {
    await callAction("seed-demo-data");

    const materials = insertsByTable["materials"];
    expect(materials.length).toBeGreaterThanOrEqual(5);

    for (const m of materials) {
      expect(m).not.toHaveProperty("quantity");
      expect(m).not.toHaveProperty("unit_cost");
      expect(m).not.toHaveProperty("status");
      expect(m).not.toHaveProperty("vendor");

      expect(m).toHaveProperty("project_id");
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("quantity_needed");
      expect(m).toHaveProperty("unit_price_current");
      expect(m).toHaveProperty("vendor_name");
      expect(m).toHaveProperty("is_shortage");
    }

    const shortages = materials.filter(m => m.is_shortage === true);
    expect(shortages.length).toBe(1);
  });

  it("seeds 6-8 schedule items spanning several weeks with real dates", async () => {
    await callAction("seed-demo-data");

    const items = insertsByTable["schedule_items"];
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(8);

    for (const item of items) {
      expect(item).toHaveProperty("project_id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("planned_start");
      expect(item).toHaveProperty("planned_end");
      expect(typeof item.planned_start).toBe("string");
      expect(typeof item.planned_end).toBe("string");
    }

    const starts = items.map(i =>
      new Date(i.planned_start as string).getTime()
    );
    const ends = items.map(i => new Date(i.planned_end as string).getTime());
    const spanDays =
      (Math.max(...ends) - Math.min(...starts)) / (24 * 60 * 60 * 1000);
    // "a few weeks" — comfortably more than one week of spread.
    expect(spanDays).toBeGreaterThan(14);
  });

  it("seeds one estimate and one purchase order with a matching line item, using only current columns", async () => {
    await callAction("seed-demo-data");

    const estimates = insertsByTable["estimates"];
    expect(estimates.length).toBe(1);
    expect(estimates[0]).toHaveProperty("project_id");
    expect(estimates[0]).toHaveProperty("estimated_low");
    expect(estimates[0]).toHaveProperty("estimated_mid");
    expect(estimates[0]).toHaveProperty("estimated_high");

    const purchaseOrders = insertsByTable["purchase_orders"];
    expect(purchaseOrders.length).toBe(1);
    expect(purchaseOrders[0]).toHaveProperty("project_id");
    expect(purchaseOrders[0]).toHaveProperty("po_number");
    expect(purchaseOrders[0]).toHaveProperty("vendor_name");
    expect(purchaseOrders[0]).toHaveProperty("status");

    const items = insertsByTable["purchase_order_items"];
    expect(items.length).toBe(1);
    expect(items[0]).toHaveProperty("purchase_order_id", purchaseOrders[0].id);
    expect(items[0]).toHaveProperty("description");
    expect(items[0]).toHaveProperty("quantity");
    expect(items[0]).toHaveProperty("unit_price");
    expect(items[0]).toHaveProperty("line_total");
  });

  it("skips reseeding when demo data already exists", async () => {
    vi.resetModules();
    const alreadySeededBuilder = {
      from: (table: string) => {
        if (table === "projects") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            async limit() {
              return { data: [{ id: 1 }], error: null };
            },
          };
        }
        return makeQueryBuilder(table);
      },
    };
    getSupabaseAdmin.mockReturnValue(alreadySeededBuilder);

    const { body } = await callAction("seed-demo-data");
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ alreadySeeded: true });
  });
});

describe("seed-demo-data action name matches the registry", () => {
  it("is registered under seed-demo-data (what setup-database.sh must POST)", async () => {
    vi.resetModules();
    const { handler } = await import("../platform-actions");
    const response = await handler(
      mockEvent({
        action: "seed_demo",
        adminToken: "admin-setup-token-change-me",
      }) as never,
      {} as never
    );
    const body = JSON.parse(response!.body as string);

    expect(response!.statusCode).toBe(400);
    expect(body.availableActions).toContain("seed-demo-data");
    expect(body.availableActions).not.toContain("seed_demo");
  });
});
