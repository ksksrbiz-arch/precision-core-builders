/**
 * Vision tagging tests — exercises the free-tier photo analysis helper:
 * config gating, JSON normalization/coercion, per-photo error isolation, and
 * the batch cap. `fetch` and usage logging are mocked; no live API is hit.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

// Mutable env the module reads at call time (ENV is imported live below).
const envState = {
  openrouterApiKey: "test-key",
  openrouterVisionModel: "",
  siteUrl: "https://precision-core.netlify.app",
};

vi.mock("./env", () => ({
  get ENV() {
    return envState;
  },
}));

// Usage logging is best-effort — stub it so nothing touches the DB.
vi.mock("./aiUsage", () => ({
  logAiUsage: vi.fn().mockResolvedValue(undefined),
}));

import {
  analyzeFieldReportPhoto,
  tagFieldReportPhotos,
  isVisionTaggingConfigured,
  VisionConfigError,
  MAX_PHOTOS_PER_REPORT,
} from "./visionTagging";

/** Build a fake OpenRouter chat/completions response with the given content. */
function mockVisionResponse(content: unknown) {
  return {
    ok: true,
    statusText: "OK",
    json: async () => ({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      choices: [
        {
          message: {
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  envState.openrouterApiKey = "test-key";
  envState.openrouterVisionModel = "";
});

describe("isVisionTaggingConfigured", () => {
  it("is true when an OpenRouter key is set", () => {
    expect(isVisionTaggingConfigured()).toBe(true);
  });

  it("is false when the key is empty", () => {
    envState.openrouterApiKey = "";
    expect(isVisionTaggingConfigured()).toBe(false);
  });
});

describe("analyzeFieldReportPhoto", () => {
  it("throws VisionConfigError when unconfigured", async () => {
    envState.openrouterApiKey = "";
    await expect(
      analyzeFieldReportPhoto("https://cdn/x.jpg")
    ).rejects.toBeInstanceOf(VisionConfigError);
  });

  it("passes the photo URL through as an image_url content part", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockVisionResponse({
        category: "progress",
        headline: "Framing ~60%",
        tags: ["framing", "lumber"],
        safetyConcerns: [],
        progressNote: "Second-floor walls up",
      }) as any
    );

    const tag = await analyzeFieldReportPhoto("https://cdn/x.jpg", "admin-1");

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string
    );
    const imagePart = body.messages[1].content.find(
      (p: any) => p.type === "image_url"
    );
    expect(imagePart.image_url.url).toBe("https://cdn/x.jpg");
    expect(body.response_format).toEqual({ type: "json_object" });

    expect(tag.category).toBe("progress");
    expect(tag.headline).toBe("Framing ~60%");
    expect(tag.tags).toEqual(["framing", "lumber"]);
    expect(tag.progressNote).toBe("Second-floor walls up");
  });

  it("coerces an unknown category to 'general' and tolerates missing fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockVisionResponse({ category: "banana", headline: "" }) as any
    );

    const tag = await analyzeFieldReportPhoto("https://cdn/x.jpg");
    expect(tag.category).toBe("general");
    expect(tag.headline).toBe("Site photo"); // fallback for empty headline
    expect(tag.tags).toEqual([]);
    expect(tag.safetyConcerns).toEqual([]);
    expect(tag.progressNote).toBeUndefined();
  });

  it("throws on a non-OK API response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Too Many Requests",
      json: async () => ({ error: { message: "rate limited" } }),
    } as any);

    await expect(analyzeFieldReportPhoto("https://cdn/x.jpg")).rejects.toThrow(
      /rate limited/
    );
  });
});

describe("tagFieldReportPhotos", () => {
  it("isolates a failing photo instead of aborting the batch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    // First photo succeeds, second fails, third succeeds.
    fetchMock
      .mockResolvedValueOnce(
        mockVisionResponse({ category: "safety", headline: "Clear" }) as any
      )
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(
        mockVisionResponse({ category: "defect", headline: "Crack" }) as any
      );

    const tags = await tagFieldReportPhotos([
      "https://cdn/1.jpg",
      "https://cdn/2.jpg",
      "https://cdn/3.jpg",
    ]);

    expect(tags).toHaveLength(3);
    expect(tags[0].category).toBe("safety");
    expect(tags[1].error).toMatch(/network blip/);
    expect(tags[1].headline).toBe("Analysis unavailable");
    expect(tags[2].category).toBe("defect");
  });

  it("caps the number of photos analyzed per report", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        mockVisionResponse({ category: "general", headline: "x" }) as any
      );

    const urls = Array.from(
      { length: MAX_PHOTOS_PER_REPORT + 4 },
      (_, i) => `https://cdn/${i}.jpg`
    );
    const tags = await tagFieldReportPhotos(urls);

    expect(tags).toHaveLength(MAX_PHOTOS_PER_REPORT);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PHOTOS_PER_REPORT);
  });

  it("throws VisionConfigError up-front when unconfigured", async () => {
    envState.openrouterApiKey = "";
    await expect(
      tagFieldReportPhotos(["https://cdn/x.jpg"])
    ).rejects.toBeInstanceOf(VisionConfigError);
  });
});
