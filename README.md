# Pecasa Design Studio

An independently hosted Pecasa garden room configurator concept for Generate Leads Online. Researched against Pecasa’s live 11-stage visualiser and the current Noah and SMART configurators on 11 October 2026.

## Experience

Four guided stages with a persistent architectural 3D preview. All 14 original Pecasa building styles, authentic thumbnails, source-based sizing limits, accessible width/depth sliders in 0.1 m increments, use-specific furniture, cladding/glazing/floor selections, side windows and selected project extras. Includes outside/front/interior camera views, dusk, zoom, dimensional labels, an illustrative floor plan, authentic Pecasa project photography, undo/redo, local draft recovery and product-only share links.

A short enquiry form (name, email, postcode; phone and project context optional) unlocks the accepted guide estimate and a personalised four-page PDF. Prices are server-only; PDF access requires durable acceptance and an opaque bearer credential. A failed save cannot unlock either. Changed designs reuse the accepted contact details and produce an immutable PDF revision. Optional marketing preference is unchecked; no payment or automatic external messages.

## Pricing scope

Pecasa’s published London table supports exact widths 3–8 m in 1 m steps and depths 2.8/3/3.5/4/5 m. These are standard-room budget guides including VAT, not fixed prices for selected styling or extras. Other dimensions, L-Shape, Angle, Pergola and Veranda return a bespoke quote requirement. No interpolation or upgrade prices are invented. The homepage and price table have different minimum figures; the PDF explains the difference. See research/pecasa.md and server/README.md.

## Run

Node 22+ recommended.

```sh
npm ci
npm run dev
npm test
npm run build
```

Deploy with Netlify, using `npm run build`, publish `dist`, functions `netlify/functions`. Netlify CLI can deploy the existing production site with `netlify deploy --prod --site 4a50ab0d-7bfc-46f2-8c8b-4de832d91830 --dir dist --functions netlify/functions --no-build`.

## Lead storage and launch dependencies

Accepted leads are stored in a private, strongly consistent Netlify Blobs store, with stable production storage and isolated preview contexts. No CRM, inbox, email delivery or analytics provider is connected. Connect an approved destination before promising automatic follow-up. PDF/enquiry links expire after 90 days; configure record deletion/retention through the site operator. The privacy notice accurately describes this independent concept and the current storage flow.

The interface emits non-PII data-layer events: configurator_view, design_start, configurator_step_view, preview_view, quote_form_start, generate_lead (only after durable acceptance), quote_updated, design_share, design_pack_download. Connect these to an approved analytics property to measure baseline conversion and qualified lead rates; improvement is an objective, not a measured outcome.

## Validation

Meaningful backend tests cover pricing, contact/schema validation, source sizing bounds, JPEG limits, genuine API/PDF gates, accepted writes/readback, idempotency, updates, immutable PDF revisions, storage failure, expiry, origin and body bounds. Live browser QA and final PDF evidence are documented in qa/REPORT.md.

Research and assets use Pecasa’s official branding, original style thumbnails and verified project photography. Previews and layouts are illustrative; final products, dimensions, planning, site conditions and written price need Pecasa review.

GitHub: https://github.com/generateleadsonline/pecasa-configurator
Live: https://pecasa-garden-room-configurator.netlify.app/configurator/
