/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

// ---------------------------------------------------------------------------
// Mock the Supabase lib module that useRealtimeTable imports from. We control
// both `isSupabaseConfigured` (via a getter so the hook's live binding sees
// changes) and the `supabase` client's channel/removeChannel surface.
// ---------------------------------------------------------------------------

type PostgresChangeCb = (payload: unknown) => void;

type FakeChannel = {
  name: string;
  changeCb: PostgresChangeCb | null;
  // The status callback passed to subscribe(). Reconnection tests re-invoke
  // this to simulate a mid-life channel status change (e.g. a channel that
  // subscribed successfully and then drops).
  subscribeCb: ((status: string) => void) | null;
  on: Mock;
  subscribe: Mock;
};

// `vi.mock` is hoisted above module init, so all state it touches must live in
// a `vi.hoisted` block that runs before the factory.
const h = vi.hoisted(() => {
  const state = {
    configured: true,
    subscribeStatus: "SUBSCRIBED",
    // When non-empty, each subscribe call pops the front status (falling
    // back to `subscribeStatus` when exhausted) so reconnection tests can
    // script a per-attempt status sequence. Existing tests never set this.
    statusQueue: [] as string[],
    channels: [] as FakeChannel[],
  };
  const channel = vi.fn((name: string): FakeChannel => {
    const ch: FakeChannel = {
      name,
      changeCb: null,
      subscribeCb: null,
      on: vi.fn((_event: string, _filter: unknown, cb: PostgresChangeCb) => {
        ch.changeCb = cb;
        return ch;
      }),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        ch.subscribeCb = cb ?? null;
        const status =
          state.statusQueue.length > 0
            ? state.statusQueue.shift()!
            : state.subscribeStatus;
        cb?.(status);
        return ch;
      }),
    };
    state.channels.push(ch);
    return ch;
  });
  const removeChannel = vi.fn();
  return { state, channel, removeChannel };
});

const { channel, removeChannel } = h;

vi.mock("@/lib/supabase", () => ({
  get isSupabaseConfigured() {
    return h.state.configured;
  },
  supabase: {
    channel: h.channel,
    removeChannel: h.removeChannel,
  },
}));

// Import AFTER the mock is registered.
import { nextReconnectDelay, useRealtimeTable } from "./useRealtimeTable";

beforeEach(() => {
  h.state.configured = true;
  h.state.subscribeStatus = "SUBSCRIBED";
  h.state.statusQueue = [];
  h.state.channels = [];
  channel.mockClear();
  removeChannel.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRealtimeTable — Supabase not configured", () => {
  it("no-ops: no channel/subscribe, isLive false, unmount is safe", () => {
    h.state.configured = false;
    const onUpdate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate })
    );

    expect(result.current.isLive).toBe(false);
    expect(result.current.lastEvent).toBeNull();
    expect(channel).not.toHaveBeenCalled();
    expect(removeChannel).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    // Unmount must not throw or attempt to remove a channel that was never made.
    expect(() => unmount()).not.toThrow();
    expect(removeChannel).not.toHaveBeenCalled();
  });
});

