import { adminProcedure, router } from "../_core/trpc";
import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  updateClient,
} from "../_data/clientsRepo";
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
  // Admin-only: client records are sensitive and this endpoint is only used by
  // admin pages. Aligns with getById (already adminProcedure); the portal never
  // calls clients.list.
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return listClients(input);
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getClientById(input.id);
    }),

  create: adminProcedure.input(ClientInput).mutation(async ({ input }) => {
    return createClient(input);
  }),

  update: adminProcedure
    .input(
      z.object({ id: z.number().int().positive() }).merge(ClientInput.partial())
    )
    .mutation(async ({ input }) => {
      const { id, leadSource, userId, ...rest } = input;
      return updateClient(id, {
        ...rest,
        ...(leadSource !== undefined && { lead_source: leadSource }),
        ...(userId !== undefined && { user_id: userId }),
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return deleteClient(input.id);
    }),
});
