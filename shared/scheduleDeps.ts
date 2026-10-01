/**
 * Schedule task dependencies.
 *
 * `schedule_items.depends_on` is a text column; the format is a comma-separated
 * list of predecessor task ids ("12,15"), meaning finish-to-start: a task
 * should not start before every listed predecessor ends. Shared by the router
 * (validation) and the Gantt UI (editor + connector lines) so both agree.
 */

export type DepTask = { id: number; dependsOn?: string | null };

/** Parse a stored value into predecessor ids (ignores junk and duplicates). */
export function parseDependsOn(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids = value
    .split(",")
    .map(part => Number(part.trim()))
    .filter(n => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}

/**
 * Serialise ids for storage in canonical (ascending) order, so comparing two
 * lists as strings is order-independent. An empty list is `null` (clears the
 * column).
 */
export function formatDependsOn(ids: readonly number[]): string | null {
  const unique = [...new Set(ids)]
    .filter(n => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
  return unique.length ? unique.join(",") : null;
}

/** Strict check for API input: digits separated by commas, nothing else. */
export function isValidDependsOn(value: string): boolean {
  return /^\d+(,\d+)*$/.test(value);
}

/**
 * Would giving `taskId` the predecessors `deps` be a problem? Returns a short
 * human message, or null when it's fine. `tasks` is the whole project.
 */
export function findDependencyProblem(
  taskId: number | null,
  deps: readonly number[],
  tasks: readonly DepTask[]
): string | null {
  const byId = new Map(tasks.map(t => [t.id, t]));
  for (const dep of deps) {
    if (taskId !== null && dep === taskId) {
      return "A task can't depend on itself.";
    }
    if (!byId.has(dep)) {
      return `Task ${dep} isn't in this project's schedule.`;
    }
  }
  if (taskId === null) return null;

  // Cycle: walking back from any new predecessor must never reach `taskId`.
  const seen = new Set<number>();
  const stack = [...deps];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === taskId) {
      return "That would create a circular dependency.";
    }
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...parseDependsOn(byId.get(current)?.dependsOn));
  }
  return null;
}

/** Predecessor ids with `removedId` taken out (used when a task is deleted). */
export function withoutDependency(
  value: string | null | undefined,
  removedId: number
): string | null {
  return formatDependsOn(parseDependsOn(value).filter(id => id !== removedId));
}
