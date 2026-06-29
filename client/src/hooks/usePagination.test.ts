/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("derives page count from total and page size", () => {
    const { result } = renderHook(() => usePagination(45, { pageSize: 20 }));
    expect(result.current.pageCount).toBe(3);
    expect(result.current.page).toBe(1);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
  });

  it("advances and retreats within bounds", () => {
    const { result } = renderHook(() => usePagination(45, { pageSize: 20 }));
    act(() => result.current.next());
    expect(result.current.page).toBe(2);
    act(() => result.current.next());
    expect(result.current.page).toBe(3);
    act(() => result.current.next()); // clamp at last page
    expect(result.current.page).toBe(3);
    expect(result.current.canNext).toBe(false);
    act(() => result.current.prev());
    expect(result.current.page).toBe(2);
  });

  it("treats an empty list as a single page", () => {
    const { result } = renderHook(() => usePagination(0, { pageSize: 20 }));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.canNext).toBe(false);
  });
});
