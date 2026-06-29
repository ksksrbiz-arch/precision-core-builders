import { portfolioRepo } from "../_data/portfolioRepo";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

const PortfolioInput = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  completionYear: z.number().int().optional(),
  squareFootage: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().optional(),
  galleryImageUrls: z.array(z.string().url()).optional(),
  clientTestimonial: z.string().optional(),
  clientName: z.string().max(200).optional(),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export const portfolioRouter = router({
  listPublished: publicProcedure.query(async () => {
    return portfolioRepo.listPublished();
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return portfolioRepo.getBySlug(input.slug);
    }),

  listAdmin: adminProcedure.query(async () => {
    return portfolioRepo.listAdmin();
  }),

  create: adminProcedure.input(PortfolioInput).mutation(async ({ input }) => {
    return portfolioRepo.create({
      title: input.title,
      slug: input.slug,
      category: input.category,
      description: input.description,
      short_description: input.shortDescription,
      location: input.location,
      completion_year: input.completionYear,
      square_footage: input.squareFootage,
      cover_image_url: input.coverImageUrl,
      gallery_image_urls: input.galleryImageUrls
        ? JSON.stringify(input.galleryImageUrls)
        : null,
      client_testimonial: input.clientTestimonial,
      client_name: input.clientName,
      featured: input.featured,
      published: input.published,
      sort_order: input.sortOrder,
    });
  }),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive() })
        .merge(PortfolioInput.partial())
    )
    .mutation(async ({ input }) => {
      const {
        id,
        shortDescription,
        completionYear,
        squareFootage,
        coverImageUrl,
        galleryImageUrls,
        clientTestimonial,
        clientName,
        sortOrder,
        ...rest
      } = input;
      return portfolioRepo.update(id, {
        ...rest,
        ...(shortDescription !== undefined && {
          short_description: shortDescription,
        }),
        ...(completionYear !== undefined && {
          completion_year: completionYear,
        }),
        ...(squareFootage !== undefined && { square_footage: squareFootage }),
        ...(coverImageUrl !== undefined && {
          cover_image_url: coverImageUrl,
        }),
        ...(galleryImageUrls !== undefined && {
          gallery_image_urls: JSON.stringify(galleryImageUrls),
        }),
        ...(clientTestimonial !== undefined && {
          client_testimonial: clientTestimonial,
        }),
        ...(clientName !== undefined && { client_name: clientName }),
        ...(sortOrder !== undefined && { sort_order: sortOrder }),
      });
    }),

  togglePublished: adminProcedure
    .input(
      z.object({ id: z.number().int().positive(), published: z.boolean() })
    )
    .mutation(async ({ input }) => {
      return portfolioRepo.update(input.id, { published: input.published });
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return portfolioRepo.update(input.id, { published: true });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return portfolioRepo.delete(input.id);
    }),
});
