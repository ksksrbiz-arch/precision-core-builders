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
      title="How Much Does a Kitchen Remodel Cost in Eugene, OR?"
      category="Cost Guides"
      heroImage="/portfolio/signature-kitchen-01.jpg"
      heroImageAlt="Completed kitchen remodel in Eugene, Oregon"
      metaTitle="Kitchen Remodel Cost in Eugene, OR (2026 Guide) | Precision Core Builders"
      metaDescription="What a kitchen remodel actually costs in Eugene, Oregon in 2026 — by tier, what drives the price, and where homeowners get surprised. From a licensed local contractor."
      publishedDate="2026-08-04"
      dek="It's the first question almost every homeowner asks us, and the honest answer is: it depends on tier. Here's what that actually means in dollars, based on 2026 Eugene-area data and what we see quoting real local kitchens."
      blocks={[
        {
          type: "p",
          content:
            "Search “kitchen remodel cost Eugene Oregon” and you'll get numbers ranging from $9,000 to $90,000 — which isn't a typo or bad data, it's because “kitchen remodel” covers wildly different scopes. A cosmetic refresh and a full gut-to-studs renovation are both technically kitchen remodels, and they cost roughly ten times apart. So instead of one number, here's how the tiers actually break down for a Eugene-area kitchen.",
        },
        { type: "h2", content: "The three real tiers" },
        {
          type: "list",
          items: [
            <>
              <strong className="text-foreground">
                Cosmetic refresh — roughly $10,000–$20,000.
              </strong>{" "}
              Repainting, cabinet refacing or refinishing, new hardware,
              updated sink and faucet, new backsplash tile. Layout stays
              exactly the same — no plumbing or electrical moves.
            </>,
            <>
              <strong className="text-foreground">
                Mid-range remodel — roughly $25,000–$50,000.
              </strong>{" "}
              This is where most Eugene kitchen projects actually land. New
              cabinets (semi-custom is the sweet spot for most homeowners),
              stone or quartz countertops, new appliances, and often some
              layout adjustment — moving a sink or relocating an island.
            </>,
            <>
              <strong className="text-foreground">
                Full custom / high-end — $50,000 and up, sometimes well
                past $90,000.
              </strong>{" "}
              Structural changes, fully custom cabinetry, premium
              appliance packages, and layout changes that touch plumbing
              and electrical throughout.
            </>,
          ],
        },
        {
          type: "p",
          content:
            "Oregon labor costs run noticeably above the national average — roughly 12% higher by most regional construction indices — which is one reason Eugene numbers tend to sit above generic “national average” kitchen remodel figures you'll find in broader searches.",
        },
        { type: "h2", content: "Where the money actually goes" },
        {
          type: "p",
          content:
            "Cabinets are almost always the single largest line item in a kitchen remodel — typically 25–35% of the total budget. After that, labor (installation, plumbing, electrical) and countertops are the next biggest chunks. Appliances vary the most: a homeowner keeping their existing appliance set can save thousands compared to a full premium package.",
        },
        {
          type: "callout",
          content: (
            <>
              <strong className="text-foreground">Budget for the unexpected.</strong>{" "}
              A reasonable rule of thumb is to set aside 10–20% of your total
              budget as contingency for issues that only show up once walls
              or flooring come out — outdated wiring, hidden water damage,
              or plumbing that doesn't match what the original permit
              records show.
            </>
          ),
        },
        { type: "h2", content: "Timeline" },
        {
          type: "p",
          content:
            "Most full kitchen remodels take 6–12 weeks from demo to final walkthrough, depending on design complexity, how customized the cabinetry is, and how quickly materials arrive. Cosmetic refreshes move much faster — often 1–3 weeks.",
        },
        { type: "h2", content: "The honest way to get a real number" },
        {
          type: "p",
          content:
            "National cost calculators are a reasonable starting point, but the only way to get an accurate number for your kitchen is a walkthrough of your actual space — your layout, your existing plumbing/electrical, and what tier you're aiming for. We offer free on-site estimates for exactly this reason, and if you want a ballpark before that conversation, our AI estimator below can give you a starting range in a couple minutes.",
        },
      ]}
      faqs={[
        {
          q: "What's the average kitchen remodel cost in Eugene, OR?",
          a: "Most Eugene kitchen remodels land in the $25,000–$50,000 mid-range tier, though smaller cosmetic refreshes can run $10,000–$20,000 and full custom high-end remodels can exceed $90,000. The right number depends heavily on scope, not just square footage.",
        },
        {
          q: "Do I need a permit for a kitchen remodel in Oregon?",
          a: "It depends on the work. Cosmetic changes (paint, cabinet refacing, countertop swaps) typically don't require a permit. Moving plumbing, electrical, or structural elements usually does. Requirements vary by city/county — we confirm what your specific project needs during your consultation.",
        },
        {
          q: "How long does a kitchen remodel take?",
          a: "Most full kitchen remodels take 6–12 weeks. Cosmetic refreshes are faster, often 1–3 weeks, depending on material availability and scope.",
        },
      ]}
      relatedLinks={[
        { label: "Try the AI Estimator", href: "/estimator" },
        { label: "Bath & Kitchen Portfolio", href: "/portfolio" },
        { label: "Remodeling Services", href: "/services/remodels" },
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
              <strong className="text-foreground">Worth knowing:</strong>{" "}
              under a 2026 Oregon law (HB 4089), intentionally using another
              contractor's CCB number without authorization — or using any
              CCB number with intent to deceive — is now a Class C felony,
              up from a misdemeanor. The state has genuinely tightened
              enforcement here.
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
        { label: "Get a Free Estimate", href: "/estimator" },
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
            'Client photos are great, but they only show you the finished result. This project walks through the material decisions, the layout calls, and the finish choices that go into a build like this. If you\'re wondering what "the standard we hold ourselves to" actually looks like in practice, this is it: a covered pergola that anchors solidly to the structure, a deck that sits flush rather than gapped, and fencing that\'s stain-matched across two completely different fence styles so the whole property reads as one cohesive design.',
        },
        {
          type: "callout",
          content: (
            <>
              <strong className="text-foreground">
                Thinking about your own backyard?
              </strong>{" "}
              Pergolas, decks, and fencing are exactly the kind of project
              where the difference between a contractor who treats it as a
              side job and one who treats it like their own home really
              shows up in the details — flush thresholds, matched stain
              across structures, hardware that's actually rated for outdoor
              exposure.
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
