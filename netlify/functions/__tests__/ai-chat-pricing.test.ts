import { beforeEach, describe, expect, it, vi } from "vitest";
const { runToolLoop } = vi.hoisted(() => ({ runToolLoop: vi.fn() }));
vi.mock("../../../server/_core/llm", () => ({
  runToolLoop,
  invokeLLM: vi.fn(),
  streamLLM: vi.fn(),
}));
vi.mock("../../../server/_core/ai/tools", () => ({
  toolsForSurface: () => [],
  toolExecutorFor: () => vi.fn(),
}));
import { handler } from "../ai-chat";
import { ERIC_PRICING_RESPONSE } from "../_utils/publicPricingPolicy";

let ip = 0;
async function chat(message: string) {
  const response = await handler(
    {
      httpMethod: "POST",
      headers: {
        origin: "https://precisioncorebuilders.com",
        "x-forwarded-for": `192.0.2.${++ip}`,
      },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
      path: "/api/ai-chat",
      isBase64Encoded: false,
    } as never,
    {} as never,
    vi.fn()
  );
  return {
    status: response?.statusCode,
    data: JSON.parse(response?.body as string),
  };
}
beforeEach(() => runToolLoop.mockReset());
describe("public chat leaves pricing to Eric", () => {
  it("answers a cost question without calling a model or estimator", async () => {
    const response = await chat("How much does a kitchen remodel cost?");
    expect(response.status).toBe(200);
    expect(response.data.text).toBe(ERIC_PRICING_RESPONSE);
    expect(response.data.estimateReady).toBe(false);
    expect(runToolLoop).not.toHaveBeenCalled();
  });
  it("replaces unsolicited monetary output on a non-pricing question", async () => {
    runToolLoop.mockResolvedValue({
      text: "A cedar deck is about $20,000.",
      model: "test",
      provider: "test",
      toolTrace: [],
    });
    const response = await chat("What materials can I use for a deck?");
    expect(response.status).toBe(200);
    expect(response.data.text).toBe(ERIC_PRICING_RESPONSE);
    expect(runToolLoop).toHaveBeenCalledWith(
      expect.objectContaining({ tools: [] })
    );
  });
});
