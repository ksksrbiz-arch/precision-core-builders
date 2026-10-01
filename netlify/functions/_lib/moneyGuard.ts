/**
 * Output guard for AI text that must never carry a dollar figure.
 *
 * The AI Operating Contract forbids a model from originating or adjusting a
 * price, cost, rate, or dollar figure — money comes from the estimating basis
 * (`shared/estimating/basis.ts`), never from generated prose. Prompting the
 * model not to is necessary but not sufficient ("validate output, not just
 * input"), so free-form model output that is shown to a user passes through
 * this deterministic redaction first.
 */

export const REDACTED_AMOUNT =
  "[amount withheld — priced by the estimating engine]";

// $1,200 · $ 1.2k · $3.5M · $450.00 · USD 2,000 · 2,000 USD · 1200 dollars
const MONEY_PATTERNS: RegExp[] = [
  /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|mm|million|thousand)?\b/gi,
  /\b(?:usd|us\$)\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|million|thousand)?\b/gi,
  /\b\d[\d,]*(?:\.\d+)?\s?(?:k|m|million|thousand)?\s?(?:usd|dollars?|bucks)\b/gi,
];

/**
 * Replace every dollar figure in `text` with a fixed marker. Returns the
 * sanitised text and how many figures were withheld so callers can surface a
 * notice.
 */
export function redactDollarFigures(text: string): {
  text: string;
  redacted: number;
} {
  let redacted = 0;
  let out = text;
  for (const pattern of MONEY_PATTERNS) {
    out = out.replace(pattern, () => {
      redacted += 1;
      return REDACTED_AMOUNT;
    });
  }
  return { text: out, redacted };
}
