/**
 * Pure helpers for the Sub-Contractors admin page: form → API payload mapping
 * and insurance-expiry status. Kept out of the component so the rules (blank →
 * omitted on create / null on edit, expiry windows) are unit-tested.
 */

export const SUB_TRADES = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Painting",
  "Drywall",
  "Framing",
  "Concrete",
  "Landscaping",
  "Flooring",
  "Cabinetry",
  "General",
] as const;

export type SubForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  licenseNumber: string;
  /** `YYYY-MM-DD` from a date input, or "". */
  insuranceExpiry: string;
  notes: string;
  /** 1–5, or "" for unrated. */
  rating: string;
  isActive: boolean;
};

export const EMPTY_SUB_FORM: SubForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  trade: "",
  licenseNumber: "",
  insuranceExpiry: "",
  notes: "",
  rating: "",
  isActive: true,
};

/** Hydrate the edit form from a `sub_contractors` row. */
export function subToForm(sub: Record<string, any>): SubForm {
  const trade = String(sub.trade ?? "");
  return {
    name: sub.name ?? "",
    company: sub.company ?? "",
    email: sub.email ?? "",
    phone: sub.phone ?? "",
    // Stored lower-case (create sends the enum value); the <select> options are
    // Title-cased. Fall back to the raw value so a legacy free-text trade shows.
    trade:
      SUB_TRADES.find(t => t.toLowerCase() === trade.toLowerCase()) ?? trade,
    licenseNumber: sub.license_number ?? "",
    insuranceExpiry: sub.insurance_expiry
      ? String(sub.insurance_expiry).slice(0, 10)
      : "",
    notes: sub.notes ?? "",
    rating: sub.rating ? String(sub.rating) : "",
    isActive: sub.is_active ?? true,
  };
}

/**
 * Map the form to an API payload. Blank text becomes `emptyValue`: `undefined`
 * on create (so the column default applies — and `z.string().email()` never sees
 * `""`, which it rejects), `null` on edit (so the value is actually cleared).
 */
export function buildSubPayload<E extends undefined | null>(
  form: SubForm,
  emptyValue: E
) {
  const text = (v: string): string | E => v.trim() || emptyValue;
  const rating = Number.parseInt(form.rating, 10);
  return {
    name: form.name.trim(),
    company: text(form.company),
    email: text(form.email),
    phone: text(form.phone),
    trade: (form.trade ? form.trade.toLowerCase() : emptyValue) as string | E,
    licenseNumber: text(form.licenseNumber),
    insuranceExpiry: (form.insuranceExpiry
      ? new Date(`${form.insuranceExpiry}T00:00:00.000Z`).toISOString()
      : emptyValue) as string | E,
    notes: text(form.notes),
    rating: (Number.isFinite(rating) && rating >= 1 && rating <= 5
      ? rating
      : emptyValue) as number | E,
  };
}

export type InsuranceStatus = "expired" | "expiring" | "current";

const DAY_MS = 86_400_000;

/**
 * Insurance state for a roster card. `expiring` = within `windowDays` (default
 * 30). Returns `null` when no expiry is on file (the card then shows nothing
 * rather than implying coverage).
 */
export function insuranceStatus(
  expiry: string | null | undefined,
  now: Date = new Date(),
  windowDays = 30
): { status: InsuranceStatus; daysLeft: number } | null {
  if (!expiry) return null;
  const t = Date.parse(expiry.length === 10 ? `${expiry}T23:59:59Z` : expiry);
  if (!Number.isFinite(t)) return null;
  const daysLeft = Math.ceil((t - now.getTime()) / DAY_MS);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  return { status: daysLeft <= windowDays ? "expiring" : "current", daysLeft };
}
