# Pecasa configurator release QA

Verified 11 October 2026 against the production deployment:
https://pecasa-garden-room-configurator.netlify.app/configurator/

Production site: `4a50ab0d-7bfc-46f2-8c8b-4de832d91830`.
Deploy: `6acb7759dbf40a7e370a2bea`.
Implementation tree on GitHub: `2c1920f8099870141b568444ca1006a83d516278`.

## Results

- Production build succeeds; all 14 meaningful backend tests pass.
- Live layouts checked at 375 × 812, 768 × 1024, 1280 × 720 and 1440 × 1000. Mobile and tablet document widths match their viewport widths, with no horizontal overflow. No broken images or captured browser console errors.
- Width and depth are native sliders with 0.1 m keyboard increments. Live changes update the visual and footprint; undo restores the preceding dimensions.
- All 14 original Pecasa styles are available with authentic thumbnails. Representative Portal, L-Shape, Veranda and Pergola journeys inspected. L-Shape plan records the cut-out footprint consistently; Pergola hides enclosed-room fittings and uses outdoor construction messaging.
- Outside, interior and dusk controls work. Expanded preview is an ARIA modal, restricts background interaction, traps focus and closes with Escape.
- Invalid enquiry fields receive specific errors; focus moves to the first invalid field. Phone and project context are optional, and marketing starts unchecked.
- Before acceptance, the interface exposes neither the price nor a PDF download. Anonymous GET requests to both `/api/quote` and `/api/design-pack` return 401.
- A clearly marked synthetic enquiry, reference `PC-E572D6FB`, was durably saved in production. A 4 × 3 m Portal unlocked the published £28,300 standard-room guide including VAT and downloaded a four-page PDF. No email or external outreach was sent.
- Reload restores the accepted estimate. Changing the width to 4.1 m hides the previous price/download until the update is saved. The accepted update reuses contact details and returns “Bespoke quote”.
- A shared design opened in a separate browser tab with the original 4 × 3 m choices, a fresh enquiry form and the price/PDF still gated. Its URL contains only the product design; no contact details or private access token.
- Every page of the live PDF was rendered and inspected: no clipping or overlaps. Selected dimensions, style, finish, entrance, side glazing, fittings, guide price and VAT wording match the accepted design. QR/link restoration targets the correct live origin and exact product choices.
- The actual 1500 × 1540 JPEG scene capture was extracted from the live PDF. `node tests/check-scene-capture.mjs qa/private/live-scene-capture.jpg` confirms the accepted image is embedded byte-for-byte, rather than replaced with a generic photograph.

## Evidence

- [Desktop](live-desktop.jpg)
- [Mobile](live-mobile.jpg)
- [Unlocked mobile estimate](live-mobile-estimate.jpg)
- [All four PDF pages](live-pdf-pages.png)
- [Live-generated example PDF](../docs/examples/pecasa-example-design-pack.pdf)

The example uses a fictional name, an example.com email and a QA note. Private bearer credentials, lead records and extracted QA internals are excluded from Git.

## Operating scope

The price is a source-backed standard-room budget guide, not a final selected-specification quotation. Bespoke dimensions, outdoor structures, upgrades and site conditions require Pecasa confirmation. No fabricated upgrade pricing or interpolation is used.

Accepted leads are stored privately in Netlify Blobs. CRM/inbox delivery and an external analytics property are not connected; the interface and privacy notice disclose the current flow. Funnel events are ready for an approved analytics connection. Conversion improvement has not yet been measured. PDF access expires after 90 days; automatic record deletion must be configured by the operator.
