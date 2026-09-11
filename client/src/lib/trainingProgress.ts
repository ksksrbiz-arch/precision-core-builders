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

export function stepKey(moduleId: string, stepIndex: number): string {
  return `${moduleId}:${stepIndex}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === "string");
}

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

export function saveProgress(progress: TrainingProgress): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable (private window, blocked site data). Progress is a
    // convenience, never a correctness requirement — the UI still works.
  }
}

export function clearProgress(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // See saveProgress.
  }
}

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter(v => v !== value)
    : [...list, value];
}

export function toggleStep(
  progress: TrainingProgress,
  key: string
): TrainingProgress {
  return {
    ...progress,
    completedSteps: toggleIn(progress.completedSteps, key),
  };
}

export function toggleModule(
  progress: TrainingProgress,
  moduleId: string
): TrainingProgress {
  return {
    ...progress,
    completedModules: toggleIn(progress.completedModules, moduleId),
  };
}
