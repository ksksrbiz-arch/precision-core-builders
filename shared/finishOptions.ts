/**
 * Curated finish options a portal client can choose from, grouped by category.
 *
 * SINGLE SOURCE OF TRUTH for upgrade pricing. `delta` is the budget impact (in
 * dollars) relative to the base allowance. The server looks the price up here
 * (see `finishSelections.select`) instead of trusting a client-supplied dollar
 * figure, because that figure is written to the append-only ledger.
 *
 * `image` is a static asset under /finishes for the gallery card.
 */
export type FinishOption = {
  label: string;
  delta: number;
  image: string;
  blurb: string;
};

export type FinishCategory = { category: string; options: FinishOption[] };

export const FINISH_OPTIONS: FinishCategory[] = [
  {
    category: "Countertops",
    options: [
      {
        label: "Quartz (Standard)",
        delta: 0,
        image: "/finishes/quartz-standard.jpg",
        blurb: "Durable engineered stone — low maintenance standard allowance",
      },
      {
        label: "Granite",
        delta: 1200,
        image: "/finishes/granite.jpg",
        blurb: "Natural stone with unique patterning and heat resistance",
      },
      {
        label: "Natural Marble",
        delta: 3500,
        image: "/finishes/marble-natural.jpg",
        blurb: "Classic veining for a luxury statement surface",
      },
    ],
  },
  {
    category: "Flooring",
    options: [
      {
        label: "Engineered Hardwood (Standard)",
        delta: 0,
        image: "/finishes/hardwood-engineered.jpg",
        blurb: "Real wood wear layer over stable core — standard allowance",
      },
      {
        label: "Luxury Vinyl Plank",
        delta: -800,
        image: "/finishes/lvp-flooring.jpg",
        blurb: "Waterproof wood-look planks — budget-friendly upgrade path",
      },
      {
        label: "Natural Stone Tile",
        delta: 2400,
        image: "/finishes/stone-tile.jpg",
        blurb: "Stone tile floors for lasting character and durability",
      },
    ],
  },
  {
    category: "Cabinetry",
    options: [
      {
        label: "Shaker (Standard)",
        delta: 0,
        image: "/finishes/cabinet-shaker.jpg",
        blurb: "Clean recessed panel doors — timeless standard allowance",
      },
      {
        label: "Custom Inset",
        delta: 4000,
        image: "/finishes/cabinet-inset.jpg",
        blurb: "Furniture-grade inset doors with precision joinery",
      },
    ],
  },
  {
    category: "Fixtures",
    options: [
      {
        label: "Brushed Nickel (Standard)",
        delta: 0,
        image: "/finishes/fixture-brushed-nickel.jpg",
        blurb: "Soft metal finish that hides fingerprints — standard",
      },
      {
        label: "Matte Black",
        delta: 350,
        image: "/finishes/fixture-matte-black.jpg",
        blurb: "Modern contrast faucet finish for contemporary baths",
      },
      {
        label: "Polished Brass",
        delta: 600,
        image: "/finishes/fixture-polished-brass.jpg",
        blurb: "Warm polished metal for a refined luxury accent",
      },
    ],
  },
];

const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase();

/**
 * Find a curated option by its label (case-insensitive). When `category` is
 * given it is preferred, but the label alone is enough — labels are unique.
 * Returns undefined for anything that isn't a curated option.
 */
export function findFinishOption(
  category: string | undefined,
  label: string
): FinishOption | undefined {
  const wanted = norm(label);
  const inCategory = FINISH_OPTIONS.filter(
    c => !category || norm(c.category) === norm(category)
  );
  for (const pool of [inCategory, FINISH_OPTIONS]) {
    for (const c of pool) {
      const hit = c.options.find(o => norm(o.label) === wanted);
      if (hit) return hit;
    }
  }
  return undefined;
}
