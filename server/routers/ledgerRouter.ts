import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  appendLedgerEntry,
  listAuditLedgerEntries,
  listLedgerEntries,
  listVisibleLedgerEntries,
} from "../_data/ledgerRepo";
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
  // Admin-only: returns the full internal ledger for a project, including
  // entries with visible_to_client = false. Portal clients must use
  // `listVisible` instead (this used to be protectedProcedure, which any
  // logged-in client could call for an arbitrary projectId).
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => listLedgerEntries(input)),

  // Client: visible entries only
  listVisible: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => listVisibleLedgerEntries(input.projectId)),

  // Admin-only audit feed: ledger entries whose title is tagged "[AUDIT]".
  // The Activity Log page previously read these straight from the browser
  // Supabase client (RLS-only); this routes the read through an explicit
  // adminProcedure role check instead.
  auditLog: adminProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(200).optional() })
        .optional()
    )
    .query(async ({ input }) => listAuditLedgerEntries(input?.limit ?? 100)),

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
    .mutation(async ({ input, ctx }) =>
      appendLedgerEntry({
        projectId: input.projectId,
        authorId: ctx.user!.id,
        entryType: input.entryType,
        title: input.title,
        description: input.description,
        amountDelta: input.amountDelta,
        documentUrl: input.documentUrl,
        documentName: input.documentName,
        visibleToClient: input.visibleToClient,
      })
    ),
});
