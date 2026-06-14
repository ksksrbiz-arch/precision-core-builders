import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Null-safe date formatters. Database timestamps can be null or malformed;
 * `new Date(null)` / `new Date("bad")` yields an Invalid Date whose
 * `.toLocale*` methods render the literal string "Invalid Date" in the UI.
 * These helpers return a placeholder instead.
 */
function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  const date = toValidDate(value);
  return date ? date.toLocaleDateString("en-US", options) : fallback;
}

export function fmtDateTime(value: unknown, fallback = "—"): string {
  const date = toValidDate(value);
  return date ? date.toLocaleString() : fallback;
}
