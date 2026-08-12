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
  | "The Tadlock Residence"
  | "Decks & Outdoor"
  | "Bath & Kitchen"
  | "Interior Remodels"
  | "Fencing & Structures"
  | "Exterior & Restoration"
  | "Custom Homes"
  | "Roofing";

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
  tag?: "Our Home" | "Signature Work";
  /** Year completed, e.g. "2023". Surfaced in the detail-page facts bar when set. */
  year?: string;
  /** Human-readable build duration, e.g. "6 weeks". Surfaced when set. */
  duration?: string;
  /** Approximate size, e.g. "1,200 sq ft" or "320 lin ft". Surfaced when set. */
  size?: string;
}

export const PROJECTS: Project[] = [
  /* ─── FLAGSHIP: Eric & Mitch's own home ─────────────────────────────── */
  {
    slug: "tadlock-residence",
    title: "The Tadlock Residence",
    category: "The Tadlock Residence",
    location: "Eugene, OR",
    tag: "Our Home",
    summary:
      "Eric and Mitch built this home's outdoor envelope themselves — pergola, decking, privacy fence, and front yard. Every board. Every fastener.",
    description:
      "When you hire the Tadlock brothers, you hire two carpenters who live in a home they built themselves. This is that home. Over a single year, Eric and Mitch designed and installed the covered pergola, composite deck, horizontal cedar privacy fence, and the hog-wire front yard fence that ties the whole property together. No subs. No shortcuts. Exactly the standard they bring to every client home.",
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
    title: "Full Home Restoration",
    category: "Exterior & Restoration",
    location: "Lane County, OR",
    tag: "Signature Work",
    summary:
      "A storm-damaged home brought back better than new — full roof, siding, and exterior envelope replacement.",
    description:
      "This home suffered extensive damage before Eric's crew arrived. We tore down and rebuilt the exterior envelope from the roof to the foundation trim: new architectural shingles, siding, windows, entry, driveway, and landscaping. The owners returned to a home that is not only rebuilt, but substantially upgraded.",
    scope: [
      "Full roof tear-off and replacement",
      "New siding and exterior trim",
      "Window and door replacements",
      "Driveway and walkway rebuild",
      "Landscaping and site restoration",
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
      "Full bath gut with a Hydro-Blok waterproofing system, custom tile work, and matching bedroom trim refresh.",
    description:
      "Down to the studs and back up. This remodel used the Hydro-Blok membrane system for bulletproof waterproofing, large-format tile with crisp layout, and carried the finish work into the adjacent bedroom with new window casings and trim.",
    scope: [
      "Hydro-Blok waterproofing system on tub surround",
      "Large-format tile installation",
      "New tub and fixture installation",
      "Bedroom window casing and trim refresh",
      "Wall color and finish coordination",
    ],
    featured: true,
    hero: "bath-remodel-06.jpg",
    photos: [
      {
        file: "bath-remodel-01.jpg",
        role: "after",
        caption: "Bedroom window casing and trim refresh",
      },
      {
        file: "bath-remodel-02.jpg",
        role: "progress",
        caption: "Hydro-Blok membrane and hex-tile shower pan going in",
      },
      { file: "bath-remodel-03.jpg", role: "progress" },
      { file: "bath-remodel-04.jpg", role: "progress" },
      { file: "bath-remodel-05.jpg", role: "progress" },
      { file: "bath-remodel-06.jpg", role: "after" },
      { file: "bath-remodel-07.jpg", role: "after" },
      { file: "bath-remodel-08.jpg", role: "after" },
      { file: "bath-remodel-09.jpg", role: "after" },
      { file: "bath-remodel-10.jpg", role: "after" },
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
      {
        file: "signature-bath-04.jpg",
        role: "progress",
        caption: "Linear mosaic shower tile install",
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
      { file: "signature-custom-home-04.jpg", role: "hero" },
      {
        file: "pergola-deck-01.jpg",
        role: "hero",
        caption: "Covered entry with stone veneer accents",
      },
    ],
  },

  /* ─── CUSTOM HOMES: ground-up rebuild ───────────────────────────────── */
  {
    slug: "custom-home-ground-up-build",
    title: "Ground-Up Custom Home Build",
    category: "Custom Homes",
    location: "Lane County, OR",
    tag: "Signature Work",
    summary:
      "Full teardown and rebuild — from demo, to foundation, to a finished single-story home with a composite deck.",
    description:
      "A complete ground-up build: interior demo and site clearing, poured concrete stem-wall foundation, floor joists, full wall and roof-truss framing, sheathing, shingle roof, siding, trim, and a finished composite deck. Every stage handled in-house from teardown to move-in ready.",
    scope: [
      "Interior demo and site clearing",
      "Concrete stem-wall foundation",
      "Floor joist and full framing package",
      "Roof sheathing and architectural shingles",
      "Exterior siding and trim",
      "Composite deck build-out",
    ],
    featured: true,
    hero: "demo-rebuild-13.jpg",
    photos: [
      { file: "demo-rebuild-01.jpg", role: "before", caption: "Interior demo" },
      {
        file: "demo-rebuild-02.jpg",
        role: "progress",
        caption: "Floor joists on new stem-wall foundation",
      },
      {
        file: "demo-rebuild-03.jpg",
        role: "progress",
        caption: "Interior wall framing with in-floor radiant tubing",
      },
      {
        file: "demo-rebuild-04.jpg",
        role: "progress",
        caption: "Full wall and roof truss framing",
      },
      {
        file: "demo-rebuild-05.jpg",
        role: "progress",
        caption: "Framing package complete",
      },
      {
        file: "demo-rebuild-06.jpg",
        role: "progress",
        caption: "Wall and roof framing underway",
      },
      {
        file: "demo-rebuild-07.jpg",
        role: "progress",
        caption: "Roof sheathing installed",
      },
      {
        file: "demo-rebuild-08.jpg",
        role: "progress",
        caption: "Sheathed and roofed, ready for siding",
      },
      {
        file: "demo-rebuild-09.jpg",
        role: "progress",
        caption: "Wall sheathing with roof underlayment",
      },
      {
        file: "demo-rebuild-10.jpg",
        role: "progress",
        caption: "Sheathing complete, shingles staged for install",
      },
      {
        file: "demo-rebuild-11.jpg",
        role: "progress",
        caption: "Siding and window trim going in",
      },
      {
        file: "demo-rebuild-12.jpg",
        role: "progress",
        caption: "Siding complete, entry steps being finished",
      },
      {
        file: "demo-rebuild-13.jpg",
        role: "after",
        caption: "Finished home",
      },
      {
        file: "demo-rebuild-14.jpg",
        role: "after",
        caption: "Composite deck build-out",
      },
    ],
  },

  /* ─── ROOFING ─────────────────────────────────────────────────────── */
  {
    slug: "architectural-shingle-roof-replacement",
    title: "Architectural Shingle Roof Replacement",
    category: "Roofing",
    location: "Lane County, OR",
    summary:
      "A full architectural shingle roof replacement — clean tie-ins, straight lines, finished ridge cap.",
    description:
      "Full shingle roof replacement from bare sheathing to finished ridge cap, with clean valley and edge lines throughout.",
    scope: [
      "Tear-off and sheathing inspection",
      "Underlayment and architectural shingle installation",
      "Ridge cap and edge detailing",
    ],
    featured: false,
    hero: "roof-replacement-02.jpg",
    photos: [
      {
        file: "roof-replacement-01.jpg",
        role: "progress",
        caption: "Shingles going on",
      },
      {
        file: "roof-replacement-02.jpg",
        role: "after",
        caption: "Finished shingle roof",
      },
      {
        file: "roof-replacement-03.jpg",
        role: "after",
        caption: "Ridge cap detail",
      },
    ],
  },
];

export const CATEGORIES: ProjectCategory[] = [
  "The Tadlock Residence",
  "Custom Homes",
  "Exterior & Restoration",
  "Bath & Kitchen",
  "Decks & Outdoor",
  "Interior Remodels",
  "Fencing & Structures",
  "Roofing",
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
