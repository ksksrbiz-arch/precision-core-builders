const DEFAULT_ADMIN_EMAILS: ReadonlyArray<string> = [
  "skdev@1commerce.online",
  "erictadlock@precisioncorebuilders.com",
];

function addEmail(set: Set<string>, email: string | undefined) {
  const normalized = (email ?? "").trim().toLowerCase();
  if (normalized) set.add(normalized);
}

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

