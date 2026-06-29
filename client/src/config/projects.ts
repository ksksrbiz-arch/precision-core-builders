/**
 * Project domain constants shared across the estimator and admin project pages.
 *
 * Extracted verbatim from `pages/Estimator.tsx` so a single source of truth
 * drives project-type pickers, material options, and ballpark timelines.
 */

export type ProjectTypeOption = {
  id: string;
  label: string;
  icon: string;
};

export const PROJECT_TYPES: ProjectTypeOption[] = [
  { id: "new-home", label: "New Home Build", icon: "🏠" },
  { id: "full-remodel", label: "Full Remodel", icon: "🔨" },
  { id: "kitchen", label: "Kitchen Remodel", icon: "🍳" },
  { id: "bathroom", label: "Bathroom Remodel", icon: "🚿" },
  { id: "addition", label: "Home Addition", icon: "📐" },
  { id: "adu", label: "ADU / Second Unit", icon: "🏡" },
  { id: "outdoor", label: "Outdoor / Deck", icon: "🌿" },
  { id: "roofing", label: "Roofing", icon: "🏗️" },
  { id: "restoration", label: "Restoration", icon: "🔧" },
  { id: "cabinets", label: "Custom Cabinets", icon: "🪵" },
];

export const MATERIALS_OPTIONS: string[] = [
  "Premium fixtures and hardware",
  "Custom cabinetry",
  "Hardwood flooring",
  "Tile and stone",
  "High-end countertops (quartz/granite)",
  "Energy-efficient windows",
  "Smart home integration",
  "Premium appliances",
];

/**
 * Rough timeline ranges (in weeks) by project type, used only as a ballpark on
 * the estimator results screen. Client-side heuristics — the on-site visit
 * produces the real schedule.
 */
export const TIMELINE_WEEKS: Record<string, [number, number]> = {
  "new-home": [20, 36],
  "full-remodel": [10, 20],
  kitchen: [4, 8],
  bathroom: [3, 6],
  addition: [8, 16],
  adu: [12, 24],
  outdoor: [2, 6],
  roofing: [1, 3],
  restoration: [4, 12],
  cabinets: [3, 8],
};
