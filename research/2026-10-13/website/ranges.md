# Pecasa ranges (14 styles), checked 13 October 2026

`ranges.json` holds the machine-readable version of this file, including full image srcsets and configurator size limits.

## Key finding: no product pages exist

None of the 14 styles has a dedicated product page, strapline or written description anywhere on www.pecasa.co.uk. I checked the sitemap (208 URLs), the WP REST API (pages, posts, `case-studies`), WP site search and the media library.

Style information exists in only three places:

1. **https://www.pecasa.co.uk/our-products/** has 11 cards: 10 named styles plus "PECASA CLASSIC 30m2". Each card gives a title, "W x D. Height H." and "From £… (inc. Vat)" with an image. There is no description text.
2. **The configurator** at https://www.pecasa.co.uk/design-your-building/ (iframe `webadminservices.com/editor-app/a7221949-…/app.html`, config v23) covers all 14 styles. It gives the name, thumbnail, default size, size limits and the displayed "Estimated price £… (inc. VAT)".
3. **Brochure PDF page 10** (https://www.pecasa.co.uk/wp-content/uploads/2025/05/final-brochure.pdf) shows 3D renders of 8 styles: Portal, Apexo, Roko, Ecke, Edge, Quba, "Lenvo" (sic) and L-Shape. It has no sizes, prices or descriptions.

The site publishes no style-specific specification. The standard specification is company-wide, and the sources conflict: homepage vs /the-pecasa-standard/ vs /garden-rooms-london/ (see `company.md` and `CONFLICTS.md`).

Pergola, Quba, Veranda and Angle exist only in the configurator (Quba also appears in the brochure render). The site never mentions them in text.

## Overview

| Style | Card on /our-products/ (exact) | Card price | Configurator default W×D×H (m) | Configurator price | In brochure p.10 |
|---|---|---|---|---|---|
| Levno | PECASA LEVNO CLASSIC 16m2 — "4.8m x 3.4m. Height 2.5m." | From £25,457 (inc. Vat) | 4.8 × 3.4 × 2.7 | £28,109 (inc. VAT) | Yes, as "Lenvo" |
| Apexo | PECASA APEXO CLASSIC 15m2 — "5m x 3.05m. Hight 2.5m." | From £32,345 (inc. Vat) | 5 × 3.05 × 2.616 | £35,423 | Yes |
| Pergola | not found | not found | 4 × 3 × 2.5 | £9,832 | No |
| Portal | PECASA PORTAL CLASSIC 15m2 — "4.6M x 3.3m. Height 2.5m." | From £33.200 (inc. Vat) | 4 × 3.3 × 2.5667 | £29,979 | Yes |
| Cabano | PECASA CABANO CLASSIC 21m2 — "5.1m x 4.1m. Height 3.32m." | From £34.559 (inc. Vat) | 4.2 × 4 × 3.3 | £35,977 | No |
| Inspiro | PECASA NSPIRO CLASSIC 27m2 — "6.1m x 4.5m. Height 3.27m." | From £38.456 (inc. Vat) | 4.6 × 3.4 × 3.27 | £28,906 | No |
| Quba | not found | not found | 4 × 2.7 × 2.5 | £29,964 | Yes |
| Roko | PECASA ROKO CLASSIC 19m2 — "6m x 3.25m. Height 2.5m." | From £35,670 (inc. Vat) | 6 × 3.25 × 3 | £31,019 | Yes |
| Ofiko | PECASA OFIKO CLASSIC 24.5m2 — "6.8m x 3.6m. Height 2.5m." | From £31,157 (inc. Vat) | 3.7 × 2.4 × 2.5 | £27,280 | No |
| Ecke | PECASA ECKE CLASSIC 8m2 — "3.3m x 2.4m. Height 2.5m." | From £25,500 (inc. Vat) | 3.3 × 2.4 × 2.5 | £26,639 | Yes |
| Edge | PECASA EDGE CLASSIC 20m2 — "5.2m x 3.7m. Height 2.5m." | From £30,250 (inc Vat) | 4.1 × 3.4 × 2.5 | £27,043 | Yes |
| L-Shape | PECASA L-SHAPE CLASSIC 16m2 — "4.8m x 3.6m. Height 2.5m." | From £34.099 (inc. Vat) | 4 × 3.3 × 2.5 | £28,207 | Yes |
| Veranda | not found | not found | 3 × 3 × 3.25 | £35,434 | No |
| Angle | not found | not found | 4.5 × 3 × 2.5 | £32,407 | No |

Notes on the overview:

- **Card dimensions:** the cards never say whether dimensions are external or internal. "Hight" and "4.6M" are the site's own text, and "." is used as the thousands separator on four prices.
- **Same size, different price:** these comparisons are reported, not explained.
  - Levno 4.8 × 3.4: card £25,457 vs configurator £28,109.
  - Apexo 5 × 3.05: card £32,345 vs configurator £35,423.
  - Roko 6 × 3.25: card £35,670 vs configurator £31,019.
  - Ecke 3.3 × 2.4: card £25,500 vs configurator £26,639.
  - The card height is 2.5 m in all four cases, while the configurator defaults to 2.7 m (Levno), 2.616 m (Apexo), 3 m (Roko) and 2.5 m (Ecke).

## Roof type

The website text states no roof type for any style. The configurator data says:

- **Pitched:** Inspiro (`RoofType.Pitched`, template "001-Pitch") and Cabano (`RoofType.Pitched`, default roof finish key "roof-copper").
- **Pergola:** `RoofType.BladesVertical`, a louvre roof. Its height limits also list Flat, Pitched, BladesHorizontal and Glass.
- **L-Shape, Angle and Veranda:** numeric `roofType` 1, 1 and 2. The public data does not label these numbers.
- **All others:** no `roofType` key in the default.
  - **Sloping wall tops in the default floor model:** Levno 2450→2700 mm, Apexo 2350→2617, Portal 2300→2567, Roko 2750→3000 and L-Shape 2385→2500. This suggests a mono-pitch or fall, but the site does not say so.
  - **Level wall tops:** Ecke, Ofiko, Quba and Edge at 2500 mm, Inspiro at 3270, Cabano at 3300, Veranda at 3250 and Angle at 2500.
- **Roof tab options:** the configurator's "Roof & Porch" tab offers "Roof Type: Flat / Pitched" tiles plus "Rooflight 1000 x 1400 / 1400 x 1400 / 2000 x 1400", "Trellis Canopy" and "Green roof". No prices are shown.
- **Brochure renders:** all 8 styles in the brochure appear flat-roofed. This is a visual observation only.

## Available sizes (configurator limits, `configuration.json?v=23`, non-admin)

| Style | Width (mm) | Depth (mm) | Height (mm) | Steps |
|---|---|---|---|---|
| Levno, Roko | 2000–10000 | 2000–8000 | 2500–3500 | 100 mm (W/D), 50 mm (H) |
| Portal | **2700**–10000 | 2000–8000 | 2500–3500 | 100 / 50 |
| Apexo | **3700**–10000 | 2000–8000 | 2500–3500 | 100 / 50 |
| Cabano, Inspiro, Quba, Ofiko, Ecke, Edge, L-Shape, Angle | 2000–10000 (Default) | 2000–8000 | 2500–3500 | 100 / 50 |
| Veranda | 2000–16000 | 2000–10000 | min 2450; max 3000 flat / 4000 pitched | 100 / 10 |
| Pergola | 2000–16000 | 2000–10000 | min 2000; max 3000 (flat, blades, glass) / 4000 pitched | 100 / 10 |

Notes on sizes:

- **Live UI checks:** Cabano's height slider showed 3.27–3.5 m at default. Apexo's width slider showed 3.7–10.
- **Website text on sizes:** the only site-wide statement is "Buildings typically range from 4 m² to 90 m², and our most popular size is around 30 m²" (homepage). No style has a published list of sizes.

## Per-style images

### Configurator thumbnails

Base URL: `https://webadminservices.com/editor-app/a7221949-fee9-45dc-8b90-7ddc7561961d/content/images/items/ranges/`. Every file returned HTTP 200 on 13 Oct.

| Style | Thumbnail file |
|---|---|
| Levno | R201.png |
| Apexo | R202.png |
| Pergola | Pergola.png |
| Portal | R203.png |
| Cabano | R922.png |
| Inspiro | R001-Pitch.png |
| Quba | R009.png |
| Roko | R204.png |
| Ofiko | R003.png |
| Ecke | R002.png |
| Edge | R004.png |
| L-Shape | R208.png |
| Veranda | R207.png |
| Angle | R215.png |

### /our-products/ card images

Base URL: `https://www.pecasa.co.uk/wp-content/uploads/2026/03/`. All main files returned HTTP 200 on 13 Oct. PNG originals of the same names also exist in the media library.

| Card | Main image and srcset variants |
|---|---|
| Levno | PECASA-LEVNO-CLASSIC-16m2.webp (500w), -300x179.webp |
| Apexo | PECASA-APEXO-CLASSIC-15m2.webp (500w), -300x161.webp |
| Portal | PECASA-PORTAL-CLASSIC-15m2.webp (500w), -300x168.webp |
| Roko | PECASA-ROKO-CLASSIC-19m2.webp (500w), -300x143.webp |
| Cabano | PECASA-CABANO-CLASSIC-21m2.webp (500w), -300x192.webp |
| Inspiro | PECASA-NSPIRO-CLASSIC-27m2.webp (500w), -300x173.webp |
| Ofiko | PECASA-OFIKO-CLASSIC-24.5m2.webp (500w), -300x170.webp |
| Ecke | PECASA-ECKE-CLASSIC-8m2.webp (500w), -300x200.webp |
| Edge | PECASA-EDGE-CLASSIC-20m2.png (640w), -300x160.png, -600x320.png |
| L-Shape | PECASA-L-SHAPE-CLASSIC-16m2.webp (500w), -300x179.webp |
| CLASSIC 30m2 (no style) | PECASA-CLASSIC-30m2.png (640w), -300x156.png, -600x311.png. This is a photo of a completed flat-roof project, not a render. |

Pergola, Quba, Veranda and Angle have no website image. They have only the configurator thumbnail, and Quba also has the brochure render.

## Per-style detail

For every style, these fields are the same:

- **Product page:** not found.
- **Strapline and description:** not found.
- **Standard specification:** not stated per style.
- **External/internal dimensions:** not stated.

| Style | Template | Marketing name | Website dimensions | Prices | Notes |
|---|---|---|---|---|---|
| Levno | 201 | PECASA LEVNO CLASSIC 16m2 | 4.8m x 3.4m, Height 2.5m | £25,457 (card); £28,109 (configurator) | Brochure spells it "Lenvo" |
| Apexo | 202 | PECASA APEXO CLASSIC 15m2 | 5m x 3.05m, Hight 2.5m | £32,345; £35,423 | Configurator min width 3.7 m |
| Pergola | 222 | not found | not found | £9,832 (configurator only) | Not a room; louvre or blade roof options; up to 16 × 10 m |
| Portal | 203 | PECASA PORTAL CLASSIC 15m2 | 4.6M x 3.3m, Height 2.5m | £33,200; £29,979 | Configurator min width 2.7 m; default 4 m wide vs card 4.6 m |
| Cabano | 922 | PECASA CABANO CLASSIC 21m2 | 5.1m x 4.1m, Height 3.32m | £34,559; £35,977 | Pitched |
| Inspiro | 001-Pitch | PECASA NSPIRO CLASSIC 27m2 | 6.1m x 4.5m, Height 3.27m | £38,456; £28,906 (different default size) | Pitched; spelt "NSPIRO" on site |
| Quba | 009 | not found | not found | £29,964 (configurator only) | Brochure render only |
| Roko | 204 | PECASA ROKO CLASSIC 19m2 | 6m x 3.25m, Height 2.5m | £35,670; £31,019 | Configurator default height 3 m vs card 2.5 m |
| Ofiko | 003 | PECASA OFIKO CLASSIC 24.5m2 | 6.8m x 3.6m, Height 2.5m | £31,157; £27,280 (configurator default 3.7 × 2.4) | — |
| Ecke | 002 | PECASA ECKE CLASSIC 8m2 | 3.3m x 2.4m, Height 2.5m | £25,500; £26,639 | Configurator's initial default style |
| Edge | 004 | PECASA EDGE CLASSIC 20m2 | 5.2m x 3.7m, Height 2.5m | £30,250 ("inc Vat"); £27,043 (configurator default 4.1 × 3.4) | — |
| L-Shape | 208 | PECASA L-SHAPE CLASSIC 16m2 | 4.8m x 3.6m, Height 2.5m | £34,099; £28,207 (configurator default 4 × 3.3) | — |
| Veranda | 207 | not found | not found | £35,434 (configurator only) | Up to 16 × 10 m |
| Angle | 215 | not found | not found | £32,407 (configurator only) | — |

## Unnamed card

"PECASA CLASSIC 30m2", "7m x 4.5m. Hight 2.5m.", "From £48,500 (inc. Vat)". No style is named.
