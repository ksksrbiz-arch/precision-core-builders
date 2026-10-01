/**
 * create-admin: admin identity is `public.users.role` + the `admin_emails`
 * allowlist. The old implementation wrote email/full_name/role into `profiles`
 * (which has none of those columns), so it always failed and could never have
 * granted access.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/_core/auth/verifyToken", () => ({
  verifyAdminToken: vi.fn(async () => ({
    ok: true,
    user: { id: "u", email: "e@x.com", name: "E", role: "admin" },
  })),
}));
vi.mock("../../../server/_core/llm", () => ({ invokeLLM: vi.fn() }));

type Call = { table: string; op: string; payload?: unknown; opts?: unknown };
const calls: Call[] = [];
let existingUser: { id: string; role: string } | null = null;
const updateUserById = vi.fn(async () => ({}));

function builder(table: string) {
  let op = "select";
  const b: any = {
    select() {
      return b;
    },
    upsert(payload: unknown, opts: unknown) {
      calls.push({ table, op: "upsert", payload, opts });
      return Promise.resolve({ error: null });
    },
    update(payload: unknown) {
      op = "update";
      calls.push({ table, op, payload });
      return b;
    },
    eq() {
      return b;
    },
    limit() {
      return Promise.resolve({
        data: existingUser ? [existingUser] : [],
        error: null,
      });
    },
    then(resolve: (v: unknown) => void) {
      resolve({ data: null, error: null });
    },
  };
  return b;
}

vi.mock("../../../server/_core/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: (t: string) => builder(t),
    auth: { admin: { updateUserById } },
  }),
}));

async function createAdmin(params: Record<string, unknown>) {
  vi.resetModules();
  const { handler } = await import("../platform-actions");
  const res = await handler(
    {
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify({ action: "create-admin", params, adminToken: "t" }),
    } as never,
    {} as never
  );
  return { statusCode: res!.statusCode, body: JSON.parse(res!.body as string) };
}

beforeEach(() => {
  calls.length = 0;
  existingUser = null;
  updateUserById.mockClear();
  vi.stubEnv("SETUP_ADMIN_TOKEN", "t");
});

describe("create-admin", () => {
  it("allowlists the email (lower-cased) and never touches `profiles`", async () => {
    const { statusCode, body } = await createAdmin({
      email: "  New.Admin@Example.com ",
    });
    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({ allowlisted: true, promoted: false });
    expect(calls.find(c => c.table === "profiles")).toBeUndefined();
    expect(calls[0]).toMatchObject({
      table: "admin_emails",
      op: "upsert",
      payload: { email: "new.admin@example.com" },
    });
    // Not signed up yet -> nothing to promote.
    expect(calls.some(c => c.table === "users" && c.op === "update")).toBe(
      false
    );
  });

  it("promotes an already-registered user and syncs app_metadata", async () => {
    existingUser = { id: "uid-1", role: "user" };
    const { statusCode, body } = await createAdmin({ email: "a@example.com" });
    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({ userId: "uid-1", promoted: true });
    expect(
      calls.find(c => c.table === "users" && c.op === "update")
    ).toMatchObject({
      payload: expect.objectContaining({ role: "admin" }),
    });
    expect(updateUserById).toHaveBeenCalledWith("uid-1", {
      app_metadata: { role: "admin" },
    });
  });

  it("is idempotent for someone who is already an admin", async () => {
    existingUser = { id: "uid-2", role: "admin" };
    const { statusCode, body } = await createAdmin({ email: "a@example.com" });
    expect(statusCode).toBe(200);
    expect(body.data.promoted).toBe(false);
    expect(calls.some(c => c.table === "users" && c.op === "update")).toBe(
      false
    );
  });

  it.each([{}, { email: "" }, { email: "not-an-email" }])(
    "rejects a missing/invalid email (%j)",
    async params => {
      const { statusCode, body } = await createAdmin(params);
      expect(statusCode).toBe(500);
      expect(body.success).toBe(false);
      expect(calls).toHaveLength(0);
    }
  );
});
