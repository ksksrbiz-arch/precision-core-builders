/**
 * @vitest-environment jsdom
 *
 * Tests for OpsCopilot — verifies the admin co-pilot renders its header and the
 * quick-prompt shortcuts, and that clicking a quick prompt forwards that exact
 * text to the streaming chat's `send`. useStreamingChat and useAuth are mocked
 * so the component renders without a live Netlify Function or Supabase session.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const sendMock = vi.fn();
const useStreamingChatMock = vi.fn();
vi.mock("@/hooks/useStreamingChat", () => ({
  useStreamingChat: (opts: unknown) => useStreamingChatMock(opts),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ accessToken: "admin-token" }),
}));

async function loadCopilot() {
  return (await import("./OpsCopilot")).default;
}

// jsdom implements neither scrollIntoView (OpsCopilot calls it on mount) nor
// ResizeObserver (used by the Radix ScrollArea it renders into).
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("OpsCopilot", () => {
  beforeEach(() => {
    sendMock.mockReset();
    useStreamingChatMock.mockReset();
    useStreamingChatMock.mockReturnValue({
      messages: [],
      loading: false,
      send: sendMock,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the header and every quick-prompt button", async () => {
    const OpsCopilot = await loadCopilot();
    render(<OpsCopilot />);

    expect(screen.getByText("Ops Co-pilot")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Which projects are over budget?" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "What's behind schedule right now?" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Which leads should I call first?" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Give me a 5-line status of the whole business",
      })
    ).toBeTruthy();
  });

  it("sends the quick-prompt text when its button is clicked", async () => {
    const user = userEvent.setup();
    const OpsCopilot = await loadCopilot();
    render(<OpsCopilot />);

    await user.click(
      screen.getByRole("button", { name: "Which leads should I call first?" })
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith("Which leads should I call first?");
  });

  it("wires the co-pilot endpoint and an auth-header provider into the chat", async () => {
    const OpsCopilot = await loadCopilot();
    render(<OpsCopilot />);

    const opts = useStreamingChatMock.mock.calls[0][0] as {
      endpoint: string;
      headers: unknown;
    };
    expect(opts.endpoint).toBe("/api/ai-copilot");
    // `headers` is a provider function that supplies the Authorization header
    // (fetched fresh per request). We assert the wiring, not the exact token,
    // so this stays valid as the token-sourcing implementation evolves.
    expect(typeof opts.headers).toBe("function");
  });
});