describe("useRealtimeTable — Supabase configured", () => {
  it("subscribes to a channel for the given table and goes live", () => {
    const { result } = renderHook(() =>
      useRealtimeTable({ table: "field_reports", onUpdate: vi.fn() })
    );

    expect(channel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledWith("realtime-field_reports");

    const ch = h.state.channels[0];
    expect(ch.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "field_reports" },
      expect.any(Function)
    );
    expect(ch.subscribe).toHaveBeenCalledTimes(1);
    expect(result.current.isLive).toBe(true);
  });

  it("invokes onUpdate and sets lastEvent when a change payload arrives", () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate })
    );

    const ch = h.state.channels[0];
    expect(ch.changeCb).toBeTypeOf("function");

    act(() => {
      ch.changeCb?.({
        eventType: "UPDATE",
        table: "projects",
        new: { id: 1, status: "active" },
        old: { id: 1, status: "planning" },
      });
    });

    const expected = {
      eventType: "UPDATE",
      table: "projects",
      new: { id: 1, status: "active" },
      old: { id: 1, status: "planning" },
    };
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(expected);
    expect(result.current.lastEvent).toEqual(expected);
  });

  it("normalizes missing new/old to null in the delivered payload", () => {
    const onUpdate = vi.fn();
    renderHook(() => useRealtimeTable({ table: "leads", onUpdate }));

    act(() => {
      h.state.channels[0].changeCb?.({ eventType: "DELETE", table: "leads" });
    });

    expect(onUpdate).toHaveBeenCalledWith({
      eventType: "DELETE",
      table: "leads",
      new: null,
      old: null,
    });
  });

  it("stays not-live when subscribe reports a non-SUBSCRIBED status", () => {
    h.state.subscribeStatus = "CHANNEL_ERROR";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );
    expect(result.current.isLive).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );
    const ch = h.state.channels[0];

    unmount();

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(ch);
  });

  it("re-subscribes when the table changes (tears down the old channel)", () => {
    const { rerender } = renderHook(
      ({ table }) => useRealtimeTable({ table, onUpdate: vi.fn() }),
      { initialProps: { table: "projects" } }
    );

    expect(channel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenLastCalledWith("realtime-projects");

    rerender({ table: "clients" });

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(h.state.channels[0]);
    expect(channel).toHaveBeenCalledTimes(2);
    expect(channel).toHaveBeenLastCalledWith("realtime-clients");
  });

  it("does NOT re-subscribe when only onUpdate changes (stable ref)", () => {
    const { rerender, result } = renderHook(
      ({ onUpdate }) => useRealtimeTable({ table: "projects", onUpdate }),
      { initialProps: { onUpdate: vi.fn() } }
    );

    expect(channel).toHaveBeenCalledTimes(1);

    // New callback identity, same table — effect must not re-run.
    const next = vi.fn();
    rerender({ onUpdate: next });
    expect(channel).toHaveBeenCalledTimes(1);
    expect(removeChannel).not.toHaveBeenCalled();

    // The latest callback is still invoked via the stable ref.
    act(() => {
      h.state.channels[0].changeCb?.({
        eventType: "INSERT",
        table: "projects",
        new: { id: 2 },
        old: null,
      });
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(result.current.lastEvent?.eventType).toBe("INSERT");
  });

  it("survives a subscribe that throws (isLive false, no crash)", () => {
    channel.mockImplementationOnce((name: string): FakeChannel => {
      const ch: FakeChannel = {
        name,
        changeCb: null,
        subscribeCb: null,
        on: vi.fn(() => ch),
        subscribe: vi.fn(() => {
          throw new Error("realtime boom");
        }),
      };
      h.state.channels.push(ch);
      return ch;
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result, unmount } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );

    expect(result.current.isLive).toBe(false);
    expect(warn).toHaveBeenCalled();
    // Channel object was created before subscribe threw; unmount is still safe.
    expect(() => unmount()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// BOT-1: realtime reconnection (exponential backoff + jitter)
// ---------------------------------------------------------------------------

describe("useRealtimeTable — reconnection backoff", () => {
  beforeEach(() => {
    // Deterministic jitter so the schedule assertions are exact.
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("nextReconnectDelay follows 1s→2s→4s… capped at 30s, + jitter", () => {
    // With Math.random mocked to 0 the jitter term collapses to 0, so the
    // delay equals the pure exponential curve.
    expect(nextReconnectDelay(0)).toBe(1000);
    expect(nextReconnectDelay(1)).toBe(2000);
    expect(nextReconnectDelay(2)).toBe(4000);
    expect(nextReconnectDelay(3)).toBe(8000);
    expect(nextReconnectDelay(4)).toBe(16000);
    expect(nextReconnectDelay(5)).toBe(30000); // capped (would be 32000)
    expect(nextReconnectDelay(50)).toBe(30000); // stays capped
  });

  it("nextReconnectDelay adds jitter within [0, 500ms)", () => {
    // Math.random is defined on [0, 1) — keep mocks inside that range.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    // 1000 + (0.5 * 500) = 1250
    expect(nextReconnectDelay(0)).toBe(1250);

    vi.spyOn(Math, "random").mockReturnValue(0.999);
    // 30000 + (0.999 * 500) = 30499.5
    expect(nextReconnectDelay(10)).toBe(30499.5);
  });

  it("schedules a resubscribe with backoff after CHANNEL_ERROR", () => {
    vi.useFakeTimers();
    // Attempt 1 errors, then subsequent attempts succeed.
    h.state.statusQueue = ["CHANNEL_ERROR", "SUBSCRIBED", "SUBSCRIBED"];

    const { result } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );

    // Initial error → not live, one channel created so far.
    expect(result.current.isLive).toBe(false);
    expect(channel).toHaveBeenCalledTimes(1);
    // Dead channel is removed immediately on recoverable status (not only at
    // the start of the next subscribe attempt).
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(h.state.channels[0]);

    // No resubscribe before the backoff delay (1000ms @ attempt 0) elapses.
    expect(channel).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(channel).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Backoff fired → second channel created and it subscribed successfully.
    expect(channel).toHaveBeenCalledTimes(2);
    expect(result.current.isLive).toBe(true);

    vi.useRealTimers();
  });

  it("resets backoff on a successful SUBSCRIBED (next error re-uses short delay)", () => {
    vi.useFakeTimers();
    // First attempt errors (backoff attempt 0 → 1000ms). The reconnect then
    // succeeds, which resets the attempt counter. We then simulate that same
    // healthy channel dropping mid-life and assert the new backoff is the
    // short 1000ms — not 2000ms — proving the reset.
    h.state.statusQueue = ["CHANNEL_ERROR"]; // only the first attempt errors
    h.state.subscribeStatus = "SUBSCRIBED"; // subsequent attempts succeed

    const { result } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );
    expect(result.current.isLive).toBe(false);

    // Backoff fires → reconnect succeeds → live + reset.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(channel).toHaveBeenCalledTimes(2);
    expect(result.current.isLive).toBe(true);

    // The now-healthy channel drops mid-life. Drive its captured subscribe
    // callback with a fresh CHANNEL_ERROR; this schedules a reconnect.
    const healthy = h.state.channels[1];
    expect(healthy.subscribeCb).toBeTypeOf("function");
    act(() => {
      healthy.subscribeCb?.("CHANNEL_ERROR");
    });
    expect(result.current.isLive).toBe(false);
    expect(removeChannel).toHaveBeenCalledWith(healthy);

    // 999ms later — no reconnect yet (rules out a sub-1000ms schedule).
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(channel).toHaveBeenCalledTimes(2);

    // At 1000ms the reconnect fires. If the backoff had NOT reset, the
    // delay would have been 2000ms and this would still be count === 2.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(channel).toHaveBeenCalledTimes(3);
    expect(result.current.isLive).toBe(true);

    vi.useRealTimers();
  });

  it("does not resubscribe after unmount during a pending reconnect", () => {
    vi.useFakeTimers();
    h.state.statusQueue = ["CHANNEL_ERROR", "CHANNEL_ERROR", "CHANNEL_ERROR"];

    const { unmount } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );
    const callsBeforeUnmount = channel.mock.calls.length;

    unmount();

    // Advancing timers past the scheduled reconnect must NOT create a new
    // channel — the teardown cleared the pending timer.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(channel.mock.calls.length).toBe(callsBeforeUnmount);

    vi.useRealTimers();
  });

  it("treats TIMED_OUT and CLOSED as recoverable too", () => {
    vi.useFakeTimers();
    for (const status of ["TIMED_OUT", "CLOSED"]) {
      channel.mockClear();
      removeChannel.mockClear();
      h.state.channels = [];
      h.state.statusQueue = [status, "SUBSCRIBED"];

      const { result } = renderHook(() =>
        useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
      );

      expect(result.current.isLive).toBe(false);
      expect(channel).toHaveBeenCalledTimes(1);
      expect(removeChannel).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(channel).toHaveBeenCalledTimes(2);
      expect(result.current.isLive).toBe(true);
    }
    vi.useRealTimers();
  });
});
