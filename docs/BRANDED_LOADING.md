# Branded loading

The HTML shell contains critical loading styles and an inline copy of the clean
Precision Core Builders vector logo. It paints independently of app JavaScript
and downloaded styles. Keep that logo and roofline consistent with
`client/src/components/BrandedLoader.tsx`, which uses the same styles for lazy
route transitions.

With JavaScript enabled, `pcb-boot` conceals prerendered content until the route
has committed and local stylesheets contain usable rules. `FirstRenderReady`
then reveals the app beneath a short fade. There is no artificial minimum wait.
If assets fail, the screen offers reload and phone contact after 12 seconds.
Reduced motion removes both the roofline drawing and loading sweep. Without
JavaScript, the loading screen stays hidden and public prerendered pages render
normally.

Prerendering normalizes local stylesheet URLs to site-relative paths so exported
pages never depend on the local build server. `pnpm check:marketing` checks this
across every public page. After `pnpm build`, run `pnpm test:marketing:loading`
for delayed JavaScript, lazy route transitions, CSS failure, desktop/mobile,
reduced motion, and JavaScript-disabled checks. Screenshots go to ignored
`audit/loading/`.
