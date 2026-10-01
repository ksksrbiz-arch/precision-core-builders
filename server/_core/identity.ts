/**
 * Identity helpers for writing "who did this" columns.
 *
 * Authors/actors are stored in `uuid` columns that reference `users.id`. Two
 * admin sign-in paths are NOT backed by a `users` row and carry synthetic ids:
 * the shared admin session token (`"admin"`) and the local dev bypass
 * (`"dev-admin-local"`). Writing those strings into a uuid column makes
 * Postgres reject the whole insert (`invalid input syntax for type uuid`), which
 * silently broke every ledger/audit/field-report/site-plan write for the shared
 * admin login. Route every such write through `authorUuid` so the row is stored
 * with a null author instead of failing.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a canonical UUID string. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * The user's id when it is a real `users.id` UUID, otherwise `null` (synthetic
 * admin-session / dev ids, or no user at all).
 */
export function authorUuid(
  user: { id: string } | null | undefined
): string | null {
  return user && isUuid(user.id) ? user.id : null;
}
