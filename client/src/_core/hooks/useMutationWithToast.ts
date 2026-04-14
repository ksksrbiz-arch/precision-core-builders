/**
 * useMutationWithToast — Wraps tRPC mutations with automatic toast feedback.
 *
 * Eliminates repetitive onSuccess/onError boilerplate across all admin pages.
 * Supports optional query invalidation, custom messages, and loading state.
 *
 * Usage:
 *   const save = useMutationWithToast(trpc.clients.create, {
 *     success: "Client created",
 *     error: "Failed to create client",
 *     invalidate: () => utils.clients.list.invalidate(),
 *   });
 *   await save.mutateAsync(payload);
 */

import { useCallback } from "react";
import { useToast } from "@/components/ToastProvider";

export interface MutationToastOptions<TData = unknown> {
  /** Toast title on success (required) */
  success: string;
  /** Toast message body on success (optional) */
  successMessage?: string;
  /** Toast title on error. Defaults to "Error" */
  error?: string;
  /** Toast message body on error. Defaults to "Something went wrong. Please try again." */
  errorMessage?: string;
  /** Called after successful mutation to invalidate queries */
  invalidate?: () => void | Promise<void>;
  /** Called with the result data on success */
  onSuccess?: (data: TData) => void;
  /** Called with the error on failure */
  onError?: (err: unknown) => void;
}

/**
 * Extracts a human-readable error message from an unknown error object.
 */
function extractErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}

/**
 * Core hook — accepts a tRPC mutation hook result and wraps it with toasts.
 *
 * Pass the tRPC mutation directly:
 *   const raw = trpc.projects.create.useMutation();
 *   const mut = useMutationWithToast(raw, options);
 */
export function useMutationWithToast<TInput, TData>(
  mutation: {
    mutateAsync: (input: TInput) => Promise<TData>;
    isPending?: boolean;
    isLoading?: boolean;
  },
  options: MutationToastOptions<TData>
) {
  const { addToast } = useToast();

  const mutateAsync = useCallback(
    async (input: TInput): Promise<TData | null> => {
      try {
        const data = await mutation.mutateAsync(input);

        await options.invalidate?.();

        addToast({
          type: "success",
          title: options.success,
          message: options.successMessage,
          duration: 4000,
        });

        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const msg = options.errorMessage ?? extractErrorMessage(err);
        addToast({
          type: "error",
          title: options.error ?? "Error",
          message: msg,
          duration: 6000,
        });
        options.onError?.(err);
        return null;
      }
    },
    [mutation, options, addToast]
  );

  const mutate = useCallback(
    (input: TInput) => {
      void mutateAsync(input);
    },
    [mutateAsync]
  );

  return {
    mutateAsync,
    mutate,
    isPending: mutation.isPending ?? mutation.isLoading ?? false,
  };
}
