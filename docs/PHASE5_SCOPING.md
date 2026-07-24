# Phase 5 — Analytics & Portfolio: Scoping

_Genuine net-new work (per `ADMIN_COMPLETION_PLAN.md`). Sized for planning; nothing here is on the critical path to go-live._

## Candidate tracks

### A. Portfolio showcase upgrades (~8–14 h)

- **Before/after sliders on more projects** — `BeforeAfterSlider` exists; the work is curating photo pairs + adding `beforeAfter` entries in `client/src/data/projects.ts`. Mostly content, not code.
- **360° walkthroughs** — SuperSplat viewer is already embedded on Home (`SuperSplatTeaser`); extending it to per-project splats is a content pipeline (capture → publish → paste URL), plus a small `ProjectWalkthrough` component reusing the existing iframe pattern.
- **Testimonials page/section** — real client quotes + project cross-links. Content-first.

### B. Command Center analytics depth (~10–16 h)

- Profitability trends over time (needs dated cost snapshots — schema addition: `project_cost_snapshots` or derive from `ledger_entries` + `materials` by month).
- Estimated-vs-actual per cost category (labor/materials/permits breakdown exists in estimates; actuals exist in ledger — needs a join view + chart).
- Crew schedule utilization heatmap from `schedule_items`.

### C. AI search depth (~6–10 h)

- "Ask across projects" — `search.ts` + `ai-copilot.ts` exist; add retrieval over `ledger_entries` and `field_reports` (embeddings in Supabase `pgvector` or keyword + LLM rerank to stay free-tier).
- Saved/frequent queries for Eric ("What did we spend on Spyglass?", "Which subs are on the Fairview job?").

### D. Client portal polish (~4–8 h)

- Before/after interactive reveals for clients (reuse `BeforeAfterSlider` in portal reports).
- Milestone celebration moments (confetti-free, on-brand: gold check animation on payment confirmation).

## Recommendation

Start with **A (content-driven, fast visible wins)** and the saved-queries slice of **C** — both reuse existing infrastructure and carry marketing + sales value. B requires schema decisions and is the only track with real migration risk.

## Explicitly out of scope (for now)

- 360 capture hardware/software purchases (Eric's call)
- Review-platform integrations (Google Business Profile API) — needs owner OAuth
- Native mobile app — PWA already covers the field use case
