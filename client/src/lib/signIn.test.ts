/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPasswordMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: unknown[]) => signInWithPasswordMock(...a),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => maybeSingleMock() }),
      }),
    }),
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  ADMIN_SESSION_KEY: "pcb-admin-session",
}));

import {
  friendlySignInError,
  resolveRole,
  roleFromMetadata,
  signInWithPassword,
} from "./signIn";

const session = (appRole?: string) => ({
  access_token: "tok",
  user: { id: "u1", app_metadata: appRole ? { role: appRole } : {} },
});

const fetchMock = vi.fn();

beforeEach(() => {
  signInWithPasswordMock.mockReset();
  maybeSingleMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // No sync endpoint / profile row unless a test says otherwise.
  fetchMock.mockResolvedValue({ ok: false });
  maybeSingleMock.mockResolvedValue({ data: null, error: null });
});

describe("roleFromMetadata", () => {
  it("trusts app_metadata only", () => {
    expect(roleFromMetadata({ app_metadata: { role: "admin" } } as never)).toBe(
      "admin"
    );
    expect(roleFromMetadata({ app_metadata: {} } as never)).toBe("user");
  });
});

describe("friendlySignInError", () => {
  it("maps known Supabase messages to plain wording", () => {
    expect(friendlySignInError("Invalid login credentials")).toBe(
      "The email or password is incorrect."
    );
    expect(friendlySignInError(undefined)).toBe(
      "The email or password is incorrect."
    );
    expect(friendlySignInError("Email not confirmed")).toMatch(/confirmed/);
    expect(friendlySignInError("Email rate limit exceeded")).toMatch(
      /Too many attempts/
    );
    expect(friendlySignInError("Something odd")).toBe("Something odd");
  });
});

describe("resolveRole", () => {
  it("prefers the server sync endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ role: "admin" }),
    });
    expect(await resolveRole(session().user as never, "tok")).toBe("admin");
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it("falls back to the users table, then to metadata", async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: "admin" }, error: null });
    expect(await resolveRole(session().user as never, "tok")).toBe("admin");

    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await resolveRole(session("admin").user as never, "tok")).toBe(
      "admin"
    );
    expect(await resolveRole(session().user as never, "tok")).toBe("user");
  });

  it("survives a network failure on the sync endpoint", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await resolveRole(session("admin").user as never, "tok")).toBe(
      "admin"
    );
  });
});

describe("signInWithPassword", () => {
  it("trims the email, clears the legacy admin token and routes admins to /admin", async () => {
    localStorage.setItem("pcb-admin-session", "legacy");
    signInWithPasswordMock.mockResolvedValue({
      data: { session: session("admin") },
      error: null,
    });
    const result = await signInWithPassword("  eric@pcb.com ", "pw");
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "eric@pcb.com",
      password: "pw",
    });
    expect(result).toEqual({ ok: true, destination: "/admin" });
    expect(localStorage.getItem("pcb-admin-session")).toBeNull();
  });

  it("routes clients to /portal", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: session() },
      error: null,
    });
    expect(await signInWithPassword("c@x.com", "pw")).toEqual({
      ok: true,
      destination: "/portal",
    });
  });

  it("returns a friendly error for bad credentials", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    expect(await signInWithPassword("a@b.com", "bad")).toEqual({
      ok: false,
      error: "The email or password is incorrect.",
    });
  });

  it("reports an unreachable service instead of throwing", async () => {
    signInWithPasswordMock.mockRejectedValue(new Error("network"));
    const result = await signInWithPassword("a@b.com", "pw");
    expect(result.ok).toBe(false);
  });
});
