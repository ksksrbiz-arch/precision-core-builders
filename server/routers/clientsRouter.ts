import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  countClientProjects,
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

/**
 * Update: `undefined` = leave unchanged; `null` = clear the column. Without
 * `.nullable()` an edit form could never blank a phone/address/notes value
 * (blank was sent as `undefined`, i.e. "no change", while the toast said saved).
 */
const ClientUpdateInput = z
  .object({ id: z.number().int().positive() })
  .merge(ClientInput.partial())
  .extend({
    phone: ClientInput.shape.phone.nullable(),
    address: ClientInput.shape.address.nullable(),
    city: ClientInput.shape.city.nullable(),
    state: ClientInput.shape.state.nullable(),
    zip: ClientInput.shape.zip.nullable(),
    notes: ClientInput.shape.notes.nullable(),
    leadSource: ClientInput.shape.leadSource.nullable(),
    // null unlinks the portal login from this client.
    userId: ClientInput.shape.userId.nullable(),
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
    .input(ClientUpdateInput)
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
      // projects.client_id is ON DELETE RESTRICT: deleting a client that still
      // owns projects fails at the database with a raw FK-violation message.
      // Say what's actually wrong instead.
      const projectCount = await countClientProjects(input.id);
      if (projectCount > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `This client still has ${projectCount} project${projectCount === 1 ? "" : "s"}. Delete or reassign ${projectCount === 1 ? "it" : "them"} before deleting the client.`,
        });
      }
      return deleteClient(input.id);
    }),
});
