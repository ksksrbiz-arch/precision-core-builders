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
 * Reads saved progress, falling back to empty for every failure mode:
 * nothing stored, unparseable JSON, wrong shape, or storage that throws.
 */
export function loadProgress(): TrainingProgress {
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
      completedSteps: isStringArray(completedSteps) ? completedSteps : [],
      completedModules: isStringArray(completedModules) ? completedModules : [],
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
