import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractBearer, verifyAdminToken, verifyToken } from "./verifyToken";

const SAVED = {
  adminToken: process.env.ADMIN_SESSION_TOKEN,
  adminEmail: process.env.ADMIN_EMAIL,
  nodeEnv: process.env.NODE_ENV,
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
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
