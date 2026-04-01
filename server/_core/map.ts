/**
 * Map utilities — Eugene, OR default center.
 * Phase 2: used by project location display and weather scheduling.
 */
export const EUGENE_OR = {
  lat: 44.0521,
  lng: -123.0868,
  city: "Eugene",
  state: "OR",
} as const;

export function formatAddress(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  return [parts.address, parts.city, parts.state, parts.zip]
    .filter(Boolean)
    .join(", ");
}
