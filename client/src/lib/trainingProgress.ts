/**
 * Training progress store.
 *
 * Progress is per-device and stored in `localStorage` on purpose: the training
 * track has to work on a tablet with no signal, and "which steps has Eric
 * checked off" is not data worth a round trip. Every access is guarded —
 * private-mode browsers and blocked site data throw on access rather than
 * returning null.
 */

const STORAGE_KEY = "pcb.training.progress.v1";

export type TrainingProgress = {
  /** Step keys ("<moduleId>:<stepIndex>") the user has checked off. */
  completedSteps: string[];
  /** Module IDs explicitly marked done. */
  completedModules: string[];
};

const EMPTY: TrainingProgress = { completedSteps: [], completedModules: [] };

/**
 * Stable identifier for one checkbox. Steps are positional, so a module's
 * steps must not be reordered without migrating the stored keys.
 */
export function stepKey(moduleId: string, stepIndex: number): string {
  return `${moduleId}:${stepIndex}`;
}

/** Guards stored JSON, which is user-writable and may be any shape. */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === "string");
}

/**
 * Normalizes a persisted list: drops duplicates, and — when `known` is given
 * — anything outside it. localStorage is user-writable and survives
 * curriculum edits, so stored entries can be repeated or stale; counting
 * them raw would let progress exceed 100%.
 */
function normalize(values: string[], known?: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  return values.filter(v => {
    if (seen.has(v)) return false;
    if (known && !known.has(v)) return false;
    seen.add(v);
    return true;
  });
}

/**
 * Reads saved progress, falling back to empty for every failure mode:
 * nothing stored, unparseable JSON, wrong shape, or storage that throws.
 *
 * Pass the current curriculum's key sets to discard entries left behind by
 * an older curriculum — callers that omit them still get deduplication.
 */
export function loadProgress(known?: {
  stepKeys?: ReadonlySet<string>;
  moduleIds?: ReadonlySet<string>;
}): TrainingProgress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const { completedSteps, completedModules } = parsed as Record<
      string,
      unknown
    >;
    return {
      completedSteps: normalize(
        isStringArray(completedSteps) ? completedSteps : [],
        known?.stepKeys
      ),
      completedModules: normalize(
        isStringArray(completedModules) ? completedModules : [],
        known?.moduleIds
      ),
    };
  } catch {
    return EMPTY;
  }
}

/** Persists progress. Silently no-ops when storage is unavailable. */
export function saveProgress(progress: TrainingProgress): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable (private window, blocked site data). Progress is a
    // convenience, never a correctness requirement — the UI still works.
  }
}

/** Wipes saved progress — backs the "Start over" control. */
export function clearProgress(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // See saveProgress.
  }
}

/** Adds or removes a value, returning a new array (never mutates). */
function toggleIn(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter(v => v !== value)
    : [...list, value];
}

/** Checks or unchecks one step, returning fresh state for React. */
export function toggleStep(
  progress: TrainingProgress,
  key: string
): TrainingProgress {
  return {
    ...progress,
    completedSteps: toggleIn(progress.completedSteps, key),
  };
}

/** Marks a whole lesson done or not done, independently of its steps. */
export function toggleModule(
  progress: TrainingProgress,
  moduleId: string
): TrainingProgress {
  return {
    ...progress,
    completedModules: toggleIn(progress.completedModules, moduleId),
  };
}
