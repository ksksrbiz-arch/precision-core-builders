/**
 * finishSelections router tests — auth enforcement, repo delegation with
 * mapped args, the client select path, calcBudgetImpact aggregation, and
 * input validation.
 *
 * The data layer (`../_data/finishSelectionsRepo`) is fully mocked so no real
 * Supabase is hit; every assertion exercises the router's own logic.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_data/finishSelectionsRepo", () => ({
  listFinishSelections: vi.fn(async () => []),
  createFinishSelection: vi.fn(async () => ({ id: 1 })),
  clientApproveFinishSelection: vi.fn(async () => ({
    id: 1,
    client_approved: true,
  })),
  adminApproveFinishSelection: vi.fn(async () => ({
    id: 1,
    eric_approved: true,
  })),
  deleteFinishSelection: vi.fn(async () => ({ success: true })),
  insertClientSelection: vi.fn(async () => ({ id: 2 })),
  listFinishSelectionBudgetFields: vi.fn(async () => []),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as repo from "../_data/finishSelectionsRepo";

const mockRepo = vi.mocked(repo);

function ctx(userId?: string, role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

const anon = () => appRouter.createCaller(ctx());
const user = () => appRouter.createCaller(ctx("u1", "user"));
const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("finishSelections router — authorization", () => {
  it("list requires authentication", async () => {
    await expect(
      anon().finishSelections.list({ projectId: 1 })
    ).rejects.toThrow(/unauthorized/i);
    expect(mockRepo.listFinishSelections).not.toHaveBeenCalled();
  });

  it("calcBudgetImpact requires authentication", async () => {
    await expect(
      anon().finishSelections.calcBudgetImpact({ projectId: 1 })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("clientApprove requires authentication", async () => {
    await expect(
      anon().finishSelections.clientApprove({ id: 1 })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("create requires admin role", async () => {
    await expect(
      user().finishSelections.create({ projectId: 1, itemName: "Faucet" })
    ).rejects.toThrow(/forbidden/i);
    expect(mockRepo.createFinishSelection).not.toHaveBeenCalled();
  });

  it("adminApprove requires admin role", async () => {
    await expect(
      user().finishSelections.adminApprove({ id: 1 })
    ).rejects.toThrow(/forbidden/i);
  });

  it("delete requires admin role", async () => {
    await expect(user().finishSelections.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(mockRepo.deleteFinishSelection).not.toHaveBeenCalled();
  });

  it("clientApprove works for any authenticated user", async () => {
    const res = await user().finishSelections.clientApprove({ id: 7 });
    expect(res).toEqual({ id: 1, client_approved: true });
  });
});

describe("finishSelections router — repo delegation", () => {
  it("list forwards the project id (not the input object)", async () => {
    await user().finishSelections.list({ projectId: 42 });
    expect(mockRepo.listFinishSelections).toHaveBeenCalledTimes(1);
    expect(mockRepo.listFinishSelections).toHaveBeenCalledWith(42);
  });

  it("create forwards the full parsed selection input to the repo", async () => {
    const input = {
      projectId: 5,
      clientId: 9,
      room: "Kitchen",
      category: "Plumbing",
      itemName: "Brushed Nickel Faucet",
      brand: "Kohler",
      sku: "K-560",
      colorName: "Nickel",
      imageUrl: "https://example.com/faucet.png",
      unitPrice: 249.99,
      quantity: 2,
      totalCost: 499.98,
      allowance: 400,
      budgetDelta: 99.98,
      notes: "Client-preferred finish",
    };
    await admin().finishSelections.create(input);
    expect(mockRepo.createFinishSelection).toHaveBeenCalledTimes(1);
    expect(mockRepo.createFinishSelection).toHaveBeenCalledWith(input);
  });

  it("clientApprove delegates with the selection id", async () => {
    await user().finishSelections.clientApprove({ id: 11 });
    expect(mockRepo.clientApproveFinishSelection).toHaveBeenCalledWith(11);
  });

  it("adminApprove delegates with the selection id", async () => {
    await admin().finishSelections.adminApprove({ id: 13 });
    expect(mockRepo.adminApproveFinishSelection).toHaveBeenCalledWith(13);
  });

  it("delete delegates with the selection id", async () => {
    await admin().finishSelections.delete({ id: 17 });
    expect(mockRepo.deleteFinishSelection).toHaveBeenCalledWith(17);
  });

  it("select maps the client-portal input onto insertClientSelection", async () => {
    const res = await user().finishSelections.select({
      projectId: 3,
      category: "Flooring",
      selection: "White Oak Hardwood",
      budgetImpact: 1200,
    });
    expect(res).toEqual({ id: 2 });
    expect(mockRepo.insertClientSelection).toHaveBeenCalledTimes(1);
    expect(mockRepo.insertClientSelection).toHaveBeenCalledWith({
      projectId: 3,
      selection: "White Oak Hardwood",
      category: "Flooring",
      budgetImpact: 1200,
    });
  });
});

describe("finishSelections router — calcBudgetImpact aggregation", () => {
  it("sums deltas and counts pending approvals from the budget fields", async () => {
    mockRepo.listFinishSelectionBudgetFields.mockResolvedValueOnce([
      { budget_delta: 100, client_approved: true, eric_approved: true },
      { budget_delta: 50, client_approved: true, eric_approved: false },
      { budget_delta: 25, client_approved: false, eric_approved: false },
      { budget_delta: null, client_approved: true, eric_approved: true },
    ] as any);

    const res = await user().finishSelections.calcBudgetImpact({
      projectId: 8,
    });

    expect(mockRepo.listFinishSelectionBudgetFields).toHaveBeenCalledWith(8);
    expect(res).toEqual({
      totalDelta: 175,
      approvedDelta: 100,
      pendingApproval: 2,
      total: 4,
    });
  });

  it("returns zeroed totals when a project has no selections", async () => {
    mockRepo.listFinishSelectionBudgetFields.mockResolvedValueOnce([] as any);
    const res = await user().finishSelections.calcBudgetImpact({
      projectId: 9,
    });
    expect(res).toEqual({
      totalDelta: 0,
      approvedDelta: 0,
      pendingApproval: 0,
      total: 0,
    });
  });
});

describe("finishSelections router — input validation", () => {
  it("list rejects non-positive project ids", async () => {
    await expect(
      user().finishSelections.list({ projectId: 0 })
    ).rejects.toThrow();
    expect(mockRepo.listFinishSelections).not.toHaveBeenCalled();
  });

  it("create rejects a non-positive project id", async () => {
    await expect(
      admin().finishSelections.create({ projectId: 0, itemName: "Faucet" })
    ).rejects.toThrow();
    expect(mockRepo.createFinishSelection).not.toHaveBeenCalled();
  });

  it("create rejects an empty item name", async () => {
    await expect(
      admin().finishSelections.create({ projectId: 1, itemName: "" })
    ).rejects.toThrow();
  });

  it("clientApprove rejects a non-positive id", async () => {
    await expect(
      user().finishSelections.clientApprove({ id: 0 })
    ).rejects.toThrow();
    expect(mockRepo.clientApproveFinishSelection).not.toHaveBeenCalled();
  });

  it("select rejects an empty selection", async () => {
    await expect(
      user().finishSelections.select({ projectId: 1, selection: "" })
    ).rejects.toThrow();
    expect(mockRepo.insertClientSelection).not.toHaveBeenCalled();
  });
});
