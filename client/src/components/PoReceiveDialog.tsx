/**
 * PoReceiveDialog — record what actually arrived on a purchase order.
 *
 * Quantities are per line and cumulative across receipts; the server bumps
 * inventory by exactly what is entered and only marks the PO "received" once
 * every line is complete. (Picking "partial" from the status menu used to apply
 * the FULL line quantity — there was nowhere to say how much came.)
 */
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

type PoItem = {
  id: number;
  description: string;
  quantity: number | string | null;
  quantity_received?: number | string | null;
  materials?: { unit?: string | null } | null;
};

type Props = {
  poId: number | null;
  poNumber?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const num = (v: unknown) => Number(v ?? 0) || 0;
const round = (n: number) => Math.round(n * 100) / 100;

export function PoReceiveDialog({ poId, poNumber, open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const { data: po, isLoading } = trpc.purchaseOrders.getById.useQuery(
    { id: poId ?? 0 },
    { enabled: open && !!poId }
  );
  const items: PoItem[] =
    (po as { purchase_order_items?: PoItem[] } | undefined)
      ?.purchase_order_items ?? [];

  const [entered, setEntered] = useState<Record<number, string>>({});
  useEffect(() => {
    if (open) setEntered({});
  }, [open, poId]);

  const remaining = (it: PoItem) =>
    Math.max(0, round(num(it.quantity) - num(it.quantity_received)));

  const receive = useMutationWithToast(
    trpc.purchaseOrders.receive.useMutation(),
    {
      success: "Receipt Recorded",
      successMessage: "Inventory was updated with the quantities that arrived.",
      error: "Receipt Failed",
      errorMessage: "Couldn't record the receipt. Please try again.",
      // e.g. "Can't receive 6 — only 5 still outstanding on that line."
      showServerMessageFor: ["BAD_REQUEST", "CONFLICT"],
      invalidate: async () => {
        await Promise.all([
          utils.purchaseOrders.list.invalidate(),
          utils.purchaseOrders.getById.invalidate(),
          utils.materials.list.invalidate(),
        ]);
      },
      onSuccess: () => onOpenChange(false),
    }
  );

  const lines = items
    .map(it => ({ itemId: it.id, quantity: Number(entered[it.id] ?? "") }))
    .filter(l => Number.isFinite(l.quantity) && l.quantity > 0);

  const overBy = (it: PoItem) => {
    const q = Number(entered[it.id] ?? "");
    return Number.isFinite(q) && q > remaining(it) + 1e-9;
  };
  const anyOver = items.some(overBy);

  const receiveAllRemaining = () =>
    setEntered(
      Object.fromEntries(
        items
          .filter(it => remaining(it) > 0)
          .map(it => [it.id, String(remaining(it))])
      )
    );

  const nothingLeft =
    items.length > 0 && items.every(it => remaining(it) === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive {poNumber ?? "purchase order"}</DialogTitle>
          <DialogDescription>
            Enter what actually arrived on each line. Inventory is updated by
            exactly these quantities; the order stays partial until every line
            is complete.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading lines…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            This purchase order has no line items to receive.
          </p>
        ) : (
          <div className="space-y-2 py-1">
            {items.map(it => {
              const left = remaining(it);
              const unit = it.materials?.unit ?? "";
              return (
                <div
                  key={it.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {it.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ordered {num(it.quantity)}
                      {unit ? ` ${unit}` : ""} · received{" "}
                      {num(it.quantity_received)} ·{" "}
                      {left > 0 ? `${left} outstanding` : "complete"}
                    </p>
                    {overBy(it) && (
                      <p role="alert" className="text-[11px] text-destructive">
                        Only {left} outstanding on this line.
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={left}
                    step="any"
                    disabled={left === 0}
                    aria-label={`Quantity received for ${it.description}`}
                    value={entered[it.id] ?? ""}
                    onChange={e =>
                      setEntered(prev => ({ ...prev, [it.id]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-24 bg-input border border-border px-2 py-2 text-right text-sm focus:outline-none focus:border-primary/60 disabled:opacity-40"
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!nothingLeft && items.length > 0 && (
            <button
              type="button"
              onClick={receiveAllRemaining}
              className="mr-auto px-3 py-2 border border-border text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Fill all outstanding
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-border text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !poId || lines.length === 0 || anyOver || receive.isPending
            }
            onClick={() => poId && receive.mutate({ id: poId, lines })}
            className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {receive.isPending ? "Saving…" : "Record receipt"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
