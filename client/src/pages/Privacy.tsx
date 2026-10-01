import { SiteNav, SiteFooter } from "@/components/layout/SiteShell";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { canonicalUrl } from "@/lib/seo";

export default function Privacy() {
  useSEO({
    title: "Website Privacy Information",
    description:
      "How Precision Core Builders handles website project inquiries and campaign information.",
    canonical: canonicalUrl("/privacy"),
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main
        id="main-content"
        className="container max-w-3xl pt-32 pb-20 space-y-6"
      >
        <h1 className="text-4xl font-semibold">Website privacy information</h1>
        <p>
          When you send a project inquiry, we receive the contact details and
          project information you provide so we can respond, discuss your
          requirements, and prepare a consultation or estimate.
        </p>
        <h2 className="text-2xl">Website services and measurement</h2>
        <p>
          Our website uses Netlify to host pages and receive forms. Estimate
          inquiries may also be sent to our project follow-up automation. We
          include the page you submitted from, a referring website origin when
          available, and campaign parameters to understand how inquiries reach
          us.
        </p>
        <p>
          Campaign context is kept in your browser session storage so it can
          accompany an inquiry after you navigate between pages. It does not
          contain your name, email, or project message.
        </p>
        <p>
          Google Tag Manager is installed to support website measurement. Our
          conversion-event code records actions such as phone-link clicks and
          successful form submissions without including your name, email
          address, or message in those events. Your browser and the services it
          contacts may process technical information such as an IP address.
        </p>
        <h2 className="text-2xl">Your choices and questions</h2>
        <p>
          You can contact us directly instead of using a form. Please do not
          include sensitive personal or financial information in a project
          inquiry. To ask about information you have provided, including
          correction or deletion requests, email{" "}
          <a className="underline" href={SITE.emailHref}>
            {SITE.email}
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          This page describes the website inquiry flow; project agreements and
          third-party services may have additional terms.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
