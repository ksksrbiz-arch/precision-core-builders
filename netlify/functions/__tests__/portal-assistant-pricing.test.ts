import { beforeEach, describe, expect, it, vi } from "vitest";
const { invokeLLM, buildPortalSnapshot } = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  buildPortalSnapshot: vi.fn(),
}));
vi.mock("../../../server/_core/llm", () => ({ invokeLLM }));
vi.mock("../../../server/_core/portalSnapshot", () => ({
  buildPortalSnapshot,
}));
vi.mock("../_utils/authGuard", () => ({
  verifyAuth: async () => ({ ok: true, user: { id: "client", role: "user" } }),
}));
import { handler } from "../portal-assistant";
import { ERIC_PRICING_RESPONSE } from "../_utils/publicPricingPolicy";

beforeEach(() => {
  invokeLLM.mockReset();
  buildPortalSnapshot.mockReset();
});
describe("client portal pricing", () => {
  it("leaves new estimates to Eric without calling AI or reading project data", async () => {
    const response = await handler(
      {
        httpMethod: "POST",
        headers: { origin: "https://precisioncorebuilders.com" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "What would a new deck cost?" }],
        }),
        path: "/api/portal-assistant",
        isBase64Encoded: false,
      } as never,
      {} as never
    );
    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response?.body as string).text).toBe(
      ERIC_PRICING_RESPONSE
    );
    expect(invokeLLM).not.toHaveBeenCalled();
    expect(buildPortalSnapshot).not.toHaveBeenCalled();
  });
});
