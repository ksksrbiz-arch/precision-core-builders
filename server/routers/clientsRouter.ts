import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

const ClientInput = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(10).optional(),
  notes: z.string().optional(),
  leadSource: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
});

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db
        .from("clients")
        .select("*, projects(id,name,status)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (input.search)
        q = q.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("clients")
        .select(
          "*, projects(id,name,status,estimated_budget,actual_cost,completion_percent,created_at)"
        )
        .eq("id", input.id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  create: adminProcedure.input(ClientInput).mutation(async ({ input }) => {
    const { data, error } = await db
      .from("clients")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        notes: input.notes,
        lead_source: input.leadSource,
        user_id: input.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: adminProcedure
    .input(
      z.object({ id: z.number().int().positive() }).merge(ClientInput.partial())
    )
    .mutation(async ({ input }) => {
      const { id, leadSource, userId, ...rest } = input;
      const { data, error } = await db
        .from("clients")
        .update({
          ...rest,
          ...(leadSource !== undefined && { lead_source: leadSource }),
          ...(userId !== undefined && { user_id: userId }),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("clients").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
