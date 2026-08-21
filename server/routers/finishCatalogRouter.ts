import { finishCatalogRepo } from "../_data/finishCatalogRepo";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

const PRICE_TIERS = ["$", "$$", "$$$"] as const;

const FinishCatalogInput = z.object({
  name: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  brand: z.string().max(200).optional(),
  description: z.string().optional(),
  priceTier: z.enum(PRICE_TIERS).optional(),
  imageUrl: z.string().url().optional(),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export const finishCatalogRouter = router({
  listPublished: publicProcedure.query(async () => {
    return finishCatalogRepo.listPublished();
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return finishCatalogRepo.getBySlug(input.slug);
    }),

  listAdmin: adminProcedure.query(async () => {
    return finishCatalogRepo.listAdmin();
  }),

  create: adminProcedure
    .input(FinishCatalogInput)
    .mutation(async ({ input }) => {
      return finishCatalogRepo.create({
        name: input.name,
        slug: input.slug,
        category: input.category,
        brand: input.brand,
        description: input.description,
        price_tier: input.priceTier,
        image_url: input.imageUrl,
        featured: input.featured,
        published: input.published,
        sort_order: input.sortOrder,
      });
    }),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive() })
        .merge(FinishCatalogInput.partial())
    )
    .mutation(async ({ input }) => {
      const { id, priceTier, imageUrl, sortOrder, ...rest } = input;
      return finishCatalogRepo.update(id, {
        ...rest,
        ...(priceTier !== undefined && { price_tier: priceTier }),
        ...(imageUrl !== undefined && { image_url: imageUrl }),
        ...(sortOrder !== undefined && { sort_order: sortOrder }),
      });
    }),

  togglePublished: adminProcedure
    .input(
      z.object({ id: z.number().int().positive(), published: z.boolean() })
    )
    .mutation(async ({ input }) => {
      return finishCatalogRepo.update(input.id, {
        published: input.published,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return finishCatalogRepo.delete(input.id);
    }),
});
