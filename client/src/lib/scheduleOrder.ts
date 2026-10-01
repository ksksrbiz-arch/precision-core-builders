/**
 * Reordering schedule tasks. `sort_order` is the primary sort key for the
 * schedule list and the Gantt rows; most rows start at 0, so a move
 * renumbers the whole list (0..n-1) in its current display order and then
 * swaps the two neighbours. Only rows whose number actually changes are sent.
 */
export type OrderedTask = { id: number; sort_order?: number | null };

export type OrderUpdate = { id: number; order: number };

export function computeReorder(
  tasks: readonly OrderedTask[],
  id: number,
  direction: "up" | "down"
): OrderUpdate[] | null {
  const from = tasks.findIndex(t => t.id === id);
  if (from < 0) return null;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= tasks.length) return null;

  const next = tasks.map(t => t.id);
  [next[from], next[to]] = [next[to], next[from]];

  const current = new Map(tasks.map(t => [t.id, t.sort_order ?? 0]));
  return next
    .map((taskId, order) => ({ id: taskId, order }))
    .filter(u => current.get(u.id) !== u.order);
}
