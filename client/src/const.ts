export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const SITE = {
  name: "Precision Core Builders",
  tagline: "Precision Construction, Core Values.",
  phone: "541-852-5144",
  phoneHref: "tel:+15418525144",
  email: "erictadlock@precisioncorebuilders.com",
  emailHref: "mailto:erictadlock@precisioncorebuilders.com",
  website: "https://precision-core.netlify.app",
  license: "CCB #246527",
  owner: "Eric Tadlock",
  location: "Eugene, Oregon",
  facebook:
    "https://www.facebook.com/p/Precision-Core-Builders-61554995032484/",
} as const;

/** All real assets hosted on the existing Webflow CDN */
export const ASSETS = {
  // Logo + hero video remain on Webflow CDN (no local equivalents yet)
  logo: "/logo.svg",
  heroVideo:
    "https://cdn.prod.website-files.com/65300180be390eef2e927062/65308f58afaa8e053210676a_Construction-Consultation%20-%2002-transcode.mp4",

  // Team headshots — served from /public/team/
  team: {
    eric: "/team/eric.jpg",
    mitch: "/team/mitch.jpg",
  },

  // Service category hero images — served from /public/portfolio/
  services: {
    residential: "/portfolio/category-residential.jpg",
    restoration: "/portfolio/house-restoration-02.jpg",
    outdoor: "/portfolio/signature-outdoor-01.jpg",
    remodels: "/portfolio/category-remodels.jpg",
    newConstruction: "/portfolio/category-new-construction.jpg",
    painting: "/portfolio/category-painting.jpg",
    roofing: "/portfolio/category-roofing.jpg",
    cabinets: "/portfolio/category-cabinets.jpg",
  },

  // Legacy portfolio array — kept for back-compat with any untouched imports.
  // New code should import PROJECTS from "@/data/projects" instead.
  portfolio: [
    "/portfolio/signature-home-01.jpg",
    "/portfolio/house-restoration-02.jpg",
    "/portfolio/side-yard-shed-03.jpg",
    "/portfolio/hottub-deck-02.jpg",
    "/portfolio/bath-remodel-06.jpg",
    "/portfolio/signature-deck-01.jpg",
    "/portfolio/signature-outdoor-01.jpg",
    "/portfolio/signature-bath-01.jpg",
    "/portfolio/signature-kitchen-01.jpg",
    "/portfolio/cedar-fence-03.jpg",
    "/portfolio/pergola-deck-03.jpg",
    "/portfolio/signature-interior-01.jpg",
  ],
} as const;
