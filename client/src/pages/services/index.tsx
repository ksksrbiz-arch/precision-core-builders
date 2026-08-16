/**
 * All 8 service pages — each exports a default component.
 * Local SEO copy written for Eugene, OR and surrounding Lane County.
 */
import { ASSETS } from "@/const";
import { ServicePage } from "./_template";

const SERVICE_AREAS = [
  "Eugene, OR",
  "Springfield, OR",
  "Coburg, OR",
  "Creswell, OR",
  "Cottage Grove, OR",
  "Junction City, OR",
  "Florence, OR",
  "Lane County, OR",
];

/**
 * Prepends a prominent "Typical budget" range to a service intro. The
 * template renders `intro` as a highlighted callout at the top of each page,
 * so this surfaces budget guidance up front. Ranges are derived from the cost
 * figures already cited in each service's FAQ/body copy where available, and
 * otherwise set to sensible Eugene-market ranges.
 */
function withBudget(range: string, intro: string): string {
  return `Typical budget: ${range}. ${intro}`;
}

// ─── 1. Residential ──────────────────────────────────────────────────────────
export function Residential() {
  return (
    <ServicePage
      title="Residential Construction"
      subtitle="Eugene, OR Residential Contractor"
      headline={
        <>
          Eugene's Residential
          <br />
          <em className="text-primary italic">Construction Specialists.</em>
        </>
      }
      heroImage={ASSETS.services.residential}
      heroImageAlt="Residential construction Eugene Oregon — Precision Core Builders"
      projectCategories={[
        "Custom Homes",
        "Signature Outdoor Living",
        "Interior Remodels",
      ]}
      metaTitle="Residential Contractor Eugene OR | CCB #246527"
      metaDescription="Licensed residential contractor in Eugene, Oregon (CCB #246527). Custom homes, renovations & additions by Eric Tadlock, 20+ years in the trade. Free estimates."
      intro={withBudget(
        "$50,000 – $500,000+",
        "With over 20 years of hands-on residential construction experience in Eugene, our lead carpenters have built the expertise to handle every dimension of home construction — from the foundation pour to the final coat of paint."
      )}
      body={[
        "Residential construction in Eugene, Oregon requires a contractor who understands both the craft and the local landscape. Oregon's climate demands precise material selection, weatherproofing standards, and building techniques that stand up to wet winters and dry summers. Eric and Mitch Tadlock have spent two decades mastering exactly that.",
        "Every residential project starts with a free on-site consultation. We review your plans, walk the property, and give you a real, itemized estimate — not a ballpark. We coordinate permits through Lane County and the City of Eugene, manage subcontractors, and keep you informed throughout every phase.",
        "We handle residential projects of all sizes — from single-room builds to complete ground-up construction. Our work is built to Oregon Building Code and beyond, with documentation at every stage.",
      ]}
      includes={[
        "Free on-site consultation and detailed estimate",
        "Oregon building permit coordination",
        "Foundation, framing, and structural work",
        "Roofing, siding, and exterior finish",
        "Interior finish work and trim carpentry",
        "Subcontractor scheduling and management",
        "Final inspection walkthrough",
        "Post-project documentation",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How long does a residential project take in Eugene?",
          a: "Timelines vary by scope. A full new home build typically runs 8–14 months. Major additions take 3–6 months. We provide a detailed schedule at the estimate stage and update you weekly throughout construction.",
        },
        {
          q: "Do you handle building permits in Eugene and Lane County?",
          a: "Yes. We manage the entire permitting process with the City of Eugene Building & Permit Services and Lane County. Permit costs are included in your estimate.",
        },
        {
          q: "Are you licensed and insured in Oregon?",
          a: `Absolutely. Precision Core Builders holds Oregon CCB license #246527 and carries full general liability and workers' compensation insurance. Copies available on request.`,
        },
        {
          q: "What is your service area?",
          a: "We serve Eugene, Springfield, Coburg, Creswell, Cottage Grove, Junction City, Florence, and surrounding Lane County communities.",
        },
      ]}
      relatedServices={[
        { label: "Remodels & Renovations", href: "/services/remodels" },
        { label: "New Construction", href: "/services/new-construction" },
        { label: "Custom Cabinets", href: "/services/cabinets" },
      ]}
    />
  );
}

