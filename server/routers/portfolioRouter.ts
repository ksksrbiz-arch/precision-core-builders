import { db } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const portfolioRouter = router({
  listPublished: publicProcedure.query(async () => {
    const { data, error } = await db.from("portfolio_projects")
      .select("id,title,slug,category,short_description,location,completion_year,square_footage,cover_image_url,featured,sort_order")
      .eq("published", true)
      .order("sort_order").order("completion_year", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await db.from("portfolio_projects")
        .select("*").eq("slug", input.slug).eq("published", true).single();
      if (error) throw new Error(error.message);
      return data;
    }),

  listAdmin: adminProcedure.query(async () => {
    const { data, error } = await db.from("portfolio_projects")
      .select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  create: adminProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("portfolio_projects").insert({
        title: input.title, slug: input.slug, category: input.category,
        description: input.description, short_description: input.shortDescription,
        location: input.location, completion_year: input.completionYear,
        square_footage: input.squareFootage, cover_image_url: input.coverImageUrl,
        gallery_image_urls: input.galleryImageUrls ? JSON.stringify(input.galleryImageUrls) : null,
        client_testimonial: input.clientTestimonial, client_name: input.clientName,
        featured: input.featured, published: input.published, sort_order: input.sortOrder,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  togglePublished: adminProcedure
    .input(z.object({ id: z.number().int().positive(), published: z.boolean() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("portfolio_projects")
        .update({ published: input.published })
        .eq("id", input.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
