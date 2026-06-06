import { useEffect, useState } from "react";

/**
 * useDebounce — returns a debounced copy of a rapidly-changing value.
 *
 * Useful for search inputs that drive server queries: the input stays
 * fully responsive while the debounced value (and any query keyed off it)
 * only updates once the user pauses typing.
 *
 * @param value  The value to debounce.
 * @param delay  Debounce window in milliseconds (default 300ms).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
