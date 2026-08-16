/**
 * All 6 service-area (location) pages — each exports a default component.
 * Local specifics (permitting jurisdiction, terrain, HOA/setback quirks) are
 * researched per city, not generic filler — see commit message / PR notes
 * for sources. Written for Eugene-based Precision Core Builders serving
 * greater Lane County.
 */
import { ASSETS } from "@/const";
import { LocationPage } from "./_template";

// ─── 1. Springfield ──────────────────────────────────────────────────────────
export function Springfield() {
  return (
    <LocationPage
      city="Springfield"
      cityState="Springfield, OR"
      heroImage={ASSETS.services.residential}
      heroImageAlt="Custom home construction in Springfield, Oregon"
      subtitle="Springfield, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Springfield.
          </em>
        </>
      }
      metaTitle="Springfield OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Springfield, Oregon. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Springfield runs its own full-service building department, separate from both Eugene and Lane County — and knowing exactly how that system works is the difference between a smooth permit and months of back-and-forth."
      body={[
        "We've built and remodeled homes throughout Springfield for years — kitchen and bath remodels near downtown, second-story additions on the Thurston side, and outdoor living builds on larger lots toward the edges. Every project starts the same way: a free on-site consultation where we walk the property, review your goals, and give you a real, itemized estimate.",
        "Because Springfield issues its own permits rather than routing through Lane County, we coordinate directly with the city's Development and Public Works Department from day one — so there's no confusion about who's reviewing your plans or how long it will take.",
      ]}
      localHeading="Building in Springfield"
      localBody={[
        "If your project is inside Springfield city limits, your permit goes through the city's own BuildSpringfield portal — which connects to the state's ePermitting backend — not the county's system. We handle that submission for you.",
        "Most Springfield properties are on city sewer through the Metropolitan Wastewater Management Commission, but if you're on the outskirts and still on a septic system, that specific review routes through Lane County even though your building permit doesn't. It's a split we watch for so it doesn't stall your timeline.",
        "Springfield also has its own Land and Drainage Alterations Permit (LDAP) for grading and drainage work, separate from your structural permit — something out-of-town crews often miss on their first Springfield project.",
        "One more local wrinkle worth knowing: parts of Glenwood and the Thurston hillside carry a Springfield mailing address but actually sit on unincorporated Lane County land, meaning county rules — not city rules — govern the build. We confirm your exact jurisdiction before we draw up a single plan.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Springfield, OR?",
          a: "Yes. Springfield is one of our core service areas alongside Eugene. We handle everything from custom home builds to kitchen and bath remodels, additions, and outdoor living spaces throughout the city. Start with our free online cost estimator for a directional range, then call for an on-site visit.",
        },
        {
          q: "Who handles my building permit in Springfield?",
          a: "The City of Springfield issues its own building permits through its BuildSpringfield portal, separate from Lane County. We manage that entire submission and coordination process for you.",
        },
        {
          q: "My address says Springfield — does that mean the city handles my permit?",
          a: "Not always. Some areas with a Springfield mailing address (parts of Glenwood and the Thurston hillside) are actually unincorporated Lane County land, which means the county — not the city — governs the build. We verify this before starting any plans.",
        },
      ]}
      nearbyAreas={[
        { label: "Eugene", href: "/" },
        { label: "Coburg", href: "/service-areas/coburg" },
        { label: "Creswell", href: "/service-areas/creswell" },
      ]}
    />
  );
}

