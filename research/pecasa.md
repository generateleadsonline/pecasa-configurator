# Pecasa configurator research — checked 11 October 2026

## Evidence and live source

- Current entry: https://www.pecasa.co.uk/design-your-building/
- Fullscreen iframe: https://webadminservices.com/editor-app/a7221949-fee9-45dc-8b90-7ddc7561961d/app.html
- Public data: same iframe directory, `configuration.json?v=23`. Version 23 is the current entry's data version. Exact, normalized public options are in `pecasa-catalog.json`.
- Public JavaScript is proprietary Garden Room Planner software (Jan Mikeska copyright). It was inspected in temporary research files; it must not be copied as the new application's implementation.

## Current user experience

The existing iframe fills the viewport and overrides the surrounding website layout. It exposes price continuously before lead capture. Width/depth already use sliders; the replacement should keep sliders and improve their feedback, keyboard support, size context and mobile placement. Fourteen style choices and eleven category tabs provide considerable depth, but the category-first journey asks customers to understand construction terminology before deciding what they need. Core actions sit in an icon toolbar and the final category is labelled Save even though its form submits an enquiry. This is a conversion opportunity: show the outcome and value of the design pack before asking for contact details, keep the 3D preview visible, then gate price and PDF through one short form.

Current tabs, in order: Style; Roof & Porch; Layout & Bathroom; Windows & Doors; Exterior Finish; Interior & Floor; Decking; Kitchen; Furniture & Decorations; Electrics & Lighting; Save.

Save form requires first name, last name, email, phone and postcode, with optional notes. Its success says a representative will contact the customer. Other source messages support saving designs by email and recovering account information. No enquiry was submitted during research.

The rendering has exterior/interior/roof-hidden/floor-plan views, plan dimensions, adjustable objects, undo/redo, lighting/night state and snapshots. PDF settings include a cover rendering, dimensioned floor plan and four elevations. The new document should combine those visuals with an inclusion/exclusion schedule, clear indicative status, selected options and next steps.

## Exact style inventory

| UI name | Template ID | Source default floor width × depth | Source height |
|---|---|---|---|
| Levno | 201 | 4.8 × 3.4m | 2.7m |
| Apexo | 202 | 5 × 3.05m | 2.616m |
| Pergola | 222 | 4 × 3m | 2.5m |
| Portal | 203 | 4 × 3.3m | 2.567m |
| Cabano | 922 | 4.2 × 4m | 3.3m |
| Inspiro | 001-Pitch | 4.6 × 3.4m | 3.27m |
| Quba | 009 | 4 × 2.7m | 2.5m |
| Roko | 204 | 6 × 3.25m | 3m |
| Ofiko | 003 | 3.7 × 2.4m | 2.5m |
| Ecke | 002 | 3.3 × 2.4m | 2.5m |
| Edge | 004 | 4.1 × 3.4m | 2.5m |
| L-Shape | 208 | 4 × 3.3m | 2.5m |
| Veranda | 207 | 3 × 3m | 3.25m |
| Angle | 215 | 4.5 × 3m | 2.5m |

Dimensions in the source building model are floor coordinates, while the slider measures the external roof outline. Overhangs and integrated porches can therefore change the visible external size. These source defaults are not a guarantee that the UI slider displays the same number.

Public bounds: standard styles use width 2–10m and depth 2–8m; Portal minimum width 2.7m and Apexo minimum width 3.7m. Pergola and Veranda support width 2–16m and depth 2–10m. All use 100mm width/depth steps. Standard height is 2.5–3.5m in 50mm steps. Veranda/Pergola use 10mm height steps and roof-specific maximums (flat 3m; pitched 4m). Keep height planning guidance conditional; these larger source dimensions do not imply permitted-development eligibility.

## Useful option depth

- Rooflights: 1000×1400, 1400×1400 and 2000×1400mm; trellis canopy, veranda, pergola and side infill.
- Layout: bathroom, cloakroom, sauna, partitions, internal doors and bathroom fixtures.
- Glazing: single/double/sliding/folding/stacker/solid doors, fixed and tilt-and-turn/awning windows, plus pergola panels.
- Cladding: vertical/horizontal cedar, render, composite granite/stone/silver-birch/walnut/oak, stone, Shadow Line, Board & Batten, black/white/grey shiplap and pine. Source keys and swatch paths are in the catalog.
- Internal finishes: white and muted blue/yellow/green plaster plus plywood; broad named flooring choice. Kitchen has 53 menu items; furniture/decorations 193; electrics/lighting 27. Progressive disclosure is essential.
- Furniture represents visual planning objects; do not imply every furniture item is supplied or included.

