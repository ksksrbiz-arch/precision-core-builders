/**
 * Estimates router tests — authorization + repo delegation.
 *
 * The data-access layer (`../_data/estimatesRepo`) is fully mocked so no real
 * Supabase call is made. Each test asserts that a procedure forwards the
 * correctly-mapped arguments to its repo function (and that admin-only
 * procedures reject non-admin / unauthenticated callers).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../_data/estimatesRepo", () => ({
  listEstimates: vi.fn(async () => ({ data: [], total: 0 })),
  getEstimateById: vi.fn(async () => ({ id: 1 })),
  createEstimate: vi.fn(async () => ({ id: 1 })),
  updateEstimate: vi.fn(async () => ({ id: 1 })),
  markEstimateSent: vi.fn(async () => ({ id: 1, sent_to_client: true })),
  markEstimateApproved: vi.fn(async () => ({
    id: 1,
    approved_by_client: true,
  })),
  getClientIdForUser: vi.fn(async () => ({ id: 7 })),
  listEstimatesForClient: vi.fn(async () => ({ data: [], total: 0 })),
  deleteEstimate: vi.fn(async () => ({ success: true })),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as repo from "../_data/estimatesRepo";

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
const user = () => appRouter.createCaller(ctx("u1", "user"));
const anon = () => appRouter.createCaller(ctx());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Estimates Router — repo delegation", () => {
  it("list forwards pagination input to listEstimates", async () => {
    const input = { page: 2, pageSize: 10, projectId: 5 };
    await admin().estimates.list(input);
    expect(repo.listEstimates).toHaveBeenCalledTimes(1);
    expect(repo.listEstimates).toHaveBeenCalledWith(input);
  });

  it("getById passes input.id to getEstimateById", async () => {
    await admin().estimates.getById({ id: 42 });
    expect(repo.getEstimateById).toHaveBeenCalledWith(42);
  });

  it("create forwards the full input to createEstimate", async () => {
    const input = {
      projectId: 3,
      clientId: 9,
      squareFootage: 1200,
      projectType: "kitchen remodel",
      complexity: "high" as const,
      materials: ["oak", "quartz"],
      location: "Eugene, OR",
      estimatedLow: 1000,
      estimatedMid: 2000,
      estimatedHigh: 3000,
    };
    const res = await admin().estimates.create(input);
    expect(repo.createEstimate).toHaveBeenCalledWith(input);
    expect(res).toEqual({ id: 1 });
  });

  it("update splits id from the partial field patch", async () => {
    await admin().estimates.update({
      id: 8,
      projectType: "bathroom",
      estimatedMid: 5000,
    });
    expect(repo.updateEstimate).toHaveBeenCalledTimes(1);
    expect(repo.updateEstimate).toHaveBeenCalledWith(8, {
      projectType: "bathroom",
      estimatedMid: 5000,
    });
  });

  it("update with only an id sends an empty patch", async () => {
    await admin().estimates.update({ id: 4 });
    expect(repo.updateEstimate).toHaveBeenCalledWith(4, {});
  });

  it("markSent passes input.id to markEstimateSent", async () => {
    await admin().estimates.markSent({ id: 11 });
    expect(repo.markEstimateSent).toHaveBeenCalledWith(11);
  });

  it("markApproved passes input.id to markEstimateApproved", async () => {
    await admin().estimates.markApproved({ id: 12 });
    expect(repo.markEstimateApproved).toHaveBeenCalledWith(12);
  });

  it("approve delegates to markEstimateApproved", async () => {
    await admin().estimates.approve({ id: 13 });
    expect(repo.markEstimateApproved).toHaveBeenCalledWith(13);
  });

  it("delete passes input.id to deleteEstimate", async () => {
    await admin().estimates.delete({ id: 14 });
    expect(repo.deleteEstimate).toHaveBeenCalledWith(14);
  });
});

describe("Estimates Router — listForClient", () => {
  it("resolves the client then lists that client's estimates", async () => {
    vi.mocked(repo.getClientIdForUser).mockResolvedValueOnce({ id: 7 });
    await user().estimates.listForClient({ projectId: 99 });
    expect(repo.getClientIdForUser).toHaveBeenCalledWith("u1");
    expect(repo.listEstimatesForClient).toHaveBeenCalledWith({
      clientId: 7,
      projectId: 99,
    });
  });

  it("returns an empty page and skips the query when no client exists", async () => {
    vi.mocked(repo.getClientIdForUser).mockResolvedValueOnce(null);
    const res = await user().estimates.listForClient({});
    expect(res).toEqual({ data: [], total: 0 });
    expect(repo.listEstimatesForClient).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    await expect(anon().estimates.listForClient({})).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.getClientIdForUser).not.toHaveBeenCalled();
  });
});

describe("Estimates Router — authorization", () => {
  it("admin procedures reject a non-admin user (forbidden)", async () => {
    const u = user();
    await expect(u.estimates.list({})).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.getById({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.create({})).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.update({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.markSent({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.markApproved({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    await expect(u.estimates.approve({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.estimates.delete({ id: 1 })).rejects.toThrow(/forbidden/i);
    // None of the repo mutations should have run.
    expect(repo.createEstimate).not.toHaveBeenCalled();
    expect(repo.deleteEstimate).not.toHaveBeenCalled();
  });

  it("admin procedures reject an unauthenticated caller (unauthorized)", async () => {
    const a = anon();
    await expect(a.estimates.list({})).rejects.toThrow(/unauthorized/i);
    await expect(a.estimates.delete({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.listEstimates).not.toHaveBeenCalled();
    expect(repo.deleteEstimate).not.toHaveBeenCalled();
  });
});

describe("Estimates Router — input validation", () => {
  it("getById rejects non-positive ids", async () => {
    await expect(admin().estimates.getById({ id: 0 })).rejects.toThrow();
    expect(repo.getEstimateById).not.toHaveBeenCalled();
  });

  it("update requires an id", async () => {
    await expect(
      admin().estimates.update({ projectType: "x" } as any)
    ).rejects.toThrow();
    expect(repo.updateEstimate).not.toHaveBeenCalled();
  });

  it("create rejects an invalid complexity enum", async () => {
    await expect(
      admin().estimates.create({ complexity: "extreme" } as any)
    ).rejects.toThrow();
    expect(repo.createEstimate).not.toHaveBeenCalled();
  });
});
