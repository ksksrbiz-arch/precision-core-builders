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
  on: Mock;
  subscribe: Mock;
};

// `vi.mock` is hoisted above module init, so all state it touches must live in
// a `vi.hoisted` block that runs before the factory.
const h = vi.hoisted(() => {
  const state = {
    configured: true,
    subscribeStatus: "SUBSCRIBED",
    channels: [] as FakeChannel[],
  };
  const channel = vi.fn((name: string): FakeChannel => {
    const ch: FakeChannel = {
      name,
      changeCb: null,
      on: vi.fn((_event: string, _filter: unknown, cb: PostgresChangeCb) => {
        ch.changeCb = cb;
        return ch;
      }),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        cb?.(state.subscribeStatus);
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
import { useRealtimeTable } from "./useRealtimeTable";

beforeEach(() => {
  h.state.configured = true;
  h.state.subscribeStatus = "SUBSCRIBED";
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
    const { result } = renderHook(() =>
      useRealtimeTable({ table: "projects", onUpdate: vi.fn() })
    );
    expect(result.current.isLive).toBe(false);
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
    // No channel was successfully created, so unmount must not remove one.
    expect(() => unmount()).not.toThrow();
    expect(removeChannel).not.toHaveBeenCalled();
  });
});