## Verified pricing basis and limitations

Official published grid: https://www.pecasa.co.uk/garden-rooms-london/

| Depth / Width | 3m | 4m | 5m | 6m | 7m | 8m |
|---|---|---|---|---|---|---|
| 2.8m | £22,300 | £26,300 | £30,300 | £34,300 | £38,300 | £42,300 |
| 3m | £24,300 | £28,300 | £32,300 | £36,300 | £40,300 | £44,300 |
| 3.5m | £26,300 | £30,300 | £34,300 | £38,300 | £42,300 | £46,300 |
| 4m | £28,300 | £32,300 | £36,300 | £40,300 | £44,300 | £48,300 |
| 5m | £32,300 | £36,300 | £40,300 | £44,300 | £48,300 | £52,300 |

VAT is included. Published examples depend on specification and site. The homepage separately states £23,000 for 3×2.8m; the sources are inconsistent. These are baseline guide figures, not reliable all-style bespoke quotes. Do not imply that custom geometry, larger sizes, upgrades or selected glazing can be calculated from this grid. Unsupported configurations should request a tailored figure after the lead, and the PDF must distinguish selected requirements from priced inclusions.

The current anonymous API accepts `POST /api/configurator/priceCalculations` with `{applicationId, data: fullDesign, userId:null}`. This is a calculation, not the enquiry endpoint. It returns nearest Levno price template, geometry rates, selected items and optional rates. Numeric option enums are required. Reconstructed Ecke 3.3×2.4m returned £25,989.6464, while the observed browser default was £26,639. Adding roof defaults changed the result but did not reproduce the observed number. Do not use this research request as a validated pricing engine. `pecasa-price-api-research.json` stores the limited findings and 87 optional rates; duplicate type variants show why assigning generic extras prices would be misleading. Tax rate returns 0 while UI labels VAT-inclusive, so VAT must not be added again.

Product-specific published examples at https://www.pecasa.co.uk/our-products/ include Levno 4.8×3.4m £25,457; Apexo 5×3.05m £32,345; Portal 4.6×3.3m £33,200; Roko 6×3.25m £35,670; Ecke 3.3×2.4m £25,500; Edge 5.2×3.7m £30,250; L-Shape 4.8×3.6m £34,099. These published defaults also differ from the live JSON dimensions; do not combine them into a fabricated per-style multiplier.

## Current company specification and conversion proof

Source: https://www.pecasa.co.uk/

Pecasa manufactures SIPs in Watford and serves the UK; it reports 120+ completed projects since 2017, 100+ years of combined experience and Made in Britain membership. Standard specification comprises SIP walls/floor/roof, Radix screws on suitable ground, EPDM roofing, Cortizo aluminium glazing, external cladding, tape-and-joint plasterboard, 12mm premium laminate and internal lights/electrics. Site clearance, supply power, water/drainage, skips and parking are separately priced. Qualifying builds have a 10-year IWA warranty subject to registration/policy. Surveys are free; written quotes normally arrive within seven days and last three months. Up-to-16m² installation guarantee is ten working days subject to specification/access/weather. Larger builds are scheduled individually. Contact: info@pecasa.co.uk; 020 8146 2200.

Use the current qualified homepage statements when older location pages claim broader guarantees. Avoid an unconditional 14-day promise or warranty for every configuration. AC/heating, bathrooms/kitchenettes, decking, acoustic insulation and triple glazing should remain separately quoted upgrades.

## Authentic branding and assets

- Official black/white Pecasa logo, with turquoise Premium Garden Rooms tagline: `public/assets/pecasa-logo.webp` (205×106 source) and `pecasa-logo-footer.webp`.
- Exact current iframe colours: turquoise `#1DAFA4`, dark teal `#18746C`, pale mint `#d3f8f2`, muted neutral `#6D7973`; site custom CSS also uses deep teal `#022828`. Dark teal is better for readable primary controls on pale backgrounds.
- Website font configuration requests Arial. The iframe stylesheet uses Arial/Helvetica and Barlow Condensed. An upgraded system sans is a design choice, not a claimed official brand font.
- Fourteen authentic thumbnails: `public/assets/styles/{key}.png`, with lowercase names and `lshape` for L-Shape. `style-asset-sources.json` provides exact source URLs.
- Official product renderings: `public/assets/pecasa-{model}-classic-{size}.webp/png`; company project still and hero image in `pecasa-project.jpeg` and `pecasa-hero.webp`. `asset-sources.json` records all source URLs.
- The hero still was downloaded as an image directly from the page; no remote video was downloaded.
