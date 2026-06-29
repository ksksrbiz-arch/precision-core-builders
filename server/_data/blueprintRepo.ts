/**
 * blueprintRepo — data-access for the `blueprint_connections` and
 * `blueprint_artifacts` tables.
 *
 * IMPORTANT: this repo holds ONLY the plain Supabase read/write query chains.
 * All crypto (AES token encryption/decryption), OAuth state signing, auth
 * gating, and audit logging stay in `blueprintRouter.ts`. Connection rows are
 * stored/returned with their `*_enc` columns untouched — encryption happens in
 * the router before insert and decryption after read.
 *
 * Query shapes (columns, filters, ordering, onConflict, error wording) MUST
 * match the previous inline behaviour exactly.
 */
import { data } from "./repository";

export const blueprintRepo = {
  /** Raw connection row for a user, or null. Used for status display. */
  async getConnectionByUserId(userId: string) {
    const { data: row, error } = await data
      .from("blueprint_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  },

  /** Raw connection row for a user (load path with its own error wording). */
  async loadConnectionRow(userId: string) {
    const { data: row, error } = await data
      .from("blueprint_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      throw new Error(`Failed to load Blueprint connection: ${error.message}`);
    return row;
  },

  /** Upsert an OAuth connection row (values already encrypted by the router). */
  async upsertOAuthConnection(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("blueprint_connections")
      .upsert(values, { onConflict: "user_id" })
      .select()
      .single();
    if (error)
      throw new Error(
        `Failed to persist Blueprint OAuth connection: ${error.message}`
      );
    return row;
  },

  /** Upsert an API-key connection row (key already encrypted by the router). */
  async upsertApiKeyConnection(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("blueprint_connections")
      .upsert(values, { onConflict: "user_id" })
      .select()
      .single();
    if (error)
      throw new Error(`Failed to save Blueprint API key: ${error.message}`);
    return row;
  },

  /** Delete the caller's connection row. */
  async deleteConnection(userId: string) {
    const { error } = await data
      .from("blueprint_connections")
      .delete()
      .eq("user_id", userId);
    if (error)
      throw new Error(
        `Failed to disconnect Blueprint account: ${error.message}`
      );
    return { success: true };
  },

  /** List artifacts for a project; non-admins only see client-visible rows. */
  async listArtifacts(projectId: number, clientVisibleOnly: boolean) {
    let q = data
      .from("blueprint_artifacts")
      .select("*")
      .eq("project_id", projectId)
      .order("synced_at", { ascending: false });
    if (clientVisibleOnly) {
      q = q.eq("visible_to_client", true);
    }
    const { data: rows, error } = await q;
    if (error)
      throw new Error(`Failed to load Blueprint artifacts: ${error.message}`);
    return rows ?? [];
  },

  /** Insert a new artifact link. */
  async insertArtifact(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("blueprint_artifacts")
      .insert(values)
      .select()
      .single();
    if (error)
      throw new Error(`Failed to attach Blueprint artifact: ${error.message}`);
    return row;
  },

  /** Fetch the project/resource of an artifact (for audit before delete). */
  async getArtifactForAudit(id: number) {
    const { data: row } = await data
      .from("blueprint_artifacts")
      .select("project_id,blueprint_resource_id")
      .eq("id", id)
      .maybeSingle();
    return row;
  },

  /** Delete an artifact link. */
  async deleteArtifact(id: number) {
    const { error } = await data
      .from("blueprint_artifacts")
      .delete()
      .eq("id", id);
    if (error)
      throw new Error(`Failed to remove Blueprint artifact: ${error.message}`);
    return { success: true };
  },
};
