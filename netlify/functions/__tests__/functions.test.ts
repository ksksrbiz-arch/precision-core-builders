/**
 * Tests for Netlify Functions
 * Integration tests for serverless API endpoints
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// ─── Helper: Mock Netlify Event ─────────────────────────────

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters?: Record<string, string> | null;
  isBase64Encoded?: boolean;
};

function mockEvent(
  method: string = "GET",
  body?: object,
  headers: Record<string, string> = {}
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      "content-type": "application/json",
      origin: "https://precision-core.netlify.app",
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: null,
  };
}

// ─── Estimate Project Function Tests ────────────────────────

describe("estimate-project function", () => {
  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../estimate-project");
    const event = mockEvent("GET");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });

  it("validates required projectType field", async () => {
    const { handler } = await import("../estimate-project");
    const event = mockEvent("POST", {
      squareFootage: 2000,
      // missing projectType
    });
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toMatch(/projectType/i);
  });
});

// ─── Weather Schedule Function Tests ────────────────────────

describe("weather-schedule function", () => {
  it("returns 405 for non-GET requests", async () => {
    const { handler } = await import("../weather-schedule");
    const event = mockEvent("POST");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });

  it("returns forecast for Eugene, OR", async () => {
    const { handler } = await import("../weather-schedule");
    const event = mockEvent("GET");
    event.queryStringParameters = { projectId: "1" };
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("forecast");
    expect(Array.isArray(body.forecast)).toBe(true);
    expect(body.forecast.length).toBeGreaterThanOrEqual(7);
    expect(body).toHaveProperty("location");
  });
});

// ─── AI Chat Function Tests ─────────────────────────────────

describe("ai-chat function", () => {
  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../ai-chat");
    const event = mockEvent("GET");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });

  it("requires messages array", async () => {
    const { handler } = await import("../ai-chat");
    const event = mockEvent("POST", {});
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toMatch(/messages/i);
  });
});

// ─── AI Ops Co-pilot Function Tests ─────────────────────────

describe("ai-copilot function", () => {
  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../ai-copilot");
    const event = mockEvent("GET");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });

  it("requires authentication (401 without a token)", async () => {
    const { handler } = await import("../ai-copilot");
    const event = mockEvent("POST", {
      messages: [{ role: "user", content: "status?" }],
    });
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(401);
  });
});

// ─── Lead Score Function Tests ──────────────────────────────

describe("lead-score function", () => {
  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../lead-score");
    const event = mockEvent("GET");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });
});

// ─── SuperSplat Config Function Tests ────────────────────────

describe("supersplat-config function", () => {
  it("returns public integration configuration", async () => {
    const { handler } = await import("../supersplat-config");
    const event = mockEvent("GET");
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.provider).toBe("SuperSplat");
    expect(body.accountUrl).toMatch(/^https:\/\/superspl\.at/);
    expect(body.demoUrl).toMatch(/^https:\/\//);
    expect(Array.isArray(body.features)).toBe(true);
  });

  it("returns 405 for non-GET requests", async () => {
    const { handler } = await import("../supersplat-config");
    const event = mockEvent("POST", {});
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(405);
  });
});

// ─── Platform Health Function Tests ─────────────────────────

describe("platform-health function", () => {
  const ORIGINAL_TOKEN = process.env.SETUP_ADMIN_TOKEN;
  beforeAll(() => {
    process.env.SETUP_ADMIN_TOKEN = "test-admin-token";
  });
  afterAll(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.SETUP_ADMIN_TOKEN;
    else process.env.SETUP_ADMIN_TOKEN = ORIGINAL_TOKEN;
  });

  it("requires adminToken for access", async () => {
    const { handler } = await import("../platform-health");
    const event = mockEvent("GET");
    // No admin token provided
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(401);
  });

  it("fails closed with 503 when SETUP_ADMIN_TOKEN is not configured", async () => {
    delete process.env.SETUP_ADMIN_TOKEN;
    const { handler } = await import("../platform-health");
    // Even presenting the old hardcoded bootstrap value must not authenticate.
    const event = {
      ...mockEvent("GET"),
      headers: { authorization: "Bearer pcb-bootstrap-2026" },
    };
    const response = await handler(event as any, {} as any);
    expect(response.statusCode).toBe(503);
    process.env.SETUP_ADMIN_TOKEN = "test-admin-token";
  });
});

// ─── Platform Actions Function Tests ─────────────────────────

describe("platform-actions function", () => {
  const ORIGINAL_TOKEN = process.env.SETUP_ADMIN_TOKEN;
  beforeAll(() => {
    process.env.SETUP_ADMIN_TOKEN = "test-admin-token";
  });
  afterAll(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.SETUP_ADMIN_TOKEN;
    else process.env.SETUP_ADMIN_TOKEN = ORIGINAL_TOKEN;
  });

  it("requires adminToken for access", async () => {
    const { handler } = await import("../platform-actions");
    const event = mockEvent("POST", { action: "get-stats" });
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(401);
  });

  it("fails closed with 503 when SETUP_ADMIN_TOKEN is not configured", async () => {
    delete process.env.SETUP_ADMIN_TOKEN;
    const { handler } = await import("../platform-actions");
    // The removed hardcoded bootstrap token must no longer grant access.
    const event = mockEvent("POST", {
      action: "get-stats",
      adminToken: "pcb-bootstrap-2026",
    });
    const response = await handler(event as any, {} as any);
    expect(response.statusCode).toBe(503);
    process.env.SETUP_ADMIN_TOKEN = "test-admin-token";
  });

  it("returns normalized action errors", async () => {
    const { handler } = await import("../platform-actions");
    const event = mockEvent("POST", {
      action: "get-stats",
      adminToken: "test-admin-token",
    });
    const response = await handler(event as any, {} as any);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Supabase not configured");
    expect(body.message).not.toMatch(/^Error:/);
  });
});

// ─── CORS and Security Tests ────────────────────────────────

describe("CORS and Security Headers", () => {
  it("all functions respond to OPTIONS preflight", async () => {
    const { handler: estimateHandler } = await import("../estimate-project");
    const { handler: weatherHandler } = await import("../weather-schedule");
    const { handler: chatHandler } = await import("../ai-chat");

    const optionsEvent = mockEvent("OPTIONS");

    const responses = await Promise.all([
      estimateHandler(optionsEvent as any, {} as any),
      weatherHandler(optionsEvent as any, {} as any),
      chatHandler(optionsEvent as any, {} as any),
    ]);

    responses.forEach(response => {
      expect([200, 204]).toContain(response.statusCode);
      expect(response.headers).toHaveProperty("Access-Control-Allow-Origin");
    });
  });
});
