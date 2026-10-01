import { afterEach, describe, expect, it, vi } from "vitest";
import submissionCreated from "../_utils/leadDelivery";
const request = () =>
  new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        id: "test-submission",
        form_name: "estimator-lead",
        data: { name: "Test", sqft: "100", utm_source: "google" },
      },
    }),
  });
describe("verified lead delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("retains the inquiry when automation is not configured", async () => {
    vi.stubGlobal("Netlify", { env: { get: () => undefined } });
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect((await submissionCreated(request())).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
  it("forwards attribution with a stable idempotency key", async () => {
    vi.stubGlobal("Netlify", {
      env: { get: () => "https://automation.example/webhook/" },
    });
    const send = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", send);
    expect((await submissionCreated(request())).status).toBe(200);
    const [url, options] = send.mock.calls[0];
    expect(url).toBe("https://automation.example/webhook/lead_captured");
    expect(options.headers["Idempotency-Key"]).toBe("test-submission");
    expect(JSON.parse(options.body).payload).toMatchObject({
      squareFootage: "100",
      source: "estimator",
      utm_source: "google",
    });
  });
  it("retries failures and exposes exhaustion", async () => {
    vi.stubGlobal("Netlify", {
      env: { get: () => "https://automation.example" },
    });
    const send = vi
      .fn()
      .mockResolvedValue(new Response("failed", { status: 503 }));
    vi.stubGlobal("fetch", send);
    expect((await submissionCreated(request())).status).toBe(502);
    expect(send).toHaveBeenCalledTimes(3);
  });
});
