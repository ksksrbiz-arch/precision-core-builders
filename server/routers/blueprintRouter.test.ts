/**
 * Blueprint router tests — auth, validation, and crypto helpers.
 *
 * DB calls are mocked by the shared mock in routers.test.ts via vi.mock
 * on "./db".  We duplicate a tiny mock here so this file runs standalone.
 */
import { describe, expect, it, beforeAll, vi } from "vitest";

vi.mock("../db", () => {
  function makeSingle() {
    return Promise.resolve({ data: null, error: null });
  }
  function makeBuilder(): any {
    const p: any = Promise.resolve({ data: [], error: null, count: 0 });
    const chain = () => makeBuilder();
    for (const m of [
      "select",
      "insert",
      "update",
      "delete",
      "upsert",
      "eq",
      "neq",
      "order",
      "limit",
      "range",
    ]) {
      p[m] = chain;
    }
    p.single = makeSingle;
    p.maybeSingle = () => Promise.resolve({ data: null, error: null });
    return p;
  }
  return {
    db: { from: () => makeBuilder() },
    paginate: () => ({ from: 0, to: 19 }),
  };
});

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  encryptSecret,
  decryptSecret,
  signState,
  verifyState,
  isCryptoConfigured,
} from "../_core/crypto";
import { __verifyOAuthState } from "./blueprintRouter";

beforeAll(() => {
  // Deterministic 32-byte key for encryption helpers.
  process.env.BLUEPRINT_ENCRYPTION_KEY = "a".repeat(64);
});

function ctx(userId?: string, role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

describe("crypto helpers", () => {
  it("isCryptoConfigured reflects BLUEPRINT_ENCRYPTION_KEY", () => {
    expect(isCryptoConfigured()).toBe(true);
  });

  it("encryptSecret + decryptSecret round-trip", () => {
    const plain = "super-secret-token-xyz";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("decryptSecret rejects tampered payloads", () => {
    const enc = encryptSecret("hello");
    // Flip one character of the base64 payload.
    const tampered =
      enc.slice(0, -2) + (enc.endsWith("A") ? "B" : "A") + enc.slice(-1);
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("signState / verifyState accept matching signatures only", () => {
    const raw = "my-state-value";
    const sig = signState(raw);
    expect(verifyState(raw, sig)).toBe(true);
    expect(
      verifyState(
        raw,
        sig.replace(/.$/, x => (x === "0" ? "1" : "0"))
      )
    ).toBe(false);
    expect(verifyState("other", sig)).toBe(false);
  });

  it("throws a clear error when the key is missing", () => {
    const saved = process.env.BLUEPRINT_ENCRYPTION_KEY;
    delete process.env.BLUEPRINT_ENCRYPTION_KEY;
    try {
      expect(() => encryptSecret("x")).toThrow(/BLUEPRINT_ENCRYPTION_KEY/);
    } finally {
      process.env.BLUEPRINT_ENCRYPTION_KEY = saved;
    }
  });
});

describe("Blueprint Router — authorization", () => {
  it("getConnectionStatus requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.blueprint.getConnectionStatus()).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("saveApiKey requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.blueprint.saveApiKey({ apiKey: "bp_test_12345678" })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("attachArtifact requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      userCaller.blueprint.attachArtifact({
        projectId: 1,
        blueprintResourceId: "abc",
        resourceType: "plan",
        visibleToClient: false,
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("buildDeepLink works for any authenticated user", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    const res = await caller.blueprint.buildDeepLink({ projectId: 42 });
    expect(res.url).toMatch(/^https:\/\/blueprint\.am\//);
    expect(res.url).toContain("pcb_project=42");
    expect(res.url).toContain("utm_source=precision-core-builders");
  });
});

describe("Blueprint Router — input validation", () => {
  const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

  it("saveApiKey rejects too-short keys", async () => {
    await expect(
      admin().blueprint.saveApiKey({ apiKey: "short" })
    ).rejects.toThrow();
  });

  it("attachArtifact rejects non-positive project IDs", async () => {
    await expect(
      admin().blueprint.attachArtifact({
        projectId: 0,
        blueprintResourceId: "abc",
        resourceType: "plan",
        visibleToClient: false,
      })
    ).rejects.toThrow();
  });

  it("startOAuth fails when client id is missing", async () => {
    const saved = process.env.BLUEPRINT_CLIENT_ID;
    delete process.env.BLUEPRINT_CLIENT_ID;
    try {
      // Re-import ENV by forcing a fresh caller — ENV is captured at import
      // time so we assert via the validation code path instead.
      const caller = admin();
      await expect(caller.blueprint.startOAuth({})).rejects.toThrow();
    } finally {
      if (saved !== undefined) process.env.BLUEPRINT_CLIENT_ID = saved;
    }
  });
});

describe("OAuth state verification", () => {
  it("rejects empty or malformed state", () => {
    expect(__verifyOAuthState("").ok).toBe(false);
    expect(__verifyOAuthState("no-dot").ok).toBe(false);
    expect(__verifyOAuthState("abc.def").ok).toBe(false);
  });

  it("accepts a freshly-signed state blob", () => {
    const payload = {
      uid: "user-1",
      nonce: "n",
      returnTo: "/admin/blueprint",
      iat: Date.now(),
    };
    const raw = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url"
    );
    const state = `${raw}.${signState(raw)}`;
    const res = __verifyOAuthState(state);
    expect(res.ok).toBe(true);
    expect(res.uid).toBe("user-1");
    expect(res.returnTo).toBe("/admin/blueprint");
  });

  it("rejects expired state blobs", () => {
    const payload = {
      uid: "user-1",
      nonce: "n",
      iat: Date.now() - 11 * 60_000,
    };
    const raw = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url"
    );
    const state = `${raw}.${signState(raw)}`;
    expect(__verifyOAuthState(state).ok).toBe(false);
  });

  it("rejects states with mismatched signatures", () => {
    const payload = { uid: "user-1", nonce: "n", iat: Date.now() };
    const raw = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url"
    );
    const state = `${raw}.${"0".repeat(64)}`;
    expect(__verifyOAuthState(state).ok).toBe(false);
  });
});
