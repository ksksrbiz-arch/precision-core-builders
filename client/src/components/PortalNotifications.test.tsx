/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const listState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
};
const markReadMutate = vi.fn();
const invalidate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ notifications: { list: { invalidate } } }),
    notifications: {
      list: { useQuery: () => listState },
      markRead: {
        useMutation: () => ({ mutate: markReadMutate, isPending: false }),
      },
    },
  },
}));
vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: vi.fn(() => ({ isLive: true, lastEvent: null })),
}));

import { PortalNotifications } from "./PortalNotifications";

const notice = (over: Record<string, unknown>) => ({
  id: 1,
  subject: "Estimate ready",
  body: "Open Payments to review.",
  channel: "in_app",
  status: "sent",
  read_at: null,
  created_at: "2026-09-30T12:00:00.000Z",
  ...over,
});

beforeEach(() => {
  markReadMutate.mockClear();
  listState.data = [];
  listState.isLoading = false;
  listState.isError = false;
});
afterEach(cleanup);

describe("PortalNotifications", () => {
  it("renders nothing when there are no in-app notices", () => {
    const { container } = render(<PortalNotifications />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing while loading, on error, or when disabled", () => {
    listState.data = [notice({})];
    listState.isLoading = true;
    expect(render(<PortalNotifications />).container.firstChild).toBeNull();
    cleanup();
    listState.isLoading = false;
    listState.isError = true;
    expect(render(<PortalNotifications />).container.firstChild).toBeNull();
    cleanup();
    listState.isError = false;
    expect(
      render(<PortalNotifications enabled={false} />).container.firstChild
    ).toBeNull();
  });

  it("shows only in-app, non-failed notices with an unread count", () => {
    listState.data = [
      notice({ id: 1, subject: "In-app unread" }),
      notice({
        id: 2,
        subject: "Already read",
        read_at: "2026-09-30T13:00:00Z",
      }),
      notice({ id: 3, subject: "Email record", channel: "email" }),
      notice({ id: 4, subject: "Failed one", status: "failed" }),
    ];
    render(<PortalNotifications />);
    expect(screen.getByText("In-app unread")).toBeTruthy();
    expect(screen.getByText("Already read")).toBeTruthy();
    expect(screen.queryByText("Email record")).toBeNull();
    expect(screen.queryByText("Failed one")).toBeNull();
    expect(screen.getByLabelText("1 unread")).toBeTruthy();
  });

  it("marks one notice read", () => {
    listState.data = [notice({ id: 7 })];
    render(<PortalNotifications />);
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    expect(markReadMutate).toHaveBeenCalledWith({ ids: [7] });
  });

  it("marks all unread read in one call", () => {
    listState.data = [
      notice({ id: 1 }),
      notice({ id: 2 }),
      notice({ id: 3, read_at: "2026-09-30T13:00:00Z" }),
    ];
    render(<PortalNotifications />);
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(markReadMutate).toHaveBeenCalledWith({ ids: [1, 2] });
  });

  it("caps the list at five and hides controls once everything is read", () => {
    listState.data = Array.from({ length: 8 }, (_, i) =>
      notice({
        id: i + 1,
        subject: `n${i + 1}`,
        read_at: "2026-09-30T13:00:00Z",
      })
    );
    render(<PortalNotifications />);
    const section = screen.getByRole("region", { name: /notifications/i });
    expect(within(section).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /mark/i })).toBeNull();
  });
});
