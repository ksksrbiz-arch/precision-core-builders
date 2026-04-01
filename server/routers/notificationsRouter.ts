import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      let q = db.from("notifications")
        .select("*")
        .eq("recipient_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (input.unreadOnly) q = q.is("read_at", null);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await db.from("notifications")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", input.id)
        .eq("recipient_id", ctx.user.id)
        .select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  send: adminProcedure
    .input(z.object({
      recipientId: z.string().uuid(),
      projectId: z.number().int().positive().optional(),
      channel: z.enum(["email","sms","in_app"]),
      subject: z.string().max(500).optional(),
      body: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("notifications").insert({
        recipient_id: input.recipientId,
        project_id: input.projectId,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        status: "pending",
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
