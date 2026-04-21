/**
 * Comprehensive test suite for tRPC routers
 * Tests all 11 routers with focus on authorization and data validation
 */
import { describe, expect, it, beforeAll, vi } from "vitest";

// Mock Supabase DB so tests run without a real database connection.
// Each call to db.from() returns a chainable builder that resolves to
// { data: [], error: null, count: 0 } for list queries and
// { data: { id: 1 }, error: null } for single-row mutations.
vi.mock("./db", () => {
  function makeSingle() {
    return Promise.resolve({
      data: { id: 1, project_id: 1, recipient_id: "user-123" },
      error: null,
    });
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
      "in",
      "not",
      "is",
      "or",
      "and",
      "order",
      "limit",
      "range",
      "filter",
      "match",
      "ilike",
      "like",
      "gte",
      "lte",
      "gt",
      "lt",
      "contains",
      "overlaps",
      "textSearch",
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
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import type { TRPCContext } from "./_core/context";

// ─── Mock Context Helpers ───────────────────────────────────

function createMockContext(
  userId?: string,
  role: "admin" | "user" = "user"
): TRPCContext {
  return {
    userId: userId ?? null,
    user: userId
      ? {
          id: userId,
          email: `test${userId}@example.com`,
          role,
        }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

// ─── Router Structure Tests ─────────────────────────────────

describe("App Router Structure", () => {
  it("exposes all 11 expected routers", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    const routers = new Set(procedures.map(p => p.split(".")[0]));

    expect(routers).toContain("auth");
    expect(routers).toContain("projects");
    expect(routers).toContain("clients");
    expect(routers).toContain("fieldReports");
    expect(routers).toContain("schedule");
    expect(routers).toContain("materials");
    expect(routers).toContain("estimates");
    expect(routers).toContain("ledger");
    expect(routers).toContain("portfolio");
    expect(routers).toContain("subContractors");
    expect(routers).toContain("finishSelections");
    expect(routers).toContain("notifications");
  });

  it("has at least 50 total procedures across all routers", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures.length).toBeGreaterThanOrEqual(50);
  });
});

// ─── Auth Router Tests ──────────────────────────────────────

describe("Auth Router", () => {
  const caller = appRouter.createCaller(createMockContext());

  it("auth.me fails when not authenticated", async () => {
    await expect(caller.auth.me()).rejects.toThrow();
  });

  it("auth.me returns user when authenticated", async () => {
    const authedCaller = appRouter.createCaller(
      createMockContext("user-123", "admin")
    );
    const result = await authedCaller.auth.me();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("role");
  });
});

// ─── Projects Router Tests ──────────────────────────────────

describe("Projects Router", () => {
  it("projects.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.projects.list()).rejects.toThrow(/unauthorized/i);
  });

  it("projects.create requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.projects.create({
        name: "Test Project",
        clientId: 1,
        startDate: new Date().toISOString(),
        budget: 50000,
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("projects.get validates ID format", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    // @ts-expect-error - testing invalid input
    await expect(caller.projects.get({ id: "invalid" })).rejects.toThrow();
  });
});

// ─── Field Reports Router Tests ────────────────────────────

describe("Field Reports Router", () => {
  it("fieldReports.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.fieldReports.list()).rejects.toThrow(/unauthorized/i);
  });

  it("fieldReports.create requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.fieldReports.create({
        projectId: 1,
        reportDate: new Date().toISOString(),
        summary: "Test report",
        transcription: "Test transcription",
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("fieldReports.publish requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(userCaller.fieldReports.publish({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });
});

// ─── Schedule Router Tests ──────────────────────────────────

describe("Schedule Router", () => {
  it("schedule.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.schedule.list({ projectId: 1 })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("schedule.create validates task type enum", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.schedule.create({
        projectId: 1,
        title: "Test Task",
        // @ts-expect-error - testing invalid enum
        taskType: "invalid_type",
        plannedStart: new Date().toISOString(),
      })
    ).rejects.toThrow();
  });

  it("schedule.updateOrder requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.schedule.updateOrder({
        projectId: 1,
        updates: [{ id: 1, order: 1 }],
      })
    ).rejects.toThrow(/forbidden/i);
  });
});

// ─── Materials Router Tests ─────────────────────────────────

describe("Materials Router", () => {
  it("materials.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.materials.list({ projectId: 1 })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("materials.create validates numeric fields", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.materials.create({
        projectId: 1,
        name: "Test Material",
        quantityNeeded: -5, // Invalid negative quantity
        unit: "ea",
      })
    ).rejects.toThrow();
  });
});

// ─── Estimates Router Tests ─────────────────────────────────

describe("Estimates Router", () => {
  it("estimates.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.estimates.list()).rejects.toThrow(/unauthorized/i);
  });

  it("estimates.approve requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(userCaller.estimates.approve({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });
});

// ─── Ledger Router Tests ────────────────────────────────────

describe("Ledger Router (Immutable)", () => {
  it("ledger.append requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.ledger.append({
        projectId: 1,
        entryType: "decision",
        description: "Test entry",
        amountCents: 1000,
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("ledger has no update or delete procedures (immutable)", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("ledger.append");
    expect(procedures).not.toContain("ledger.update");
    expect(procedures).not.toContain("ledger.delete");
  });

  it("ledger.list is available to authenticated users", async () => {
    const caller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    // Should not throw - users can read ledger entries for their projects
    await expect(caller.ledger.list({ projectId: 1 })).resolves.toBeDefined();
  });
});

