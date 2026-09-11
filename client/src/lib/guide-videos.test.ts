import { describe, expect, it } from "vitest";
import {
  GUIDE_VIDEOS,
  getGuideVideo,
  hasGuideVideo,
  recordedVideoCount,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "./guide-videos";
import { GUIDES } from "@/pages/admin/guides-data";

describe("guide-videos", () => {
  it("every registered video is keyed to a real guide id", () => {
    const guideIds = new Set(GUIDES.map(g => g.id));
    for (const key of Object.keys(GUIDE_VIDEOS)) {
      expect(guideIds.has(key), `${key} is not a guide id`).toBe(true);
    }
  });

  it("every registered video has a non-empty YouTube id", () => {
    for (const [key, video] of Object.entries(GUIDE_VIDEOS)) {
      expect(
        video.youtubeId.trim().length,
        `${key} has an empty id`
      ).toBeGreaterThan(0);
    }
  });

  it("reports absence for guides with no video", () => {
    expect(getGuideVideo("definitely-not-a-guide")).toBeUndefined();
    expect(hasGuideVideo("definitely-not-a-guide")).toBe(false);
  });

  it("recordedVideoCount matches the registry size", () => {
    expect(recordedVideoCount()).toBe(Object.keys(GUIDE_VIDEOS).length);
  });

  it("builds a privacy-enhanced embed URL", () => {
    const url = youtubeEmbedUrl("abc123");
    expect(url).toContain("youtube-nocookie.com/embed/abc123");
    expect(url).toContain("rel=0");
  });

  it("URL-encodes ids so a malformed entry cannot break out of the URL", () => {
    expect(youtubeEmbedUrl('a"b')).not.toContain('"');
    expect(youtubeThumbnailUrl("a/b")).toContain("a%2Fb");
    expect(youtubeWatchUrl("a&b")).toContain("a%26b");
  });
});