// ─── 2. Coburg ───────────────────────────────────────────────────────────────
export function Coburg() {
  return (
    <LocationPage
      city="Coburg"
      cityState="Coburg, OR"
      heroImage={ASSETS.services.remodels}
      heroImageAlt="Home remodeling contractor in Coburg, Oregon"
      subtitle="Coburg, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Coburg.
          </em>
        </>
      }
      metaTitle="Coburg OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Coburg, Oregon. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Coburg is a small town with its own Planning Department — and a few local requirements that catch homeowners off guard if they're expecting the same process as Eugene or Springfield."
      body={[
        "We've worked on homes throughout Coburg's historic district and surrounding residential streets. Every project starts with a free, no-obligation on-site consultation so you get a real estimate, not a guess.",
        "Coburg's small-town scale means permitting decisions often involve more direct conversation with city staff than in larger jurisdictions — something we use to your advantage by coordinating early and clearly.",
      ]}
      localHeading="Building in Coburg"
      localBody={[
        "Many building permits in Coburg require a land-use approval first — even for projects that wouldn't need one in Eugene or Springfield. Lot line adjustments, partitions, subdivisions, and significant changes in building use all fall under this extra step, and we plan for it upfront rather than discovering it mid-project.",
        "Coburg completed its own municipal wastewater project a few years back, which means septic systems here are no longer under Lane County's jurisdiction — wastewater development and maintenance now runs through the City of Coburg directly. If a contractor is still quoting the old county septic process for a Coburg property, that's outdated information.",
        "Coburg also applies a 3% technology fee on top of standard permit fees, which we build into your estimate from the start so there's no surprise line item later.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Coburg, OR?",
          a: "Yes, Coburg is one of our regular service areas. We handle residential construction, remodels, and outdoor living projects throughout the city and its surrounding residential streets.",
        },
        {
          q: "Why does my Coburg project need a land-use approval before a building permit?",
          a: "Coburg's Planning Department requires land-use approval for many types of development — including lot line adjustments, partitions, subdivisions, and significant changes in building use — before a building permit can be issued. We identify whether your project needs this step during the initial consultation.",
        },
        {
          q: "Is septic in Coburg handled by Lane County?",
          a: "No — not anymore. Since Coburg completed its municipal wastewater project, septic and wastewater development in Coburg is handled directly by the City of Coburg, not Lane County.",
        },
      ]}
      nearbyAreas={[
        { label: "Eugene", href: "/" },
        { label: "Springfield", href: "/service-areas/springfield" },
        { label: "Junction City", href: "/service-areas/junction-city" },
      ]}
    />
  );
}

// ─── 3. Creswell ──────────────────────────────────────────────────────────────
export function Creswell() {
  return (
    <LocationPage
      city="Creswell"
      cityState="Creswell, OR"
      heroImage={ASSETS.services.newConstruction}
      heroImageAlt="New home construction in Creswell, Oregon"
      subtitle="Creswell, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Creswell.
          </em>
        </>
      }
      metaTitle="Creswell OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Creswell, Oregon. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Creswell doesn't run its own building department — permitting here is handled through the City of Cottage Grove's Building Department, a detail a lot of homeowners don't realize until their permit gets routed somewhere they didn't expect."
      body={[
        "We build and remodel homes throughout Creswell, from the compact city core to the larger lots that stretch toward unincorporated Lane County. A free on-site consultation is always the first step, so you get an itemized estimate grounded in your actual property.",
        "Because Creswell's permitting flows through a neighboring city's building department, coordination matters more here than almost anywhere else on our service map — and it's exactly the kind of detail we manage so you don't have to.",
      ]}
      localHeading="Building in Creswell"
      localBody={[
        "Inspection and plan review services for Creswell are provided through the City of Cottage Grove's Building Department, not a Creswell-specific office. That means your timeline and inspection scheduling follow Cottage Grove's building department calendar — we coordinate directly with that office so your project doesn't lose time to a jurisdiction mix-up.",
        "Outside the small city core, a number of Creswell-area addresses sit on unincorporated Lane County land, meaning your permit may actually go to the county rather than the city depending on exactly where your lot falls relative to city limits. We verify this before any plans are drawn.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Creswell, OR?",
          a: "Yes — and you can start with our free online cost estimator for a directional budget before the site visit. Creswell is one of our regular service areas, and we're familiar with how permitting works here — including the fact that it routes through Cottage Grove's building department rather than a separate Creswell office.",
        },
        {
          q: "Why does my Creswell permit go through Cottage Grove?",
          a: "Creswell doesn't operate its own building department. Building inspection and plan review services for Creswell are provided by the City of Cottage Grove's Building Department. We coordinate with that office directly on your behalf.",
        },
        {
          q: "Is my Creswell property in the city or the county?",
          a: "It depends on your exact lot. Many addresses in the Creswell area sit on unincorporated Lane County land rather than inside official city limits, which changes which jurisdiction reviews your permit. We confirm this for your specific address before starting design work.",
        },
      ]}
      nearbyAreas={[
        { label: "Cottage Grove", href: "/service-areas/cottage-grove" },
        { label: "Eugene", href: "/" },
        { label: "Springfield", href: "/service-areas/springfield" },
      ]}
    />
  );
}

