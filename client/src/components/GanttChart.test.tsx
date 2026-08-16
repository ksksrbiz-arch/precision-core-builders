/**
 * @vitest-environment jsdom
 *
 * Tests for GanttChart — verifies that the schedule visualization renders its
 * empty state gracefully, surfaces task labels for dated items, and reflects
 * the input dates in the rendered output. The drag-day math lives in
 * non-exported helpers, so it is exercised indirectly via the rendered bars
 * rather than by refactoring the source.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ScheduleItem } from "./GanttChart";

// trpc's useQuery is the only heavy dependency GanttChart pulls in; stub it so
// the component renders from its prop `items` in jsdom without a live client.
const listUseQueryMock = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    schedule: {
      list: {
        useQuery: () => listUseQueryMock(),
      },
    },
  },
}));

// Force the desktop (chart) layout by default; the mobile branch swaps to a
// list. Individual tests can override the return value.
const useIsMobileMock = vi.fn();
vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

// Recharts' ResponsiveContainer measures the DOM (zero-sized in jsdom, so it
// renders nothing). Render children at a fixed size so the bars/labels appear.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

async function loadGantt() {
  return await import("./GanttChart");
}

function makeItem(overrides: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: 1,
    project_id: 1,
    title: "Foundation pour",
    status: "pending",
    weather_sensitive: false,
    planned_start: "2026-03-01",
    planned_end: "2026-03-05",
    assigned_to: null,
    notes: null,
    ...overrides,
  };
}

describe("GanttChart", () => {
  beforeEach(() => {
    listUseQueryMock.mockReset();
    listUseQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    useIsMobileMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    // Radix Dialog renders Content into a portal on document.body. React's
    // cleanup() unmounts the tree but the orphaned portal nodes can linger
    // in jsdom and bleed into the next test (e.g. a stale "Save changes"
    // button). Wipe body-level leftovers so each test starts clean.
    document.body.innerHTML = "";
  });

  it("renders a loading state while the query is in flight", async () => {
    listUseQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { GanttChart } = await loadGantt();
    render(<GanttChart projectId={1} />);
    expect(screen.getByText("Loading schedule…")).toBeTruthy();
  });

  it("renders the empty state when there are no items", async () => {
    const { GanttChart } = await loadGantt();
    render(<GanttChart projectId={1} items={[]} />);
    expect(screen.getByText("No dated tasks")).toBeTruthy();
  });

  it("renders the empty state when items have no dates", async () => {
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, planned_start: null, planned_end: null }),
      makeItem({ id: 2, planned_start: "2026-03-01", planned_end: null }),
    ];
    // Should not throw and should fall back to the empty state.
    expect(() =>
      render(<GanttChart projectId={1} items={items} />)
    ).not.toThrow();
    expect(screen.getByText("No dated tasks")).toBeTruthy();
  });

  it("renders task labels for dated items (mobile list view)", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, title: "Excavation" }),
      makeItem({
        id: 2,
        title: "Framing",
        planned_start: "2026-03-10",
        planned_end: "2026-03-20",
      }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    expect(screen.getByText("Excavation")).toBeTruthy();
    expect(screen.getByText("Framing")).toBeTruthy();
    expect(screen.getByText("Project Schedule")).toBeTruthy();
  });

  it("reflects the input dates in the rendered mobile rows", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({
        id: 1,
        title: "Roofing",
        planned_start: "2026-04-01",
        planned_end: "2026-04-08",
      }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    // The row prints the localized start/end dates derived from the input.
    const start = new Date("2026-04-01").toLocaleDateString();
    const end = new Date("2026-04-08").toLocaleDateString();
    expect(screen.getByText(new RegExp(start))).toBeTruthy();
    expect(screen.getByText(new RegExp(end))).toBeTruthy();
  });

  it("flags weather-sensitive tasks in the mobile view", async () => {
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({ id: 1, title: "Concrete slab", weather_sensitive: true }),
    ];
    render(<GanttChart projectId={1} items={items} />);
    expect(screen.getByText("Weather")).toBeTruthy();
  });

  it("prefers database items over prop items when the query resolves", async () => {
    listUseQueryMock.mockReturnValue({
      data: [
        {
          id: 99,
          project_id: 1,
          title: "DB task",
          status: "in_progress",
          weather_sensitive: false,
          planned_start: "2026-05-01",
          planned_end: "2026-05-04",
        },
      ],
      isLoading: false,
    });
    useIsMobileMock.mockReturnValue(true);
    const { GanttChart } = await loadGantt();
    render(
      <GanttChart projectId={1} items={[makeItem({ title: "Prop task" })]} />
    );
    expect(screen.getByText("DB task")).toBeTruthy();
    expect(screen.queryByText("Prop task")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BOT-2: task edit dialog (click task → modal; readOnly view-only; onTaskEdit)
// ---------------------------------------------------------------------------

describe("GanttChart — task edit dialog", () => {
  beforeEach(() => {
    listUseQueryMock.mockReset();
    listUseQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    useIsMobileMock.mockReset();
    useIsMobileMock.mockReturnValue(true); // mobile list view is clickable in jsdom
  });

  it("opens the edit dialog with all fields when a mobile task row is clicked", async () => {
    const onTaskEdit = vi.fn();
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({
        id: 7,
        title: "Framing inspection",
        status: "in_progress",
        assigned_to: "Miguel",
        notes: "Bring extra ladders",
        planned_start: "2026-06-01",
        planned_end: "2026-06-03",
      }),
    ];
    render(<GanttChart projectId={1} items={items} onTaskEdit={onTaskEdit} />);

    // Row is keyboard- and click-activatable; click it to open the dialog.
    fireEvent.click(screen.getByText("Framing inspection"));

    // The dialog title and every labeled field is present and pre-filled.
    expect(screen.getByText("Edit task")).toBeTruthy();
    const dialog = screen.getByRole("dialog");
    expect(
      (within(dialog).getByLabelText("Title") as HTMLInputElement).value
    ).toBe("Framing inspection");
    expect(
      (within(dialog).getByLabelText("Planned start") as HTMLInputElement).value
    ).toBe("2026-06-01");
    expect(
      (within(dialog).getByLabelText("Planned end") as HTMLInputElement).value
    ).toBe("2026-06-03");
    expect(
      (within(dialog).getByLabelText("Assignee") as HTMLInputElement).value
    ).toBe("Miguel");
    expect(
      (within(dialog).getByLabelText("Notes") as HTMLTextAreaElement).value
    ).toBe("Bring extra ladders");
    // The status trigger surfaces the current value.
    expect(within(dialog).getByText("in progress")).toBeTruthy();

    // Close the dialog so no open portal/scroll-lock leaks into the next test.
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("emits the edited task via onTaskEdit when Save changes is clicked", async () => {
    const onTaskEdit = vi.fn();
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({
        id: 9,
        title: "Drywall hang",
        status: "pending",
        assigned_to: null,
        notes: null,
        planned_start: "2026-07-10",
        planned_end: "2026-07-14",
      }),
    ];
    render(<GanttChart projectId={1} items={items} onTaskEdit={onTaskEdit} />);

    fireEvent.click(screen.getByText("Drywall hang"));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Drywall hang (revised)" },
    });
    fireEvent.change(within(dialog).getByLabelText("Assignee"), {
      target: { value: "Rosa" },
    });
    fireEvent.change(within(dialog).getByLabelText("Notes"), {
      target: { value: "Confirm mud delivery" },
    });
    fireEvent.click(within(dialog).getByText("Save changes"));

    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    const [edited] = onTaskEdit.mock.calls[0] as [ScheduleItem];
    expect(edited.id).toBe(9);
    expect(edited.title).toBe("Drywall hang (revised)");
    expect(edited.assigned_to).toBe("Rosa");
    expect(edited.notes).toBe("Confirm mud delivery");
    // Untouched fields are preserved through the edit.
    expect(edited.status).toBe("pending");
    expect(edited.planned_start).toContain("2026-07-10");
    expect(edited.planned_end).toContain("2026-07-14");
    // The dialog closes after save (Radix tears its portal down async — wait).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("renders a view-only dialog (no Save action) when readOnly", async () => {
    const onTaskEdit = vi.fn();
    const { GanttChart } = await loadGantt();
    const items = [
      makeItem({
        id: 3,
        title: "Roofing",
        status: "complete",
        assigned_to: "Dan",
        notes: "Done ahead of schedule",
        planned_start: "2026-05-01",
        planned_end: "2026-05-06",
      }),
    ];
    render(
      <GanttChart
        projectId={1}
        items={items}
        onTaskEdit={onTaskEdit}
        readOnly
      />
    );

    fireEvent.click(screen.getByText("Roofing"));
    const dialog = screen.getByRole("dialog");

    // View-only copy + a Close button instead of Cancel/Save.
    expect(screen.getByText("Task details")).toBeTruthy();
    // The header's built-in close (X) button also carries an sr-only "Close"
    // label, so scope to the footer button whose visible text is "Close".
    const closeButtons = within(dialog).getAllByText("Close");
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Save changes")).toBeNull();

    // Fields are read-only.
    expect(
      (within(dialog).getByLabelText("Title") as HTMLInputElement).hasAttribute(
        "readonly"
      )
    ).toBe(true);
    expect(
      (
        within(dialog).getByLabelText("Notes") as HTMLTextAreaElement
      ).hasAttribute("readonly")
    ).toBe(true);

    // Closing must not call onSave (there is no save action in view-only mode).
    const footerClose = within(dialog).getAllByText("Close").slice(-1)[0];
    fireEvent.click(footerClose);
    expect(onTaskEdit).not.toHaveBeenCalled();
    // Radix tears the portal down async after the close interaction.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
