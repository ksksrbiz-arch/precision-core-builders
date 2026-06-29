/**
 * Reusable list pagination control.
 *
 * Replaces the hand-built "Prev / Page N of M / Next" button rows duplicated
 * across admin list pages. Pairs with the `usePagination` hook.
 *
 * @example
 * const pager = usePagination(data?.total ?? 0, { pageSize });
 * <Pagination {...pager} />
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  page: number;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  prev: () => void;
  next: () => void;
  /** Hidden when there is a single page. Default: true. */
  hideWhenSingle?: boolean;
  className?: string;
};

export function Pagination({
  page,
  pageCount,
  canPrev,
  canNext,
  prev,
  next,
  hideWhenSingle = true,
  className,
}: PaginationProps) {
  if (hideWhenSingle && pageCount <= 1) return null;

  return (
    <div
      className={cn("flex items-center justify-between gap-4 pt-4", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={prev}
        disabled={!canPrev}
        aria-label="Previous page"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={next}
        disabled={!canNext}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
