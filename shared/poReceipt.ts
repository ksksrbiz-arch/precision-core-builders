/**
 * Purchase-order receiving, as pure rules.
 *
 * A receipt records how much of each PO line actually arrived. Receipts are
 * cumulative per line (`quantity_received`), a line can't be received past its
 * ordered quantity, and the PO becomes `received` only when every line is
 * complete (otherwise `partial`). The same planner backs "Receive" (explicit
 * quantities) and "mark received" (everything still outstanding), so inventory
 * is only ever bumped by the quantity that really arrived.
 */

export type PoLine = {
  id: number;
  materialId: number | null;
  /** Ordered quantity (null/0 = nothing to receive on this line). */
  quantity: number | null;
  /** Already received on earlier receipts. */
  quantityReceived: number;
};

export type ReceiptInput = { itemId: number; quantity: number };

export type LineReceipt = {
  itemId: number;
  materialId: number | null;
  /** Quantity arriving on THIS receipt (what inventory is bumped by). */
  delta: number;
  /** Cumulative received after this receipt. */
  newReceived: number;
  /** True when the line is now fully received. */
  complete: boolean;
};

export type ReceiptPlan =
  | {
      ok: true;
      lines: LineReceipt[];
      status: "partial" | "received";
    }
  | { ok: false; error: string };

const round = (n: number) => Math.round(n * 100) / 100;

/** Everything still outstanding on a PO, as receipt inputs. */
export function remainingReceipts(lines: readonly PoLine[]): ReceiptInput[] {
  return lines
    .map(l => ({
      itemId: l.id,
      quantity: round((l.quantity ?? 0) - l.quantityReceived),
    }))
    .filter(r => r.quantity > 0);
}

export function planReceipt(
  lines: readonly PoLine[],
  receipts: readonly ReceiptInput[]
): ReceiptPlan {
  if (receipts.length === 0) {
    return { ok: false, error: "Enter a quantity for at least one line." };
  }
  const byId = new Map(lines.map(l => [l.id, l]));
  const seen = new Set<number>();
  const planned = new Map<number, LineReceipt>();

  for (const r of receipts) {
    const line = byId.get(r.itemId);
    if (!line) {
      return { ok: false, error: "A line isn't part of this purchase order." };
    }
    if (seen.has(r.itemId)) {
      return { ok: false, error: "A line was listed more than once." };
    }
    seen.add(r.itemId);
    if (!Number.isFinite(r.quantity) || r.quantity <= 0) {
      return { ok: false, error: "Quantities received must be above zero." };
    }
    const ordered = line.quantity ?? 0;
    const remaining = round(ordered - line.quantityReceived);
    if (r.quantity > remaining + 1e-9) {
      return {
        ok: false,
        error: `Can't receive ${r.quantity} — only ${Math.max(remaining, 0)} still outstanding on that line.`,
      };
    }
    const newReceived = round(line.quantityReceived + r.quantity);
    planned.set(r.itemId, {
      itemId: line.id,
      materialId: line.materialId,
      delta: round(r.quantity),
      newReceived,
      complete: newReceived >= ordered - 1e-9,
    });
  }

  // PO-level status after applying these receipts to the current state.
  const allComplete = lines.every(l => {
    const ordered = l.quantity ?? 0;
    if (ordered <= 0) return true;
    const p = planned.get(l.id);
    const received = p ? p.newReceived : l.quantityReceived;
    return received >= ordered - 1e-9;
  });

  return {
    ok: true,
    lines: [...planned.values()],
    status: allComplete ? "received" : "partial",
  };
}
