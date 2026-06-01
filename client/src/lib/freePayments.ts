/**
 * Free payment-link generators — PayPal.me / Venmo / Zelle / mailto invoice.
 *
 * These helpers produce a public URL that the contractor can text or email
 * to a client to request payment. No API key, no Stripe account, no fees
 * (until the client uses the payment service's own card surcharge, if any).
 *
 * Configure the handles via Vite environment variables:
 *   VITE_PAYPAL_ME_USERNAME      e.g. "ericpcb"  → https://paypal.me/ericpcb/250
 *   VITE_VENMO_USERNAME          e.g. "Eric-T"   → https://venmo.com/Eric-T?…
 *   VITE_ZELLE_HANDLE            e.g. "eric@precisioncorebuilders.com"
 *   VITE_INVOICE_FROM_EMAIL      e.g. "eric@precisioncorebuilders.com"
 *
 * Handles fall back to empty strings — UI hides options that are not set.
 */

export type FreePaymentProvider = "paypal" | "venmo" | "zelle" | "email";

export type FreePaymentRequest = {
  amountCents: number;
  description: string;
  clientEmail?: string;
  clientName?: string;
  projectName?: string;
};

export type FreePaymentLink = {
  provider: FreePaymentProvider;
  label: string;
  /** External URL or mailto: URL to copy / open. */
  url: string;
  /** True if the link launches the user's mail client rather than a website. */
  isMailto: boolean;
};

const env =
  (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export function getFreePaymentConfig() {
  return {
    paypalMe: (env.VITE_PAYPAL_ME_USERNAME ?? "").trim(),
    venmo: (env.VITE_VENMO_USERNAME ?? "").trim(),
    zelle: (env.VITE_ZELLE_HANDLE ?? "").trim(),
    fromEmail: (env.VITE_INVOICE_FROM_EMAIL ?? "").trim(),
  };
}

export function hasAnyFreePaymentMethod(): boolean {
  const c = getFreePaymentConfig();
  return Boolean(c.paypalMe || c.venmo || c.zelle || c.fromEmail);
}

function fmtAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function fmtAmountWithCommas(amountCents: number): string {
  return (amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Build the body text that goes into the mailto: invoice and into any
 * "copy and paste to a text message" workflow.
 */
function buildInvoiceMessage(
  req: FreePaymentRequest,
  links: FreePaymentLink[]
): string {
  const amount = `$${fmtAmountWithCommas(req.amountCents)}`;
  const lines: string[] = [];
  lines.push(
    `Hi${req.clientName ? " " + req.clientName : ""},`,
    "",
    `Here is your invoice from Precision Core Builders:`,
    "",
    `  Amount due: ${amount}`,
    `  Description: ${req.description}`
  );
  if (req.projectName) lines.push(`  Project: ${req.projectName}`);
  lines.push("");
  const payable = links.filter(l => !l.isMailto);
  if (payable.length > 0) {
    lines.push("You can pay by clicking any of the following links:");
    for (const l of payable) {
      lines.push(`  • ${l.label}: ${l.url}`);
    }
    lines.push("");
  }
  lines.push("Thank you for your business.", "", "— Precision Core Builders");
  return lines.join("\n");
}

/**
 * Generate every free payment link configured in the environment.
 * The returned array is ordered by the most "user-friendly" option first.
 */
export function buildFreePaymentLinks(
  req: FreePaymentRequest
): FreePaymentLink[] {
  const cfg = getFreePaymentConfig();
  const links: FreePaymentLink[] = [];
  const amount = fmtAmount(req.amountCents);
  const note = encodeURIComponent(req.description);

  if (cfg.paypalMe) {
    // paypal.me/<user>/<amount> opens the Send Money UI with the amount filled in.
    links.push({
      provider: "paypal",
      label: "PayPal",
      url: `https://www.paypal.com/paypalme/${encodeURIComponent(cfg.paypalMe)}/${amount}USD`,
      isMailto: false,
    });
  }

  if (cfg.venmo) {
    // venmo.com/<user>?txn=pay&amount=&note= — opens Venmo web/app with prefilled fields.
    links.push({
      provider: "venmo",
      label: "Venmo",
      url:
        `https://venmo.com/${encodeURIComponent(cfg.venmo)}` +
        `?txn=pay&amount=${amount}&note=${note}`,
      isMailto: false,
    });
  }

  if (cfg.zelle) {
    // Zelle has no public deep link, so we emit a mailto: containing the
    // handle and instructions — the client opens their own bank app to send.
    const subject = encodeURIComponent(`Zelle payment: ${req.description}`);
    const body = encodeURIComponent(
      `Please send $${fmtAmountWithCommas(req.amountCents)} via Zelle to:\n\n  ${cfg.zelle}\n\nMemo: ${req.description}\n\nThank you.`
    );
    const to = encodeURIComponent(req.clientEmail ?? "");
    links.push({
      provider: "zelle",
      label: "Zelle (email instructions)",
      url: `mailto:${to}?subject=${subject}&body=${body}`,
      isMailto: true,
    });
  }

  // Always include a "send the whole invoice as an email" mailto: option
  // when a client email address is known, even if no payment handle is set.
  if (req.clientEmail) {
    const subject = encodeURIComponent(
      `Invoice from Precision Core Builders — $${fmtAmountWithCommas(req.amountCents)}`
    );
    const body = encodeURIComponent(buildInvoiceMessage(req, links));
    const cc = cfg.fromEmail ? `&cc=${encodeURIComponent(cfg.fromEmail)}` : "";
    links.push({
      provider: "email",
      label: "Email invoice to client",
      url: `mailto:${encodeURIComponent(req.clientEmail)}?subject=${subject}${cc}&body=${body}`,
      isMailto: true,
    });
  }

  return links;
}
