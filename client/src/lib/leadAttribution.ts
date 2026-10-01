/** Attribution contains campaign context only; never copy arbitrary query data. */
const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
const STORAGE_KEY = "pcb_campaign_context";
export function captureLeadAttribution(): Record<string, string> {
  const current: Record<string, string> = {
    landingPage: window.location.pathname,
    referrer: "",
  };
  const params = new URLSearchParams(window.location.search);
  try {
    current.referrer = document.referrer
      ? new URL(document.referrer).origin
      : "";
  } catch {
    /* malformed referrer */
  }
  for (const key of KEYS) current[key] = (params.get(key) ?? "").slice(0, 200);
  try {
    const previous = sessionStorage.getItem(STORAGE_KEY);
    if (previous && !KEYS.some(key => params.has(key))) {
      const parsed = JSON.parse(previous);
      if (parsed && typeof parsed === "object") {
        for (const key of ["landingPage", "referrer", ...KEYS]) {
          if (typeof parsed[key] === "string")
            current[key] = parsed[key].slice(0, 200);
        }
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* blocked storage does not prevent an inquiry */
  }
  return current;
}
export function appendLeadAttribution(data: FormData): void {
  for (const [key, value] of Object.entries(captureLeadAttribution()))
    data.set(key, value);
}
