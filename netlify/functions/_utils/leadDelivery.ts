/** Netlify invokes this reserved event function only for verified submissions.
 * The accepted form remains in Netlify Forms if automation is unavailable. */
declare const Netlify: { env: { get(name: string): string | undefined } };
export default async function submissionCreated(
  req: Request
): Promise<Response> {
  const { payload } = (await req.json()) as {
    payload?: {
      id?: string;
      form_name?: string;
      data?: Record<string, string>;
    };
  };
  if (!payload?.id || !payload.data)
    return new Response("Invalid submission", { status: 400 });
  // This helper also runs inside the existing legacy Lambda handler.
  const base =
    typeof Netlify !== "undefined"
      ? Netlify.env.get("N8N_WEBHOOK_URL")
      : process.env.N8N_WEBHOOK_URL;
  if (!base) {
    console.warn(
      "[lead-delivery] Automation not configured; inquiry retained in Netlify Forms",
      { submissionId: payload.id }
    );
    return new Response("Stored in Netlify Forms", { status: 200 });
  }
  const data = payload.data;
  const fields = [
    "name",
    "email",
    "phone",
    "projectType",
    "complexity",
    "estimatedMid",
    "estimatedLow",
    "estimatedHigh",
    "budget",
    "message",
    "service",
    "landingPage",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ];
  const lead = Object.fromEntries(
    fields
      .filter(key => typeof data[key] === "string")
      .map(key => [key, data[key]])
  );
  const body = JSON.stringify({
    event: "lead_captured",
    timestamp: new Date().toISOString(),
    source: "precision-core-builders",
    payload: {
      ...lead,
      squareFootage: data.sqft,
      source: payload.form_name === "estimator-lead" ? "estimator" : "contact",
      submissionId: payload.id,
    },
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(`${base.replace(/\/$/, "")}/lead_captured`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": payload.id,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (result.ok) {
        console.info("[lead-delivery] Delivered", {
          submissionId: payload.id,
          attempt,
        });
        return new Response("Delivered");
      }
    } catch {
      /* retry transient delivery failures without logging personal data */
    }
    if (attempt < 3) await new Promise(done => setTimeout(done, attempt * 500));
  }
  console.error(
    "[lead-delivery] Delivery exhausted; recover inquiry from Netlify Forms",
    { submissionId: payload.id }
  );
  return new Response("Automation failed; inquiry retained in Netlify Forms", {
    status: 502,
  });
}
