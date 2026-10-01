/**
 * Regression tests: functions that read/write private business data through the
 * service-role DB (no per-tenant scoping) must be admin-only. They used to be
 * `auth: "user"`, which let any signed-in portal client search every other
 * client's records, inject field reports into arbitrary projects, and burn paid
 * vision-model credits.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../server/_core/auth/verifyToken", () => {
  const users: Record<string, { id: string; email: string; role: string }> = {
    "client-token": { id: "u-client", email: "c@example.com", role: "user" },
    "admin-token": { id: "u-admin", email: "a@example.com", role: "admin" },
  };
  const verifyToken = async (token: string | null) => {
    const user = token ? users[token] : undefined;
    return user
      ? { ok: true as const, user: { ...user, name: null } }
      : { ok: false as const, statusCode: 401 as const, message: "bad token" };
  };
  return {
    extractBearer: (h: Record<string, string | undefined>) =>
      h["authorization"]?.replace(/^Bearer /, "") || null,
    verifyToken,
    verifyAdminToken: async (token: string | null) => {
      const r = await verifyToken(token);
      if (!r.ok) return r;
      return r.user.role === "admin"
        ? r
        : {
            ok: false as const,
            statusCode: 403 as const,
            message: "Admin access required",
          };
    },
  };
});

function ev(token: string, body: object = {}) {
  return {
    httpMethod: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://precision-core.netlify.app",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

const handlers = {
  search: () => import("../search"),
  "voice-to-report": () => import("../voice-to-report"),
  "vision-studio": () => import("../vision-studio"),
};

describe.each(Object.entries(handlers))("%s is admin-only", (_name, load) => {
  it("rejects a signed-in portal client with 403", async () => {
    const { handler } = await load();
    const res = await handler(
      ev("client-token", { query: "smith" }),
      {} as any
    );
    expect(res!.statusCode).toBe(403);
  });

  it("rejects an anonymous caller with 401", async () => {
    const { handler } = await load();
    const res = await handler(ev("nope", { query: "smith" }), {} as any);
    expect(res!.statusCode).toBe(401);
  });

  it("lets an admin past the auth guard", async () => {
    const { handler } = await load();
    // Empty body => the handler's own validation runs (400), proving the guard
    // let the admin through without needing live providers.
    const res = await handler(ev("admin-token", {}), {} as any);
    expect([400, 413, 500, 503]).toContain(res!.statusCode);
    expect(res!.statusCode).not.toBe(403);
    expect(res!.statusCode).not.toBe(401);
  });
});
