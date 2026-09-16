/**
 * Handler tests for the rewritten estimator.
 *
 * The behaviour that matters here is the fail-down guarantee: the dollar
 * figures are produced by code, so an absent, broken, or misbehaving LLM must
 * degrade the *explanation* and never the estimate. Before the rewrite, a
 * provider failure returned a 502 and the visitor got nothing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeEstimate } from "../../../shared/estimating";

const invokeLLM = vi.fn();
const getSupabaseAdmin = vi.fn(() => null);

vi.mock("../../../server/_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLM(...args),
}));
vi.mock("../../../server/_core/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

function mockEvent(body: unknown, ip = "203.0.113.1") {
  return {
    httpMethod: "POST",
    headers: { origin: "http://localhost:5173", "x-forwarded-for": ip },
    body: JSON.stringify(body),
    isBase64Encoded: false,
    path: "/api/estimate-project",
    queryStringParameters: null,
  };
}

async function post(body: unknown, ip?: string) {
  const { handler } = await import("../estimate-project");
  const response = await handler(mockEvent(body, ip) as never, {} as never);
  return {
    statusCode: response!.statusCode,
    body: JSON.parse(response!.body as string),
  };
}

/** Unique IP per test so the shared rate limiter doesn't bleed across cases. */
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;

beforeEach(() => {
  invokeLLM.mockReset();
  getSupabaseAdmin.mockReset();
  getSupabaseAdmin.mockReturnValue(null);
});

describe("estimate-project — deterministic figures", () => {
  it("returns the computed estimate, not a model's numbers", async () => {
    // The model is told the figures are final; even if it tries to restate
    // different ones, the response carries the computed values.
    invokeLLM.mockResolvedValue({
      text: "Kitchen remodels in Eugene are driven by cabinetry and countertop selections, plus any plumbing or electrical relocation. An on-site visit sets the real scope.",
      model: "test",
      provider: "groq",
    });

    const { statusCode, body } = await post(
      { projectType: "kitchen", complexity: "medium" },
      nextIp()
    );

    const expected = computeEstimate({
      projectType: "kitchen",
      complexity: "medium",
    });
    if (expected.status !== "ok") throw new Error("fixture should price");

    expect(statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.estimatedLow).toBe(expected.estimate.estimatedLow);
    expect(body.estimatedMid).toBe(expected.estimate.estimatedMid);
    expect(body.estimatedHigh).toBe(expected.estimate.estimatedHigh);
    expect(body.basis.explanationSource).toBe("ai");
  });

  it("still returns the estimate when the LLM is unavailable", async () => {
    invokeLLM.mockRejectedValue(new Error("No LLM API key configured"));

    const { statusCode, body } = await post(
      { projectType: "bathroom", complexity: "high" },
      nextIp()
    );

    expect(statusCode).toBe(200);
    expect(body.estimatedMid).toBeGreaterThan(0);
    expect(body.basis.explanationSource).toBe("deterministic");
    // The deterministic explanation still accounts for the number.
    expect(body.aiReasoning).toMatch(/whole-project range/);
    expect(body.aiReasoning).toMatch(/not a firm quote/);
  });

  it("discards an explanation that invents a dollar figure", async () => {
    invokeLLM.mockResolvedValue({
      text: "Expect to pay about $412,000 for this build, all in.",
      model: "test",
      provider: "groq",
    });

    const { body } = await post(
      { projectType: "new-home", squareFootage: 2000 },
      nextIp()
    );

    expect(body.basis.explanationSource).toBe("deterministic");
    expect(body.aiReasoning).not.toMatch(/412,000/);
  });

  it("discards an explanation that invents a rate", async () => {
    invokeLLM.mockResolvedValue({
      text: "Eugene additions typically run 92% of new-build cost per square foot.",
      model: "test",
      provider: "groq",
    });

    const { body } = await post(
      { projectType: "addition", squareFootage: 500 },
      nextIp()
    );

    expect(body.basis.explanationSource).toBe("deterministic");
  });

  it("discards an explanation that presents the estimate as a commitment", async () => {
    invokeLLM.mockResolvedValue({
      text: "This is a firm quote and the price is locked in for your project.",
      model: "test",
      provider: "groq",
    });

    const { body } = await post({ projectType: "roofing" }, nextIp());

    expect(body.basis.explanationSource).toBe("deterministic");
  });

  it("rejects a figure that is only a substring of an allowed one", async () => {
    // "$18" sits inside the allowed "$180", and "5%" inside "45%". A substring
    // check would wave both through; matching is exact per figure.
    invokeLLM.mockResolvedValue({
      text: "Framing runs about $18 per square foot and permits are roughly 5% of the job.",
      model: "test",
      provider: "groq",
    });

    const { body } = await post(
      { projectType: "new-home", squareFootage: 2000 },
      nextIp()
    );

    expect(body.basis.explanationSource).toBe("deterministic");
  });

  it("keeps an explanation that restates the computed figures", async () => {
    const computed = computeEstimate({
      projectType: "kitchen",
      complexity: "medium",
    });
    if (computed.status !== "ok") throw new Error("fixture should price");

    invokeLLM.mockResolvedValue({
      text: `Cabinetry and countertops drive most of the $${computed.estimate.estimatedMid.toLocaleString()} expected figure. Layout changes that move plumbing push it upward.`,
      model: "test",
      provider: "groq",
    });

    const { body } = await post(
      { projectType: "kitchen", complexity: "medium" },
      nextIp()
    );

    expect(body.basis.explanationSource).toBe("ai");
  });

  it("keeps an explanation that reuses figures from the derivation", async () => {
    const computed = computeEstimate({
      projectType: "new-home",
      squareFootage: 2000,
      complexity: "medium",
    });
    if (computed.status !== "ok") throw new Error("fixture should price");

    // Quoting the basis rate back is legitimate — it is in the derivation.
    invokeLLM.mockResolvedValue({
      text: "The $180–$350/sqft range reflects finish level more than anything else. Cabinetry, millwork and window packages move a build within it.",
      model: "test",
      provider: "groq",
    });

    const { body } = await post(
      { projectType: "new-home", squareFootage: 2000 },
      nextIp()
    );

    expect(body.basis.explanationSource).toBe("ai");
    expect(body.aiReasoning).toMatch(/180/);
  });
});

