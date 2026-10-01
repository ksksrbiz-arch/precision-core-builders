/** Public pricing decisions belong to Eric, including when a visitor asks AI. */
export const ERIC_PRICING_RESPONSE =
  "Eric prepares all project pricing after reviewing the scope and property. This website does not provide budget ranges or cost estimates. Contact Eric at 541-852-5144 or visit /contact to arrange an on-site consultation.";

export function isPricingRequest(message: string): boolean {
  return /\b(cost|costs|price|prices|pricing|budget|estimate|estimates|quote|quotes|ballpark|afford|expensive|cheap|dollars?|USD|how much)\b|[$€£]/i.test(
    message
  );
}

export function publicProjectAnswer(answer: string): string {
  return isPricingRequest(answer) ||
    /\b\d[\d,.]*k\s*[–-]\s*\d[\d,.]*k\b/i.test(answer)
    ? ERIC_PRICING_RESPONSE
    : answer;
}
