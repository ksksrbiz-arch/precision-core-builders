/**
 * Portfolio router tests — public read access, admin gating, and a happy-path
 * per procedure.
 *
 * The `portfolioRepo` data layer is fully mocked so no real Supabase is hit; we
 * assert on the arguments the router hands each repo method (including its
 * camelCase → snake_case insert/update mapping). `../db` is also mocked
 * (mirroring vendorsRouter.test.ts) so importing the full appRouter never
 * constructs a live client.
 *
 * The distinguishing case here: `listPublished` and `getBySlug` are
 * publicProcedures — they MUST succeed with no authenticated user — while the
 * admin CRUD procedures gate.
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

vi.mock("../_data/portfolioRepo", () => ({
  portfolioRepo: {
    listPublished: vi.fn(async () => [{ id: 1, title: "Riverside Estate" }]),
    getBySlug: vi.fn(async (slug: string) => ({ id: 2, slug })),
    listAdmin: vi.fn(async () => [{ id: 1, title: "Riverside Estate" }]),
    create: vi.fn(async (values: any) => ({ id: 7, ...values })),
    update: vi.fn(async (id: number, values: any) => ({ id, ...values })),
    delete: vi.fn(async () => ({ success: true })),
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { portfolioRepo } from "../_data/portfolioRepo";

const listPublishedMock = vi.mocked(portfolioRepo.listPublished);
const getBySlugMock = vi.mocked(portfolioRepo.getBySlug);
const listAdminMock = vi.mocked(portfolioRepo.listAdmin);
const createMock = vi.mocked(portfolioRepo.create);
const updateMock = vi.mocked(portfolioRepo.update);
const deleteMock = vi.mocked(portfolioRepo.delete);

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

describe("Portfolio Router — public read access", () => {
  it("listPublished succeeds with no authenticated user", async () => {
    const res = await anon().portfolio.listPublished();
    expect(listPublishedMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, title: "Riverside Estate" }]);
  });

  it("getBySlug succeeds with no authenticated user", async () => {
    const res = await anon().portfolio.getBySlug({ slug: "riverside-estate" });
    expect(getBySlugMock).toHaveBeenCalledWith("riverside-estate");
    expect(res).toEqual({ id: 2, slug: "riverside-estate" });
  });
});

describe("Portfolio Router — admin authorization", () => {
  it("listAdmin rejects unauthenticated callers", async () => {
    await expect(anon().portfolio.listAdmin()).rejects.toThrow(/unauthorized/i);
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("listAdmin rejects non-admin users", async () => {
    await expect(user().portfolio.listAdmin()).rejects.toThrow(/forbidden/i);
    expect(listAdminMock).not.toHaveBeenCalled();
  });

  it("create rejects non-admin users", async () => {
    await expect(
      user().portfolio.create({ title: "New", slug: "new" })
    ).rejects.toThrow(/forbidden/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects unauthenticated callers", async () => {
    await expect(
      anon().portfolio.update({ id: 1, title: "Renamed" })
    ).rejects.toThrow(/unauthorized/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("togglePublished rejects non-admin users", async () => {
    await expect(
      user().portfolio.togglePublished({ id: 1, published: true })
    ).rejects.toThrow(/forbidden/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("publish rejects non-admin users", async () => {
    await expect(user().portfolio.publish({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("delete rejects non-admin users", async () => {
    await expect(user().portfolio.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("Portfolio Router — admin happy paths", () => {
  it("listAdmin delegates to the repo", async () => {
    const res = await admin().portfolio.listAdmin();
    expect(listAdminMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, title: "Riverside Estate" }]);
  });

  it("create maps camelCase input to snake_case columns", async () => {
    await admin().portfolio.create({
      title: "Riverside Estate",
      slug: "riverside-estate",
      shortDescription: "A modern lakeside build",
      completionYear: 2025,
      squareFootage: 4200,
      coverImageUrl: "https://img.example/cover.jpg",
      galleryImageUrls: ["https://img.example/a.jpg"],
      clientTestimonial: "Superb work",
      clientName: "The Reyes Family",
      featured: true,
      published: true,
      sortOrder: 3,
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      title: "Riverside Estate",
      slug: "riverside-estate",
      category: undefined,
      description: undefined,
      short_description: "A modern lakeside build",
      location: undefined,
      completion_year: 2025,
      square_footage: 4200,
      cover_image_url: "https://img.example/cover.jpg",
      gallery_image_urls: JSON.stringify(["https://img.example/a.jpg"]),
      client_testimonial: "Superb work",
      client_name: "The Reyes Family",
      featured: true,
      published: true,
      sort_order: 3,
    });
  });

  it("create applies schema defaults for featured/published/sortOrder", async () => {
    await admin().portfolio.create({ title: "Bare", slug: "bare" });
    const values = createMock.mock.calls[0][0] as Record<string, unknown>;
    expect(values.featured).toBe(false);
    expect(values.published).toBe(false);
    expect(values.sort_order).toBe(0);
    expect(values.gallery_image_urls).toBeNull();
  });

  it("update maps only the provided optional fields", async () => {
    await admin().portfolio.update({
      id: 3,
      title: "Renamed",
      shortDescription: "Updated blurb",
      sortOrder: 9,
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateMock.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(id).toBe(3);
    // NOTE: `PortfolioInput.partial()` does not strip the `.default()` on
    // `featured`/`published`/`sortOrder`, so those defaults are always injected
    // into the update patch even when the caller omits them. This asserts the
    // router's actual behaviour (a latent footgun: a title-only update silently
    // resets featured/published to false).
    expect(patch).toEqual({
      title: "Renamed",
      featured: false,
      published: false,
      short_description: "Updated blurb",
      sort_order: 9,
    });
    expect("cover_image_url" in patch).toBe(false);
    expect("completion_year" in patch).toBe(false);
  });

  it("togglePublished forwards the published flag", async () => {
    await admin().portfolio.togglePublished({ id: 4, published: false });
    expect(updateMock).toHaveBeenCalledWith(4, { published: false });
  });

  it("publish sets published to true", async () => {
    await admin().portfolio.publish({ id: 5 });
    expect(updateMock).toHaveBeenCalledWith(5, { published: true });
  });

  it("delete forwards input.id", async () => {
    const res = await admin().portfolio.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("Portfolio Router — input validation", () => {
  it("create rejects an empty title", async () => {
    await expect(
      admin().portfolio.create({ title: "", slug: "x" })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects an invalid coverImageUrl", async () => {
    await expect(
      admin().portfolio.create({
        title: "T",
        slug: "t",
        coverImageUrl: "not-a-url",
      })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects a non-positive id", async () => {
    await expect(admin().portfolio.update({ id: 0 })).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