// ─── 2. Remodels & Renovations ───────────────────────────────────────────────
export function Remodels() {
  return (
    <ServicePage
      title="Remodels & Renovations"
      subtitle="Eugene, OR Remodel Contractor"
      headline={
        <>
          Eugene Remodels Done
          <br />
          <em className="text-primary italic">The Right Way.</em>
        </>
      }
      heroImage={ASSETS.services.remodels}
      heroImageAlt="Kitchen and bathroom remodel Eugene Oregon"
      projectCategories={["Interior Remodels", "Bath & Kitchen"]}
      metaTitle="Home Remodeling Contractor Eugene OR | CCB #246527"
      metaDescription="Expert home remodeling in Eugene, Oregon — kitchens, baths, and whole-home renovations. Licensed CCB #246527, 20+ years of experience. Free estimates."
      intro={withBudget(
        "$25,000 – $150,000+",
        "We transform outdated Eugene homes into modern, functional spaces that match how you actually live. Kitchens, bathrooms, living spaces, basements — we tackle remodels and renovations of every scale with the same level of craftsmanship."
      )}
      body={[
        "A remodel is more than cosmetic. Behind every great kitchen renovation or bathroom update is proper structural work, updated plumbing and electrical coordination, and finish carpentry that holds up for decades. We bring all of that together under one roof.",
        "Eugene homeowners trust us because we're straight with them from day one. You get a detailed scope of work before a single tool comes out. Change orders are documented. Timelines are real. And we clean up every day before we leave.",
        "Whether you're updating a single bathroom or completely reimagining your home's layout, we work closely with you to understand your vision — then execute it with precision.",
      ]}
      includes={[
        "Kitchen remodels (full gut to cabinet upgrades)",
        "Bathroom remodels and additions",
        "Whole-home renovations",
        "Structural modifications and wall removal",
        "Plumbing and electrical coordination",
        "Custom built-ins and cabinetry",
        "Flooring installation and refinishing",
        "Tile, countertop, and fixture installation",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How much does a kitchen remodel cost in Eugene?",
          a: "Kitchen remodels in Eugene typically range from $25,000 to $80,000+ depending on scope, materials, and layout changes. We provide itemized estimates so you know exactly where every dollar goes.",
        },
        {
          q: "Do we need to move out during a remodel?",
          a: "For most kitchen and bathroom remodels, no. We sequence the work to minimize disruption and maintain access to essential areas. For full-home renovations, temporary relocation may be needed for a portion of the project.",
        },
        {
          q: "How long does a bathroom remodel take?",
          a: "A standard bathroom remodel takes 2–4 weeks from demo to completion. Larger master bath remodels can run 4–6 weeks. We give you a week-by-week schedule before we start.",
        },
        {
          q: "Do you handle permits for remodels?",
          a: "Yes. Structural changes, electrical work, plumbing modifications, and additions require permits in Eugene. We handle all of it through the City of Eugene Building Division.",
        },
      ]}
      relatedServices={[
        { label: "Residential", href: "/services/residential" },
        { label: "Custom Cabinets", href: "/services/cabinets" },
        { label: "Painting", href: "/services/painting" },
      ]}
    />
  );
}

