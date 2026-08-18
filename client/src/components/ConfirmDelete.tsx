/**
 * ConfirmDelete — a thin wrapper over `ui/alert-dialog` collapsing the
 * near-identical destructive-confirm flows repeated across ClientsList,
 * VendorsList, SubContractorsList, MaterialsView, PortfolioAdmin and
 * FinishSelectionsAdmin.
 *
 * The rendered markup mirrors the VendorsList flow exactly: trigger →
 * content → header (title + description) → footer (Cancel, destructive
 * Action).
 *
 * Usage:
 *   <ConfirmDelete
 *     trigger={
 *       <button aria-label={`Remove ${vendor.name}`}>
 *         <Trash2 className="h-3.5 w-3.5" />
 *       </button>
 *     }
 *     title={`Remove ${vendor.name}?`}
 *     description="This removes the vendor from your catalog."
 *     confirmLabel="Remove"
 *     onConfirm={() => deleteMut.mutate({ id: vendor.id })}
 *   />
 */
import type { ReactElement, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ConfirmDeleteProps = {
  /**
   * The element that opens the dialog. Must be a single element — Radix
   * clones it via `asChild` and forwards its own props/ref onto it, so a
   * custom component used here must forward both. Icon-only triggers need
   * aria-label.
   */
  trigger: ReactElement;
  title: ReactNode;
  description: ReactNode;
  /** Label for the destructive action. Defaults to "Delete". */
  confirmLabel?: string;
  /** Label for the dismissive action. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Fired only when the destructive action is chosen. */
  onConfirm: () => void;
};

export function ConfirmDelete({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDeleteProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDelete;
