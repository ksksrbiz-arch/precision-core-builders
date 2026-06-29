/**
 * Data-access layer for the `ledger_entries` table.
 *
 * The ledger is an immutable, append-only cost/decision log: this repo exposes
 * reads plus a single insert (`appendLedgerEntry`) and intentionally provides
 * NO update or delete paths. Query shapes are preserved exactly from the
 * original ledgerRouter.
 */
import { data, paginate, unwrapList } from "./repository";

export type EntryType =
  | "decision"
  | "change_order"
  | "inspection"
  | "permit"
  | "milestone"
  | "cost_adjustment"
  | "note";

export async function listLedgerEntries(params: {
  projectId: number;
  page?: number;
  pageSize?: number;
}) {
  const { from, to } = paginate(params);
  return unwrapList(
    await data
      .from("ledger_entries")
      .select("*", { count: "exact" })
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: false })
      .range(from, to)
  );
}

export async function listVisibleLedgerEntries(projectId: number) {
  const { data: rows, error } = await data
    .from("ledger_entries")
    .select(
      "id,entry_type,title,description,amount_delta,document_url,document_name,created_at"
    )
    .eq("project_id", projectId)
    .eq("visible_to_client", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function listAuditLedgerEntries(limit: number) {
  const { data: rows, error } = await data
    .from("ledger_entries")
    .select("id,title,description,project_id,created_at")
    .like("title", "[AUDIT]%")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export type AppendLedgerEntryInput = {
  projectId: number;
  authorId: string;
  entryType: EntryType;
  title: string;
  description: string;
  amountDelta?: number;
  documentUrl?: string;
  documentName?: string;
  visibleToClient?: boolean;
};

// Append-only — no update/delete
export async function appendLedgerEntry(input: AppendLedgerEntryInput) {
  const { data: row, error } = await data
    .from("ledger_entries")
    .insert({
      project_id: input.projectId,
      author_id: input.authorId,
      entry_type: input.entryType,
      title: input.title,
      description: input.description,
      amount_delta: input.amountDelta,
      document_url: input.documentUrl,
      document_name: input.documentName,
      visible_to_client: input.visibleToClient ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}