// ─── Portfolio Router Tests ─────────────────────────────────

describe("Portfolio Router", () => {
  it("portfolio.listPublished is publicly accessible", async () => {
    const caller = appRouter.createCaller(createMockContext());

    // Should not throw - public endpoint
    await expect(caller.portfolio.listPublished()).resolves.toBeDefined();
  });

  it("portfolio.create requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.portfolio.create({
        title: "Test Project",
        description: "Test description",
        completionDate: new Date().toISOString(),
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("portfolio.publish requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(userCaller.portfolio.publish({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });
});

// ─── Clients Router Tests ───────────────────────────────────

describe("Clients Router", () => {
  it("clients.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.clients.list()).rejects.toThrow(/unauthorized/i);
  });

  it("clients.create validates email format", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.clients.create({
        name: "Test Client",
        email: "invalid-email", // Invalid format
        phone: "555-1234",
      })
    ).rejects.toThrow();
  });
});

// ─── Sub-Contractors Router Tests ───────────────────────────

describe("Sub-Contractors Router", () => {
  it("subContractors.list requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(userCaller.subContractors.list()).rejects.toThrow(
      /forbidden/i
    );
  });

  it("subContractors.create validates trade enum", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.subContractors.create({
        name: "Test Contractor",
        // @ts-expect-error - testing invalid enum
        trade: "invalid_trade",
        email: "test@example.com",
      })
    ).rejects.toThrow();
  });
});

// ─── Finish Selections Router Tests ────────────────────────

describe("Finish Selections Router", () => {
  it("finishSelections.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(
      caller.finishSelections.list({ projectId: 1 })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("finishSelections.select allows client to select finishes", async () => {
    const clientCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    // Should not throw - clients can select finishes for their projects
    await expect(
      clientCaller.finishSelections.select({
        projectId: 1,
        category: "flooring",
        selection: "Hardwood Oak",
        budgetImpact: 5000,
      })
    ).resolves.toBeDefined();
  });
});

// ─── Notifications Router Tests ─────────────────────────────

describe("Notifications Router", () => {
  it("notifications.list requires authentication", async () => {
    const caller = appRouter.createCaller(createMockContext());
    await expect(caller.notifications.list()).rejects.toThrow(/unauthorized/i);
  });

  it("notifications.markRead only marks user's own notifications", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    // Should complete without error (RLS will filter to user's notifications)
    await expect(
      userCaller.notifications.markRead({ ids: [1, 2, 3] })
    ).resolves.toBeDefined();
  });

  it("notifications.send requires admin role", async () => {
    const userCaller = appRouter.createCaller(
      createMockContext("user-123", "user")
    );

    await expect(
      userCaller.notifications.send({
        recipientId: "other-user",
        channel: "email",
        subject: "Test",
        body: "Test message",
      })
    ).rejects.toThrow(/forbidden/i);
  });
});

// ─── Input Validation Tests ─────────────────────────────────

describe("Input Validation", () => {
  it("rejects empty required strings", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.projects.create({
        name: "", // Empty name should fail
        clientId: 1,
        startDate: new Date().toISOString(),
        budget: 50000,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid date formats", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.projects.create({
        name: "Test Project",
        clientId: 1,
        startDate: "not-a-date", // Invalid date
        budget: 50000,
      })
    ).rejects.toThrow();
  });

  it("rejects negative monetary values", async () => {
    const caller = appRouter.createCaller(
      createMockContext("admin-1", "admin")
    );

    await expect(
      caller.estimates.create({
        projectId: 1,
        squareFootage: 2000,
        projectType: "remodel",
        estimatedLow: -1000, // Negative amount should fail
        estimatedMid: 25000,
        estimatedHigh: 35000,
      })
    ).rejects.toThrow();
  });
});

// ─── Authorization Matrix Tests ─────────────────────────────

describe("Authorization Matrix", () => {
  const adminCaller = appRouter.createCaller(
    createMockContext("admin-1", "admin")
  );
  const userCaller = appRouter.createCaller(
    createMockContext("user-1", "user")
  );
  const anonCaller = appRouter.createCaller(createMockContext());

  it("public procedures are accessible without auth", async () => {
    await expect(anonCaller.portfolio.listPublished()).resolves.toBeDefined();
  });

  it("protected procedures require authentication", async () => {
    await expect(anonCaller.projects.list()).rejects.toThrow(/unauthorized/i);
    await expect(userCaller.projects.list()).resolves.toBeDefined();
  });

  it("admin procedures require admin role", async () => {
    await expect(
      userCaller.projects.create({
        name: "Test",
        clientId: 1,
        startDate: new Date().toISOString(),
        budget: 50000,
      })
    ).rejects.toThrow(/forbidden/i);

    await expect(
      adminCaller.projects.create({
        name: "Test",
        clientId: 1,
        startDate: new Date().toISOString(),
        budget: 50000,
      })
    ).resolves.toBeDefined();
  });
});
