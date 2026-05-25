import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ADMIN_EMAILS: ReadonlyArray<string> = [
  "skdev@1commerce.online",
  "erictadlock@precisioncorebuilders.com",
  "eric@precisioncorebuilders.com",
];

function addEmail(set: Set<string>, email: string | undefined) {
  const normalized = (email ?? "").trim().toLowerCase();
  if (normalized) set.add(normalized);
}

/**
 * Returns the set of admin emails from hardcoded defaults + env vars.
 * This is synchronous and does NOT check the database.
 */
export function getAdminEmailSet(): Set<string> {
  const set = new Set<string>();

  for (const email of DEFAULT_ADMIN_EMAILS) {
    addEmail(set, email);
  }

  addEmail(set, process.env.ADMIN_EMAIL);

  for (const email of (process.env.ADMIN_EMAILS ?? "").split(",")) {
    addEmail(set, email);
  }

  return set;
}

/**
 * Returns the full set of admin emails by merging hardcoded defaults,
 * env vars, AND the `admin_emails` database table.  Falls back to the
 * synchronous set when the DB query fails.
 */
export async function getAdminEmailSetWithDb(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const set = getAdminEmailSet();

  try {
    const { data, error } = await supabase.from("admin_emails").select("email");

    if (!error && data) {
      for (const row of data) {
        addEmail(set, row.email);
      }
    }
  } catch {
    // DB unavailable — fall back to env-based set.
  }

  return set;
}
