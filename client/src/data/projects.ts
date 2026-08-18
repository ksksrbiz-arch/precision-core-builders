/**
 * Precision Core Builders — Projects Catalog
 *
 * Real Eric Tadlock work, sanitized and dateless per client request.
 * Categories align with CCB licensed work classes and homeowner search intent.
 *
 * Photo roles:
 *   "before" — pre-work state (eligible for before/after slider pairing)
 *   "after"  — completed work (primary hero candidates)
 *   "progress" — mid-build process shots (construction story / trust signal)
 *   "hero"   — standalone portfolio piece (no clear before)
 *
 * beforeAfter: when present, these two filenames render as a drag-reveal slider.
 */

export type ProjectCategory =
  | "Signature Outdoor Living"
  | "Decks & Outdoor"
  | "Bath & Kitchen"
  | "Interior Remodels"
  | "Fencing & Structures"
  | "Exterior & Restoration"
  | "Custom Homes";

export type PhotoRole = "before" | "after" | "progress" | "hero";

export interface ProjectPhoto {
  file: string; // filename (relative to /portfolio/) or absolute HTTPS URL
  role: PhotoRole;
  caption?: string;
}

export interface BeforeAfter {
  before: string; // filename (relative to /portfolio/) or absolute HTTPS URL
  after: string;
  caption?: string;
}

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  location?: string;
  summary: string;
  description: string;
  scope: string[];
  featured: boolean;
  hero: string;
  beforeAfter?: BeforeAfter;
  photos: ProjectPhoto[];
  /** Optional tag — used for special editorial treatment (e.g. the builders' own home) */
  tag?: "Featured Project" | "Signature Work";
  /** Year completed, e.g. "2023". Surfaced in the detail-page facts bar when set. */
  year?: string;
  /** Human-readable build duration, e.g. "6 weeks". Surfaced when set. */
  duration?: string;
  /** Approximate size, e.g. "1,200 sq ft" or "320 lin ft". Surfaced when set. */
  size?: string;
}

