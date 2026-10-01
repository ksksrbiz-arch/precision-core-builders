import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBearer, verifyAdminToken, verifyToken } from "./verifyToken";

// The Supabase path is exercised through a controllable fake admin client.
const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();
let adminClient: unknown = null;
vi.mock("../supabase", () => ({
  getSupabaseAdmin: () => adminClient,
}));

function fakeSupabase() {
  return {
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
    }),
  };
}

const SAVED = {
  adminToken: process.env.ADMIN_SESSION_TOKEN,
  adminEmail: process.env.ADMIN_EMAIL,
  nodeEnv: process.env.NODE_ENV,
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  adminClient = null;
  getUserMock.mockReset();
  maybeSingleMock.mockReset();
  delete process.env.ADMIN_SESSION_TOKEN;
  delete process.env.ADMIN_EMAIL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NODE_ENV = "development";
});

afterEach(() => {
  process.env.ADMIN_SESSION_TOKEN = SAVED.adminToken;
  process.env.ADMIN_EMAIL = SAVED.adminEmail;
  process.env.NODE_ENV = SAVED.nodeEnv;
  process.env.SUPABASE_URL = SAVED.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SAVED.key;
});

describe("extractBearer", () => {
  it("pulls the token out of an Authorization header", () => {
    expect(extractBearer({ authorization: "Bearer abc.def" })).toBe("abc.def");
    expect(extractBearer({ Authorization: "Bearer xyz" })).toBe("xyz");
  });

  it("returns null when absent or malformed", () => {
    expect(extractBearer({})).toBeNull();
    expect(extractBearer({ authorization: "Basic abc" })).toBeNull();
    expect(extractBearer({ authorization: "Bearer " })).toBeNull();
  });
});

describe("verifyToken", () => {
  it("rejects a missing token with 401", async () => {
    const r = await verifyToken(null);
    expect(r).toMatchObject({ ok: false, statusCode: 401 });
  });

  it("accepts the configured admin session token", async () => {
    process.env.ADMIN_SESSION_TOKEN = "secret-admin";
    process.env.ADMIN_EMAIL = "eric@precisioncorebuilders.com";
    const r = await verifyToken("secret-admin");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.role).toBe("admin");
      expect(r.user.email).toBe("eric@precisioncorebuilders.com");
    }
  });

  it("accepts the dev bypass token outside production", async () => {
    const r = await verifyToken("dev-admin-token");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe("admin");
  });

  it("rejects the dev bypass token in production", async () => {
    process.env.NODE_ENV = "production";
    const r = await verifyToken("dev-admin-token");
    expect(r.ok).toBe(false);
  });

  it("reports unconfigured auth when Supabase is unavailable", async () => {
    const r = await verifyToken("some.jwt.token");
    expect(r).toMatchObject({ ok: false, statusCode: 401 });
  });
});

describe("verifyAdminToken", () => {
  it("passes through admin tokens", async () => {
    process.env.ADMIN_SESSION_TOKEN = "secret-admin";
    const r = await verifyAdminToken("secret-admin");
    expect(r.ok).toBe(true);
  });

  it("propagates the underlying failure", async () => {
    const r = await verifyAdminToken(null);
    expect(r).toMatchObject({ ok: false, statusCode: 401 });
  });
});

describe("verifyToken — Supabase role resolution", () => {
  const CONFIRMED = "2026-01-01T00:00:00Z";

  beforeEach(() => {
    adminClient = fakeSupabase();
  });

  it("never grants admin from user-writable user_metadata.role", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "attacker@example.com",
          email_confirmed_at: CONFIRMED,
          app_metadata: {},
          user_metadata: { role: "admin" },
        },
      },
      error: null,
    });
    // No public.users row yet — the fallback path must not trust user_metadata.
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const r = await verifyToken("a.jwt");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe("user");
    expect(await verifyAdminToken("a.jwt")).toMatchObject({
      ok: false,
      statusCode: 403,
    });
  });

  it("honours app_metadata.role when the profile row is unavailable", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u2",
          email: "eric@precisioncorebuilders.com",
          email_confirmed_at: CONFIRMED,
          app_metadata: { role: "admin" },
          user_metadata: {},
        },
      },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "rls" },
    });

    const r = await verifyToken("a.jwt");
    expect(r.ok && r.user.role).toBe("admin");
  });

  it("uses the public.users role when present", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u3",
          email: "eric@precisioncorebuilders.com",
          email_confirmed_at: CONFIRMED,
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const r = await verifyToken("a.jwt");
    expect(r.ok && r.user.role).toBe("admin");
  });

  it("demotes an admin whose email was never confirmed", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u4",
          email: "eric@precisioncorebuilders.com",
          email_confirmed_at: null,
          app_metadata: { role: "admin" },
          user_metadata: {},
        },
      },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const r = await verifyToken("a.jwt");
    expect(r.ok && r.user.role).toBe("user");
  });

  it("rejects an invalid JWT", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "bad" },
    });
    expect(await verifyToken("bad")).toMatchObject({
      ok: false,
      statusCode: 401,
    });
  });
});

describe("verifyToken — admin session token comparison", () => {
  it("rejects a near-miss of the admin session token", async () => {
    process.env.ADMIN_SESSION_TOKEN = "secret-admin";
    expect((await verifyToken("secret-admiN")).ok).toBe(false);
    expect((await verifyToken("secret-admin ")).ok).toBe(false);
  });
});
