/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/guide-videos", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/guide-videos")>(
      "@/lib/guide-videos"
    );
  return {
    ...actual,
    getGuideVideo: (id: string) =>
      id === "has-video"
        ? { youtubeId: "abc123", duration: "2 min" }
        : undefined,
  };
});

import { GuideVideo } from "./GuideVideo";

afterEach(cleanup);

describe("GuideVideo", () => {
  it("renders nothing when the guide has no video", () => {
    const { container } = render(
      <GuideVideo guideId="no-video" guideTitle="Schedule" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows a placeholder when showPending is set and no video exists", () => {
    render(<GuideVideo guideId="no-video" guideTitle="Schedule" showPending />);
    expect(screen.getByText(/no walkthrough recorded/i)).toBeTruthy();
  });

  it("does not mount the YouTube iframe until play is pressed", () => {
    const { container } = render(
      <GuideVideo guideId="has-video" guideTitle="Field Reports" />
    );
    expect(container.querySelector("iframe")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /play/i }));

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain(
      "youtube-nocookie.com/embed/abc123"
    );
  });

  it("labels the play control and shows the runtime", () => {
    render(<GuideVideo guideId="has-video" guideTitle="Field Reports" />);
    const button = screen.getByRole("button", { name: /play/i });
    expect(button.getAttribute("aria-label")).toContain(
      "Field Reports walkthrough"
    );
    expect(screen.getByText(/2 min/)).toBeTruthy();
  });

  it("offers a watch-on-YouTube fallback once playing", () => {
    render(<GuideVideo guideId="has-video" guideTitle="Field Reports" />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    const link = screen.getByRole("link", { name: /open on youtube/i });
    expect(link.getAttribute("href")).toContain("watch?v=abc123");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});
