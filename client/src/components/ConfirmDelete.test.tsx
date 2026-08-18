/**
 * @vitest-environment jsdom
 *
 * Tests for ConfirmDelete — asserts the dialog opens from its trigger, that
 * confirming fires onConfirm exactly once, and that cancelling never does.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDelete } from "./ConfirmDelete";

afterEach(() => {
  cleanup();
});

function renderConfirmDelete(onConfirm: () => void) {
  return render(
    <ConfirmDelete
      trigger={<button aria-label="Remove Northwest Supply">trash</button>}
      title="Remove Northwest Supply?"
      description="This removes the vendor from your catalog."
      confirmLabel="Remove"
      onConfirm={onConfirm}
    />
  );
}

describe("ConfirmDelete", () => {
  it("renders the trigger and keeps the dialog closed initially", () => {
    renderConfirmDelete(vi.fn());
    expect(screen.getByLabelText("Remove Northwest Supply")).toBeTruthy();
    expect(screen.queryByText("Remove Northwest Supply?")).toBeNull();
  });

  it("opens the dialog with title and description on trigger click", async () => {
    const user = userEvent.setup();
    renderConfirmDelete(vi.fn());
    await user.click(screen.getByLabelText("Remove Northwest Supply"));
    expect(screen.getByText("Remove Northwest Supply?")).toBeTruthy();
    expect(
      screen.getByText("This removes the vendor from your catalog.")
    ).toBeTruthy();
  });

  it("fires onConfirm when the destructive action is chosen", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderConfirmDelete(onConfirm);
    await user.click(screen.getByLabelText("Remove Northwest Supply"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not fire onConfirm when cancelled", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderConfirmDelete(onConfirm);
    await user.click(screen.getByLabelText("Remove Northwest Supply"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove Northwest Supply?")).toBeNull();
  });

  it("defaults the action labels to Delete and Cancel", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDelete
        trigger={<button aria-label="Delete item">trash</button>}
        title="Delete item?"
        description="This cannot be undone."
        onConfirm={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText("Delete item"));
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});
