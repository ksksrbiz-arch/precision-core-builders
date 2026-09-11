/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingChat } from "./useStreamingChat";

/** A minimal buffered (non-streaming) JSON Response stand-in. */
function jsonRes(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const h = new Headers({ "content-type": "application/json", ...headers });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: h,
    body: {}, // truthy, but content-type !== event-stream ⇒ buffered path
    json: async () => body,
  } as unknown as Response;
}

const formatError = (status: number, fallback?: string) =>
  fallback ?? `ERR_${status}`;

// Zero-delay retries keep the tests fast and deterministic.
const RETRY = { maxRetries: 2, baseDelayMs: 0, maxDelayMs: 0 };

function setup() {
  return renderHook(() =>
    useStreamingChat({ endpoint: "/api/ai-chat", formatError, retry: RETRY })
  );
}

/** Text of the last assistant bubble. */
function assistantText(result: {
  current: ReturnType<typeof useStreamingChat>;
}) {
  const msgs = result.current.messages;
  return [...msgs].reverse().find(m => m.role === "assistant")?.content;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useStreamingChat retry", () => {
  it("renders the buffered answer on first-try success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(200, { text: "hello there", provider: "groq" })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    expect(assistantText(result)).toBe("hello there");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a transient 503 and then succeeds", async () => {
    const mock = fetch as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce(jsonRes(503, { error: "overloaded" }));
    mock.mockResolvedValueOnce(jsonRes(200, { text: "recovered" }));
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    expect(assistantText(result)).toBe("recovered");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a non-retryable 400 and surfaces the error once", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(400, { error: "bad request" })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    expect(assistantText(result)).toBe("bad request");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("exhausts the retry budget then shows the formatted error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonRes(429, { error: "slow down" })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    // 1 initial attempt + maxRetries(2) = 3 total.
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(assistantText(result)).toBe("slow down");
  });

  it("retries a network error (rejected fetch) then succeeds", async () => {
    const mock = fetch as ReturnType<typeof vi.fn>;
    mock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    mock.mockResolvedValueOnce(jsonRes(200, { text: "back online" }));
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    expect(assistantText(result)).toBe("back online");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("ignores an empty prompt", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.send("   ");
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("clears the loading flag after the exchange settles", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(200, { text: "done" })
    );
    const { result } = setup();
    await act(async () => {
      await result.current.send("hi");
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

describe("useStreamingChat conversation state", () => {
  /** Parse the JSON body of the nth fetch call. */
  function bodyOf(n: number): Record<string, unknown> {
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[n];
    return JSON.parse((call[1] as { body: string }).body);
  }

  it("surfaces server-derived metadata to onMeta", async () => {
    const onMeta = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(200, {
        text: "Kitchens vary a lot.",
        project: { projectType: "kitchen", stage: "Researching" },
        suggestions: [{ label: "What it costs", prompt: "What drives cost?" }],
        estimateReady: false,
        route: "estimator",
      })
    );
    const { result } = renderHook(() =>
      useStreamingChat({
        endpoint: "/api/ai-chat",
        formatError,
        retry: RETRY,
        onMeta,
      })
    );
    await act(async () => {
      await result.current.send("kitchen remodel?");
    });

    expect(onMeta).toHaveBeenCalledTimes(1);
    const meta = onMeta.mock.calls[0][0];
    expect(meta.route).toBe("estimator");
    expect(meta.estimateReady).toBe(false);
    expect(meta.suggestions).toHaveLength(1);
  });

  it("echoes the project model back so state accumulates across turns", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        jsonRes(200, { text: "ok", project: { projectType: "kitchen" } })
      )
      .mockResolvedValueOnce(
        jsonRes(200, {
          text: "ok again",
          project: { projectType: "kitchen", squareFootage: 300 },
        })
      );
    const { result } = setup();

    await act(async () => {
      await result.current.send("kitchen");
    });
    // First turn carries no prior project.
    expect(bodyOf(0).project).toBeUndefined();

    await act(async () => {
      await result.current.send("about 300 sq ft");
    });
    // Second turn sends back what the server derived on the first.
    expect(bodyOf(1).project).toEqual({ projectType: "kitchen" });
  });

  it("does not call onMeta on an error response", async () => {
    const onMeta = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(400, { error: "bad" })
    );
    const { result } = renderHook(() =>
      useStreamingChat({
        endpoint: "/api/ai-chat",
        formatError,
        retry: RETRY,
        onMeta,
      })
    );
    await act(async () => {
      await result.current.send("hi");
    });
    expect(onMeta).not.toHaveBeenCalled();
  });

  it("tolerates a response with no metadata at all", async () => {
    const onMeta = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonRes(200, { text: "plain answer" })
    );
    const { result } = renderHook(() =>
      useStreamingChat({
        endpoint: "/api/ai-chat",
        formatError,
        retry: RETRY,
        onMeta,
      })
    );
    await act(async () => {
      await result.current.send("hi");
    });
    expect(assistantText(result)).toBe("plain answer");
    const meta = onMeta.mock.calls[0][0];
    expect(meta.suggestions).toBeUndefined();
    expect(meta.estimateReady).toBeUndefined();
  });
});
