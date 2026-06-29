import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the env module with a stable, mutable object so each test can set keys.
vi.mock("./env", () => ({
  ENV: {
    groqApiKey: "",
    googleAiApiKey: "",
    openrouterApiKey: "",
    anthropicApiKey: "",
    groqModel: "",
    geminiModel: "",
    openrouterModel: "",
    anthropicModel: "",
    llmProviderOrder: "",
    siteUrl: "",
  },
}));

import { ENV } from "./env";
import {
  invokeLLM,
  isLLMConfigured,
  resolveProviderOrder,
  streamLLM,
  type LLMStreamChunk,
} from "./llm";

/** Build a fake SSE Response whose body streams the given lines. */
function sseResponse(lines: string[], status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return { ok: status >= 200 && status < 300, status, statusText: "", body };
}

/** Drain a streamLLM generator into its text + done chunks. */
async function collect(gen: AsyncGenerator<LLMStreamChunk>) {
  const text: string[] = [];
  let done: Extract<LLMStreamChunk, { type: "done" }> | undefined;
  for await (const chunk of gen) {
    if (chunk.type === "text") text.push(chunk.text);
    else if (chunk.type === "done") done = chunk;
  }
  return { text: text.join(""), done };
}

function resetEnv() {
  ENV.groqApiKey = "";
  ENV.googleAiApiKey = "";
  ENV.openrouterApiKey = "";
  ENV.anthropicApiKey = "";
  ENV.groqModel = "";
  ENV.geminiModel = "";
  ENV.openrouterModel = "";
  ENV.anthropicModel = "";
  ENV.llmProviderOrder = "";
  ENV.siteUrl = "";
}

const okOpenAI = (content: string, model = "test-model") => ({
  ok: true,
  status: 200,
  json: async () => ({
    choices: [{ message: { content } }],
    model,
    usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
  }),
});

const okGemini = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text: content }] } }],
    usageMetadata: {
      promptTokenCount: 1,
      candidatesTokenCount: 2,
      totalTokenCount: 3,
    },
  }),
});

const errResponse = (status: number, message: string) => ({
  ok: false,
  status,
  statusText: message,
  json: async () => ({ error: { message } }),
});

beforeEach(() => {
  resetEnv();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveProviderOrder", () => {
  it("defaults to free-first and filters to configured providers", () => {
    ENV.groqApiKey = "g";
    ENV.anthropicApiKey = "a";
    expect(resolveProviderOrder()).toEqual(["groq", "anthropic"]);
  });

  it("returns empty when nothing is configured", () => {
    expect(resolveProviderOrder()).toEqual([]);
    expect(isLLMConfigured()).toBe(false);
  });

  it("honors LLM_PROVIDER_ORDER override", () => {
    ENV.groqApiKey = "g";
    ENV.anthropicApiKey = "a";
    ENV.googleAiApiKey = "ge";
    ENV.llmProviderOrder = "anthropic,groq";
    // Override comes first; remaining configured providers appended.
    expect(resolveProviderOrder()).toEqual(["anthropic", "groq", "gemini"]);
  });

  it("ignores unknown providers in the override list", () => {
    ENV.groqApiKey = "g";
    ENV.llmProviderOrder = "bogus,groq";
    expect(resolveProviderOrder()).toEqual(["groq"]);
  });
});

describe("invokeLLM", () => {
  it("throws a helpful error when no provider is configured", async () => {
    await expect(
      invokeLLM({ messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/No LLM API key configured/);
  });

  it("uses the first configured provider and tags the result", async () => {
    ENV.groqApiKey = "g";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      okOpenAI("hello")
    );

    const result = await invokeLLM({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.provider).toBe("groq");
    expect(result.text).toBe("hello");
    expect(result.usage?.totalTokens).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the next provider when the first errors", async () => {
    ENV.groqApiKey = "g";
    ENV.googleAiApiKey = "ge";
    const mock = fetch as ReturnType<typeof vi.fn>;
    // Groq fails with a non-retryable 401, then Gemini succeeds.
    mock.mockResolvedValueOnce(errResponse(401, "unauthorized"));
    mock.mockResolvedValueOnce(okGemini("from gemini"));

    const result = await invokeLLM({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.provider).toBe("gemini");
    expect(result.text).toBe("from gemini");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws an aggregated error when all providers fail", async () => {
    ENV.groqApiKey = "g";
    ENV.googleAiApiKey = "ge";
    const mock = fetch as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(errResponse(401, "unauthorized"));

    await expect(
      invokeLLM({ messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/All LLM providers failed/);
  });
});

describe("streamLLM", () => {
  it("throws (before yielding) when no provider is configured", async () => {
    await expect(
      collect(streamLLM({ messages: [{ role: "user", content: "hi" }] }))
    ).rejects.toThrow(/No LLM API key configured/);
  });

  it("streams OpenAI-compatible SSE deltas then a done chunk", async () => {
    ENV.groqApiKey = "g";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}],"model":"m1"}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}\n\n',
        "data: [DONE]\n\n",
      ])
    );

    const { text, done } = await collect(
      streamLLM({ messages: [{ role: "user", content: "hi" }] })
    );

    expect(text).toBe("Hello");
    expect(done?.done.provider).toBe("groq");
    expect(done?.done.model).toBe("m1");
    expect(done?.done.usage?.totalTokens).toBe(3);
  });

  it("handles SSE frames split across network chunk boundaries", async () => {
    ENV.groqApiKey = "g";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"con',
        'tent":"split"}}]}\n\n',
        "data: [DONE]\n\n",
      ])
    );

    const { text } = await collect(
      streamLLM({ messages: [{ role: "user", content: "hi" }] })
    );
    expect(text).toBe("split");
  });

  it("falls back to the next provider when the first errors pre-stream", async () => {
    ENV.groqApiKey = "g";
    ENV.googleAiApiKey = "ge";
    const mock = fetch as ReturnType<typeof vi.fn>;
    // Groq fails non-retryably, then Gemini (buffered) succeeds.
    mock.mockResolvedValueOnce(errResponse(401, "unauthorized"));
    mock.mockResolvedValueOnce(okGemini("from gemini"));

    const { text, done } = await collect(
      streamLLM({ messages: [{ role: "user", content: "hi" }] })
    );

    expect(text).toBe("from gemini");
    expect(done?.done.provider).toBe("gemini");
  });

  it("buffers Gemini into a single text chunk", async () => {
    ENV.googleAiApiKey = "ge";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      okGemini("buffered reply")
    );

    const { text, done } = await collect(
      streamLLM({ messages: [{ role: "user", content: "hi" }] })
    );

    expect(text).toBe("buffered reply");
    expect(done?.done.provider).toBe("gemini");
  });

  it("throws an aggregated error when all providers fail pre-stream", async () => {
    ENV.groqApiKey = "g";
    ENV.openrouterApiKey = "o";
    const mock = fetch as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(errResponse(401, "unauthorized"));

    await expect(
      collect(streamLLM({ messages: [{ role: "user", content: "hi" }] }))
    ).rejects.toThrow(/All LLM providers failed/);
  });
});
