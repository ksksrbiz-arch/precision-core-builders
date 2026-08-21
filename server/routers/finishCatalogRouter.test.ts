/**
 * Finish Catalog router tests — public read access, admin gating, and a
 * happy-path per procedure. Mirrors portfolioRouter.test.ts exactly since
 * finishCatalogRouter is a deliberate structural clone of portfolioRouter.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

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

vi.mock("../_data/finishCatalogRepo", () => ({
  finishCatalogRepo: {
    listPublished: vi.fn(async () => [{ id: 1, name: "White Oak Flooring" }]),
    getBySlug: vi.fn(async (slug: string) => ({ id: 2, slug })),
    listAdmin: vi.fn(async () => [{ id: 1, name: "White Oak Flooring" }]),
    create: vi.fn(async (values: any) => ({ id: 7, ...values })),
    update: vi.fn(async (id: number, values: any) => ({ id, ...values })),
    delete: vi.fn(async () => ({ success: true })),
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { finishCatalogRepo } from "../_data/finishCatalogRepo";

const listPublishedMock = vi.mocked(finishCatalogRepo.listPublished);
const getBySlugMock = vi.mocked(finishCatalogRepo.getBySlug);
const listAdminMock = vi.mocked(finishCatalogRepo.listAdmin);
const createMock = vi.mocked(finishCatalogRepo.create);
const updateMock = vi.mocked(finishCatalogRepo.update);
const deleteMock = vi.mocked(finishCatalogRepo.delete);

function ctx(userId?: string, role: "admin" | "user" = "admin"): TrpcContext {
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

describe("Finish Catalog Router — public read access", () => {
  it("listPublished succeeds with no authenticated user", async () => {
    const res = await anon().finishCatalog.listPublished();
    expect(listPublishedMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, name: "White Oak Flooring" }]);
  });

  it("getBySlug succeeds with no authenticated user", async () => {
    const res = await anon().finishCatalog.getBySlug({
      slug: "white-oak-flooring",
    });
    expect(getBySlugMock).toHaveBeenCalledWith("white-oak-flooring");
    expect(res).toEqual({ id: 2, slug: "white-oak-flooring" });
  });
});

describe("Finish Catalog Router — admin authorization", () => {
  it("listAdmin rejects unauthenticated callers", async () => {
    await expect(anon().finishCatalog.listAdmin()).rejects.toThrow(
      /unauthorized/i
    );
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("listAdmin rejects non-admin users", async () => {
    await expect(user().finishCatalog.listAdmin()).rejects.toThrow(
      /forbidden/i
    );
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("create rejects non-admin users", async () => {
    await expect(
      user().finishCatalog.create({ name: "New", slug: "new" })
    ).rejects.toThrow(/forbidden/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects unauthenticated callers", async () => {
    await expect(
      anon().finishCatalog.update({ id: 1, name: "Renamed" })
    ).rejects.toThrow(/unauthorized/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("togglePublished rejects non-admin users", async () => {
    await expect(
      user().finishCatalog.togglePublished({ id: 1, published: true })
    ).rejects.toThrow(/forbidden/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("delete rejects non-admin users", async () => {
    await expect(user().finishCatalog.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("Finish Catalog Router — admin happy paths", () => {
  it("listAdmin delegates to the repo", async () => {
    const res = await admin().finishCatalog.listAdmin();
    expect(listAdminMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, name: "White Oak Flooring" }]);
  });

  it("create maps camelCase input to snake_case columns", async () => {
    await admin().finishCatalog.create({
      name: "White Oak Flooring",
      slug: "white-oak-flooring",
      category: "Flooring",
      brand: "Shaw Floors",
      description: "Wide-plank engineered white oak.",
      priceTier: "$$",
      imageUrl: "https://img.example/oak.jpg",
      featured: true,
      published: true,
      sortOrder: 3,
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      name: "White Oak Flooring",
      slug: "white-oak-flooring",
      category: "Flooring",
      brand: "Shaw Floors",
      description: "Wide-plank engineered white oak.",
      price_tier: "$$",
      image_url: "https://img.example/oak.jpg",
      featured: true,
      published: true,
      sort_order: 3,
    });
  });

  it("create applies schema defaults for featured/published/sortOrder", async () => {
    await admin().finishCatalog.create({ name: "Bare", slug: "bare" });
    const values = createMock.mock.calls[0][0] as Record<string, unknown>;
    expect(values.featured).toBe(false);
    expect(values.published).toBe(false);
    expect(values.sort_order).toBe(0);
  });

  it("update maps priceTier/imageUrl/sortOrder to snake_case", async () => {
    await admin().finishCatalog.update({
      id: 3,
      name: "Renamed",
      priceTier: "$$$",
      imageUrl: "https://img.example/new.jpg",
      sortOrder: 9,
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateMock.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(id).toBe(3);
    expect(patch).toMatchObject({
      name: "Renamed",
      price_tier: "$$$",
      image_url: "https://img.example/new.jpg",
      sort_order: 9,
    });
    expect("priceTier" in patch).toBe(false);
    expect("imageUrl" in patch).toBe(false);
    expect("sortOrder" in patch).toBe(false);
  });

  it("togglePublished forwards the published flag", async () => {
    await admin().finishCatalog.togglePublished({ id: 4, published: false });
    expect(updateMock).toHaveBeenCalledWith(4, { published: false });
  });

  it("delete forwards input.id", async () => {
    const res = await admin().finishCatalog.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("Finish Catalog Router — input validation", () => {
  it("create rejects an empty name", async () => {
    await expect(
      admin().finishCatalog.create({ name: "", slug: "x" })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects an invalid imageUrl", async () => {
    await expect(
      admin().finishCatalog.create({
        name: "T",
        slug: "t",
        imageUrl: "not-a-url",
      })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects an invalid priceTier", async () => {
    await expect(
      admin().finishCatalog.create({
        name: "T",
        slug: "t",
        priceTier: "$$$$" as any,
      })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects a non-positive id", async () => {
    await expect(admin().finishCatalog.update({ id: 0 })).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
