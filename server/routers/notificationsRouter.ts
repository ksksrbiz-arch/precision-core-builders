import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { z } from "zod";

async function dispatchViaN8n(payload: {
  channel: string;
  recipientId: string;
  subject?: string;
  body: string;
  projectId?: number;
}) {
  if (!ENV.n8nWebhookUrl) return;
  try {
    await fetch(`${ENV.n8nWebhookUrl.replace(/\/$/, "")}/notify-client`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "client_notification",
        payload,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    // Non-fatal — notification is saved to DB regardless
  }
}

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      let q = db
        .from("notifications")
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
      const { data, error } = await db
        .from("notifications")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", input.id)
        .eq("recipient_id", ctx.user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  send: adminProcedure
    .input(
      z.object({
        recipientId: z.string().uuid(),
        projectId: z.number().int().positive().optional(),
        channel: z.enum(["email", "sms", "in_app"]),
        subject: z.string().max(500).optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("notifications")
        .insert({
          recipient_id: input.recipientId,
          project_id: input.projectId,
          channel: input.channel,
          subject: input.subject,
          body: input.body,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Dispatch email/SMS via n8n for non-in_app channels
      if (input.channel !== "in_app") {
        await dispatchViaN8n({
          channel: input.channel,
          recipientId: input.recipientId,
          subject: input.subject,
          body: input.body,
          projectId: input.projectId,
        });

        // Mark as sent
        await db
          .from("notifications")
          .update({ status: "sent" })
          .eq("id", data.id);
      }

      return data;
    }),
});
