// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketingDesign } from "./MarketingDesign";
import { ProjectCard } from "../portfolio/ProjectCard";
import { PROJECTS } from "@/data/projects";
vi.mock("framer-motion", async importOriginal => ({
  ...(await importOriginal<typeof import("framer-motion")>()),
  useReducedMotion: () => true,
}));
afterEach(cleanup);

describe("public marketing design", () => {
  it("scopes the palette to its own subtree", () => {
    const { container } = render(
      <>
        <div data-testid="private">Private UI</div>
        <MarketingDesign>
          <main>Public UI</main>
        </MarketingDesign>
      </>
    );
    expect(container.querySelector(".marketing-page main")?.textContent).toBe(
      "Public UI"
    );
    expect(screen.getByTestId("private").closest(".marketing-page")).toBeNull();
  });
  it("exposes project cards as real navigable links", () => {
    render(<ProjectCard project={PROJECTS[0]} />);
    expect(
      screen
        .getByRole("link", { name: `View ${PROJECTS[0].title}` })
        .getAttribute("href")
    ).toBe(`/portfolio/${PROJECTS[0].slug}`);
  });
});
