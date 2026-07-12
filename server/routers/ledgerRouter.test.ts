/**
 * Ledger router tests — append-only cost/decision log.
 *
 * The `ledger_entries` repo is mocked (vi.mock on "../_data/ledgerRepo") so no
 * real Supabase is hit. These tests assert correct delegation with mapped args
 * (especially the admin `append` mutation and the client-scoped `listVisible`),
 * auth enforcement (admin vs protected vs anonymous), and input validation
 * against the ledger's `entryType` enum and positive-id constraints.
 *
 * The ledger is immutable/append-only: the router exposes reads plus a single
 * `append` mutation and intentionally has no update/delete path — asserted below.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_data/ledgerRepo", () => ({
  appendLedgerEntry: vi.fn(),
  listLedgerEntries: vi.fn(),
  listVisibleLedgerEntries: vi.fn(),
  listAuditLedgerEntries: vi.fn(),
}));

import { appRouter } from "../routers";
import { ledgerRouter } from "./ledgerRouter";
import type { TrpcContext } from "../_core/context";
import {
  appendLedgerEntry,
  listAuditLedgerEntries,
  listLedgerEntries,
  listVisibleLedgerEntries,
} from "../_data/ledgerRepo";

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
  vi.mocked(appendLedgerEntry).mockResolvedValue({ id: 99 } as any);
  vi.mocked(listLedgerEntries).mockResolvedValue({
    data: [],
    total: 0,
  } as any);
  vi.mocked(listVisibleLedgerEntries).mockResolvedValue([] as any);
  vi.mocked(listAuditLedgerEntries).mockResolvedValue([] as any);
});

describe("Ledger Router — authorization", () => {
  it("list requires authentication", async () => {
    await expect(anon().ledger.list({ projectId: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(listLedgerEntries).not.toHaveBeenCalled();
  });

  it("listVisible requires authentication", async () => {
    await expect(anon().ledger.listVisible({ projectId: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(listVisibleLedgerEntries).not.toHaveBeenCalled();
  });

  it("auditLog requires admin role", async () => {
    await expect(user().ledger.auditLog()).rejects.toThrow(/forbidden/i);
    expect(listAuditLedgerEntries).not.toHaveBeenCalled();
  });

  it("append requires admin role (authenticated non-admin is forbidden)", async () => {
    await expect(
      user().ledger.append({
        projectId: 1,
        entryType: "decision",
        title: "t",
        description: "d",
      })
    ).rejects.toThrow(/forbidden/i);
    expect(appendLedgerEntry).not.toHaveBeenCalled();
  });

  it("append rejects anonymous callers before touching the repo", async () => {
    await expect(
      anon().ledger.append({
        projectId: 1,
        entryType: "decision",
        title: "t",
        description: "d",
      })
    ).rejects.toThrow(/unauthorized/i);
    expect(appendLedgerEntry).not.toHaveBeenCalled();
  });
});

describe("Ledger Router — read delegation", () => {
  it("list forwards pagination params to the repo (admin only)", async () => {
    await admin().ledger.list({ projectId: 7, page: 2, pageSize: 25 });
    expect(listLedgerEntries).toHaveBeenCalledTimes(1);
    expect(listLedgerEntries).toHaveBeenCalledWith({
      projectId: 7,
      page: 2,
      pageSize: 25,
    });
  });

  it("list is forbidden for non-admin users (internal ledger)", async () => {
    await expect(user().ledger.list({ projectId: 7 })).rejects.toThrow(
      /forbidden/i
    );
    expect(listLedgerEntries).not.toHaveBeenCalled();
  });

  it("listVisible resolves to the project id scalar, not the input object", async () => {
    await user().ledger.listVisible({ projectId: 42 });
    expect(listVisibleLedgerEntries).toHaveBeenCalledTimes(1);
    expect(listVisibleLedgerEntries).toHaveBeenCalledWith(42);
  });

  it("auditLog defaults the limit to 100 when omitted", async () => {
    await admin().ledger.auditLog();
    expect(listAuditLedgerEntries).toHaveBeenCalledWith(100);
  });

  it("auditLog forwards an explicit limit", async () => {
    await admin().ledger.auditLog({ limit: 15 });
    expect(listAuditLedgerEntries).toHaveBeenCalledWith(15);
  });
});

describe("Ledger Router — append delegation", () => {
  it("maps input plus caller id into the repo, defaulting visibleToClient to true", async () => {
    const res = await admin().ledger.append({
      projectId: 5,
      entryType: "change_order",
      title: "Change order #3",
      description: "Client approved upgraded fixtures",
      amountDelta: 1250.5,
      documentUrl: "https://example.com/co3.pdf",
      documentName: "co3.pdf",
    });

    expect(res).toEqual({ id: 99 });
    expect(appendLedgerEntry).toHaveBeenCalledTimes(1);
    expect(appendLedgerEntry).toHaveBeenCalledWith({
      projectId: 5,
      authorId: "admin-1",
      entryType: "change_order",
      title: "Change order #3",
      description: "Client approved upgraded fixtures",
      amountDelta: 1250.5,
      documentUrl: "https://example.com/co3.pdf",
      documentName: "co3.pdf",
      visibleToClient: true,
    });
  });

  it("passes an explicit visibleToClient=false through unchanged", async () => {
    await admin().ledger.append({
      projectId: 8,
      entryType: "cost_adjustment",
      title: "Internal reconciliation",
      description: "Adjust ledger for supplier credit",
      amountDelta: -300,
      visibleToClient: false,
    });

    expect(appendLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 8,
        authorId: "admin-1",
        entryType: "cost_adjustment",
        amountDelta: -300,
        visibleToClient: false,
      })
    );
    const arg = vi.mocked(appendLedgerEntry).mock.calls[0][0];
    expect(arg.documentUrl).toBeUndefined();
    expect(arg.documentName).toBeUndefined();
  });
});

describe("Ledger Router — input validation", () => {
  it("append rejects an entryType outside the enum", async () => {
    await expect(
      admin().ledger.append({
        projectId: 1,
        entryType: "bogus_type" as any,
        title: "t",
        description: "d",
      })
    ).rejects.toThrow();
    expect(appendLedgerEntry).not.toHaveBeenCalled();
  });

  it("append rejects non-positive project ids", async () => {
    await expect(
      admin().ledger.append({
        projectId: 0,
        entryType: "note",
        title: "t",
        description: "d",
      })
    ).rejects.toThrow();
    expect(appendLedgerEntry).not.toHaveBeenCalled();
  });

  it("append rejects an empty title", async () => {
    await expect(
      admin().ledger.append({
        projectId: 1,
        entryType: "note",
        title: "",
        description: "d",
      })
    ).rejects.toThrow();
    expect(appendLedgerEntry).not.toHaveBeenCalled();
  });

  it("list rejects non-positive project ids", async () => {
    await expect(user().ledger.list({ projectId: -1 })).rejects.toThrow();
    expect(listLedgerEntries).not.toHaveBeenCalled();
  });
});

describe("Ledger Router — immutability", () => {
  it("exposes only reads plus a single append (no update/delete)", () => {
    const procedures = Object.keys(ledgerRouter._def.procedures).sort();
    expect(procedures).toEqual(["append", "auditLog", "list", "listVisible"]);
  });
});
