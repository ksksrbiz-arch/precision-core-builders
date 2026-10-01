import { useState } from "react";
import { ArrowUpRight, Menu, X, Phone } from "lucide-react";
import { PROJECTS, photoUrl } from "@/data/projects";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { canonicalUrl } from "@/lib/seo";
import { trackCtaClick, trackPhoneClick } from "@/lib/analytics";
import "./home-redesign.css";
import "./home-brand-blend.css";

const links = [
  { label: "Our work", href: "/portfolio" },
  { label: "Services", href: "/services" },
  { label: "Our story", href: "/about" },
  { label: "Resources", href: "/blog" },
];
const selected = [
  "tadlock-residence",
  "signature-bath-kitchen",
  "signature-custom-home",
]
  .map(slug => PROJECTS.find(project => project.slug === slug)!)
  .filter(Boolean);

function ConsultationLink({ light = false }: { light?: boolean }) {
  return (
    <a
      href="/contact"
      className={`premium-button${light ? " premium-button-light" : ""}`}
      onClick={() => trackCtaClick("home_consultation")}
    >
      <span>Request a consultation</span>
      <ArrowUpRight size={18} aria-hidden />
    </a>
  );
}

export default function HomeRedesign() {
  const [menuOpen, setMenuOpen] = useState(false);
  useSEO({
    title: "Custom Homes & Remodeling in Eugene, OR",
    description:
      "Custom homes, thoughtful remodels, and additions by Precision Core Builders. Explore our work in Eugene and Lane County, then request a free on-site consultation.",
    canonical: canonicalUrl("/"),
  });
  return (
    <div className="premium-home">
      <a href="#main-content" className="premium-skip">
        Skip to content
      </a>
      <header className="premium-header">
        <a
          href="/"
          className="premium-brand"
          aria-label="Precision Core Builders home"
        >
          <img
            className="premium-brand-mark"
            src="/logo.svg"
            alt=""
            width="42"
            height="42"
          />
          <span>PRECISION CORE</span>
          <small>BUILDERS · EUGENE, OREGON</small>
        </a>
        <nav className="premium-desktop-nav" aria-label="Main navigation">
          {links.map(link => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/contact"
          className="premium-nav-cta"
          onClick={() => trackCtaClick("home_nav_consultation")}
        >
          Let’s talk <ArrowUpRight size={17} aria-hidden />
        </a>
        <button
          className="premium-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="premium-mobile-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && (
        <nav
          id="premium-mobile-nav"
          className="premium-mobile-nav"
          aria-label="Mobile navigation"
          onKeyDown={event => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
        >
          {links.map(link => (
            <a key={link.href} href={link.href}>
              {link.label}
              <ArrowUpRight size={18} aria-hidden />
            </a>
          ))}
          <a href="/contact">
            Request a consultation
            <ArrowUpRight size={18} aria-hidden />
          </a>
        </nav>
      )}
      <main id="main-content">
        <section className="premium-hero">
          <div className="premium-hero-copy">
            <p className="premium-eyebrow">
              Precision construction. Core values.
            </p>
            <h1>
              Good homes.
              <br />
              Built <em>with care.</em>
            </h1>
            <p className="premium-intro">
              Custom homes, remodels, and additions in Eugene & Lane County.
              Thoughtfully built around the way you live.
            </p>
            <ConsultationLink />
            <a className="premium-text-link" href="/portfolio">
              Explore our work <ArrowUpRight size={17} aria-hidden />
            </a>
            <div className="premium-hero-note">
              <span>{SITE.license}</span>
              <span>Free on-site consultations</span>
            </div>
          </div>
          <figure className="premium-hero-photo">
            <img
              src="/portfolio/signature-outdoor-01.jpg"
              alt="Covered outdoor living space, composite deck, and cedar detailing built by Precision Core Builders"
              fetchPriority="high"
              loading="eager"
              width="1200"
              height="1000"
            />
            <figcaption>
              <span>Spaces made for everyday living.</span>
              <a
                href="/portfolio/tadlock-residence"
                aria-label="View the outdoor living project"
              >
                <ArrowUpRight aria-hidden />
              </a>
            </figcaption>
          </figure>
        </section>
        <div className="premium-local-line">
          <span>ROOTED IN EUGENE. BUILT FOR YOU.</span>
          <p>From a better kitchen to a home built from the ground up.</p>
        </div>
        <section
          className="premium-section premium-work"
          aria-labelledby="selected-work"
        >
          <div className="premium-section-heading">
            <div>
              <p className="premium-eyebrow">Selected work</p>
              <h2 id="selected-work">
                The details make
                <br />
                the difference.
              </h2>
            </div>
            <div>
              <p>
                Real projects. Hands-on craftsmanship.
                <br />A closer look at what we build.
              </p>
              <a href="/portfolio" className="premium-text-link">
                View all projects <ArrowUpRight size={17} aria-hidden />
              </a>
            </div>
          </div>
          <div className="premium-project-grid">
            {selected.map((project, index) => (
              <a
                href={`/portfolio/${project.slug}`}
                className="premium-project"
                key={project.slug}
              >
                <div className="premium-project-image">
                  <img
                    src={photoUrl(project.hero)}
                    alt={project.title}
                    loading="lazy"
                    width="900"
                    height="1050"
                  />
                </div>
                <div className="premium-project-caption">
                  <div>
                    <p className="premium-eyebrow">
                      0{index + 1} / {project.category}
                    </p>
                    <h3>{project.title}</h3>
                  </div>
                  <ArrowUpRight size={22} aria-hidden />
                </div>
              </a>
            ))}
          </div>
        </section>
        <section
          className="premium-services premium-section"
          aria-labelledby="services-heading"
        >
          <div>
            <p className="premium-eyebrow">What we do</p>
            <h2 id="services-heading">
              Your next chapter.
              <br />
              Our kind of work.
            </h2>
            <p>
              One room or a whole new home. We help you understand the scope,
              make considered choices, and bring it all together.
            </p>
            <a href="/services" className="premium-text-link">
              Explore our services <ArrowUpRight size={17} aria-hidden />
            </a>
          </div>
          <div className="premium-service-list">
            {[
              {
                name: "Custom homes & additions",
                description: "More room for the life you want to live.",
                href: "/services/new-construction",
              },
              {
                name: "Remodels & renovations",
                description:
                  "A fresh perspective on the home you already love.",
                href: "/services/remodels",
              },
              {
                name: "Outdoor living",
                description: "Well-built spaces beyond your back door.",
                href: "/services/outdoor",
              },
              {
                name: "Cabinetry & finish work",
                description: "The details that make a space feel complete.",
                href: "/services/cabinets",
              },
            ].map((service, index) => (
              <a key={service.href} href={service.href}>
                <span className="premium-service-number">0{index + 1}</span>
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </div>
                <ArrowUpRight size={22} aria-hidden />
              </a>
            ))}
          </div>
        </section>
        <section
          className="premium-story premium-section"
          aria-labelledby="story-heading"
        >
          <figure>
            <img
              src="/portfolio/signature-deck-01.jpg"
              alt="Covered pergola and composite decking with carefully finished edges"
              loading="lazy"
              width="1000"
              height="1000"
            />
          </figure>
          <div>
            <p className="premium-eyebrow">The people behind the work</p>
            <h2 id="story-heading">
              Hands-on builders.
              <br />
              <em>Personal by design.</em>
            </h2>
            <p>
              Eric and Mitch Tadlock bring a carpenter’s eye to every
              project—from the structure behind the walls to the details you
              touch every day.
            </p>
            <p>
              We start by listening. Then we work through your scope, explain
              the choices, and review the finished work with you.
            </p>
            <a href="/about" className="premium-text-link">
              Meet the builders <ArrowUpRight size={17} aria-hidden />
            </a>
          </div>
        </section>
        <section
          className="premium-section premium-process"
          aria-labelledby="process-heading"
        >
          <p className="premium-eyebrow">A clear way forward</p>
          <h2 id="process-heading">Start with a conversation.</h2>
          <div className="premium-process-grid">
            {[
              {
                title: "Tell us what you have in mind",
                body: "Share your ideas, location, and priorities. You don’t need to have every detail figured out.",
              },
              {
                title: "Walk through the possibilities",
                body: "An on-site consultation helps us understand the space and discuss scope, materials, and next steps.",
              },
              {
                title: "Build with a shared plan",
                body: "Review a written estimate and agree on the work before moving into construction.",
              },
            ].map((step, index) => (
              <div key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
          <p className="premium-planning-note">
            Still exploring your budget?{" "}
            <a href="/estimator">
              Try the preliminary cost estimator{" "}
              <ArrowUpRight size={15} aria-hidden />
            </a>
          </p>
        </section>
        <section className="premium-closing">
          <p className="premium-eyebrow">Let’s make it yours</p>
          <h2>
            A home that feels right.
            <br />A good place to start.
          </h2>
          <ConsultationLink light />
          <a
            href={SITE.phoneHref}
            className="premium-phone"
            onClick={() => trackPhoneClick("home_closing")}
          >
            <Phone size={17} aria-hidden /> {SITE.phone}
          </a>
        </section>
      </main>
      <footer className="premium-footer">
        <div className="premium-footer-brand">
          <a href="/" className="premium-brand">
            <span>PRECISION CORE</span>
            <small>BUILDERS · EUGENE, OREGON</small>
          </a>
          <p>
            Thoughtful construction.
            <br />
            Craftsmanship that feels like home.
          </p>
          <span>{SITE.license}</span>
        </div>
        <div>
          <h2>Explore</h2>
          <a href="/portfolio">Our work</a>
          <a href="/services">Services</a>
          <a href="/about">Our story</a>
          <a href="/showroom">Finish showroom</a>
        </div>
        <div>
          <h2>Plan your project</h2>
          <a href="/contact">Request a consultation</a>
          <a href="/estimator">Preliminary cost estimator</a>
          <a href="/blog">Homeowner resources</a>
          <a href="/faq">Common questions</a>
        </div>
        <div>
          <h2>Let’s talk</h2>
          <a
            href={SITE.phoneHref}
            onClick={() => trackPhoneClick("home_footer")}
          >
            {SITE.phone}
          </a>
          <a href={SITE.emailHref}>{SITE.email}</a>
          <p>Eugene & Lane County, Oregon</p>
        </div>
        <div className="premium-footer-bottom">
          <p>© {new Date().getFullYear()} Precision Core Builders</p>
          <div>
            <a href="/privacy">Privacy</a>
            <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            <a href="/auth/login">Client & team sign in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
