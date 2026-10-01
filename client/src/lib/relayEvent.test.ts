import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authHeader", () => ({
  getAuthHeader: vi.fn(async () => ({ Authorization: "Bearer admin-jwt" })),
}));

import { relayAdminEvent } from "./relayEvent";

describe("relayAdminEvent", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    warn.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the event with the admin Authorization header", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await relayAdminEvent({ event: "milestone_complete", payload: { id: 1 } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/n8n-webhook");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer admin-jwt",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      event: "milestone_complete",
      payload: { id: 1 },
    });
  });

  it("logs (does not throw) when the relay answers with an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 }))
    );
    await expect(
      relayAdminEvent({ event: "material_shortage" })
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 401"));
  });

  it("swallows network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    await expect(
      relayAdminEvent({ event: "material_shortage" })
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
