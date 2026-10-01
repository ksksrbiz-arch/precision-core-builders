# Marketing improvements

## Implemented

- Build-time browser prerendering for every public sitemap URL, including page content, unique canonical metadata, and route-specific service/article images. Private routes remain client-rendered.
- Public unknown routes return a Netlify 404, while API, admin, portal, authentication, and onboarding routes retain their routing behavior.
- Homepage leads with custom homes, remodels, additions, and the actual service area. Unverified testimonials, numeric rating/customer claims, founding dates, and absolute callback promises no longer appear in the reviewed marketing surfaces.
- Campaign parameters, initial landing path, and referrer origin accompany contact, service, and estimator submissions. Only an explicit campaign-field allowlist is retained in session storage; no arbitrary URL query parameters are copied.
- Showroom visitors can select up to ten finishes and send that list into their editable inquiry message.
- Privacy information is linked in the footer and beside forms. Cost guides distinguish preliminary planning ranges from written estimates; the unsourced regional 12% labor claim was removed.
- Estimator browser webhook removed. The existing form-submission handler preserves scoring and lead-board insertion, now handles service inquiries, and sends follow-up automation from the server with three bounded attempts and a submission idempotency key. Logs identify delivery outcomes without logging inquiry content. Netlify Forms remains the recoverable source if delivery fails.
- Sitemap includes the previously omitted deck and bathroom articles plus the privacy page.

## Verification

Run `pnpm exec tsc --noEmit`, the focused attribution/showroom/delivery tests and existing function suite, `pnpm build`, then `pnpm check:marketing`.

The marketing check inspects all generated HTML for one canonical, a single H1, substantive initial content, description metadata, form-attribution registration, and noindex on the generated 404 page. It also checks the configured HTTP 404 fallback.

Chromium is a build-only dependency. Netlify installs browser system dependencies before building. Prerendering blocks external requests and all API requests so builds neither send analytics nor depend on private services. The live finish catalog remains interactive rather than publishing a stale product snapshot.

## After deployment

1. Verify deployed service/contact/article HTML, unknown-route HTTP 404, and direct admin/auth/portal navigation. Local preview does not emulate Netlify redirect processing.
2. Submit an authorized test inquiry and confirm Netlify Forms, lead-board insertion, function delivery logs, and n8n receipt. Configure `N8N_WEBHOOK_URL` in Functions scope if automation is desired. Downstream automation must honor `Idempotency-Key` to suppress duplicates after ambiguous failures.
3. Check GA4/GTM configuration and mark qualified inquiries/booked consultations as outcomes. Code events alone do not establish that analytics tags are publishing or reporting correctly.
4. Use Search Console URL Inspection to verify rendered content and selected canonicals. Measure deployed mobile Core Web Vitals before promising performance improvements.
5. Owner review: company founding date versus founders' experience, licensed/insured assertions, actual rating source/count, customer-quote provenance/permission, and privacy wording versus actual retention practices and configured analytics tags.
6. Expand case studies only with verified project facts and customer permission. No new customer histories, results, review scores, or market statistics have been invented.

No production form submissions or external analytics/automation configuration changes are part of local verification.
