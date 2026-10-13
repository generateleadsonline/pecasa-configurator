# Pecasa garden room designer (v2)

A 3D configurator for Pecasa Premium Garden Rooms, built for Generate Leads Online. It covers all 14 of
Pecasa's styles, at the sizes, options and finishes of Pecasa's own planner (configuration v23,
read 13 October 2026). Its only prices are ones Pecasa publishes.

- Live: https://pecasa-garden-room-configurator.netlify.app/configurator/
- QA report: [docs/qa/CONFIGURATOR-QA.md](docs/qa/CONFIGURATOR-QA.md)
- Points for Pecasa to confirm: [docs/qa/CONFIGURATOR-CONFIRMATIONS.md](docs/qa/CONFIGURATOR-CONFIRMATIONS.md)
- Example customer PDFs: [docs/examples/](docs/examples/)
- Source research (website, brochure, planner, photographs): [research/2026-10-13/](research/2026-10-13/)

## What it does

- **Six steps:** style, size and roof, exterior, doors and windows, interior, and your price.
- **3D model:** each style is built to the planner's template geometry:
  - roof kind, fall or pitch
  - fascias, fins, posts and decks
  - glazed corners
  - cladding direction
  - board widths at true scale
- **Views:** outside, inside and plan. Zoom by buttons, scroll or pinch. The plan view is dimensioned.
- **Camera:** every option turns the camera to the part it changes and outlines it.
- **Prices**, from three published sources:
  - Pecasa's online estimate at each style's default size.
  - The /our-products/ "from" prices at those exact sizes.
  - The published price table, at its sizes, for enclosed rectangular styles.

  Every other size, and every extra, is **Quoted** or **Upgrade**. Nothing is invented.
- **Sales:**
  - Header: request a callback, visit the showroom, download the brochure, and the phone number.
  - Price page: adds Book a call and Download PDF.
  - Selling points from Pecasa's own pages appear beside the step each one supports.
  - A short tour on the first visit, replayable from Help.
  - Every step and call to action is pushed to `dataLayer`.
- **Forms** (Netlify Forms): separate first and last names, a required UK phone number checked against Ofcom's numbering plan, email and postcode. Each form carries the full specification and a link to the design.
- **PDF:**
  - high-resolution renders: hero, front, four sides, at dusk, two interiors and the plan
  - a dimensioned drawing
  - the full specification, continuing onto extra pages if needed
  - the price, the next steps, and a booking link and QR code
- **Every device:** the boot ladder from the SMART configurator (`src/configurator-boot.js`):
  - high, medium and low quality tiers, an older-WebGL build (three r162) and a simple-shading safe tier
  - a flat SVG drawing as the last resort
  - a rebuild when the context is lost, and a crash guard that ignores early reloads
  - texture memory freed once uploaded
  - `?debug3d` diagnostics
- **Lazy 3D:** the 3D code loads only on the first interaction, or when the page is idle. Until then a poster of the style shows.

## Layout

- `src/`: page, styles and modules.
  - `configurator-data.js`: styles, options, published prices and selling points, all with sources.
  - `configurator-model.js`: state, pricing, fitting, share links, spec and validation.
  - `configurator-geometry.js`: the planner's templates.
  - `configurator-building.js`, `configurator-furniture.js` and `configurator-textures.js`: the 3D model.
  - `configurator-scene.js`: renderer, views, focus and captures.
  - `configurator-pdf.js`: the customer PDF.
- `tools/build.py`: bundles with esbuild into `public/`. It hashes the assets, expands the form fields and writes the CSP. `public/` is committed, so Netlify deploys it as built.
- `tools/posters.py`, `tools/fonts.py`, `tools/build-pdf-assets.py`: posters, font subsets and PDF assets.
- `tools/qa/`: browser QA suites (below). `zfight.js`, `shot.mjs` and `check-mobile-3d.mjs` are reused from the SMART repo.

## Build and test

```sh
npm ci
npm run build          # python3 tools/build.py
npm run check          # sh build.sh: what Netlify runs
npm test               # model, prices, fitting, validation; PDFs read back; attribution
```

The browser suites need `playwright-core`, set in `PLAYWRIGHT_CORE`, plus Google Chrome. The mobile suite also needs Playwright's WebKit. Each takes a base URL, local or live:

```sh
node tools/qa/check-options.mjs  <url>      # every option visibly changes the model and is highlighted
node tools/qa/check-zfighting.mjs --url <url>  # no coplanar flicker, every style and size
node tools/qa/check-mobile-3d.mjs <url>     # iPhone (WebKit), Android (Chrome), forced failures
node tools/qa/check-layout.mjs   <url>      # 320 to 1440px: no sideways scroll, 44px targets, axe (AXE_CORE=…/axe.min.js)
node tools/qa/check-flows.mjs    <url>      # tour, views, zoom, CTAs, forms (POSTs intercepted), analytics
```

## Deploy

Netlify site `4a50ab0d-7bfc-46f2-8c8b-4de832d91830`:

- Build command: `sh build.sh`. Publish directory: `public`.
- Form detection must be on for the five forms:
  - `pecasa-design-quote`
  - `pecasa-callback`
  - `pecasa-book-call`
  - `pecasa-showroom-visit`
  - `pecasa-brochure`
- The preview is `noindex`. Its CSP has no `unsafe-inline`.

Before launch, Pecasa needs to name where enquiries should go (the email inbox or CRM), and supply a Google Tag Manager ID and, if it has one, a booking calendar link. See the confirmations list.