// ─── 3. New Construction ─────────────────────────────────────────────────────
export function NewConstruction() {
  return (
    <ServicePage
      title="New Construction"
      subtitle="Eugene, OR Custom Home Builder"
      headline={
        <>
          Custom Homes Built
          <br />
          <em className="text-primary italic">To Stand the Test of Time.</em>
        </>
      }
      heroImage={ASSETS.services.newConstruction}
      heroImageAlt="New home construction Eugene Oregon"
      projectCategories={["Custom Homes", "Signature Outdoor Living"]}
      metaTitle="Custom Home Builder Eugene OR | New Construction"
      metaDescription="Custom home builder in Eugene, Oregon. Ground-up construction from permits to final walkthrough. Licensed CCB #246527, 20+ years of experience. Free estimates."
      intro={withBudget(
        "$350,000 – $1,500,000+",
        "Building a new home in Eugene is one of the most significant investments you'll make. We manage every phase — site prep, permits, foundation, framing, systems, and finish — so you get the home you envisioned, built correctly from the ground up."
      )}
      body={[
        "New construction requires a contractor who can see the whole picture while executing every detail. Eric and Mitch Tadlock have been doing exactly that across Lane County for two decades — coordinating subcontractors, managing material timelines, and holding the line on quality at every stage.",
        "We work with your architect and designer, or help connect you with local Eugene professionals. Once plans are finalized, we handle everything: Lane County permits, utility coordination, subcontractor scheduling, framing, systems rough-in, insulation, drywall, finish carpentry, and final inspections.",
        "You stay informed throughout. Weekly updates, documented milestones, and direct access to Eric mean you're never wondering what's happening on your job site.",
      ]}
      includes={[
        "Site preparation and foundation work",
        "Complete framing — floors, walls, roof",
        "All permit coordination with Lane County and City of Eugene",
        "Plumbing, electrical, and HVAC rough-in coordination",
        "Insulation and weatherproofing",
        "Drywall, interior finish, and trim",
        "Exterior siding, roofing, and windows",
        "Final inspection and punch list completion",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How long does it take to build a custom home in Eugene?",
          a: "From permit approval to move-in, a custom home in Eugene typically takes 10–16 months depending on size and complexity. We provide a detailed phase schedule at the start of your project.",
        },
        {
          q: "Do I need an architect before contacting you?",
          a: "Not necessarily. We can work with plans you already have, or connect you with trusted local architects and designers in Eugene. We'll review any existing plans and advise before you commit to design costs.",
        },
        {
          q: "What areas around Eugene do you build new homes in?",
          a: "We build new homes throughout Eugene, Springfield, Coburg, Creswell, Cottage Grove, Junction City, and surrounding Lane County communities.",
        },
        {
          q: "How do you handle cost overruns?",
          a: "We build detailed, itemized estimates and document every change order in writing before proceeding. Surprises are rare — and when scope changes arise, we discuss costs with you before the work happens.",
        },
      ]}
      relatedServices={[
        { label: "Residential", href: "/services/residential" },
        { label: "Outdoor Spaces", href: "/services/outdoor" },
        { label: "Custom Cabinets", href: "/services/cabinets" },
      ]}
    />
  );
}

// ─── 4. Restoration ──────────────────────────────────────────────────────────
export function Restoration() {
  return (
    <ServicePage
      title="Restoration"
      subtitle="Eugene, OR Restoration Contractor"
      headline={
        <>
          Restoring Eugene Homes
          <br />
          <em className="text-primary italic">Back to Their Best.</em>
        </>
      }
      heroImage={ASSETS.services.restoration}
      heroImageAlt="Home restoration project Eugene Oregon — before and after"
      projectCategories={["Exterior & Restoration"]}
      metaTitle="Home Restoration Contractor Eugene OR | CCB #246527"
      metaDescription="Professional home restoration in Eugene, Oregon — water and fire damage, structural repairs, historic preservation. Licensed CCB #246527. Free estimates."
      intro={withBudget(
        "$15,000 – $200,000+",
        "Restoration work demands a contractor with deep structural knowledge and a respect for what makes a home worth preserving. We bring both — restoring Eugene homes from damage, deterioration, or decades of deferred maintenance back to their full potential."
      )}
      body={[
        "Whether it's water damage from Oregon's wet winters, fire damage, dry rot, pest damage, or simply years of wear that have caught up with a structure, we approach every restoration project with the same thoroughness we bring to new construction.",
        "We assess the full extent of damage before quoting — no surprises mid-project. Structural repairs come first, then weatherproofing, then finish work. Every phase is documented for insurance purposes when applicable.",
        "For historic homes in Eugene's older neighborhoods, we take special care to match original materials, profiles, and finishes wherever possible, preserving what makes these homes architecturally significant.",
      ]}
      includes={[
        "Structural damage assessment and repair",
        "Water and moisture damage remediation",
        "Fire and smoke damage reconstruction",
        "Dry rot and pest damage repair",
        "Foundation and crawl space restoration",
        "Historic material matching and preservation",
        "Insurance documentation support",
        "Full finish restoration to pre-damage condition",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "Do you work with insurance companies on restoration claims?",
          a: "Yes. We provide detailed documentation — scope of work, photos, and itemized costs — that meets insurance adjuster requirements. We've worked with most major carriers in the Eugene area.",
        },
        {
          q: "How do you assess the full extent of damage before quoting?",
          a: "We do a thorough on-site inspection before any estimate, including checking inside walls if necessary. We'd rather find everything upfront than discover it mid-project.",
        },
        {
          q: "Can you match the original materials on a historic Eugene home?",
          a: "In most cases, yes. We source period-appropriate lumber, millwork profiles, siding patterns, and finishes. Eugene has several excellent salvage and specialty suppliers we work with regularly.",
        },
      ]}
      relatedServices={[
        { label: "Residential", href: "/services/residential" },
        { label: "Roofing", href: "/services/roofing" },
        { label: "Painting", href: "/services/painting" },
      ]}
    />
  );
}

