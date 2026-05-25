/**
 * Tests for auth-sync-role Netlify function.
 *
 * Covers:
 *  - HTTP method / origin gates
 *  - Missing / invalid bearer token
 *  - Missing service-role config
 *  - Allowlisted email → role='admin' upsert
 *  - Non-allowlisted email → role='user' upsert
 *  - Existing admin not on allowlist → role preserved (no downgrade)
 *  - ADMIN_EMAILS env var extends the allowlist
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
};

function mockEvent(
  method = "POST",
  headers: Record<string, string> = {}
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      origin: "https://precision-core.netlify.app",
      ...headers,
    },
    body: null,
  };
}

// ── Supabase client mock ────────────────────────────────────────────────────
const getUserMock = vi.fn();
const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();

function buildFromBuilder() {
  // .from("users").select("role").eq("id", id).maybeSingle()
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
  }));
  // .from("users").upsert(payload, opts)
  return {
    select,
    upsert: upsertMock,
  };
}

const fromMock = vi.fn(() => buildFromBuilder());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

async function loadHandler() {
  vi.resetModules();
  const mod = await import("../auth-sync-role");
  return mod.handler;
}

describe("auth-sync-role function", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-test");
    vi.stubEnv("ADMIN_EMAILS", "");
    getUserMock.mockReset();
    upsertMock.mockReset();
    maybeSingleMock.mockReset();
    fromMock.mockClear();
    upsertMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 204 for OPTIONS preflight", async () => {
    const handler = await loadHandler();
    const res = await handler(mockEvent("OPTIONS") as any, {} as any);
    expect(res.statusCode).toBe(204);
  });

  it("returns 405 for GET", async () => {
    const handler = await loadHandler();
    const res = await handler(
      mockEvent("GET", { authorization: "Bearer x" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(405);
  });

  it("returns 401 when no Authorization header is sent", async () => {
    const handler = await loadHandler();
    const res = await handler(mockEvent("POST") as any, {} as any);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when the bearer token is invalid", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "bad token" },
    });
    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer bad" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(401);
  });

  it("returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer x" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(503);
  });

  it("upserts allowlisted email as admin and returns role='admin'", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-eric",
          email: "ErictAdlock@PrecisionCoreBuilders.com",
          user_metadata: { name: "Eric Tadlock" },
        },
      },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.role).toBe("admin");
    expect(body.email).toBe("erictadlock@precisioncorebuilders.com");

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({
      id: "user-eric",
      email: "erictadlock@precisioncorebuilders.com",
      name: "Eric Tadlock",
      role: "admin",
    });
    expect(opts).toEqual({ onConflict: "id" });
  });

  it("upserts skdev@1commerce.online as admin", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-skdev",
          email: "skdev@1commerce.online",
          user_metadata: {},
        },
      },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).role).toBe("admin");
  });

  it("upserts eric@precisioncorebuilders.com as admin", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-eric-alt",
          email: "eric@precisioncorebuilders.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).role).toBe("admin");
  });

  it("upserts non-allowlisted email as user", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-client",
          email: "client@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).role).toBe("user");
    expect(upsertMock.mock.calls[0][0].role).toBe("user");
  });

  it("preserves existing admin role for users not on the allowlist", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-legacy-admin",
          email: "legacy@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).role).toBe("admin");
    expect(upsertMock.mock.calls[0][0].role).toBe("admin");
  });

  it("honors ADMIN_EMAILS env var as additional allowlist", async () => {
    vi.stubEnv("ADMIN_EMAILS", "extra@example.com, OTHER@example.com");
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-extra",
          email: "other@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).role).toBe("admin");
  });

  it("returns 400 when the authenticated user has no email", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "anon", email: null, user_metadata: {} } },
      error: null,
    });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(400);
  });

  it("returns 500 when the upsert fails", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-eric",
          email: "skdev@1commerce.online",
          user_metadata: {},
        },
      },
      error: null,
    });
    upsertMock.mockResolvedValue({ error: { message: "db down" } });

    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", { authorization: "Bearer good" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(500);
  });
});
