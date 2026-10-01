type EmailEnvironment = { env: { get(key: string): string | undefined } };

function env(key: string) {
  return (
    globalThis as typeof globalThis & { Netlify?: EmailEnvironment }
  ).Netlify?.env.get(key);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!
  );
}

/** Called only by Netlify's signed submission-created event, never a public mail API. */
export async function sendInquiryEmails(
  id: string,
  data: Record<string, string>
) {
  // Explicit production-only opt-in prevents preview/test deploys emailing real leads.
  if (env("RESEND_INQUIRY_EMAILS_ENABLED") !== "true") return;
  const key = env("RESEND_API_KEY");
  if (!key) {
    console.warn("[inquiry-email] RESEND_API_KEY missing; sending disabled");
    return;
  }
  const email = data.email?.trim();
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s<>"'@]+@[^\s<>"'@]+\.[^\s<>"'@]+$/.test(email)
  ) {
    console.warn("[inquiry-email] Invalid customer email; sending skipped");
    return;
  }
  const name = escapeHtml(data.name?.trim() || "there");
  const project = escapeHtml(
    data.projectType || data.service || "Project consultation"
  );
  const from =
    "Precision Core Builders <notifications@precisioncorebuilders.com>";
  const eric = "erictadlock@precisioncorebuilders.com";
  const messages = [
    {
      kind: "owner",
      to: eric,
      reply_to: email,
      template: {
        id: "711366a5-6374-4205-8032-fe73a6a81fda",
        variables: {
          CUSTOMER_NAME: name,
          CUSTOMER_EMAIL: email,
          CUSTOMER_PHONE: escapeHtml(data.phone || "Phone not provided"),
          PROJECT_TYPE: project,
          MESSAGE: escapeHtml(
            data.message || "No additional details provided."
          ),
        },
      },
    },
    {
      kind: "customer",
      to: email,
      reply_to: eric,
      template: {
        id: "81fc6a15-a209-436d-b184-70951c766ee4",
        variables: { CUSTOMER_NAME: name, PROJECT_TYPE: project },
      },
    },
  ];
  const outcomes = await Promise.allSettled(
    messages.map(async ({ kind, ...message }) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `pcb-inquiry-${id}-${kind}`,
            },
            body: JSON.stringify({ from, ...message }),
            signal: AbortSignal.timeout(8_000),
          });
          if (response.ok) {
            console.log(
              `[inquiry-email] ${kind} accepted for submission ${id}`
            );
            return;
          }
          if (response.status !== 429 && response.status < 500) {
            throw new Error(`Resend rejected ${kind}: HTTP ${response.status}`);
          }
          if (attempt === 2)
            throw new Error(
              `Resend unavailable for ${kind}: HTTP ${response.status}`
            );
        } catch (error) {
          if (
            attempt === 2 ||
            (error instanceof Error &&
              error.message.startsWith("Resend rejected"))
          )
            throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      }
    })
  );
  if (outcomes.some(result => result.status === "rejected")) {
    console.error(
      `[inquiry-email] Delivery failed for submission ${id}; retained in Netlify Forms`
    );
    throw new Error("Inquiry email delivery failed");
  }
}
