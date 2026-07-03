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
    const { data: row, error } = await data
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async markFailed(id: number, reason: string) {
    const { data: row, error } = await data
      .from("notifications")
      .update({ status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  /**
   * Resolve a recipient's contact details for outbound delivery. The
   * notification's recipient_id references `users`; we prefer the user's own
   * email/phone and fall back to a linked `clients` row for any missing field.
   */
  async recipientContact(recipientId: string) {
    let email: string | null = null;
    let phone: string | null = null;

    const { data: user } = await data
      .from("users")
      .select("email, phone")
      .eq("id", recipientId)
      .maybeSingle();
    if (user) {
      email = user.email ?? null;
      phone = user.phone ?? null;
    }

    if (!email || !phone) {
      const { data: client } = await data
        .from("clients")
        .select("email, phone")
        .eq("user_id", recipientId)
        .limit(1)
        .maybeSingle();
      if (client) {
        email = email ?? client.email ?? null;
        phone = phone ?? client.phone ?? null;
      }
    }

    return { email, phone };
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
