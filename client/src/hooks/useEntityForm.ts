import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * Lightweight controlled-form state for the inline create/edit forms that admin
 * list and detail pages re-implement with bespoke `useState` + setter objects
 * (ClientsList create form, ProjectDetail edit overlay, SubContractorsList, …).
 *
 * Intentionally minimal — for complex validation prefer React Hook Form + Zod
 * (already a dependency). This covers the common "a few fields, reset on close"
 * case without per-page boilerplate.
 *
 * @example
 * const form = useEntityForm({ name: "", email: "" });
 * <Input value={form.values.name} onChange={e => form.setField("name", e.target.value)} />
 * // on dialog close:
 * form.reset();
 */
export type EntityForm<T> = {
  values: T;
  setValues: Dispatch<SetStateAction<T>>;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Reset to the initial values, optionally overriding some fields. */
  reset: (overrides?: Partial<T>) => void;
};

export function useEntityForm<T extends Record<string, unknown>>(
  initial: T
): EntityForm<T> {
  const [values, setValues] = useState<T>(initial);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) =>
      setValues(prev => ({ ...prev, [key]: value })),
    []
  );

  const reset = useCallback(
    (overrides?: Partial<T>) => setValues({ ...initial, ...overrides }),
    // `initial` is captured once; callers pass a stable object or accept the
    // first-render snapshot as the reset baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { values, setValues, setField, reset };
}
