/**
 * Blog posts. Each exports a default-style named component using the
 * ArticlePage template. Cost figures are sourced from multiple published
 * 2026 Oregon/Eugene remodeling-cost guides (see PR notes for sources),
 * synthesized and paraphrased into original wording — not copied from any
 * single source. CCB facts are sourced from the Oregon CCB's own public
 * requirements and multiple independent verification guides, current as
 * of Aug 2026. The case study uses only real project data already in
 * data/projects.ts (the Signature Outdoor Living project).
 */
import { ArticlePage } from "./_template";

// ─── 1. Kitchen Remodel Cost Guide ───────────────────────────────────────────
export function KitchenRemodelCost() {
  return (
    <ArticlePage
      title="Planning a Kitchen Remodel in Eugene, OR"
      category="Project Planning"
      heroImage="/portfolio/category-remodels.jpg"
      heroImageAlt="Planning a Kitchen Remodel in Eugene, OR"
      metaTitle="Planning a Kitchen Remodel in Eugene, OR | Precision Core Builders"
      metaDescription="Plan your kitchen layout, cabinetry, finishes, and project scope with Eric before construction begins."
      publishedDate="2026-08-16"
      dek="Plan your kitchen layout, cabinetry, finishes, and project scope with Eric before construction begins."
      blocks={[
        { type: "h2", content: "Define the scope" },
        {
          type: "p",
          content:
            "A cosmetic refresh can retain the existing layout. A larger renovation may include cabinetry, flooring, plumbing, electrical work, or structural changes. Gather your priorities so Eric can review them with you.",
        },
        { type: "h2", content: "Consider layout and materials" },
        {
          type: "p",
          content:
            "Discuss storage, work surfaces, lighting, appliances, and how you use the room. Existing utilities and site conditions help determine the work required.",
        },
        { type: "h2", content: "Start with Eric" },
        {
          type: "p",
          content:
            "Bring photos, inspiration, and any existing plans to an on-site consultation. Eric reviews your actual space and prepares project-specific pricing himself.",
        },
      ]}
      faqs={[
        {
          q: "Who prepares pricing for my project?",
          a: "Eric prepares project-specific pricing after an on-site review of your scope, property, and selections. Contact him to arrange a consultation.",
        },
      ]}
      relatedLinks={[
        { label: "Talk with Eric", href: "/contact" },
        { label: "Remodeling services", href: "/services/remodels" },
        { label: "Our work", href: "/portfolio" },
      ]}
    />
  );
}