// ─── 5. Outdoor Spaces ───────────────────────────────────────────────────────
export function Outdoor() {
  return (
    <ServicePage
      title="Outdoor Spaces"
      subtitle="Eugene, OR Deck & Outdoor Builder"
      headline={
        <>
          Outdoor Living Spaces
          <br />
          <em className="text-primary italic">Built for Oregon.</em>
        </>
      }
      heroImage={ASSETS.services.outdoor}
      heroImageAlt="Custom deck and outdoor living space Eugene Oregon"
      projectCategories={["Decks & Outdoor", "Fencing & Structures"]}
      metaTitle="Deck Builder & Outdoor Contractor Eugene OR"
      metaDescription="Custom decks, patios, pergolas, and outdoor living spaces in Eugene, Oregon. Designed and built for Oregon's climate. Licensed CCB #246527. Free estimates."
      intro={withBudget(
        "$10,000 – $100,000+",
        "Eugene's outdoor lifestyle deserves spaces built to match — and to last through Oregon's seasons. We design and build decks, patios, pergolas, fencing, and full outdoor living environments that hold up to the wet winters and shine in the dry summers."
      )}
      body={[
        "Outdoor construction in Oregon requires material choices and build techniques that go beyond what works in dryer climates. We use properly treated lumber, stainless fasteners, and drainage details that prevent the rot and moisture problems that take down cheaper builds within a few years.",
        "From a simple pressure-treated deck to a full covered outdoor kitchen with pergola, built-in seating, and privacy fencing — we handle the full spectrum of outdoor living projects throughout the Eugene area.",
        "Every outdoor project is permitted and built to Oregon Residential Specialty Code, ensuring it adds value to your property and passes inspection.",
      ]}
      includes={[
        "Custom wood, composite, and Trex decking",
        "Covered patios and pergolas",
        "Outdoor kitchens and built-in grill stations",
        "Fencing — cedar, composite, ornamental",
        "Steps, railings, and ADA-accessible ramps",
        "Retaining walls and landscape grading",
        "Concrete and paver patios",
        "Permit coordination with City of Eugene",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "What deck materials hold up best in Eugene's wet climate?",
          a: "Composite decking (Trex, TimberTech) offers the best longevity in Eugene's wet climate with minimal maintenance. For wood, we recommend kiln-dried Douglas Fir or cedar with proper sealing. We discuss tradeoffs at the estimate.",
        },
        {
          q: "Do outdoor decks require permits in Eugene?",
          a: "Yes — decks over 30 inches from grade or attached to the house require a building permit in Eugene. We handle all permitting through the City of Eugene Building Division.",
        },
        {
          q: "How long does a deck build take?",
          a: "A standard deck takes 1–2 weeks from permit approval. Larger covered outdoor structures with pergolas, kitchens, or multiple levels typically run 3–5 weeks.",
        },
      ]}
      relatedServices={[
        { label: "Residential", href: "/services/residential" },
        { label: "New Construction", href: "/services/new-construction" },
        { label: "Painting", href: "/services/painting" },
      ]}
    />
  );
}