// ─── 4. Cottage Grove ─────────────────────────────────────────────────────────
export function CottageGrove() {
  return (
    <LocationPage
      city="Cottage Grove"
      cityState="Cottage Grove, OR"
      heroImage={ASSETS.services.restoration}
      heroImageAlt="Home restoration project in Cottage Grove, Oregon"
      subtitle="Cottage Grove, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Cottage Grove.
          </em>
        </>
      }
      metaTitle="Cottage Grove OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Cottage Grove, Oregon. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Known as the Covered Bridge Capital of Oregon, Cottage Grove runs its own full-service building department — one that also handles inspections for the surrounding communities of Creswell, Coburg, and Veneta."
      body={[
        "We've built and remodeled homes throughout Cottage Grove, from the historic core near downtown to the residential streets further out. Every project begins with a free on-site consultation and a real, itemized estimate.",
        "Cottage Grove's building department is fully online through Oregon's statewide ePermitting system, which keeps plan review, correction notes, and inspection scheduling moving efficiently — and we work within that system daily.",
      ]}
      localHeading="Building in Cottage Grove"
      localBody={[
        "Cottage Grove participates in Oregon's statewide ePermitting program, so plan submission, correction notes, and inspection tracking all happen online start to finish — which keeps projects moving faster than jurisdictions still handling everything on paper.",
        "One thing worth knowing if you're adding a shed or accessory structure: Cottage Grove requires a conditional use permit for certain outbuildings depending on lot placement and use, a step some other Lane County cities skip for smaller structures. We check this against your specific lot before quoting.",
        "Because Cottage Grove's building department also serves Creswell, Coburg, and Veneta, the office handles a wide range of jurisdictions daily — we've built a working relationship with their review process over repeated projects.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Cottage Grove, OR?",
          a: "Yes, Cottage Grove is one of our core service areas. We handle residential construction, remodels, restorations, and outdoor living projects throughout the city.",
        },
        {
          q: "Does Cottage Grove use online permitting?",
          a: "Yes. Cottage Grove participates in Oregon's statewide ePermitting system, allowing electronic plan submission, correction tracking, and online inspection scheduling.",
        },
        {
          q: "Do I need a special permit for a shed in Cottage Grove?",
          a: "Possibly. Cottage Grove requires a conditional use permit for certain accessory structures depending on lot placement and intended use. We verify this against your specific property before providing a quote.",
        },
      ]}
      nearbyAreas={[
        { label: "Creswell", href: "/service-areas/creswell" },
        { label: "Coburg", href: "/service-areas/coburg" },
        { label: "Eugene", href: "/" },
      ]}
    />
  );
}

// ─── 5. Junction City ─────────────────────────────────────────────────────────
export function JunctionCity() {
  return (
    <LocationPage
      city="Junction City"
      cityState="Junction City, OR"
      heroImage={ASSETS.services.outdoor}
      heroImageAlt="Outdoor living space construction in Junction City, Oregon"
      subtitle="Junction City, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Junction City.
          </em>
        </>
      }
      metaTitle="Junction City OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Junction City, Oregon. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Junction City maintains its own Building Department, and sits in flat Willamette Valley farmland along the Long Tom River drainage — which changes what we check before design work even begins."
      body={[
        "We build and remodel homes throughout Junction City, from in-town residential lots to properties further out toward the surrounding farmland. A free on-site consultation and itemized estimate come first, always.",
        "Because permits here are reviewed locally by Junction City's own Building Official rather than routed through the county, coordination tends to be direct and efficient — as long as your project has already cleared any floodplain or wetland review it needs.",
      ]}
      localHeading="Building in Junction City"
      localBody={[
        "Junction City sits in flat Willamette Valley farmland along the Long Tom River drainage, which means floodplain and wetland considerations come up more often here than in the hillier parts of Eugene or Springfield — especially for additions, ADUs, or any project that disturbs soil near a waterway.",
        "The city maintains current FEMA floodplain maps and a wetland inventory recognized by the Department of State Lands, and checking your lot against both is one of the first things we do before design work starts, not after.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Junction City, OR?",
          a: "Yes — and you can start with our free online cost estimator for a directional budget before the site visit. Junction City is one of our regular service areas, and we're familiar with the floodplain and wetland considerations that come up more often here due to the flat, river-adjacent terrain.",
        },
        {
          q: "Why does floodplain mapping matter for my Junction City project?",
          a: "Junction City sits along the Long Tom River drainage in flat Willamette Valley farmland, which means more properties here are near mapped flood hazard or wetland areas than in hillier parts of Lane County. We check your lot against the city's current FEMA floodplain maps and wetland inventory before finalizing any design.",
        },
      ]}
      nearbyAreas={[
        { label: "Coburg", href: "/service-areas/coburg" },
        { label: "Eugene", href: "/" },
        { label: "Florence", href: "/service-areas/florence" },
      ]}
    />
  );
}

