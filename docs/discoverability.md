# Discoverability & GEO (Generative Engine Optimization)

How search engines and AI assistants find and cite Precision Core Builders:
what was added, how the pieces fit together, and what is left to do.

## What was added

| File                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/public/robots.txt`           | Crawler policy. Public marketing pages open to all (`User-agent: * Allow: /`); explicit, individually commented allow rules for reputable AI crawlers — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Bingbot, Applebot-Extended, Meta-ExternalAgent, CCBot, cohere-ai (the business explicitly wants AI discoverability). Private app surfaces (`/admin`, `/portal`, `/auth`, `/api`, `/onboarding`, `/dev-login`, `/callback`) stay blocked for everyone. Points at the sitemap.                                    |
| `client/public/llms.txt`             | [llmstxt.org](https://llmstxt.org)-spec summary for AI assistants: H1 project name, blockquote summary, then H2 sections with markdown links — company, all 8 services, service area, estimator, portfolio, FAQ, contact, plus a verified-facts section.                                                                                                                                                                                                                                                                                                                                            |
| `client/public/llms-full.txt`        | Extended companion to `llms.txt` with fuller prose and citable facts only: founded 2004, 20+ years of finish carpentry, values Trust/Respect/Diligence, zero call-backs, 50+ happy customers, insurance carried, permit handling, milestone payment structure. Claims not stated anywhere in the codebase (business hours, typical budget ranges, warranties) were deliberately **omitted**, not invented.                                                                                                                                                                                          |
| `client/public/humans.txt`           | Light, factual humans.txt: team, company, stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `client/public/manifest.webmanifest` | Web app manifest for the public marketing site (identity + icons). The pre-existing `manifest.json` stays scoped to the `/admin` PWA and is untouched.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `client/public/og-image.README.md`   | Placeholder note for the branded 1200×630 og-image asset (see follow-ups).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scripts/generate-sitemap.ts`        | Now emits the production domain `https://precisioncorebuilders.com` (was the Netlify preview domain). Priority scheme: home 1.0 · estimator/contact 0.9 · services/portfolio/about/faq 0.8 · project pages 0.7. `<lastmod>` = build date; output stays deterministic (stable route order, single source of truth). Covers every public route in `client/src/App.tsx`: `/`, `/about`, `/services` (+ 8 service sub-pages), `/portfolio` (+ every project slug from `client/src/data/projects.ts`), `/faq`, `/contact`, `/estimator`. Auth/admin/portal/onboarding routes are intentionally excluded. |
| `client/public/sitemap.xml`          | Regenerated output of `pnpm sitemap` — never hand-edit; change the generator instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `scripts/indexnow.mjs`               | Dependency-free IndexNow submitter (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## How the pieces fit together

## IndexNow usage

`scripts/indexnow.mjs` reads every URL from `client/public/sitemap.xml` and
POSTs them to `https://api.indexnow.org/indexnow`. No new npm dependencies;
the key comes from the `INDEXNOW_KEY` environment variable and is never
committed.

```powershell
# one-time setup: generate a key, then serve it at
# https://precisioncorebuilders.com/<key>.txt (see follow-ups)
node -e "console.log(crypto.randomUUID())"

# submit (PowerShell)
$env:INDEXNOW_KEY = "<key>"; node scripts/indexnow.mjs

# preview the payload without sending anything
$env:INDEXNOW_KEY = "<key>"; node scripts/indexnow.mjs --dry-run
```

Run `pnpm sitemap` first if routes changed (it also runs inside `pnpm build`).
HTTP 200/202 from the API means the URLs were accepted.

## Follow-ups

1. **og-image asset** — create `client/public/og-image.jpg` (1200×630, branded)
   and update the og/twitter meta in `client/index.html` (currently a
   portfolio photo at non-standard 1261×946). Details in
   `client/public/og-image.README.md`; coordinate with the `index.html` owner.
2. **INDEXNOW_KEY** — generate a key, add `client/public/<key>.txt` so
   IndexNow can verify ownership, and set `INDEXNOW_KEY` in the deploy
   environment. Deliberately not generated/committed yet.
3. **Search Console / Bing Webmaster Tools** — once the custom domain is live,
   verify both properties and submit
   `https://precisioncorebuilders.com/sitemap.xml`.
4. **Optional** — link `manifest.webmanifest` from `client/index.html` if a
   public-site install experience is wanted (`manifest.json` remains the
   `/admin` PWA manifest).

5. **robots.txt** is the front door: it welcomes search and AI crawlers, keeps private surfaces out, and advertises the sitemap.
6. **sitemap.xml** (generated; runs automatically before `vite build`, or manually via `pnpm sitemap`) enumerates every public URL with `lastmod`/`changefreq`/`priority` so crawlers re-index what changed.
7. **llms.txt / llms-full.txt** live at well-known root URLs and give AI answer engines clean, citable facts (license, services, process, contact) so citations are accurate.
8. **manifest.webmanifest / humans.txt** round out site identity metadata.
9. **IndexNow** pushes URL updates to participating engines (Bing, Yandex, etc.) on deploy instead of waiting for re-crawl.
