import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const markSent = vi.fn();
vi.mock("../_data/notificationsRepo", () => ({
  notificationsRepo: {
    insert: (...a: unknown[]) => insert(...a),
    markSent: (...a: unknown[]) => markSent(...a),
  },
}));
const sendEmail = vi.fn();
vi.mock("./delivery", () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
}));

import {
  estimateReadyMessage,
  notifyClientEstimateSent,
} from "./estimateNotifications";

const est = {
  id: 3,
  project_id: 12,
  projects: { name: "Canby Farmhouse" },
  clients: { name: "Jane Reynolds", email: "jane@example.com", user_id: "u-1" },
};

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ id: 99 });
  markSent.mockReset().mockResolvedValue({});
  sendEmail.mockReset().mockResolvedValue({ channel: "email", ok: true });
});

describe("estimateReadyMessage", () => {
  it("is personalised and never contains a dollar figure", () => {
    const { subject, body } = estimateReadyMessage(est);
    expect(subject).toMatch(/estimate/i);
    expect(body).toContain("Hi Jane,");
    expect(body).toContain("Canby Farmhouse");
    expect(body).not.toMatch(/\$\s?\d/);
  });

  it("falls back to a neutral greeting without a client name", () => {
    expect(estimateReadyMessage({ id: 1 }).body.startsWith("Hello,")).toBe(
      true
    );
  });
});

describe("notifyClientEstimateSent", () => {
  it("sends an in-app notification and an email", async () => {
    const r = await notifyClientEstimateSent(est);
    expect(r).toEqual({ inApp: true, email: "sent" });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_id: "u-1",
        project_id: 12,
        channel: "in_app",
      })
    );
    expect(markSent).toHaveBeenCalledWith(99);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com" })
    );
  });

  it("skips in-app when the client has no portal login, still emails", async () => {
    const r = await notifyClientEstimateSent({
      ...est,
      clients: { ...est.clients, user_id: null },
    });
    expect(r).toEqual({ inApp: false, email: "sent" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("reports a skipped email when the provider isn't configured", async () => {
    sendEmail.mockResolvedValue({ channel: "email", ok: false, skipped: true });
    expect((await notifyClientEstimateSent(est)).email).toBe("skipped");
  });

  it("reports a failed email without throwing", async () => {
    sendEmail.mockResolvedValue({ channel: "email", ok: false, error: "bad" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await notifyClientEstimateSent(est)).email).toBe("failed");
    warn.mockRestore();
  });

  it("an in-app failure does not stop the email", async () => {
    insert.mockRejectedValue(new Error("db"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await notifyClientEstimateSent(est);
    expect(r).toEqual({ inApp: false, email: "sent" });
    warn.mockRestore();
  });

  it("does nothing for an estimate with no client", async () => {
    expect(await notifyClientEstimateSent({ id: 1 })).toEqual({
      inApp: false,
      email: "no_address",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
