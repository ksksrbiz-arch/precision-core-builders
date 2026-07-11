/**
 * Shared display formatters.
 *
 * Consolidates the `$${n.toLocaleString()}`, ad-hoc number, and percent
 * formatting that was inlined across estimator, project, schedule, billing, and
 * dashboard pages. Date formatting continues to live in `utils.ts` and is
 * re-exported here so pages can import every formatter from one module.
 *
 * These mirror the previous inline output (locale "en-US", `$` prefix, plain
 * `toLocaleString`) so adopting them does not change what users see.
 */
export { fmtDate, fmtDateTime } from "./utils";

function isNullish(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

/**
 * Format a value as USD, e.g. `1234` → `"$1,234"`. Mirrors the previously
 * inlined `$${n.toLocaleString()}` pattern, with null-safety.
 */
export function formatCurrency(
  value: number | null | undefined,
  fallback = "—"
): string {
  if (isNullish(value)) return fallback;
  return `$${(value as number).toLocaleString("en-US")}`;
}

/** Format a number with locale grouping, e.g. `1234.5` → `"1,234.5"`. */
export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  fallback = "—"
): string {
  if (isNullish(value)) return fallback;
  return (value as number).toLocaleString("en-US", options);
}

/**
 * Format a value as compact USD, e.g. `1_200_000` → `"$1.2M"`, `5000` →
 * `"$5K"`, `450` → `"$450"`. Backs chart axis/tooltip labels that need a short
 * money string. Null/undefined/NaN render as the fallback.
 */
export function formatCompactCurrency(
  value: number | null | undefined,
  fallback = "—"
): string {
  if (isNullish(value)) return fallback;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value as number);
}

/** Format a value already expressed in percent units, e.g. `42` → `"42%"`. */
export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 0,
  fallback = "—"
): string {
  if (isNullish(value)) return fallback;
  return `${(value as number).toFixed(fractionDigits)}%`;
}
