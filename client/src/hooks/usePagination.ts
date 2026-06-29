import { useCallback, useState } from "react";

/**
 * List pagination state, extracted from the per-page `useState(page)` +
 * prev/next handlers duplicated across admin list pages (ClientsList,
 * EstimatesList, SubContractorsList, …).
 *
 * Pairs with the tRPC list inputs `{ page, pageSize }` and the `<Pagination>`
 * component.
 *
 * @example
 * const { data } = trpc.clients.list.useQuery({ page, pageSize });
 * const pager = usePagination(data?.total ?? 0, { pageSize });
 */
export type UsePaginationOptions = {
  /** Rows per page. Default: 20 (matches the server default). */
  pageSize?: number;
  /** Initial page (1-based). Default: 1. */
  initialPage?: number;
};

export type PaginationState = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  setPage: (page: number) => void;
  next: () => void;
  prev: () => void;
};

export function usePagination(
  total: number,
  options: UsePaginationOptions = {}
): PaginationState {
  const pageSize = options.pageSize ?? 20;
  const [page, setPageRaw] = useState(options.initialPage ?? 1);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);

  const setPage = useCallback(
    (next: number) => setPageRaw(Math.max(1, next)),
    []
  );
  const next = useCallback(
    () => setPageRaw(p => Math.min(p + 1, pageCount)),
    [pageCount]
  );
  const prev = useCallback(() => setPageRaw(p => Math.max(1, p - 1)), []);

  return {
    page: current,
    pageSize,
    pageCount,
    total,
    canPrev: current > 1,
    canNext: current < pageCount,
    setPage,
    next,
    prev,
  };
}
