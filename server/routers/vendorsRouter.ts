import { adminProcedure, router } from "../_core/trpc";
import {
  createVendor,
  deleteVendor,
  getVendorById,
  listVendors,
  updateVendor,
} from "../_data/vendorsRepo";
import { z } from "zod";

export const vendorsRouter = router({
  list: adminProcedure.query(async () => listVendors()),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getVendorById(input.id)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        contactName: z.string().max(200).optional(),
        email: z.string().email().max(320).optional(),
        phone: z.string().max(20).optional(),
        website: z.string().max(2048).optional(),
        address: z.string().optional(),
        category: z.string().max(120).optional(),
        accountNumber: z.string().max(120).optional(),
        paymentTerms: z.string().max(120).optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => createVendor(input)),

  update: adminProcedure
    .input(
      // Optional text fields are `.nullable()` so the edit UI can clear a value
      // (null → column set NULL). `undefined` still means "leave unchanged".
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(200).optional(),
        contactName: z.string().max(200).nullable().optional(),
        email: z.string().email().max(320).nullable().optional(),
        phone: z.string().max(20).nullable().optional(),
        website: z.string().max(2048).nullable().optional(),
        address: z.string().nullable().optional(),
        category: z.string().max(120).nullable().optional(),
        accountNumber: z.string().max(120).nullable().optional(),
        paymentTerms: z.string().max(120).nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        id,
        contactName,
        accountNumber,
        paymentTerms,
        isActive,
        ...rest
      } = input;
      return updateVendor(id, {
        ...rest,
        ...(contactName !== undefined && { contact_name: contactName }),
        ...(accountNumber !== undefined && { account_number: accountNumber }),
        ...(paymentTerms !== undefined && { payment_terms: paymentTerms }),
        ...(isActive !== undefined && { is_active: isActive }),
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deleteVendor(input.id)),
});
