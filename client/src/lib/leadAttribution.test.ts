// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendLeadAttribution,
  captureLeadAttribution,
} from "./leadAttribution";
describe("lead attribution", () => {
  beforeEach(() => {
    sessionStorage.clear();
    history.replaceState({}, "", "/");
  });
  it("preserves campaign and landing page across navigation without copying arbitrary data", () => {
    history.replaceState(
      {},
      "",
      "/services?utm_source=google&utm_campaign=remodel&email=private"
    );
    captureLeadAttribution();
    history.replaceState({}, "", "/contact");
    const data = new FormData();
    appendLeadAttribution(data);
    expect(data.get("landingPage")).toBe("/services");
    expect(data.get("utm_source")).toBe("google");
    expect(data.has("email")).toBe(false);
  });
  it("survives corrupt stored context", () => {
    sessionStorage.setItem("pcb_campaign_context", "invalid");
    expect(() => appendLeadAttribution(new FormData())).not.toThrow();
  });
  it("bounds campaign values", () => {
    history.replaceState({}, "", `/?utm_source=${"a".repeat(500)}`);
    expect(captureLeadAttribution().utm_source).toHaveLength(200);
  });
});
