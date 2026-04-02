import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

const EntryTypeEnum = z.enum([
  "decision",
  "change_order",
  "inspection",
  "permit",
  "milestone",
  "cost_adjustment",
  "note",
]);

export const ledgerRouter = router({
  // Admin: all entries
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      const { data, error, count } = await db
        .from("ledger_entries")
        .select("*", { count: "exact" })
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  // Client: visible entries only
  listVisible: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("ledger_entries")
        .select(
          "id,entry_type,title,description,amount_delta,document_url,document_name,created_at"
        )
        .eq("project_id", input.projectId)
        .eq("visible_to_client", true)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  // Append-only — no update/delete
  append: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        entryType: EntryTypeEnum,
        title: z.string().min(1).max(300),
        description: z.string().min(1),
        amountDelta: z.number().optional(),
        documentUrl: z.string().url().optional(),
        documentName: z.string().optional(),
        visibleToClient: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await db
        .from("ledger_entries")
        .insert({
          project_id: input.projectId,
          author_id: ctx.user.id,
          entry_type: input.entryType,
          title: input.title,
          description: input.description,
          amount_delta: input.amountDelta,
          document_url: input.documentUrl,
          document_name: input.documentName,
          visible_to_client: input.visibleToClient ?? true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