// ─── 2. Oregon CCB Licensing Guide ───────────────────────────────────────────
export function CCBLicensingGuide() {
  return (
    <ArticlePage
      title="Oregon CCB Licensing: What to Check Before Hiring a Contractor"
      category="Homeowner Resources"
      heroImage="/portfolio/category-residential.jpg"
      heroImageAlt="Residential construction project in Eugene, Oregon"
      metaTitle="How to Verify a Contractor's CCB License in Oregon | Precision Core Builders"
      metaDescription="What Oregon's CCB license actually verifies, how to check it yourself, and the red flags to watch for before you sign a contract or pay a deposit."
      publishedDate="2026-08-04"
      dek="Oregon law requires a contractor to hold an active CCB license for almost any paid construction, repair, or improvement work — and the license number is supposed to be on every estimate and contract you're handed. Here's how to actually check it."
      blocks={[
        {
          type: "p",
          content:
            "Oregon requires anyone paid to build, repair, or improve a residential or commercial structure to hold an active license from the Construction Contractors Board (CCB) once the job value hits $1,000 — a threshold most real projects clear immediately. Working without one is illegal, and hiring an unlicensed contractor removes your access to Oregon's consumer protection system if something goes wrong.",
        },
        { type: "h2", content: "What the license actually confirms" },
        {
          type: "list",
          items: [
            "The contractor (or business) is registered with the state",
            "They carry a current surety bond — a minimum of $20,000 for residential general contractors, or $15,000 for residential specialty contractors",
            "They carry active general liability insurance",
            "Any complaint or disciplinary history is on public record",
          ],
        },
        {
          type: "p",
          content:
            "A license number alone doesn't tell you everything — the bond and insurance behind it have their own separate expiration dates. It's possible for a contractor's license to show \"Active\" while their bond or insurance has quietly lapsed, which is exactly the gap that leaves a homeowner exposed if a claim ever comes up.",
        },
        { type: "h2", content: "How to actually check it" },
        {
          type: "p",
          content:
            "The official source is the CCB's own lookup tool at oregon.gov/ccb. Search by the contractor's business name or their CCB number — Oregon law requires that number to be displayed on every estimate, contract, invoice, and advertisement, so any legitimate contractor should be able to give it to you instantly without hesitation.",
        },
        {
          type: "list",
          items: [
            "Confirm the license status is Active, not expired or suspended",
            "Confirm the business name matches exactly what's on your contract — a mismatch is a red flag",
            "Check the bond amount and expiration date, not just that a bond exists",
            "Check that liability insurance is current, not just listed",
            "Review complaint history, if any, and how it was resolved",
          ],
        },
        {
          type: "callout",
          content: (
            <>
              <strong className="text-foreground">Worth knowing:</strong> under
              a 2026 Oregon law (HB 4089), intentionally using another
              contractor's CCB number without authorization — or using any CCB
              number with intent to deceive — is now a Class C felony, up from a
              misdemeanor. The state has genuinely tightened enforcement here.
            </>
          ),
        },
        { type: "h2", content: "What a CCB license doesn't cover" },
        {
          type: "p",
          content:
            "A general CCB license doesn't automatically cover every trade. Electrical and plumbing work often requires separate credentials through the Oregon Building Codes Division, and landscape contracting has its own separate board. If your project spans multiple trades, it's worth asking which specific licenses apply to each part of the work.",
        },
        { type: "h2", content: "Our license, for reference" },
        {
          type: "p",
          content: `Precision Core Builders holds Oregon CCB #246527. You're welcome to look it up yourself before we ever start a conversation — we'd rather you verify it than just take our word for it.`,
        },
      ]}
      faqs={[
        {
          q: "Is a CCB license required for small jobs too?",
          a: "Yes — Oregon requires a CCB license for any construction, repair, or improvement work valued at $1,000 or more, which covers nearly every real residential project.",
        },
        {
          q: "Where do I look up a contractor's CCB license?",
          a: "The official tool is at oregon.gov/ccb. Search by the contractor's business name or their CCB license number, which they're legally required to provide on any estimate or contract.",
        },
        {
          q: "What's Precision Core Builders' CCB number?",
          a: "CCB #246527. You can verify it directly on Oregon's official CCB lookup tool.",
        },
      ]}
      relatedLinks={[
        { label: "About Precision Core Builders", href: "/about" },
        { label: "Request a Consultation", href: "/contact" },
        { label: "FAQ", href: "/faq" },
      ]}
    />
  );
}

// ─── 3. Case Study: Signature Outdoor Living Project ─────────────────────────
export function TadlockResidenceCaseStudy() {
  return (
    <ArticlePage
      title="What a Full Outdoor Living Build Actually Looks Like"
      category="Project Story"
      heroImage="/portfolio/signature-outdoor-01.jpg"
      heroImageAlt="Finished outdoor living space in Eugene, Oregon"
      metaTitle="A Complete Outdoor Living Build | Case Study | Precision Core Builders"
      metaDescription="A covered pergola, composite deck, and matched cedar fencing, built out over the course of a year. Here's the real project, start to finish."
      publishedDate="2026-08-04"
      dek="Most contractors show you the finished photo. We wanted to walk through what a full outdoor living build actually involves — from bare structure to a cohesive, finished property."
      blocks={[
        {
          type: "p",
          content:
            "This project covers the full outdoor envelope of a property: a covered pergola, a composite deck, a cedar privacy fence, and a front-yard fence that ties the whole property together. Same standard we bring to every client's project, start to finish.",
        },
        { type: "h2", content: "The starting point" },
        {
          type: "p",
          content:
            "The backyard started as a bare frame — a blank structural shell with no covered outdoor space, no deck, and no real separation from the neighboring properties. Building out the full outdoor living space took the better part of a year, worked in around other client projects.",
        },
        { type: "h2", content: "What actually got built" },
        {
          type: "list",
          items: [
            "A black-finished louvered pergola, anchored directly to the home's structure",
            "A grey-tone composite deck, set flush to the back-door threshold for a clean transition",
            "A horizontal cedar privacy fence running the full property perimeter",
            "A front-yard cedar-and-hog-wire fence, stain-matched to tie the whole property together",
            "Siding, trim, and finish work on an accessory structure on the property",
          ],
        },
        { type: "h2", content: "Why we're showing you this one" },
        {
          type: "p",
          content:
            "Client photos are great, but they only show you the finished result. This project walks through the material decisions, the layout calls, and the finish choices that go into a build like this. If you're wondering what \"the standard we hold ourselves to\" actually looks like in practice, this is it: a covered pergola that anchors solidly to the structure, a deck that sits flush rather than gapped, and fencing that's stain-matched across two completely different fence styles so the whole property reads as one cohesive design.",
        },
        {
          type: "callout",
          content: (
            <>
              <strong className="text-foreground">
                Thinking about your own backyard?
              </strong>{" "}
              Pergolas, decks, and fencing are exactly the kind of project where
              the difference between a contractor who treats it as a side job
              and one who treats it like their own home really shows up in the
              details — flush thresholds, matched stain across structures,
              hardware that's actually rated for outdoor exposure.
            </>
          ),
        },
      ]}
      relatedLinks={[
        { label: "Outdoor Living Services", href: "/services/outdoor" },
        { label: "See the Full Project", href: "/portfolio/tadlock-residence" },
        { label: "About Eric & Mitch", href: "/about" },
      ]}
    />
  );
}

