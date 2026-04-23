import { db } from "../db";
import { paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { z } from "zod";

type ClientInfo = {
  id: number;
  name: string;
  email: string;
};

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
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await db
        .from("notifications")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .in("id", input.ids)
        .eq("recipient_id", ctx.user.id)
        .select();
      if (error) throw new Error(error.message);
      return data ?? [];
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

  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
        channel: z.enum(["email", "sms", "in_app"]).optional(),
        status: z.enum(["pending", "sent", "read", "failed"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db
        .from("notifications")
        .select(
          "id, recipient_id, project_id, channel, status, subject, body, created_at, sent_at, read_at, failure_reason, projects(name)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (input.channel) q = q.eq("channel", input.channel);
      if (input.status) q = q.eq("status", input.status);
      if (input.search) {
        q = q.or(
          `subject.ilike.%${input.search}%,body.ilike.%${input.search}%`
        );
      }

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);

      const notifications = data ?? [];
      const recipientIds = Array.from(
        new Set(
          notifications
            .map(item => item.recipient_id)
            .filter((value): value is string => !!value)
        )
      );

      let clientsMap = new Map<string, ClientInfo>();

      if (recipientIds.length > 0) {
        const { data: clients, error: clientsError } = await db
          .from("clients")
          .select("id, user_id, name, email")
          .in("user_id", recipientIds);

        if (clientsError) throw new Error(clientsError.message);

        clientsMap = new Map(
          (clients ?? [])
            .filter(client => !!client.user_id)
            .map(client => [
              client.user_id as string,
              {
                id: client.id,
                name: client.name,
                email: client.email,
              },
            ])
        );
      }

      return {
        data: notifications.map(item => ({
          ...item,
          recipient: item.recipient_id
            ? (clientsMap.get(item.recipient_id) ?? null)
            : null,
        })),
        total: count ?? 0,
      };
    }),
});
