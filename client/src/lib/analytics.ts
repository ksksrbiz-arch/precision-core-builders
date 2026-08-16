/**
 * Lightweight GTM dataLayer helper for marketing conversion events.
 * No-ops when dataLayer is unavailable (SSR / ad blockers).
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type ConversionEvent =
  | "phone_click"
  | "contact_submit"
  | "estimator_complete"
  | "estimator_lead_submit"
  | "cta_click";

type EventPayload = {
  event: ConversionEvent;
  /** Optional free-form context (page path, CTA label, etc.) */
  context?: string;
  value?: number;
  currency?: string;
};

export function trackConversion(payload: EventPayload): void {
  if (typeof window === "undefined") return;
  const layer = window.dataLayer;
  if (!Array.isArray(layer)) return;
  layer.push({
    event: payload.event,
    event_context: payload.context ?? window.location.pathname,
    event_value: payload.value,
    event_currency: payload.currency ?? "USD",
  });
}

/** Convenience wrappers for common CTAs */
export function trackPhoneClick(source = "site"): void {
  trackConversion({ event: "phone_click", context: source });
}

export function trackContactSubmit(): void {
  trackConversion({ event: "contact_submit" });
}

export function trackEstimatorComplete(approxValue?: number): void {
  trackConversion({
    event: "estimator_complete",
    value: approxValue,
  });
}

export function trackEstimatorLeadSubmit(): void {
  trackConversion({ event: "estimator_lead_submit" });
}

export function trackCtaClick(label: string): void {
  trackConversion({ event: "cta_click", context: label });
}