// ─── 4. Deck Cost Guide (Eugene) ─────────────────────────────────────────────
export function DeckCostEugene() {
  return (
    <ArticlePage
      title="Planning a Deck in Eugene, OR"
      category="Project Planning"
      heroImage="/portfolio/signature-deck-01.jpg"
      heroImageAlt="Planning a Deck in Eugene, OR"
      metaTitle="Planning a Deck in Eugene, OR | Precision Core Builders"
      metaDescription="Explore deck materials, access, site conditions, and maintenance before meeting with Eric."
      publishedDate="2026-08-16"
      dek="Explore deck materials, access, site conditions, and maintenance before meeting with Eric."
      blocks={[
        { type: "h2", content: "Choose the right materials" },
        {
          type: "p",
          content:
            "Pressure-treated wood, cedar, and composite decking have different appearance and maintenance needs. Eric can discuss which materials suit your property and how you plan to use the space.",
        },
        { type: "h2", content: "Review the property" },
        {
          type: "p",
          content:
            "Deck height, access, foundations, drainage, stairs, railings, and connections to the house all affect the scope. Permit requirements must be confirmed for your specific site.",
        },
        { type: "h2", content: "Walk the site with Eric" },
        {
          type: "p",
          content:
            "Share your goals and arrange an on-site consultation. Eric reviews the property and prepares the project pricing after confirming the scope.",
        },
      ]}
      faqs={[
        {
          q: "Who prepares pricing for my project?",
          a: "Eric prepares project-specific pricing after an on-site review of your scope, property, and selections. Contact him to arrange a consultation.",
        },
      ]}
      relatedLinks={[
        { label: "Talk with Eric", href: "/contact" },
        { label: "Remodeling services", href: "/services/remodels" },
        { label: "Our work", href: "/portfolio" },
      ]}
    />
  );
}

// ─── 5. Bathroom Remodel Cost Guide (Eugene) ─────────────────────────────────
export function BathroomRemodelCostEugene() {
  return (
    <ArticlePage
      title="Planning a Bathroom Remodel in Eugene, OR"
      category="Project Planning"
      heroImage="/portfolio/signature-bath-01.jpg"
      heroImageAlt="Planning a Bathroom Remodel in Eugene, OR"
      metaTitle="Planning a Bathroom Remodel in Eugene, OR | Precision Core Builders"
      metaDescription="Review bathroom layout, waterproofing, fixtures, and finish selections with Eric."
      publishedDate="2026-08-16"
      dek="Review bathroom layout, waterproofing, fixtures, and finish selections with Eric."
      blocks={[
        { type: "h2", content: "Decide what changes" },
        {
          type: "p",
          content:
            "A refresh may keep the existing layout, while a larger remodel can include new plumbing locations, cabinetry, tile, or a custom shower. Identify what needs to work better for your household.",
        },
        { type: "h2", content: "Plan the concealed work" },
        {
          type: "p",
          content:
            "Waterproofing, substrate preparation, ventilation, and plumbing deserve attention before choosing finishes. Eric reviews the existing room and identifies what needs further investigation.",
        },
        { type: "h2", content: "Discuss the project with Eric" },
        {
          type: "p",
          content:
            "Bring photos and finish ideas to an on-site consultation. Eric prepares pricing after reviewing the room, selections, and scope.",
        },
      ]}
      faqs={[
        {
          q: "Who prepares pricing for my project?",
          a: "Eric prepares project-specific pricing after an on-site review of your scope, property, and selections. Contact him to arrange a consultation.",
        },
      ]}
      relatedLinks={[
        { label: "Talk with Eric", href: "/contact" },
        { label: "Remodeling services", href: "/services/remodels" },
        { label: "Our work", href: "/portfolio" },
      ]}
    />
  );
}
