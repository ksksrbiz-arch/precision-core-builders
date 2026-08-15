/**
 * Data-access layer foundation.
 *
 * tRPC routers previously embedded raw `db.from(table).select(...)` chains plus
 * the repeated `if (error) throw new Error(error.message)` unwrap. This module
 * provides the shared building blocks for thin per-domain repositories so query
 * logic lives in one layer and routers focus on validation + shaping.
 *
 * The repositories built on top of this MUST preserve the exact existing query
 * shapes (columns, filters, ordering) — this is a structural refactor, not a
 * behaviour change.
 */
import { db, paginate, type PaginationInput } from "../db";

/** Shared service-role Supabase handle used by every repository. */
export const data = db;

export { paginate };
export type { PaginationInput };

/**
 * Untyped Supabase row. The project's Supabase client carries no generated
 * Database types, so query results were already effectively `any` before this
 * refactor; the data layer preserves that exact looseness so adopting it does
 * not change the inferred tRPC output types of the routers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseRow = any;

/**
 * Escape a user-supplied search term for safe interpolation into a
 * PostgREST filter string (e.g. `.or(\`name.ilike.%${term}%\`)`).
 *
 * PostgREST's filter syntax treats `,` `.` `(` `)` and `%` as structural —
 * an unescaped search term containing them can alter which columns/operators
 * the filter applies to (e.g. injecting an extra `,role.eq.admin` clause),
 * not classic SQL injection, but a real query-shape injection risk. Escape
 * each with a leading backslash, which PostgREST treats as a literal.
 */
export function escapePostgrestFilterTerm(term: string): string {
  return term.replace(/[\\,.()%]/g, "\\$&");
}

export type SupabaseResult = {
  data: SupabaseRow;
  error: { message: string } | null;
};

export type SupabaseListResult = {
  data: SupabaseRow[] | null;
  error: { message: string } | null;
  count?: number | null;
};

/**
 * Resolve a single-row Supabase result, throwing the Supabase error message on
 * failure (matching the routers' existing `throw new Error(error.message)`).
 */
export function unwrapOne(result: SupabaseResult): SupabaseRow {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Resolve a list Supabase result to `{ data, total }`, throwing on error. */
export function unwrapList(result: SupabaseListResult): {
  data: SupabaseRow[];
  total: number;
} {
  if (result.error) throw new Error(result.error.message);
  return { data: result.data ?? [], total: result.count ?? 0 };
}

/** Resolve a Supabase result that returns no data (delete), throwing on error. */
export function unwrapVoid(result: { error: { message: string } | null }): {
  success: true;
} {
  if (result.error) throw new Error(result.error.message);
  return { success: true };
}
