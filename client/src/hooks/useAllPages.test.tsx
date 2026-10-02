/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";

// The hook only touches trpc via useAllProjects/useAllClients, which these
// tests don't call; keep the real client (and its Supabase setup) out of it.
vi.mock("@/lib/trpc", () => ({ trpc: {} }));
import { act, renderHook, waitFor } from "@testing-library/react";
import { MAX_PICKER_PAGES, PICKER_PAGE_SIZE, useAllPages } from "./useAllPages";

const TOTAL = 230;
const row = (i: number) => ({ id: i });

/**
 * A fake paginated query: page N of a TOTAL-row list. Results are cached per
 * page, like react-query's, so `data` is referentially stable between renders.
 */
function fakeList(total: number, calls: number[] = []) {
  const cache = new Map<number, { data: { id: number }[]; total: number }>();
  return ({ page, pageSize }: { page: number; pageSize: number }) => {
    calls.push(page);
    if (!cache.has(page)) {
      const from = (page - 1) * pageSize;
      const n = Math.max(0, Math.min(pageSize, total - from));
      cache.set(page, {
        data: Array.from({ length: n }, (_, i) => row(from + i)),
        total,
      });
    }
    return {
      data: cache.get(page),
      isLoading: false,
      isError: false,
      refetch: () => undefined,
    };
  };
}

describe("useAllPages", () => {
  it("walks every page so rows past the old 50/100 cap are selectable", async () => {
    const calls: number[] = [];
    const { result } = renderHook(() => useAllPages(fakeList(TOTAL, calls)));
    await waitFor(() => expect(result.current.data?.data.length).toBe(TOTAL));
    expect(result.current.data!.data[229]).toEqual({ id: 229 });
    expect(new Set(calls)).toEqual(new Set([1, 2, 3]));
    expect(result.current.isLoading).toBe(false);
  });

  it("reports loading while later pages are still being fetched", async () => {
    const seen: boolean[] = [];
    const list = fakeList(TOTAL);
    const { result } = renderHook(() => {
      const r = useAllPages(list);
      seen.push(r.isLoading);
      return r;
    });
    await waitFor(() => expect(result.current.data?.data.length).toBe(TOTAL));
    // Loading from the first render (page 1 in, more coming) until the last page.
    expect(seen[0]).toBe(true);
    expect(seen.at(-1)).toBe(false);
  });

  it("makes one request for a short list", async () => {
    const calls: number[] = [];
    const { result } = renderHook(() => useAllPages(fakeList(7, calls)));
    await waitFor(() => expect(result.current.data?.data.length).toBe(7));
    expect(new Set(calls)).toEqual(new Set([1]));
    expect(result.current.isLoading).toBe(false);
  });

  it("handles a mock that omits total (treated as a single page)", async () => {
    const { result } = renderHook(() =>
      useAllPages(() => ({
        data: { data: [row(1), row(2)] },
        isLoading: false,
        isError: false,
        refetch: () => undefined,
      }))
    );
    await waitFor(() => expect(result.current.data?.data.length).toBe(2));
    expect(result.current.isLoading).toBe(false);
  });

  it("returns a referentially stable result between renders", async () => {
    const list = fakeList(7);
    const { result, rerender } = renderHook(() => useAllPages(list));
    await waitFor(() => expect(result.current.data?.data.length).toBe(7));
    const first = result.current.data;
    rerender();
    expect(result.current.data).toBe(first);
  });

  it("stops at the page cap instead of looping forever", async () => {
    const calls: number[] = [];
    const huge = MAX_PICKER_PAGES * PICKER_PAGE_SIZE + 500;
    const { result } = renderHook(() => useAllPages(fakeList(huge, calls)));
    await waitFor(() =>
      expect(result.current.data?.data.length).toBe(
        MAX_PICKER_PAGES * PICKER_PAGE_SIZE
      )
    );
    expect(Math.max(...calls)).toBe(MAX_PICKER_PAGES);
    expect(result.current.isLoading).toBe(false);
  });

  it("refetch starts over from page 1", async () => {
    const { result } = renderHook(() => useAllPages(fakeList(7)));
    await waitFor(() => expect(result.current.data?.data.length).toBe(7));
    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data?.data.length).toBe(7));
  });
});
