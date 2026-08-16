/**
 * Ballpark construction timeline from project type + complexity.
 * Pure function extracted from the public Estimator page for unit testing
 * and reuse.
 */
import { TIMELINE_WEEKS } from "@/config/projects";

export type EstimateComplexity = "low" | "medium" | "high";

/**
 * Returns a human-readable week range (e.g. `"8–16 weeks"`) or null when the
 * project type has no configured baseline.
 */
export function estimateTimeline(
  projectType: string,
  complexity: EstimateComplexity
): string | null {
  const base = TIMELINE_WEEKS[projectType];
  if (!base) return null;
  const factor = complexity === "high" ? 1.25 : complexity === "low" ? 0.85 : 1;
  const low = Math.max(1, Math.round(base[0] * factor));
  const high = Math.max(low + 1, Math.round(base[1] * factor));
  return `${low}–${high} weeks`;
}
