# Site Plans: scale, measurement and takeoff

**Status:** Phase 1 shipped · Phases 2–3 planned
**Owner:** Eric (what he measures) / the codebase (the arithmetic)

## Why

`/admin/site-plans` was a stock Excalidraw whiteboard. A wall "labelled 20'" was
only text — the canvas works in pixels, so nothing on a plan was a real length
or area, and nothing could feed an estimate. The tool now has a real scale and
measures what's drawn. We kept Excalidraw rather than building CAD: Eric needs
trustworthy quantities, not a drafting package (Bluebeam/PlanGrid already exist
for that).

## How it works

```
draw / drop stamps → mark (room · wall · door · window) → calibrate scale
        → shared/planMeasure.ts → live readout + takeoff (browser)
                                → sitePlans.takeoff (server, from the STORED plan)
```

- **Scale** is `site_plans.scale_px_per_ft` (NULL = never calibrated → default
  `20` px/ft, i.e. one grid square = one foot). Set by drawing a line over a
  known length and typing its real length (`12' 6"`, `12.5`, `150"`).
- **Marking** is `customData.pcb = { kind, name?, wallType? }` on an Excalidraw
  element. Library stamps are marked automatically (`classifyStamp`); the
  builder marks anything else from the Measure tab. **Only marked shapes count**
  in the takeoff, so loose sketching never inflates quantities.
- **Takeoff** = floor area (per room), wall run by type, door/window counts,
  fixture counts. Closed lines measure with the shoelace formula, so angled
  rooms are exact.
- **The server recomputes** the takeoff from the stored elements + scale
  (`sitePlans.takeoff`). The browser's live panel is a convenience; a quantity
  that reaches an estimate is never one the client merely asserted.

Quantities only. Dollars stay in `shared/estimating/basis.ts` — a plan can give
the estimator its square footage, never a price.

## Files

| File                                          | Owns                                                                       |
| :-------------------------------------------- | :------------------------------------------------------------------------- |
| `shared/planMeasure.ts`                       | Scale, geometry, length parse/format, tags, `computeTakeoff` (pure/shared) |
| `client/src/lib/planScene.ts`                 | Scene helpers: change signature (dirty check), tagging, dimension text     |
| `client/src/components/plan/MeasurePanel.tsx` | Measure tab: scale, selection readout, marking, takeoff                    |
| `client/src/pages/admin/SitePlanBuilder.tsx`  | Canvas, library, save/load, unsaved-work guard                             |
| `server/routers/sitePlansRouter.ts`           | CRUD + `takeoff`; scale is bounded 0.5–5000 px/ft                          |
| `drizzle/migrations/0015_site_plan_scale.sql` | The `scale_px_per_ft` column (additive, idempotent)                        |

## Also fixed in Phase 1

- **Unsaved work was silently lost** — loading another plan or pressing New
  replaced the canvas with no warning, and there was no autosave. There is now
  an "Unsaved changes" indicator, a discard confirmation, and a `beforeunload`
  guard. "Dirty" is judged by element versions, so scrolling/zooming doesn't
  count.
- **Honest stamps** — the dimension-line stamp said `10'-0"` but was 6 ft long
  at the grid scale; it is now genuinely 10 ft. Stamps are resized to the plan
  scale and placed at the true visible centre (zoom-aware).
- **The in-app guide** described a client-portal "Share" button and a "Stamps"
  toolbar button that don't exist; corrected.

## Phases

| Phase | Scope                                                                                                                                          | Status  |
| :---- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1     | Scale, measured readout, marking, takeoff panel + server `takeoff`, unsaved-work guard                                                         | Shipped |
| 2     | Plan ↔ project link in the UI; "use floor area" → estimator square footage (server-derived); layout so the panel stops covering the drawing    | Planned |
| 3     | Plan revisions; client-portal share (read-only) and PDF export — only if Eric asks for it; no CAD (wall joins, auto-dimensioning) unless asked | Planned |

## Operating notes

- Migration `0015` must be applied to production. Until it is, **saves still
  work** (an uncalibrated plan never writes the column and an unchanged scale is
  never re-sent) but calibrating and saving a scale will fail.
- Changing a plan's scale changes what every shape measures — by design, since
  calibration is how a photographed or imported plan is brought to true size.
