/**
 * Privacy Policy — standard construction business privacy policy.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { SITE } from "@/const";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container max-w-3xl">
          <span
            className="block text-[10px] tracking-[0.3em] uppercase text-primary font-bold mb-3"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Legal
          </span>
          <h1
            className="text-3xl sm:text-4xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Last updated: April 2026
          </p>

          <div className="prose-custom space-y-8 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                1. Information We Collect
              </h2>
              <p>
                {SITE.name} ("we", "us", or "our") collects information you
                provide directly when you:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Submit a contact form or request an estimate</li>
                <li>Create an account on our client portal</li>
                <li>Communicate with us via email, phone, or our website</li>
                <li>
                  Use our AI Project Estimator or other interactive tools
                </li>
              </ul>
              <p className="mt-2">
                This may include your name, email address, phone number, project
                address, project details, and budget information.
              </p>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                2. How We Use Your Information
              </h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Provide construction estimates and respond to your inquiries
                </li>
                <li>
                  Manage your project through our client portal (field reports,
                  schedules, finish selections, budget tracking)
                </li>
                <li>
                  Communicate about project updates, scheduling, and milestones
                </li>
                <li>Improve our services and website experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                3. Information Sharing
              </h2>
              <p>
                We do not sell, trade, or rent your personal information to third
                parties. We may share your information with:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Sub-contractors and suppliers as necessary to complete your
                  project
                </li>
                <li>
                  Service providers that help us operate our website and business
                  (hosting, email, payment processing)
                </li>
                <li>
                  Government agencies if required by law or to comply with legal
                  processes
                </li>
              </ul>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                4. Data Security
              </h2>
              <p>
                We implement industry-standard security measures to protect your
                personal information, including encrypted data transmission
                (HTTPS), secure authentication, and access controls. However, no
                method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                5. Cookies
              </h2>
              <p>
                Our website uses essential cookies to maintain your login session
                and remember your preferences. We may also use analytics cookies
                to understand how visitors use our site. You can control cookie
                settings in your browser.
              </p>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                6. Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Request access to the personal information we hold about you
                </li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at{" "}
                <a
                  href={SITE.emailHref}
                  className="text-primary hover:underline"
                >
                  {SITE.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2
                className="text-lg font-semibold text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                7. Contact
              </h2>
              <p>
                If you have questions about this privacy policy, contact us:
              </p>
              <p className="mt-2">
                {SITE.name}
                <br />
                {SITE.location}
                <br />
                <a
                  href={SITE.emailHref}
                  className="text-primary hover:underline"
                >
                  {SITE.email}
                </a>
                <br />
                <a
                  href={SITE.phoneHref}
                  className="text-primary hover:underline"
                >
                  {SITE.phone}
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