// ─── 6. Painting ─────────────────────────────────────────────────────────────
export function Painting() {
  return (
    <ServicePage
      title="Painting"
      subtitle="Eugene, OR Painting Contractor"
      headline={
        <>
          Interior &amp; Exterior Painting
          <br />
          <em className="text-primary italic">Done Right.</em>
        </>
      }
      heroImage={ASSETS.services.painting}
      heroImageAlt="Professional interior and exterior painting Eugene Oregon"
      projectCategories={["Exterior & Restoration", "Interior Remodels"]}
      metaTitle="Painting Contractor Eugene OR | Interior & Exterior"
      metaDescription="Professional interior and exterior painting in Eugene, Oregon. Proper prep, quality materials, clean results that last. Licensed CCB #246527. Free estimates."
      intro={withBudget(
        "$3,000 – $30,000+",
        "Painting done right starts with preparation — not the brush. We take the time to properly prep every surface before a drop of paint goes on, which is why our finishes hold up to Eugene's climate for years without peeling, fading, or cracking."
      )}
      body={[
        "Most painting problems — bubbling, peeling, early fading — trace back to skipped prep work. We sand, prime, and address any moisture or adhesion issues before applying finish coats. The difference shows immediately and lasts for years.",
        "For exterior work in Eugene, we use premium exterior coatings rated for high-moisture environments. For interiors, we match paint sheen, product type, and application method to the room's function — low-VOC options available throughout.",
        "We work alongside our construction and remodel crews or as a standalone painting contractor. Either way, the standard is the same.",
      ]}
      includes={[
        "Interior walls, ceilings, and trim painting",
        "Exterior siding, trim, and door painting",
        "Cabinet painting and refinishing",
        "Deck and fence staining and sealing",
        "Full surface prep — sanding, patching, priming",
        "Pressure washing before exterior work",
        "Low-VOC and zero-VOC paint options",
        "Color consultation available",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How often should I repaint the exterior of my Eugene home?",
          a: "In Eugene's climate, most exteriors need repainting every 6–10 years depending on sun exposure, siding type, and the quality of the previous paint job. We assess your existing finish at the estimate.",
        },
        {
          q: "Do you offer cabinet painting as an alternative to replacement?",
          a: "Yes — cabinet painting and refinishing is one of the most cost-effective ways to update a kitchen. We prep properly, use a bonding primer, and apply a factory-smooth finish that holds up to daily use.",
        },
        {
          q: "Do I need to move furniture and belongings before you start?",
          a: "We move and protect furniture with drop cloths as part of our process. We ask that breakables and valuables be removed from work areas before we arrive.",
        },
      ]}
      relatedServices={[
        { label: "Remodels & Renovations", href: "/services/remodels" },
        { label: "Custom Cabinets", href: "/services/cabinets" },
        { label: "Restoration", href: "/services/restoration" },
      ]}
    />
  );
}

// ─── 7. Roofing ──────────────────────────────────────────────────────────────
export function Roofing() {
  return (
    <ServicePage
      title="Roofing"
      subtitle="Eugene, OR Roofing Contractor"
      headline={
        <>
          Eugene Roofing
          <br />
          <em className="text-primary italic">Built for Oregon Rain.</em>
        </>
      }
      heroImage={ASSETS.services.roofing}
      heroImageAlt="Roof replacement and roofing services Eugene Oregon"
      projectCategories={["Exterior & Restoration"]}
      metaTitle="Roofing Contractor Eugene OR | Replacement & Repair"
      metaDescription="Expert roofing in Eugene, Oregon — replacements, repairs, and inspections built for Oregon's climate. Licensed contractor CCB #246527. Free estimates."
      intro={withBudget(
        "$8,000 – $40,000+",
        "A roof in Eugene, Oregon has to perform. With 48+ inches of annual rainfall, your roof is your home's first and most critical line of defense. We install, repair, and replace roofs built to handle what Oregon throws at them."
      )}
      body={[
        "Roofing failures in Eugene are almost always the result of improper installation — failed flashings, inadequate underlayment, poor ventilation, or cheap materials that degrade quickly in wet conditions. We don't cut those corners.",
        "We work with architectural shingles, metal roofing, and standing seam systems — recommending the right material for your home's structure, pitch, and budget. Every installation includes proper ice and water shield at eaves and valleys, ridge ventilation, and fully sealed flashings at all penetrations.",
        "Roof inspections are available for home purchases, pre-remodel assessments, and annual maintenance reviews throughout Lane County.",
      ]}
      includes={[
        "Full roof replacement — shingle, metal, standing seam",
        "Leak repair and emergency patching",
        "Flashing repair and replacement",
        "Gutter installation and repair",
        "Roof deck inspection and repair",
        "Ventilation assessment and upgrade",
        "Pre-purchase roof inspections",
        "Storm damage assessment and repair",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How do I know if my Eugene home needs a new roof or just repairs?",
          a: "Shingles curling, granule loss in gutters, visible daylight in the attic, and leaks after heavy rain are all signs. We offer free roof assessments and will give you an honest answer about repair vs. replacement.",
        },
        {
          q: "What roofing materials work best in Eugene's wet climate?",
          a: "Architectural (dimensional) shingles with a 30-year rating are the most cost-effective for most Eugene homes. Metal roofing offers superior longevity (50+ years) in wet climates and is increasingly popular for its durability.",
        },
        {
          q: "How long does a full roof replacement take?",
          a: "Most full residential roof replacements in Eugene are completed in 1–3 days depending on size and complexity. We coordinate for minimal disruption and clean up completely each day.",
        },
      ]}
      relatedServices={[
        { label: "Restoration", href: "/services/restoration" },
        { label: "Residential", href: "/services/residential" },
        { label: "New Construction", href: "/services/new-construction" },
      ]}
    />
  );
}

