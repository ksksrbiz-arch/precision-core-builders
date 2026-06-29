/**
 * notificationsRepo — data-access for the `notifications` table (plus the
 * `clients` lookup used to resolve recipients in the admin list).
 *
 * Routers own validation, n8n dispatch, and result shaping; the Supabase query
 * chains live here and MUST match the previous inline behaviour exactly
 * (columns, filters, ordering, ranges).
 */
import { data, paginate, type PaginationInput } from "./repository";

export type NotificationInsert = {
  recipient_id: string;
  project_id?: number;
  channel: "email" | "sms" | "in_app";
  subject?: string;
  body: string;
  status: string;
};

export type AdminListFilters = PaginationInput & {
  search?: string;
  channel?: "email" | "sms" | "in_app";
  status?: "pending" | "sent" | "read" | "failed";
};

export const notificationsRepo = {
  async listForRecipient(recipientId: string, unreadOnly?: boolean) {
    let q = data
      .from("notifications")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (unreadOnly) q = q.is("read_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async markRead(ids: number[], recipientId: string) {
    const { data: rows, error } = await data
      .from("notifications")
      .update({ read_at: new Date().toISOString(), status: "read" })
      .in("id", ids)
      .eq("recipient_id", recipientId)
      .select();
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async insert(values: NotificationInsert) {
    const { data: row, error } = await data
      .from("notifications")
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async markSent(id: number) {
    await data.from("notifications").update({ status: "sent" }).eq("id", id);
  },

  async adminList(input: AdminListFilters) {
    const { from, to } = paginate(input);
    let q = data
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
      q = q.or(`subject.ilike.%${input.search}%,body.ilike.%${input.search}%`);
    }

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { data: rows ?? [], count: count ?? 0 };
  },

  async clientsByUserIds(recipientIds: string[]) {
    const { data: clients, error } = await data
      .from("clients")
      .select("id, user_id, name, email")
      .in("user_id", recipientIds);
    if (error) throw new Error(error.message);
    return clients ?? [];
  },
};
