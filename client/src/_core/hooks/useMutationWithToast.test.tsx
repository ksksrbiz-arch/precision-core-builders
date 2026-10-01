// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addToast = vi.fn();
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast }),
}));

import { useMutationWithToast } from "./useMutationWithToast";

function setup<T>(
  result: T | Error,
  options: Partial<Parameters<typeof useMutationWithToast<unknown, T>>[1]> = {}
) {
  const mutateAsync = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const invalidate = vi.fn();
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const { result: hook } = renderHook(() =>
    useMutationWithToast<unknown, T>(
      { mutateAsync },
      {
        success: "Saved",
        error: "Save Failed",
        invalidate,
        onSuccess,
        onError,
        ...options,
      }
    )
  );
  return { hook, invalidate, onSuccess, onError };
}

beforeEach(() => addToast.mockClear());

describe("useMutationWithToast", () => {
  it("shows a success toast, invalidates, and calls onSuccess", async () => {
    const { hook, invalidate, onSuccess } = setup({ id: 1 });
    await hook.current.mutateAsync({});
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", title: "Saved" })
    );
    expect(invalidate).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
  });

  it("shows an error toast and calls onError when the mutation throws", async () => {
    const { hook, onSuccess, onError } = setup<{ id: number }>(
      new Error("boom")
    );
    const out = await hook.current.mutateAsync({});
    expect(out).toBeNull();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: "boom" })
    );
    expect(onError).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  describe("failed() — resolved-but-failed results", () => {
    const failed = (row: { status: string; why?: string }) =>
      row.status === "failed" ? `Not delivered: ${row.why}` : null;

    it("shows an error toast (not success) and skips onSuccess", async () => {
      const { hook, invalidate, onSuccess } = setup(
        { status: "failed", why: "provider not configured" },
        { failed }
      );
      const out = await hook.current.mutateAsync({});

      expect(out).toEqual({ status: "failed", why: "provider not configured" });
      expect(addToast).toHaveBeenCalledTimes(1);
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Save Failed",
          message: "Not delivered: provider not configured",
        })
      );
      // The failed row must still show up in the list...
      expect(invalidate).toHaveBeenCalled();
      // ...but the compose form must not be closed/reset as if it had worked.
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("behaves normally when the result is not a failure", async () => {
      const { hook, onSuccess } = setup({ status: "sent" }, { failed });
      await hook.current.mutateAsync({});
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "success" })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
