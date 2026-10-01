import { describe, expect, it } from "vitest";
import {
  ERIC_PRICING_RESPONSE,
  isPricingRequest,
  publicProjectAnswer,
} from "../_utils/publicPricingPolicy";

describe("public project pricing policy", () => {
  it.each([
    "How much is a kitchen remodel?",
    "Give me a ballpark",
    "Can I afford a deck?",
    "My budget is $25,000",
    "Estimate the cost per square foot",
  ])("sends pricing request to Eric: %s", message => {
    expect(isPricingRequest(message)).toBe(true);
  });
  it.each([
    "Allow $25,000 to $50,000",
    "Approximately 30000 USD",
    "Twenty thousand dollars",
    "Allow 25k–50k",
    "The typical cost is fifty thousand",
  ])("blocks monetary model output: %s", answer => {
    expect(publicProjectAnswer(answer)).toBe(ERIC_PRICING_RESPONSE);
  });
  it("allows construction guidance without publishing pricing", () => {
    expect(isPricingRequest("What materials work well for a deck?")).toBe(
      false
    );
    expect(
      publicProjectAnswer("Bring photos and plans to your consultation.")
    ).toBe("Bring photos and plans to your consultation.");
  });
});
