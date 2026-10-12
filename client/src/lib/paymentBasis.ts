/**
 * What the client portal's payment schedule and "pay outstanding balance" links
 * are computed from.
 *
 * Precedence:
 *   1. the project's contracted budget — the actual contract, and the same
 *      figure the admin Billing screen bills milestones against, so the client
 *      never sees one milestone amount in the portal and is invoiced another;
 *   2. otherwise the mid-point of the latest estimate the CLIENT HAS APPROVED.
 *
 * An unsent draft, or an estimate still "Pending Review", is not a payable
 * number: the schedule and pay links must not appear from it. (The page used to
 * take `estimates[0]` — the newest estimate of any state.)
 */
export type PaymentBasis = {
  amount: number;
  source: "contract" | "approved_estimate";
} | null;

type EstimateLike = {
  approved_by_client?: boolean | null;
  estimated_mid?: number | string | null;
};

const positive = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** `estimates` is expected newest-first (as `estimates.listForClient` returns). */
export function resolvePaymentBasis(
  project: { contracted_budget?: number | string | null } | null | undefined,
  estimates: EstimateLike[]
): PaymentBasis {
  const contract = positive(project?.contracted_budget);
  if (contract > 0) return { amount: contract, source: "contract" };

  const approved = estimates.find(e => e.approved_by_client);
  const mid = positive(approved?.estimated_mid);
  if (mid > 0) return { amount: mid, source: "approved_estimate" };

  return null;
}
