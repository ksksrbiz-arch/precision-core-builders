import { adminProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";
import {
  createSubContractor,
  deleteSubContractor,
  getProjectBriefingInfo,
  getSubContractorById,
  getSubContractorContact,
  listSubContractors,
  updateSubContractor,
} from "../_data/subContractorsRepo";
import { z } from "zod";

export const subContractorsRouter = router({
  list: adminProcedure.query(async () => listSubContractors()),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getSubContractorById(input.id)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        company: z.string().max(200).optional(),
        email: z.string().email().max(320).optional(),
        phone: z.string().max(20).optional(),
        trade: z
          .enum([
            "general",
            "plumbing",
            "electrical",
            "framing",
            "roofing",
            "hvac",
            "concrete",
            "landscaping",
            "painting",
            "flooring",
            "masonry",
            "drywall",
            "insulation",
            "windows",
            "cabinetry",
            "tile",
            "other",
          ])
          .optional(),
        licenseNumber: z.string().max(100).optional(),
        insuranceExpiry: z.string().datetime().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => createSubContractor(input)),

  update: adminProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      const { id, licenseNumber, insuranceExpiry, isActive, ...rest } = input;
      return updateSubContractor(id, {
        ...rest,
        ...(licenseNumber !== undefined && { license_number: licenseNumber }),
        ...(insuranceExpiry !== undefined && {
          insurance_expiry: insuranceExpiry,
        }),
        ...(isActive !== undefined && { is_active: isActive }),
      });
    }),

  sendBriefing: adminProcedure
    .input(
      z.object({
        subContractorId: z.number().int().positive(),
        projectId: z.number().int().positive(),
        scheduleDetails: z.string(),
        siteAccessCode: z.string().optional(),
        safetyNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sub = await getSubContractorContact(input.subContractorId);
      const project = await getProjectBriefingInfo(input.projectId);

      const briefingContent = [
        `Project: ${project?.name ?? "Unknown"}`,
        `Location: ${project?.address ?? ""}, ${project?.city ?? "Eugene, OR"}`,
        `Schedule: ${input.scheduleDetails}`,
        input.siteAccessCode ? `Site Access Code: ${input.siteAccessCode}` : "",
        input.safetyNotes ? `Safety Notes: ${input.safetyNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Notify owner via n8n (n8n routes to SMS/email the sub-contractor)
      await notifyOwner({
        title: `Briefing sent to ${sub?.name ?? "sub-contractor"}`,
        content: briefingContent,
      });

      // Also fire sub_notification n8n event to route directly to the sub
      if (ENV.n8nWebhookUrl && (sub?.email || sub?.phone)) {
        try {
          await fetch(
            `${ENV.n8nWebhookUrl.replace(/\/$/, "")}/sub-notification`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "sub_notification",
                payload: {
                  subName: sub?.name,
                  subEmail: sub?.email,
                  subPhone: sub?.phone,
                  projectId: input.projectId,
                  projectName: project?.name,
                  scheduleDetails: input.scheduleDetails,
                  siteAccessCode: input.siteAccessCode,
                  safetyNotes: input.safetyNotes,
                  briefingContent,
                },
              }),
              signal: AbortSignal.timeout(8000),
            }
          );
        } catch {
          // Non-fatal — briefing content is still returned to admin
        }
      }

      return { success: true, subName: sub?.name, briefingContent };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deleteSubContractor(input.id)),
});
