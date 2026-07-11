/**
 * Clients router tests — repo delegation, auth enforcement, and input
 * validation.
 *
 * The underlying data layer (`../_data/clientsRepo`) is fully mocked with
 * vi.mock so no real Supabase is hit; each test asserts that the router
 * delegates to the repo with correctly mapped arguments, that admin-only
 * procedures reject non-admin / unauthenticated callers, and that malformed
 * inputs are rejected by the zod schemas.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../_data/clientsRepo", () => ({
  listClients: vi.fn(async () => ({ data: [], total: 0 })),
  getClientById: vi.fn(async () => ({ id: 1, name: "Ada" })),
  createClient: vi.fn(async () => ({ id: 2, name: "Grace" })),
  updateClient: vi.fn(async () => ({ id: 3, name: "Updated" })),
  deleteClient: vi.fn(async () => ({ success: true })),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from "../_data/clientsRepo";

function ctx(userId?: string, role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

const validClient = {
  name: "Grace Hopper",
  email: "grace@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Clients Router — authorization", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.clients.list({})).rejects.toThrow(/unauthorized/i);
  });

  it("list requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.clients.list({})).rejects.toThrow(/forbidden/i);
  });

  it("getById requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.clients.getById({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("create requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.clients.create(validClient)).rejects.toThrow(
      /forbidden/i
    );
  });

  it("update requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.clients.update({ id: 1, name: "x" })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("delete requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.clients.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("create rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.clients.create(validClient)).rejects.toThrow(
      /unauthorized/i
    );
  });
});

describe("Clients Router — repo delegation", () => {
  it("list forwards pagination + search args to listClients", async () => {
    const res = await admin().clients.list({
      page: 2,
      pageSize: 25,
      search: "ada",
    });
    expect(listClients).toHaveBeenCalledTimes(1);
    expect(listClients).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      search: "ada",
    });
    expect(res).toEqual({ data: [], total: 0 });
  });

  it("getById forwards the numeric id to getClientById", async () => {
    const res = await admin().clients.getById({ id: 7 });
    expect(getClientById).toHaveBeenCalledWith(7);
    expect(res).toEqual({ id: 1, name: "Ada" });
  });

  it("create forwards the validated payload to createClient", async () => {
    const input = {
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "5035551234",
      leadSource: "referral",
    };
    const res = await admin().clients.create(input);
    expect(createClient).toHaveBeenCalledWith(input);
    expect(res).toEqual({ id: 2, name: "Grace" });
  });

  it("update maps leadSource/userId to snake_case and strips id", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    await admin().clients.update({
      id: 9,
      name: "New Name",
      leadSource: "web",
      userId,
    });
    expect(updateClient).toHaveBeenCalledTimes(1);
    expect(updateClient).toHaveBeenCalledWith(9, {
      name: "New Name",
      lead_source: "web",
      user_id: userId,
    });
  });

  it("update omits snake_case keys when leadSource/userId are absent", async () => {
    await admin().clients.update({ id: 4, city: "Eugene" });
    expect(updateClient).toHaveBeenCalledWith(4, { city: "Eugene" });
    const [, fields] = (updateClient as any).mock.calls[0];
    expect(fields).not.toHaveProperty("lead_source");
    expect(fields).not.toHaveProperty("user_id");
  });

  it("delete forwards the id to deleteClient", async () => {
    const res = await admin().clients.delete({ id: 5 });
    expect(deleteClient).toHaveBeenCalledWith(5);
    expect(res).toEqual({ success: true });
  });
});

describe("Clients Router — input validation", () => {
  it("getById rejects non-positive ids", async () => {
    await expect(admin().clients.getById({ id: 0 })).rejects.toThrow();
    expect(getClientById).not.toHaveBeenCalled();
  });

  it("getById rejects non-integer ids", async () => {
    await expect(admin().clients.getById({ id: 1.5 })).rejects.toThrow();
  });

  it("create rejects an invalid email", async () => {
    await expect(
      admin().clients.create({ name: "Bad", email: "not-an-email" })
    ).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("create rejects an empty name", async () => {
    await expect(
      admin().clients.create({ name: "", email: "ok@example.com" })
    ).rejects.toThrow();
  });

  it("create rejects a non-uuid userId", async () => {
    await expect(
      admin().clients.create({ ...validClient, userId: "not-a-uuid" })
    ).rejects.toThrow();
  });

  it("list rejects a pageSize above the max", async () => {
    await expect(admin().clients.list({ pageSize: 101 })).rejects.toThrow();
    expect(listClients).not.toHaveBeenCalled();
  });

  it("delete rejects non-positive ids", async () => {
    await expect(admin().clients.delete({ id: -3 })).rejects.toThrow();
    expect(deleteClient).not.toHaveBeenCalled();
  });
});