// ─── 6. Florence ──────────────────────────────────────────────────────────────
export function Florence() {
  return (
    <LocationPage
      city="Florence"
      cityState="Florence, OR"
      heroImage={ASSETS.services.outdoor}
      heroImageAlt="Coastal home construction in Florence, Oregon"
      subtitle="Florence, OR General Contractor"
      headline={
        <>
          Custom Home Builder &amp;
          <br />
          <em className="text-primary italic">
            Remodeling Contractor in Florence.
          </em>
        </>
      }
      metaTitle="Florence OR General Contractor | Precision Core Builders"
      metaDescription="Licensed general contractor serving Florence, Oregon and the coast. Custom homes, remodels & additions. CCB #246527. Free on-site estimates."
      intro="Florence is coastal, and that changes the permitting conversation in ways that don't come up anywhere else in our service area — between dune sand terrain, flood hazard zones, and a designated Tsunami Hazard Overlay Zone."
      body={[
        "We build and remodel homes along the Florence coastline and throughout the surrounding area, and we plan for the coastal-specific requirements from the very first conversation rather than after a permit gets kicked back.",
        "A free on-site consultation lets us walk your specific lot, note its proximity to flood zones or dune terrain, and give you an itemized estimate that already accounts for the extra review Florence properties often require.",
      ]}
      localHeading="Building on the Coast in Florence"
      localBody={[
        "Any construction inside a mapped flood hazard area requires a special flood hazard development permit, along with elevation certificates confirming your finished floor height clears the required level — a step inland cities like Eugene or Springfield simply don't have.",
        "Florence participates in Oregon's statewide ePermitting system for standard building, electrical, plumbing, and mechanical permits, but flood and Tsunami Hazard Overlay Zone reviews layer on top of that base process for many coastal lots.",
        "If your lot is anywhere near the dunes or close to sea level, we build the elevation and flood review timeline into your project schedule from the very first conversation — not as an afterthought once plans are already drawn.",
      ]}
      faqs={[
        {
          q: "Do you build and remodel homes in Florence, OR?",
          a: "Yes — and you can start with our free online cost estimator for a directional budget before the site visit. Florence is one of our service areas, and we have experience with the coastal-specific permitting — flood hazard review, elevation certificates, and dune terrain — that inland Lane County projects don't require.",
        },
        {
          q: "Why does my Florence project need an elevation certificate?",
          a: "If your property is within a mapped flood hazard area, Florence requires a special flood hazard development permit along with an elevation certificate confirming your finished floor height meets the required minimum. We identify this requirement during your initial consultation, before design work begins.",
        },
        {
          q: "What is the Tsunami Hazard Overlay Zone?",
          a: "It's a coastal risk designation that applies additional review to certain construction in Florence, layered on top of standard building, electrical, plumbing, and mechanical permitting. We check whether your specific lot falls within this zone as part of our early project planning.",
        },
      ]}
      nearbyAreas={[
        { label: "Junction City", href: "/service-areas/junction-city" },
        { label: "Eugene", href: "/" },
      ]}
    />
  );
}
