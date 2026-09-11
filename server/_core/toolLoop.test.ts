/**
 * Tests for the bounded tool loop.
 *
 * The contract: a model that keeps asking for tools must terminate, a tool that
 * throws must not abort the turn, and the caller always gets an answer or a
 * thrown provider error — never a half-finished tool state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Keep usage logging out of the way.
vi.mock("./aiUsage", () => ({ logAiUsage: vi.fn() }));
vi.mock("./env", () => ({
  ENV: {
    groqApiKey: "test-key",
    openrouterApiKey: "",
    groqModel: "",
    openrouterModel: "",
    llmProviderOrder: "groq",
    siteUrl: "",
  },
}));

import { runToolLoop, type LLMTool } from "./llm";

const TOOLS: LLMTool[] = [
  {
    name: "add",
    description: "Add two numbers together for the user.",
    parameters: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
    },
  },
];

/** Queue a provider response that requests a tool call. */
function toolCallResponse(name: string, args: string, id = "call_1") {
  return {
    ok: true,
    json: async () => ({
      model: "test-model",
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ id, function: { name, arguments: args } }],
          },
        },
      ],
    }),
  };
}

/** Queue a provider response that answers in prose. */
function textResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      model: "test-model",
      choices: [{ message: { content: text } }],
    }),
  };
}

// The fetch stub is module-level and intended to hold for the whole file;
// Vitest isolates test files, so there is nothing to tear down between tests.
// Only the call history is reset.
beforeEach(() => fetchMock.mockReset());

describe("runToolLoop", () => {
  it("executes a requested tool and feeds the result back", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse("add", '{"a":2,"b":3}'))
      .mockResolvedValueOnce(textResponse("That comes to 5."));

    const execute = vi.fn().mockResolvedValue({ sum: 5 });
    const result = await runToolLoop({
      messages: [{ role: "user", content: "what is 2 + 3" }],
      tools: TOOLS,
      execute,
    });

    expect(execute).toHaveBeenCalledWith("add", { a: 2, b: 3 });
    expect(result.text).toBe("That comes to 5.");
    expect(result.toolTrace).toEqual([
      { name: "add", args: { a: 2, b: 3 }, result: { sum: 5 } },
    ]);
  });

  it("sends the tool result back with the id it answers", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse("add", '{"a":1,"b":1}', "abc123"))
      .mockResolvedValueOnce(textResponse("2."));

    await runToolLoop({
      messages: [{ role: "user", content: "1+1" }],
      tools: TOOLS,
      execute: () => ({ sum: 2 }),
    });

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    const toolMsg = secondBody.messages.find(
      (m: { role: string }) => m.role === "tool"
    );
    expect(toolMsg.tool_call_id).toBe("abc123");
    // The assistant's own tool request must be replayed too, or the provider
    // rejects an orphaned tool result.
    const assistantMsg = secondBody.messages.find(
      (m: { role: string; tool_calls?: unknown }) =>
        m.role === "assistant" && m.tool_calls
    );
    expect(assistantMsg.tool_calls[0].id).toBe("abc123");
  });

  it("answers without the tool when arguments are malformed JSON", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse("add", "{not json"))
      .mockResolvedValueOnce(textResponse("I couldn't compute that."));

    const execute = vi.fn();
    const result = await runToolLoop({
      messages: [{ role: "user", content: "add things" }],
      tools: TOOLS,
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.toolTrace[0].result).toEqual({
      error: "Tool arguments were not valid JSON.",
    });
    expect(result.text).toBe("I couldn't compute that.");
  });

  it("reports a throwing tool to the model instead of aborting the turn", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse("add", '{"a":1,"b":2}'))
      .mockResolvedValueOnce(
        textResponse("That lookup failed, but here's what I can say.")
      );

    const result = await runToolLoop({
      messages: [{ role: "user", content: "add" }],
      tools: TOOLS,
      execute: () => {
        throw new Error("database unreachable");
      },
    });

    expect(result.toolTrace[0].result).toEqual({
      error: "database unreachable",
    });
    expect(result.text).toMatch(/here's what I can say/);
  });

  it("withholds tools on the final round so the model must answer", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse("add", '{"a":1,"b":1}'))
      .mockResolvedValueOnce(toolCallResponse("add", '{"a":2,"b":2}'))
      .mockResolvedValueOnce(textResponse("Final answer."));

    const result = await runToolLoop({
      messages: [{ role: "user", content: "go" }],
      tools: TOOLS,
      execute: () => ({ ok: true }),
      maxRounds: 2,
    });

    expect(result.text).toBe("Final answer.");
    // Last request must carry no tools — that's what forces termination.
    const lastBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(lastBody.tools).toBeUndefined();
  });

  it("terminates even if the model asks for tools every round", async () => {
    fetchMock.mockResolvedValue(toolCallResponse("add", '{"a":1,"b":1}'));

    const result = await runToolLoop({
      messages: [{ role: "user", content: "loop forever" }],
      tools: TOOLS,
      execute: () => ({ ok: true }),
      maxRounds: 2,
    });

    // Bounded: maxRounds + 1 provider calls, then it gives up with what it has.
    expect(fetchMock.mock.calls.length).toBe(3);
    expect(result).toBeDefined();
  });

  it("does not send a tools field when none are supplied", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("Plain answer."));
    await runToolLoop({
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      execute: () => ({}),
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tools).toBeUndefined();
  });

  it("returns immediately when the model answers without tools", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("No tools needed."));
    const execute = vi.fn();
    const result = await runToolLoop({
      messages: [{ role: "user", content: "hello" }],
      tools: TOOLS,
      execute,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(result.toolTrace).toEqual([]);
  });

  it("runs every tool in a multi-call turn", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test-model",
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "a",
                    function: { name: "add", arguments: '{"a":1,"b":1}' },
                  },
                  {
                    id: "b",
                    function: { name: "add", arguments: '{"a":2,"b":2}' },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce(textResponse("Both done."));

    const execute = vi.fn().mockResolvedValue({ ok: true });
    const result = await runToolLoop({
      messages: [{ role: "user", content: "two things" }],
      tools: TOOLS,
      execute,
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(result.toolTrace).toHaveLength(2);
  });
});