describe("estimate-project — VERIFY path", () => {
  it("returns VERIFY instead of a number for an unpriced project type", async () => {
    const { statusCode, body } = await post(
      { projectType: "adu", squareFootage: 800 },
      nextIp()
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBe("verify");
    expect(body.estimatedMid).toBeUndefined();
    expect(body.projectType).toBe("ADU / Second Unit");
    expect(body.message).toMatch(/on-site estimate/i);
    // No model call is needed to say "we don't price this from a form".
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns VERIFY when a per-sqft type has no square footage", async () => {
    const { body } = await post({ projectType: "new-home" }, nextIp());

    expect(body.status).toBe("verify");
    expect(body.reason).toMatch(/per square foot/);
  });

  it("returns VERIFY for a project type outside the basis", async () => {
    const { body } = await post({ projectType: "helipad" }, nextIp());

    expect(body.status).toBe("verify");
    expect(body.reason).toMatch(/isn't in the estimating basis/);
  });

  it("never persists a VERIFY result", async () => {
    const insert = vi.fn();
    getSupabaseAdmin.mockReturnValue({
      from: () => ({ insert }),
    } as never);

    await post(
      {
        projectType: "cabinets",
        clientId: "3f6d1c4e-0000-4000-8000-000000000001",
      },
      nextIp()
    );

    expect(insert).not.toHaveBeenCalled();
  });
});

describe("estimate-project — basis metadata", () => {
  it("reports how old the cost assumptions are", async () => {
    invokeLLM.mockRejectedValue(new Error("offline"));

    const { body } = await post({ projectType: "kitchen" }, nextIp());

    expect(body.basis.region).toMatch(/Eugene/);
    expect(typeof body.basis.reviewedAt).toBe("string");
    expect(body.basis.ageDays).toBeGreaterThan(0);
    // The relocated rates are knowingly unreviewed — the response says so
    // rather than implying the number rests on current market data.
    expect(body.basis.stale).toBe(true);
  });
});