// ─── 8. Custom Cabinets ───────────────────────────────────────────────────────
export function Cabinets() {
  return (
    <ServicePage
      title="Custom Cabinets"
      subtitle="Eugene, OR Cabinet Builder"
      headline={
        <>
          Custom Cabinets &amp; Millwork
          <br />
          <em className="text-primary italic">Built to Fit Your Home.</em>
        </>
      }
      heroImage={ASSETS.services.cabinets}
      heroImageAlt="Custom cabinetry and millwork Eugene Oregon"
      projectCategories={["Bath & Kitchen", "Interior Remodels"]}
      metaTitle="Custom Cabinet Builder Eugene OR | Built-Ins & Millwork"
      metaDescription="Custom cabinetry, built-ins, and finish millwork in Eugene, Oregon. Designed for your space and built by hand. Licensed CCB #246527. Free on-site estimates."
      intro={withBudget(
        "$12,000 – $60,000+",
        "Eric and Mitch Tadlock spent 20+ years as finish carpenters before founding Precision Core Builders. Custom cabinetry is in their DNA — built for your specific space, proportioned correctly, and crafted to outlast stock cabinet alternatives by decades."
      )}
      body={[
        "Stock cabinets are built to fit a showroom. Custom cabinets are built to fit your home. The difference matters in every kitchen, bathroom, and living space where the layout isn't perfectly standard — which is most Eugene homes, particularly in older neighborhoods.",
        "We build kitchen cabinets, bathroom vanities, laundry room built-ins, mudroom storage, bookcases, entertainment centers, and any millwork element your home needs. Every piece is measured on-site, built to those dimensions, and installed by the same carpenters who built it.",
        "Finish options include paint, stain, and lacquer — applied in our shop for a factory-quality result that field painting can't match.",
      ]}
      includes={[
        "Kitchen cabinetry — base, wall, and island",
        "Bathroom vanities and linen storage",
        "Built-in bookcases and entertainment centers",
        "Mudroom and laundry room built-ins",
        "Closet systems and bedroom built-ins",
        "Custom trim, crown molding, and wainscoting",
        "Paint, stain, or lacquer finish",
        "On-site measurement and installation",
      ]}
      serviceAreas={SERVICE_AREAS}
      faqs={[
        {
          q: "How do custom cabinets compare in cost to stock cabinets from big-box stores?",
          a: "Custom cabinets typically cost 30–60% more than stock options but last 2–3x longer, fit your exact space, and offer material and finish quality that stock cabinets don't approach. For most Eugene homeowners doing a serious kitchen update, custom is the better long-term investment.",
        },
        {
          q: "How long does a custom cabinet project take?",
          a: "From measurement to installation, most kitchen cabinet projects take 4–8 weeks. This includes shop time for building and finishing, and typically 2–4 days for installation depending on scope.",
        },
        {
          q: "Can you match existing cabinets for an addition or partial update?",
          a: "Yes. Profile matching, stain matching, and hardware sourcing for additions and partial updates is something we do regularly. We assess feasibility at the estimate stage.",
        },
      ]}
      relatedServices={[
        { label: "Remodels & Renovations", href: "/services/remodels" },
        { label: "Residential", href: "/services/residential" },
        { label: "Painting", href: "/services/painting" },
      ]}
    />
  );
}
