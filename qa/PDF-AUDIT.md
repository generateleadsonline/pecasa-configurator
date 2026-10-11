# PDF QA follow-up - 11 October 2026

The standard four-page example and five stress variants were checked after corrections: 24 rendered pages in total. Variants cover all extras, an 80-character name with unsupported glyphs, a minimum 2 × 2 m L-Shape with kitchenette and bathroom, a maximum Veranda, and a maximum Pergola.

## Corrected findings

1. Rectangular plan notes mentioned an L-shaped cut-out. Notes now describe the selected building style, including the enclosed-room envelope for Veranda and the open structure for Pergola.
2. Furniture overlapped the kitchenette and crossed the recessed front of the smallest L-Shape. Metre-based placement checks now reject symbols that collide with selected fixtures or extend outside the main room body. The PDF also clips furniture and fittings to the room outline. Furniture is omitted when the selected footprint cannot depict it clearly.
3. Accepted name characters outside Manrope's glyph coverage silently disappeared. The cover checks the embedded font's actual glyph map. Unsupported names receive “Prepared for your project”; the full name remains in the private enquiry record. Supported names retain the personal salutation and wrap correctly.
4. A Pergola investment callout could have text below its mint background. The optional callout is now shown only when sufficient vertical space is available. The quote rows, next steps, source and footer retain clear spacing.

## Verification

- All 24 final pages rendered and visually inspected, with no material layout regressions.
- All 20 automated backend/geometry tests pass, including six furniture placement regressions.
- Main example: Portal 4 × 3 m, cedar, bifold doors, no side window or optional extras; published £28,300 standard-room guide including VAT.
- Stress price lists: all selected items recorded, up to 12 quote rows; unpriced options remain explicitly quoted separately. Bespoke structures show no invented numeric price.
- The actual scene JPEG is accepted and embedded byte-for-byte. Embedded regular/bold Manrope fonts include ToUnicode maps for correct text extraction.
- The main PDF's QR code was decoded from a 300 dpi page render and restores the exact design on the live Netlify origin. PDF annotations contain the correct public design, company email and pricing source links; no contact details or private bearer tokens in share links.
- Page size is A4 throughout; document titles, references, page numbering, footers and source wording remain consistent.

The updated [example](../docs/examples/pecasa-example-design-pack.pdf) and [four-page preview](live-pdf-pages.png) are included alongside the source. Private stress fixtures and receipts are excluded from Git.

## Fresh production verification

The corrected generator was published in [commit d516c4d4](https://github.com/generateleadsonline/pecasa-configurator/commit/d516c4d4ff22e319a8276661c5eff164b2d5838c) and [Netlify deployment 6acb81bf](https://app.netlify.com/projects/pecasa-garden-room-configurator/deploys/6acb81bf9f486c0f057dfcdc). A clearly marked synthetic submission on the production origin returned HTTP 201; its PDF downloaded with HTTP 200 in about 3.0 seconds and contained the exact accepted scene JPEG. A request without a saved enquiry token returned HTTP 401.

All four fresh production pages were rendered and visually reviewed, bringing the total to 28 checked pages. Checks confirmed A4 page sizes, both embedded Manrope font streams, the safe heading for an unsupported name, the corrected rectangular plan note, the £28,300 VAT-inclusive guide and matching specification. Both public reopen links restore the exact submitted design. The QR code was decoded from the actual production PDF at 300 dpi and also restored that design on the live origin. The PDF response remained private and non-cacheable. No material layout issues were found; private receipts and access tokens remain excluded from this report and Git.
