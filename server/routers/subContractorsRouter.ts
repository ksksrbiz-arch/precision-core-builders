import { db } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";

export const subContractorsRouter = router({
  list: adminProcedure.query(async () => {
    const { data, error } = await db.from("sub_contractors")
      .select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db.from("sub_contractors")
        .select("*").eq("id", input.id).single();
      if (error) throw new Error(error.message);
      return data;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      company: z.string().max(200).optional(),
      email: z.string().email().max(320).optional(),
      phone: z.string().max(20).optional(),
      trade: z.string().max(100).optional(),
      licenseNumber: z.string().max(100).optional(),
      insuranceExpiry: z.string().datetime().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("sub_contractors").insert({
        name: input.name, company: input.company, email: input.email,
        phone: input.phone, trade: input.trade,
        license_number: input.licenseNumber,
        insurance_expiry: input.insuranceExpiry,
        notes: input.notes,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      company: z.string().max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
      trade: z.string().max(100).optional(),
      licenseNumber: z.string().max(100).optional(),
      insuranceExpiry: z.string().datetime().optional(),
      rating: z.number().int().min(1).max(5).optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, licenseNumber, insuranceExpiry, isActive, ...rest } = input;
      const { data, error } = await db.from("sub_contractors").update({
        ...rest,
        ...(licenseNumber !== undefined && { license_number: licenseNumber }),
        ...(insuranceExpiry !== undefined && { insurance_expiry: insuranceExpiry }),
        ...(isActive !== undefined && { is_active: isActive }),
      }).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  sendBriefing: adminProcedure
    .input(z.object({
      subContractorId: z.number().int().positive(),
      projectId: z.number().int().positive(),
      scheduleDetails: z.string(),
      siteAccessCode: z.string().optional(),
      safetyNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data: sub } = await db.from("sub_contractors")
        .select("name,email,phone").eq("id", input.subContractorId).single();
      const { data: project } = await db.from("projects")
        .select("name,address,city").eq("id", input.projectId).single();

      const briefingContent = [
        `Project: ${project?.name ?? "Unknown"}`,
        `Location: ${project?.address ?? ""}, ${project?.city ?? "Eugene, OR"}`,
        `Schedule: ${input.scheduleDetails}`,
        input.siteAccessCode ? `Site Access Code: ${input.siteAccessCode}` : "",
        input.safetyNotes ? `Safety Notes: ${input.safetyNotes}` : "",
      ].filter(Boolean).join("\n");

      // Notify owner via n8n (n8n routes to SMS/email the sub-contractor)
      await notifyOwner({
        title: `Briefing sent to ${sub?.name ?? "sub-contractor"}`,
        content: briefingContent,
      });

      return { success: true, subName: sub?.name, briefingContent };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("sub_contractors").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
