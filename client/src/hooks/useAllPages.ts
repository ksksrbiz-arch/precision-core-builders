/**
 * Load EVERY page of a paginated admin list, for pickers and lookups.
 *
 * The list routers cap `pageSize` at 100, and the pickers used to ask for one
 * page of 50–100 — so the 51st/101st project or client silently could not be
 * selected anywhere (schedule, materials, ledger, billing, estimates…). This
 * walks the pages (each its own cached query) and returns the combined rows in
 * the same `{ data: { data, total } }` shape the pickers already read, so call
 * sites are drop-in replacements.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export const PICKER_PAGE_SIZE = 100;
/** Safety valve: stop after this many pages (2,000 rows) rather than loop forever. */
export const MAX_PICKER_PAGES = 20;

type PageResult<T> = { data: T[]; total?: number | null };

type ListQuery<T> = {
  data: PageResult<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

export function useAllPages<T>(
  useListPage: (input: { page: number; pageSize: number }) => ListQuery<T>
) {
  const [page, setPage] = useState(1);
  const pages = useRef(new Map<number, PageResult<T>>());

  const current = useListPage({ page, pageSize: PICKER_PAGE_SIZE });

  // Record the page in hand (keyed by page, so a refetch replaces it). Done
  // during render — idempotent — so there's no effect -> setState -> render
  // chain that could loop when a caller's query returns a fresh object each
  // render.
  if (current.data) pages.current.set(page, current.data);

  const loaded = [...pages.current.values()].reduce(
    (n, p) => n + p.data.length,
    0
  );
  const total = current.data?.total ?? loaded;
  const more =
    !!current.data &&
    current.data.data.length === PICKER_PAGE_SIZE &&
    loaded < total &&
    page < MAX_PICKER_PAGES;

  // Advance only when a full page has landed and rows are still missing.
  useEffect(() => {
    if (more) setPage(p => p + 1);
    else if (current.data && loaded < total && page >= MAX_PICKER_PAGES) {
      console.warn(
        `[useAllPages] stopped at ${MAX_PICKER_PAGES} pages; ${total - loaded} rows not loaded`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [more, page]);

  // Referentially stable until the page data actually changes, so callers can
  // safely list the result in effect dependency arrays.
  const combined = useMemo(() => {
    if (pages.current.size === 0) return current.data;
    const rows = [...pages.current.entries()]
      .sort(([x], [y]) => x - y)
      .flatMap(([, p]) => p.data);
    return { data: rows, total: current.data?.total ?? rows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.data, page]);

  return {
    // Same shape as `trpc.X.list.useQuery` results: `data.data` is the rows.
    data: combined,
    // Still "loading" while later pages are being fetched, so a picker never
    // renders a truncated list as if it were complete.
    isLoading: current.isLoading || more,
    isError: current.isError,
    refetch: () => {
      pages.current.clear();
      setPage(1);
      return current.refetch();
    },
  };
}

/** Every non-archived project (archived ones are excluded by the router). */
export function useAllProjects() {
  return useAllPages(input => trpc.projects.list.useQuery(input));
}

export function useAllClients() {
  return useAllPages(input => trpc.clients.list.useQuery(input));
}
