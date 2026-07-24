# og-image placeholder note

**Status: asset needed (follow-up) — no branded og-image exists yet.**

`client/index.html` currently points `og:image` / `twitter:image` at
`https://precisioncorebuilders.com/portfolio/signature-outdoor-01.jpg`
(1261×946). That works, but it is a portfolio photo rather than a branded
social card, and its dimensions are not the recommended 1200×630.

## Follow-up: create `client/public/og-image.jpg`

- 1200×630 px, JPG (or PNG), ideally < 300 KB
- Brand: logo + "Precision Core Builders" + "Custom Homes & Remodeling —
  Eugene, OR" + "CCB #246527" on the dark brand background (`#0C0A08`) with
  the gold accent (`#C8A84B`)
- Then update `og:image`, `og:image:width` (1200), `og:image:height` (630),
  and `twitter:image` in `client/index.html` to
  `https://precisioncorebuilders.com/og-image.jpg`
  (`client/index.html` is owned by the SEO teammate — coordinate there)
