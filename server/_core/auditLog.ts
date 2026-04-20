/**
 * Audit logging for admin operations.
 *
 * Writes structured audit records to the `ledger_entries` table using a
 * `"note"` entry type and a reserved `[AUDIT]` prefix so they are easy to
 * filter from operational ledger entries.
 *
 * Usage:
 *   import { logAdminAction } from "./_core/auditLog";
 *   await logAdminAction(ctx, "project.create", "projects", project.id, { name: project.name });
 *
 * If the ledger insert fails, the error is logged to console but NOT re-thrown
 * so that a logging failure never breaks the primary operation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "project.create"
  | "project.update"
  | "project.delete"
  | "client.create"
  | "client.update"
  | "client.delete"
  | "fieldReport.create"
  | "fieldReport.publish"
  | "fieldReport.unpublish"
  | "fieldReport.delete"
  | "estimate.create"
  | "estimate.approve"
  | "estimate.delete"
  | "material.create"
  | "material.update"
  | "material.delete"
  | "subcontractor.create"
  | "subcontractor.update"
  | "subcontractor.delete"
  | "portfolioProject.create"
  | "portfolioProject.publish"
  | "portfolioProject.delete"
  | "scheduleItem.create"
  | "scheduleItem.update"
  | "scheduleItem.delete";

type AuditContext = {
  user: { id: string; email?: string } | null;
};

/**
 * Write an audit record to `ledger_entries`.
 *
 * @param db        Supabase admin client (service-role).
 * @param ctx       tRPC context containing the authenticated admin user.
 * @param action    Namespaced action string (e.g. "project.create").
 * @param projectId The project this action relates to (required by the table).
 *                  Pass 0 or undefined for project-agnostic actions — those
 *                  won't be logged to the ledger (use console only).
 * @param details   Optional key-value metadata to include in the description.
 */
export async function logAdminAction(
  db: SupabaseClient,
  ctx: AuditContext,
  action: AuditAction,
  projectId: number | undefined,
  details?: Record<string, unknown>
): Promise<void> {
  const userId = ctx.user?.id ?? "unknown";
  const userEmail = ctx.user?.email;
  const description = [
    `User: ${userEmail ?? userId}`,
    `Action: ${action}`,
    details ? `Details: ${JSON.stringify(details)}` : null,
    `Timestamp: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join(" | ");

  // Always write to function/server logs for external log aggregation.
  console.info(`[AUDIT] ${action}`, {
    userId,
    projectId,
    details,
  });

  // Only persist to ledger when a valid project ID is available.
  if (!projectId || !Number.isInteger(projectId) || projectId <= 0) return;

  try {
    const { error } = await db.from("ledger_entries").insert({
      project_id: projectId,
      author_id: userId,
      entry_type: "note",
      title: `[AUDIT] ${action}`,
      description,
      visible_to_client: false,
    });

    if (error) {
      console.error("[auditLog] Failed to persist audit entry:", error.message);
    }
  } catch (err) {
    // Never let audit logging break the primary operation.
    console.error("[auditLog] Unexpected error:", err);
  }
}
