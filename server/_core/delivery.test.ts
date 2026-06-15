import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  ENV: {
    resendApiKey: "",
    briefingEmailFrom: "from@example.com",
    briefingEmailTo: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFrom: "",
    briefingSmsTo: "",
  },
}));

import { ENV } from "./env";
import { sendEmail, sendSms } from "./delivery";

beforeEach(() => {
  ENV.resendApiKey = "";
  ENV.briefingEmailTo = "";
  ENV.twilioAccountSid = "";
  ENV.twilioAuthToken = "";
  ENV.twilioFrom = "";
  ENV.briefingSmsTo = "";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("skips cleanly when unconfigured (no network call)", async () => {
    const r = await sendEmail({ subject: "s", text: "t" });
    expect(r).toMatchObject({ channel: "email", ok: false, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts to Resend when configured", async () => {
    ENV.resendApiKey = "re_123";
    ENV.briefingEmailTo = "eric@example.com";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: async () => "{}",
    });
    const r = await sendEmail({ subject: "s", text: "t" });
    expect(r.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe("sendSms", () => {
  it("skips cleanly when unconfigured (no network call)", async () => {
    const r = await sendSms({ body: "hi" });
    expect(r).toMatchObject({ channel: "sms", ok: false, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});
