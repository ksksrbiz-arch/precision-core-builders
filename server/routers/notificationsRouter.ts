import { notificationsRepo } from "../_data/notificationsRepo";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { sendEmail, sendSms } from "../_core/delivery";
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
      return notificationsRepo.listForRecipient(ctx.user.id, input.unreadOnly);
    }),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      return notificationsRepo.markRead(input.ids, ctx.user.id);
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
      const record = await notificationsRepo.insert({
        recipient_id: input.recipientId,
        project_id: input.projectId,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        status: "pending",
      });

      // in_app: the DB row IS the delivery — nothing to send externally.
      if (input.channel === "in_app") {
        return notificationsRepo.markSent(record.id);
      }

      // email/sms: resolve the recipient's contact details and deliver via the
      // real Resend/Twilio implementations in delivery.ts. Status only flips to
      // "sent" on a confirmed send; otherwise the row is recorded as "failed".
      const contact = await notificationsRepo.recipientContact(
        input.recipientId
      );

      let result;
      if (input.channel === "email") {
        if (!contact.email) {
          return notificationsRepo.markFailed(
            record.id,
            "No email address on file for recipient."
          );
        }
        result = await sendEmail({
          subject: input.subject ?? "Precision Core Builders",
          text: input.body,
          to: contact.email,
        });
      } else {
        if (!contact.phone) {
          return notificationsRepo.markFailed(
            record.id,
            "No phone number on file for recipient."
          );
        }
        result = await sendSms({ body: input.body, to: contact.phone });
      }

      // Optional additional relay — best-effort, never flips delivery status.
      await dispatchViaN8n({
        channel: input.channel,
        recipientId: input.recipientId,
        subject: input.subject,
        body: input.body,
        projectId: input.projectId,
      });

      if (result.ok) {
        return notificationsRepo.markSent(record.id);
      }

      const reason = result.skipped
        ? `${input.channel === "email" ? "Email (Resend)" : "SMS (Twilio)"} provider is not configured.`
        : (result.error ?? "Delivery failed.");
      return notificationsRepo.markFailed(record.id, reason);
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
      const { data, count } = await notificationsRepo.adminList(input);

      const notifications = data;
      const recipientIds = Array.from(
        new Set(
          notifications
            .map(item => item.recipient_id)
            .filter((value): value is string => !!value)
        )
      );

      let clientsMap = new Map<string, ClientInfo>();

      if (recipientIds.length > 0) {
        const clients = await notificationsRepo.clientsByUserIds(recipientIds);

        clientsMap = new Map(
          clients
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
