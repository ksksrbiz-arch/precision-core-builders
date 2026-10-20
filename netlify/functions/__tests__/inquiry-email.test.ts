import { afterEach, describe, expect, it, vi } from "vitest";
import { sendInquiryEmails } from "../_utils/inquiryEmail";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function enableSending() {
  vi.stubGlobal("Netlify", {
    env: {
      get: (key: string) =>
        key === "RESEND_INQUIRY_EMAILS_ENABLED" ? "true" : "test-only-key",
    },
  });
}

describe("inquiry emails", () => {
  it("sends both templates with correct recipients, reply addresses and stable retry keys", async () => {
    enableSending();
    const mock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mock);
    await sendInquiryEmails("submission-123", {
      name: "<script>alert(1)</script>",
      email: "customer@example.com",
      message: "A & B",
    });
    expect(mock).toHaveBeenCalledTimes(2);
    const owner = JSON.parse(mock.mock.calls[0][1].body);
    const customer = JSON.parse(mock.mock.calls[1][1].body);
    expect(owner.to).toBe("erictadlock@precisioncorebuilders.com");
    expect(owner.reply_to).toBe("customer@example.com");
    expect(customer.to).toBe("customer@example.com");
    expect(customer.reply_to).toBe(owner.to);
    expect(owner.template.variables.CUSTOMER_NAME).toContain("&lt;script&gt;");
    expect(owner.template.variables.MESSAGE).toBe("A &amp; B");
    expect(mock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      "pcb-inquiry-submission-123-owner"
    );
  });

  it("does not send with missing configuration or invalid recipients", async () => {
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    await sendInquiryEmails("123", { email: "customer@example.com" });
    enableSending();
    await sendInquiryEmails("123", { email: "bad\r\nBcc:other@example.com" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("reports permanent failure without endlessly retrying", async () => {
    enableSending();
    const mock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", mock);
    await expect(
      sendInquiryEmails("123", { email: "customer@example.com" })
    ).rejects.toThrow("delivery failed");
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("reads its settings from process.env when there is no Netlify global (the production case)", async () => {
    // Legacy-style serverless functions have no `Netlify` global; the flag and the
    // API key are only visible through process.env. This failed silently in prod.
    expect((globalThis as { Netlify?: unknown }).Netlify).toBeUndefined();
    vi.stubEnv("RESEND_INQUIRY_EMAILS_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    const mock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mock);
    await sendInquiryEmails("submission-456", {
      email: "customer@example.com",
    });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer test-only-key"
    );
  });

  it("says so in the logs when sending is switched off", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    await sendInquiryEmails("789", { email: "customer@example.com" });
    expect(mock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_INQUIRY_EMAILS_ENABLED")
    );
    warn.mockRestore();
  });
});