export const PROJECTS: Project[] = [
  /* ─── SIGNATURE: outdoor living build ───────────────────────────────── */
  {
    slug: "tadlock-residence",
    title: "Signature Outdoor Living Project",
    category: "Signature Outdoor Living",
    location: "Eugene, OR",
    tag: "Featured Project",
    summary:
      "A full outdoor living build-out — pergola, composite decking, privacy fencing, and front yard fencing, all tied together in one cohesive design.",
    description:
      "A covered pergola, composite deck, horizontal cedar privacy fence, and a hog-wire front yard fence that ties the whole property together — built to the same standard we bring to every client home.",
    scope: [
      "Black-finished louvered pergola anchored to the structure",
      "Grey-tone composite deck, flush to the back-door threshold",
      "Horizontal cedar privacy fence, full property perimeter",
      "Front-yard cedar + hog-wire fence matched in stain",
      "Accessory structure siding, trim, and finish",
    ],
    featured: true,
    hero: "signature-outdoor-01.jpg",
    photos: [
      {
        file: "signature-outdoor-01.jpg",
        role: "hero",
        caption: "Finished outdoor living room",
      },
      {
        file: "signature-deck-01.jpg",
        role: "hero",
        caption: "Covered pergola and composite deck, finished",
      },
      {
        file: "pergola-deck-02.jpg",
        role: "after",
        caption: "Mitered composite step detail",
      },
      {
        file: "cedar-fence-01.jpg",
        role: "hero",
        caption: "Cedar privacy fence and pergola, finished",
      },
      {
        file: "cedar-fence-02.jpg",
        role: "progress",
        caption: "Fence panel assembly",
      },
      {
        file: "front-fence-01.jpg",
        role: "hero",
        caption: "Front hog-wire fence",
      },
      {
        file: "front-fence-02.jpg",
        role: "hero",
        caption: "Matched-stain front and rear fencing",
      },
    ],
  },

  /* ─── EXTERIOR & RESTORATION ────────────────────────────────────────── */
  {
    slug: "full-house-restoration",
    title: "Full Home Rebuild",
    category: "Exterior & Restoration",
    location: "Lane County, OR",
    tag: "Signature Work",
    summary:
      "A storm-damaged home torn down and rebuilt from the ground up — new foundation, full framing, roof, siding, and a finished composite deck.",
    description:
      "This home suffered extensive damage before Eric's crew arrived. Rather than patch it, we tore down to the foundation and rebuilt the entire home from the ground up: new concrete stem-wall foundation, full framing package, roof sheathing and architectural shingles, siding and trim, and a finished composite deck. The owners returned to a home that isn't repaired — it's brand new.",
    scope: [
      "Interior demo and site clearing",
      "Concrete stem-wall foundation and floor framing",
      "Full wall and roof-truss framing package",
      "Roof sheathing and architectural shingle roofing",
      "New siding, trim, and exterior finish",
      "Composite deck build-out",
      "Driveway and site cleanup",
    ],
    featured: true,
    hero: "house-restoration-02.jpg",
    beforeAfter: {
      before: "house-restoration-01.jpg",
      after: "house-restoration-02.jpg",
      caption: "Drag to reveal the transformation",
    },
    photos: [
      { file: "house-restoration-01.jpg", role: "before" },
      {
        file: "house-restoration-03.jpg",
        role: "progress",
        caption: "New stem-wall foundation, floor framing underway",
      },
      {
        file: "house-restoration-04.jpg",
        role: "before",
        caption: "Interior demo",
      },
      {
        file: "house-restoration-05.jpg",
        role: "progress",
        caption: "Floor joists on new stem-wall foundation",
      },
      {
        file: "house-restoration-06.jpg",
        role: "progress",
        caption: "Interior wall framing with in-floor radiant tubing",
      },
      {
        file: "house-restoration-07.jpg",
        role: "progress",
        caption: "Full wall and roof truss framing",
      },
      {
        file: "house-restoration-08.jpg",
        role: "progress",
        caption: "Framing package complete",
      },
      {
        file: "house-restoration-09.jpg",
        role: "progress",
        caption: "Wall and roof framing underway",
      },
      {
        file: "house-restoration-10.jpg",
        role: "progress",
        caption: "Roof sheathing installed",
      },
      {
        file: "house-restoration-11.jpg",
        role: "progress",
        caption: "Sheathed and roofed, ready for siding",
      },
      {
        file: "house-restoration-12.jpg",
        role: "progress",
        caption: "Wall sheathing with roof underlayment",
      },
      {
        file: "house-restoration-13.jpg",
        role: "progress",
        caption: "Sheathing complete, shingles staged for install",
      },
      {
        file: "house-restoration-14.jpg",
        role: "progress",
        caption: "Siding and window trim going in",
      },
      {
        file: "house-restoration-15.jpg",
        role: "progress",
        caption: "Siding complete, entry steps being finished",
      },
      {
        file: "house-restoration-16.jpg",
        role: "after",
        caption: "Finished home",
      },
      {
        file: "house-restoration-17.jpg",
        role: "after",
        caption: "Composite deck build-out",
      },
      {
        file: "house-restoration-18.jpg",
        role: "progress",
        caption: "Architectural shingle roof going on",
      },
      {
        file: "house-restoration-19.jpg",
        role: "after",
        caption: "Finished shingle roof",
      },
      {
        file: "house-restoration-20.jpg",
        role: "after",
        caption: "Ridge cap detail",
      },
      { file: "house-restoration-02.jpg", role: "after" },
    ],
  },

  /* ─── DECKS & OUTDOOR ──────────────────────────────────────────────── */
  {
    slug: "composite-hot-tub-deck",
    title: "Composite Hot Tub Deck",
    category: "Decks & Outdoor",
    location: "Eugene, OR",
    summary:
      "A custom composite deck wrapping a hot tub — framed with treated lumber, finished in low-maintenance decking.",
    description:
      "Built from bare earth: pressure-treated ledger and joists sized for the hot tub load, mitered composite decking with cascading step-downs to grade. Finished in a single visit with zero callbacks.",
    scope: [
      "Treated-lumber framing around hot tub footprint",
      "Composite decking with concealed fasteners",
      "Cascading step-down finish",
      "Custom skirting matched to home siding",
    ],
    featured: true,
    hero: "hottub-deck-02.jpg",
    beforeAfter: {
      before: "hottub-deck-01.jpg",
      after: "hottub-deck-02.jpg",
      caption: "Framing to finish",
    },
    photos: [
      { file: "hottub-deck-01.jpg", role: "before", caption: "Framing stage" },
      { file: "hottub-deck-02.jpg", role: "after", caption: "Finished deck" },
      { file: "hottub-deck-03.jpg", role: "after" },
    ],
  },

  /* ─── FENCING & STRUCTURES ─────────────────────────────────────────── */
  {
    slug: "side-yard-shed-build",
    title: "Matched-Siding Side-Yard Shed",
    category: "Fencing & Structures",
    location: "Eugene, OR",
    summary:
      "Replaced a cheap plastic shed with a custom lean-to that reads as a seamless extension of the home.",
    description:
      "The homeowners wanted more than storage — they wanted the side yard to look intentional. Eric's crew built a lean-to shed with siding, trim, and rooflines matching the existing home. From the street, it looks like it was always there.",
    scope: [
      "Site prep and concrete pier foundation",
      "Stick-built framing tied to existing roofline",
      "Hardie-style siding matched to home",
      "Custom double-door entry",
      "Matched trim and paint finish",
    ],
    featured: true,
    hero: "side-yard-shed-03.jpg",
    photos: [
      { file: "side-yard-shed-01.jpg", role: "after" },
      { file: "side-yard-shed-03.jpg", role: "after" },
      { file: "side-yard-shed-04.jpg", role: "after" },
      { file: "side-yard-shed-05.jpg", role: "after" },
      { file: "side-yard-shed-06.jpg", role: "after" },
      { file: "side-yard-shed-07.jpg", role: "after" },
      { file: "side-yard-shed-08.jpg", role: "after" },
    ],
  },
  {
    slug: "cedar-privacy-fence",
    title: "Forested Lot Privacy Fence",
    category: "Fencing & Structures",
    location: "Lane County, OR",
    summary:
      "A long-run cedar privacy fence threading a wooded property line — built to last, built to look right in the trees.",
    description:
      "Fence runs like this one live or die on the post set. Every post concrete-set, boards tight, cap board on top. The fence sits back into the trees and reads as part of the landscape.",
    scope: [
      "Layout and post setting in concrete",
      "Cedar picket assembly",
      "Continuous cap rail",
      "Gate fabrication (as applicable)",
    ],
    featured: false,
    hero: "cedar-fence-03.jpg",
    photos: [
      { file: "cedar-fence-03.jpg", role: "hero" },
      { file: "cedar-fence-04.jpg", role: "hero" },
    ],
  },
  {
    slug: "prefab-gable-shed",
    title: "Gable-Roof Storage Shed",
    category: "Fencing & Structures",
    location: "Lane County, OR",
    summary:
      "A clean gable-roof shed sited on a compacted gravel pad — simple, square, built to last in the Oregon rain.",
    description:
      "Not every job needs to be a custom build. This gable-roof shed was sited on a compacted gravel pad, set level, and finished with shingles matching the main home's roof.",
    scope: [
      "Site prep and gravel pad",
      "Shed delivery / placement",
      "Shingle finish and trim",
    ],
    featured: false,
    hero: "gable-shed-01.jpg",
    photos: [
      { file: "gable-shed-01.jpg", role: "hero" },
      { file: "gable-shed-02.jpg", role: "hero" },
    ],
  },

  /* ─── BATH & KITCHEN ───────────────────────────────────────────────── */
  {
    slug: "bath-remodel-schluter",
    title: "Bathroom Remodel",
    category: "Bath & Kitchen",
    location: "Eugene, OR",
    summary:
      "Full bath gut with a Hydro-Blok waterproofing system and custom large-format tile work.",
    description:
      "Down to the studs and back up. This remodel used the Hydro-Blok membrane system for bulletproof waterproofing and large-format tile with crisp, clean layout throughout.",
    scope: [
      "Hydro-Blok waterproofing system on tub surround",
      "Large-format tile installation",
      "New tub and fixture installation",
      "Wall color and finish coordination",
    ],
    featured: true,
    hero: "bath-remodel-09.jpg",
    photos: [
      {
        file: "bath-remodel-02.jpg",
        role: "progress",
        caption: "Hydro-Blok membrane and hex-tile shower pan going in",
      },
      { file: "bath-remodel-05.jpg", role: "progress" },
      { file: "bath-remodel-12.jpg", role: "progress" },
      { file: "bath-remodel-07.jpg", role: "after" },
      { file: "bath-remodel-08.jpg", role: "after" },
      { file: "bath-remodel-09.jpg", role: "after" },
      { file: "bath-remodel-11.jpg", role: "after" },
    ],
  },
  {
    slug: "signature-bath-kitchen",
    title: "Signature Kitchen & Bath Work",
    category: "Bath & Kitchen",
    location: "Various, Lane County",
    tag: "Signature Work",
    summary:
      "Selected finish work from completed kitchens and baths — tile, cabinetry, stone, and lighting in the same visual family.",
    description:
      "A gallery of representative finishes from completed interiors. These aren't one project — they're the consistent quality bar you get when Eric's crew runs your remodel.",
    scope: [
      "Custom cabinetry installation",
      "Stone and tile selection + install",
      "Plumbing and lighting coordination",
      "Finish carpentry and paint",
    ],
    featured: false,
    hero: "signature-bath-01.jpg",
    photos: [
      { file: "signature-bath-01.jpg", role: "hero" },
      { file: "signature-bath-02.jpg", role: "hero" },
      { file: "signature-kitchen-01.jpg", role: "hero" },
      { file: "signature-kitchen-02.jpg", role: "hero" },
      { file: "signature-interior-01.jpg", role: "hero" },
      { file: "signature-interior-02.jpg", role: "hero" },
      { file: "signature-interior-03.jpg", role: "hero" },
      {
        file: "signature-bath-03.jpg",
        role: "hero",
        caption: "Frameless glass shower with full-height marble tile",
      },
    ],
  },

  /* ─── INTERIOR REMODELS ────────────────────────────────────────────── */
  {
    slug: "lvp-flooring-install",
    title: "Whole-Home LVP Flooring",
    category: "Interior Remodels",
    location: "Lane County, OR",
    summary:
      "Tear-out and install of luxury vinyl plank throughout a multi-room interior — tight layout, no field splits.",
    description:
      "Full removal of tired existing flooring and installation of LVP across connected rooms and transitions. Careful attention to seam layout and baseboard refit for a finish that reads custom.",
    scope: [
      "Existing flooring demo and subfloor prep",
      "LVP installation across multiple rooms",
      "Transition and threshold detailing",
      "Base trim reinstall and touch-up",
    ],
    featured: false,
    hero: "lvp-flooring-04.jpg",
    photos: [
      { file: "lvp-flooring-01.jpg", role: "progress" },
      { file: "lvp-flooring-02.jpg", role: "progress" },
      { file: "lvp-flooring-03.jpg", role: "progress" },
      { file: "lvp-flooring-04.jpg", role: "after" },
      { file: "lvp-flooring-05.jpg", role: "after" },
      { file: "lvp-flooring-06.jpg", role: "after" },
      { file: "lvp-flooring-07.jpg", role: "after" },
      { file: "lvp-flooring-08.jpg", role: "after" },
    ],
  },
  {
    slug: "exterior-window-trim",
    title: "Exterior Window Trim Refresh",
    category: "Exterior & Restoration",
    location: "Eugene, OR",
    summary:
      "Removed rotted trim from an accent bay and rebuilt the casings — small visible fix, big envelope upgrade.",
    description:
      "What looks cosmetic is usually structural. The existing window trim had failed and was letting water behind the siding. Full removal, flashing repair, new PVC trim, and paint to match.",
    scope: [
      "Demo of failed trim and inspection of sheathing",
      "New flashing and weather-resistant barrier repair",
      "PVC trim installation",
      "Paint to match existing",
    ],
    featured: false,
    hero: "window-trim-01.jpg",
    photos: [{ file: "window-trim-01.jpg", role: "progress" }],
  },

  /* ─── CUSTOM HOMES ─────────────────────────────────────────────────── */
  {
    slug: "signature-custom-home",
    title: "Custom Home — Craftsman Ranch",
    category: "Custom Homes",
    location: "Eugene, OR",
    tag: "Signature Work",
    summary:
      "A single-story craftsman-ranch with deep charcoal siding, stone accents, and a wide covered entry.",
    description:
      "Full custom build: from pad to finish. Wide covered entry with cedar-tone columns, stone veneer accents, deep charcoal siding, and tidy landscaping at hand-off.",
    scope: [
      "Full new construction, ground-up",
      "Exterior: stone veneer, lap siding, cedar accents",
      "Interior finish carpentry",
      "Hand-off ready landscaping",
    ],
    featured: true,
    hero: "signature-home-01.jpg",
    photos: [
      { file: "signature-home-01.jpg", role: "hero" },
      { file: "signature-exterior-01.jpg", role: "hero" },
      { file: "signature-exterior-02.jpg", role: "hero" },
      {
        file: "pergola-deck-01.jpg",
        role: "hero",
        caption: "Covered entry with stone veneer accents",
      },
      {
        file: "signature-exterior-03.jpg",
        role: "hero",
        caption: "Front exterior, finished",
      },
    ],
  },

  /* ─── NEW: Linear mosaic shower remodel ─────────────────────────────── */
  {
    slug: "mosaic-shower-remodel",
    title: "Linear Mosaic Shower Remodel",
    category: "Bath & Kitchen",
    location: "Lane County, OR",
    summary:
      "Dated tub-shower combo replaced with a floor-to-ceiling black, white, and grey linear mosaic surround.",
    description:
      "Out with the builder-grade tan fiberglass surround, in with a full mosaic tile package — diagonal-set linear mosaic as the feature wall, vertical wood-look tile flanking it, and a new floating vanity to match.",
    scope: [
      "Demo of existing tub/shower surround",
      "Diagonal linear mosaic tile feature wall",
      "Vertical wood-look tile side walls",
      "New tub, fixtures, and floating vanity",
    ],
    featured: false,
    hero: "bath-mosaic-03.jpg",
    beforeAfter: {
      before: "bath-mosaic-01.jpg",
      after: "bath-mosaic-03.jpg",
      caption: "Builder-grade to custom mosaic",
    },
    photos: [
      {
        file: "bath-mosaic-01.jpg",
        role: "before",
        caption: "Original tub/shower",
      },
      {
        file: "signature-bath-04.jpg",
        role: "progress",
        caption: "Mosaic tile install",
      },
      {
        file: "bath-mosaic-03.jpg",
        role: "after",
        caption: "Finished shower surround",
      },
      {
        file: "bath-mosaic-04.jpg",
        role: "after",
        caption: "Finished bath, wide view",
      },
      {
        file: "bath-mosaic-05.jpg",
        role: "after",
        caption: "Floating vanity detail",
      },
    ],
  },

  /* ─── NEW: Stacked-stone fireplace remodel ──────────────────────────── */
  {
    slug: "stacked-stone-fireplace",
    title: "Stacked-Stone Fireplace Remodel",
    category: "Interior Remodels",
    location: "Lane County, OR",
    summary:
      "An outdated tile fireplace surround reframed and rebuilt floor-to-ceiling in stacked stone with a linear gas insert.",
    description:
      "The old tile surround came out down to the framing. We rebuilt the chase, ran floor-to-ceiling stacked stone up the vaulted wall, and set a new linear gas insert — a full focal-point rebuild in a great room.",
    scope: [
      "Demo of existing tile surround",
      "Chase framing and reinforcement",
      "Floor-to-ceiling stacked stone veneer",
      "Linear gas fireplace insert installation",
    ],
    featured: false,
    hero: "fireplace-remodel-02.jpg",
    beforeAfter: {
      before: "fireplace-remodel-01.jpg",
      after: "fireplace-remodel-02.jpg",
      caption: "Framed chase to finished stone surround",
    },
    photos: [
      {
        file: "fireplace-remodel-01.jpg",
        role: "before",
        caption: "Chase reframed",
      },
      {
        file: "fireplace-remodel-02.jpg",
        role: "after",
        caption: "Finished stacked-stone surround",
      },
    ],
  },

  /* ─── NEW: Custom interior structure build ──────────────────────────── */
  {
    slug: "custom-structure-build",
    title: "Custom Interior Structure Build",
    category: "Fencing & Structures",
    location: "Lane County, OR",
    summary:
      "A steel-stud framed, polycarbonate-paneled enclosure built out inside a commercial space.",
    description:
      "Not every job is a house. This one was a fully custom steel-stud frame with translucent polycarbonate panel walls, built out inside an existing commercial space start to finish.",
    scope: [
      "Steel stud frame layout and assembly",
      "Polycarbonate panel wall installation",
      "Interior finish and hardware",
    ],
    featured: false,
    hero: "custom-structure-02.jpg",
    photos: [
      {
        file: "custom-structure-01.jpg",
        role: "progress",
        caption: "Frame and panel install",
      },
      {
        file: "custom-structure-02.jpg",
        role: "after",
        caption: "Finished enclosure",
      },
    ],
  },

  /* ─── DECKS & OUTDOOR: covered patio pergola ────────────────────────── */
  {
    slug: "covered-patio-pergola",
    title: "Covered Patio Pergola",
    category: "Decks & Outdoor",
    location: "Lane County, OR",
    summary:
      "A cedar pergola with a clear polycarbonate roof panel, built onto an existing concrete patio.",
    description:
      "A cedar pergola framed and anchored to the home, then topped with a clear corrugated polycarbonate roof panel for weather cover without losing natural light.",
    scope: [
      "Cedar pergola framing, anchored to the home",
      "Clear corrugated polycarbonate roof panels",
      "Structural post footings on existing patio",
    ],
    featured: false,
    hero: "pergola-cover-02.jpg",
    photos: [
      {
        file: "pergola-cover-01.jpg",
        role: "progress",
        caption: "Cedar pergola framing",
      },
      {
        file: "pergola-cover-02.jpg",
        role: "after",
        caption: "Polycarbonate roof panels installed",
      },
      {
        file: "pergola-cover-03.jpg",
        role: "after",
        caption: "Roofline detail at the house eave",
      },
      { file: "pergola-cover-04.jpg", role: "after" },
    ],
  },

  /* ─── DECKS & OUTDOOR: composite deck build ──────────────────────────── */
  {
    slug: "composite-deck-build",
    title: "Composite Deck Build",
    category: "Decks & Outdoor",
    location: "Lane County, OR",
    summary:
      "A multi-level composite deck with built-in bench seating and a paver patio tie-in.",
    description:
      "A composite deck build with built-in bench seating around a grill area, stepping down to a paver patio at grade.",
    scope: [
      "Composite decking and framing",
      "Built-in bench seating",
      "Cable-rail sections",
      "Paver patio tie-in at grade",
    ],
    featured: false,
    hero: "composite-deck-build-01.jpg",
    photos: [
      { file: "composite-deck-build-01.jpg", role: "after" },
      { file: "composite-deck-build-02.jpg", role: "after" },
    ],
  },

  /* ─── EXTERIOR & RESTORATION: cedar shake siding ─────────────────────── */
  {
    slug: "cedar-shake-siding",
    title: "Cedar Shake Siding & Roofing Detail",
    category: "Exterior & Restoration",
    location: "Lane County, OR",
    summary:
      "Horizontal cedar shake siding on a dormer accent, tied into a new architectural shingle roof.",
    description:
      "Horizontal cedar shake siding installed on a dormer accent wall, with clean roof-to-wall flashing tied into new architectural shingles.",
    scope: [
      "Horizontal cedar shake siding installation",
      "Roof-to-wall flashing detail",
      "Architectural shingle roofing",
    ],
    featured: false,
    hero: "cedar-shake-siding-01.jpg",
    photos: [
      { file: "cedar-shake-siding-01.jpg", role: "after" },
      { file: "cedar-shake-siding-02.jpg", role: "after" },
    ],
  },

  /* ─── EXTERIOR & RESTORATION: exterior painting ──────────────────────── */
  {
    slug: "exterior-house-painting",
    title: "Exterior House Painting",
    category: "Exterior & Restoration",
    location: "Lane County, OR",
    summary: "A full exterior repaint, windows masked and prepped for spray.",
    description:
      "A full exterior repaint from prep to finish — windows and fixtures masked off for spray application, siding coated top to bottom.",
    scope: [
      "Surface prep and masking",
      "Spray-applied exterior paint",
      "Trim and fixture protection",
    ],
    featured: false,
    hero: "exterior-painting-01.jpg",
    photos: [
      { file: "exterior-painting-01.jpg", role: "after" },
      {
        file: "exterior-painting-02.jpg",
        role: "progress",
        caption: "Windows masked and prepped for spray",
      },
    ],
  },

  /* ─── INTERIOR REMODELS: interior trim & finish ──────────────────────── */
  {
    slug: "interior-trim-finish",
    title: "Interior Trim & Finish Work",
    category: "Interior Remodels",
    location: "Eugene, OR",
    summary:
      "Interior trim, casing, and finish work across a dining nook, living room, and bedroom.",
    description:
      "Interior finish carpentry — window casings, crown molding, and trim work carried consistently through the dining nook, living room, and bedroom.",
    scope: [
      "Window and door casing",
      "Crown molding",
      "Interior trim and finish carpentry",
    ],
    featured: false,
    hero: "interior-finish-02.jpg",
    photos: [
      { file: "interior-finish-01.jpg", role: "after", caption: "Dining nook" },
      { file: "interior-finish-02.jpg", role: "after", caption: "Living room" },
      { file: "interior-finish-03.jpg", role: "after", caption: "Bedroom" },
    ],
  },

  /* ─── DECKS & OUTDOOR: mosaic patio ───────────────────────────────────── */
  {
    slug: "mosaic-accent-patio",
    title: "Deck & Mosaic Accent Wall",
    category: "Decks & Outdoor",
    location: "Lane County, OR",
    summary: "A wood deck with a custom mosaic tile accent wall and pergola.",
    description:
      "A wood deck build with a custom mosaic tile accent wall and a covered entry pergola.",
    scope: [
      "Wood deck construction",
      "Custom mosaic accent wall",
      "Entry pergola",
    ],
    featured: false,
    hero: "mosaic-patio-01.jpg",
    photos: [{ file: "mosaic-patio-01.jpg", role: "after" }],
  },
];

export const CATEGORIES: ProjectCategory[] = [
  "Signature Outdoor Living",
  "Custom Homes",
  "Exterior & Restoration",
  "Bath & Kitchen",
  "Decks & Outdoor",
  "Interior Remodels",
  "Fencing & Structures",
];

/** Helper: resolve a photo filename or absolute URL */
export const photoUrl = (file: string) =>
  /^https?:\/\//i.test(file) ? file : `/portfolio/${file}`;

/** Find a project by slug */
export const getProject = (slug: string) => PROJECTS.find(p => p.slug === slug);

/** Featured projects for homepage rail */
export const featuredProjects = () => PROJECTS.filter(p => p.featured);

/** Projects filtered by category */
export const projectsByCategory = (cat: ProjectCategory | "All") =>
  cat === "All" ? PROJECTS : PROJECTS.filter(p => p.category === cat);
