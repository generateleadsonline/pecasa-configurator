# Pecasa published prices, checked 13 October 2026

**Scope:** I crawled all 208 URLs in `sitemap_index.xml` (post, page, portfolio and team sitemaps). I also crawled 16 case-study URLs and one page (`/insulated-garden-rooms/`) that are missing from the sitemap; I found them through the WordPress REST API. I searched the WP media library for PDFs and price images. I read the configurator iframe and the brochure PDF. Raw HTML is in `raw/pages/`, extracted text is in `raw/text/` and `raw/body/`, and the machine-readable version is `prices.json`.

**Rule:** I quote every figure verbatim. "Not found" means I searched for it and it is not on the site.

## 1. Summary

| # | Price source | URL | VAT wording | Style tied? |
|---|---|---|---|---|
| A | "Prices start from £23,000 including VAT for a 3 m × 2.8 m garden room." | https://www.pecasa.co.uk/ (3 times) | "including VAT" | No |
| B | Width × depth price grid, 30 cells, £22,300–£52,300 | /garden-rooms-london/ and 5 Hertfordshire pages | "Prices include VAT." | No |
| C | 11 "From £… (inc. Vat)" model cards | /our-products/ | "(inc. Vat)" / "(inc Vat)" | 10 named styles + 1 unnamed |
| D | Configurator default "Estimated price £… (inc. VAT)" for all 14 styles | /design-your-building/ (iframe) | "(inc. VAT)" | Yes |
| E | Planning consultancy and council fees | /faq/ | not stated | n/a |
| F | Generic cost ranges on four older location pages | Rickmansworth, Kings Langley, Berkhamsted, Bushey | not stated | No |
| G | Generic blog figures (cost per m², ROI scenario) | 2 blog posts | not stated | No |
| H | Hidden JSON-LD `priceRange` "£30000" / "$" | 225 / 20 pages | n/a | No |

**Extras and upgrades with a published price:** **not found.** No price is published anywhere for a bathroom, shower room, WC, kitchenette, decking, sedum or green roof, electrics, the base or foundations, AC or heating, triple glazing, acoustic insulation, rooflights or cladding upgrades. That applies to the pages, blog posts, FAQ, brochure and the configurator UI, which shows only a running total.

The homepage says "Upgrades such as air conditioning, a shower room or decking are priced in your quotation." It also says "See the full price list and what is included." That sentence is plain text with no link, and I found no price-list page or PDF.

The only add-on charges published are the planning fees in section E.

## 2. Homepage "from" price (A)

URL: https://www.pecasa.co.uk/ (JSON-LD dateModified 2026-10-09). `/team/` and `/our-team/` render the same content and canonicalise to the homepage.

1. "Prices start from £23,000 including VAT for a 3 m × 2.8 m garden room. Every Pecasa building is bespoke, and your final quotation reflects the design, specification and site requirements. You will also receive a free 3D design and a written, VAT-inclusive quotation, normally within seven days of your survey. Quotations remain valid for three months." (section "Clear, VAT-inclusive prices")
2. "Prices start from £23,000 including VAT for a 3 m × 2.8 m garden room. … Upgrades such as air conditioning, a shower room or decking are priced in your quotation. See the full price list and what is included." (section "How much does a garden room cost?")
3. "Prices start from £23,000 including VAT for a 3 m × 2.8 m garden room. Every Pecasa building is bespoke, and your final quotation reflects the design, specification and site requirements." (FAQ accordion)

- Size: 3 m × 2.8 m
- Style: not stated
- VAT: "including VAT"

## 3. Price grid (B): London plus 5 Hertfordshire pages

### 3.1 Pages carrying the grid

| URL | dateModified | Result |
|---|---|---|
| https://www.pecasa.co.uk/garden-rooms-london/ (reference) | 2026-10-05 | — |
| https://www.pecasa.co.uk/garden-rooms-design-herts/ | 2026-10-05 | Identical, 30/30 desktop + 30/30 mobile cells |
| https://www.pecasa.co.uk/garden-rooms-hertfordshire/ | 2026-10-05 | Identical |
| https://www.pecasa.co.uk/herts-garden-rooms/ | 2026-10-05 | Identical |
| https://www.pecasa.co.uk/outdoor-garden-buildings-hertfordshire/ | 2026-10-05 | Identical |
| https://www.pecasa.co.uk/garden-rooms-hertfordshire-create-your-garden-room-with-pecasa/ (blog post) | 2026-10-05 | Identical |

- **Cell-by-cell comparison with London:** 0 differences on all 5 pages. I checked both the desktop `<table>` and the mobile `<details>` cards, plus the header labels.
- **Diff of the whole price block** (from "Real Garden Room Price Examples - VAT Included" to "Pricing note…"): identical on all 5 pages.
- **No other location page has a grid.** The other 20+ location pages (Finchley, St Albans, Watford, Radlett, Berkhamsted, Edgware, and so on) have no grid.

### 3.2 The grid as published

Header cell: "Size (m) Depth × Width". Prices are VAT-inclusive.

| Depth ↓ / Width → | 3m wide | 4m wide | 5m wide | 6m wide | 7m wide | 8m wide |
|---|---|---|---|---|---|---|
| 2.8m deep "Compact & efficient" | £22,300 | £26,300 | £30,300 | £34,300 | £38,300 | £42,300 |
| 3m deep "★ Most popular" | £24,300 | £28,300 | £32,300 | £36,300 | £40,300 | £44,300 |
| 3.5m deep "Extra comfort" | £26,300 | £30,300 | £34,300 | £38,300 | £42,300 | £46,300 |
| 4m deep "More space" | £28,300 | £32,300 | £36,300 | £40,300 | £44,300 | £48,300 |
| 5m deep "Multi-purpose space" | £32,300 | £36,300 | £40,300 | £44,300 | £48,300 | £52,300 |

The column header labels are exact: "3m wideApprox. 8m² (e.g. 2.8 × 3.0)", "4m wideApprox. 10–12m² (e.g. 2.8 × 4.0)", "5m wideApprox. 14m² (e.g. 2.8 × 5.0)", "6m wideApprox. 17m² (e.g. 2.8 × 6.0)", "7m wideApprox. 20m² (e.g. 2.8 × 7.0)" and "8m wideApprox. 22m² (e.g. 2.8 × 8.0)".

The mobile cards repeat the same "Approx. …m²" label under every depth. For example, "3m wide Approx. 8m² £32,300" appears under 5m deep, even though 3 × 5 = 15 m².

Each step is +£4,000 per extra metre of width. Depth steps are +£2,000 (2.8→3 m), +£2,000 (3→3.5 m), +£2,000 (3.5→4 m) and +£4,000 (4→5 m). This is an observation only; the site does not state a formula.

### 3.3 Text around the grid (identical on all six pages)

- Heading: "Real Garden Room Price Examples - VAT Included"
- Intro: "A useful garden-room price should show what size and specification it relates to. PECASA publishes model examples with VAT included, giving homeowners a realistic starting point before the design is adapted to the site."
- Title: "Published PECASA model examples (including VAT)"
- Banner: "Bespoke garden rooms / Pricing Guide for every size / Premium builds, precision made. Installed in as little as 16–18 days."
- Badges: "Made in Britain / Built in our factory", "Ground screw foundation / Stronger. Cleaner. Greener.", "16–18 days / Installation in as little as 16–18 days*", "Independent warranty / For total peace of mind"
- VAT line: **"Prices include VAT. Final price may vary based on exact specification, site conditions and any additional options."** followed by "*Timescales vary by project."
- "What's included as standard": SIP construction (walls, roof & floor); Ground screw foundation system; EPDM rubber roof; High performance windows & doors; External cladding (choice of finishes); Electrical & data (internal fittings); Tape-and-joint internal finish; Decoration (painting & lighting)
- "Popular upgrades" (no prices): Kitchenette & bathroom; Decking & patio areas; Smart home features; Bespoke storage & furniture
- "All our buildings are backed by an independent 10 year insurance-backed warranty for complete peace of mind."
- "Made in BritainDesigned & built by Pecasa / Quick installation16–18 days (typical) / Bespoke design serviceFree 3D visualisations / Book your free surveywww.pecasa.co.uk · 020 8146 2200"
- Pricing note: "Pricing note: These are current published model examples, not fixed quotes for every site. Bespoke dimensions, access, ground conditions, glazing, services, bathrooms/kitchenettes, AC installation, decking and other options can change the final price. The written PECASA quotation should govern the final scope and cost."
- Style: **not stated.** The grid is not tied to any named range.

## 4. Product examples (C): https://www.pecasa.co.uk/our-products/

dateModified 2026-03-24. This is the only page that names styles with prices. Text is verbatim, including the site's typos.

| Card title (exact) | Dimensions (exact) | Price (exact) | £ | Style |
|---|---|---|---|---|
| PECASA CLASSIC 30m2 | 7m x 4.5m. Hight 2.5m. | From £48,500 (inc. Vat) | 48,500 | none named (image is a project photo) |
| PECASA LEVNO CLASSIC 16m2 | 4.8m x 3.4m. Height 2.5m. | From £25,457 (inc. Vat) | 25,457 | Levno |
| PECASA APEXO CLASSIC 15m2 | 5m x 3.05m. Hight 2.5m. | From £32,345 (inc. Vat) | 32,345 | Apexo |
| PECASA PORTAL CLASSIC 15m2 | 4.6M x 3.3m. Height 2.5m. | From £33.200 (inc. Vat) | 33,200 | Portal |
| PECASA ROKO CLASSIC 19m2 | 6m x 3.25m. Height 2.5m. | From £35,670 (inc. Vat) | 35,670 | Roko |
| PECASA CABANO CLASSIC 21m2 | 5.1m x 4.1m. Height 3.32m. | From £34.559 (inc. Vat) | 34,559 | Cabano |
| PECASA NSPIRO CLASSIC 27m2 | 6.1m x 4.5m. Height 3.27m. | From £38.456 (inc. Vat) | 38,456 | Inspiro (spelt "NSPIRO") |
| PECASA OFIKO CLASSIC 24.5m2 | 6.8m x 3.6m. Height 2.5m. | From £31,157 (inc. Vat) | 31,157 | Ofiko |
| PECASA ECKE CLASSIC 8m2 | 3.3m x 2.4m. Height 2.5m. | From £25,500 (inc. Vat) | 25,500 | Ecke |
| PECASA EDGE CLASSIC 20m2 | 5.2m x 3.7m. Height 2.5m. | From £30,250 (inc Vat) | 30,250 | Edge |
| PECASA L-SHAPE CLASSIC 16m2 | 4.8m x 3.6m. Height 2.5m. | From £34.099 (inc. Vat) | 34,099 | L-Shape |

- **Not on this page:** Pergola, Quba, Veranda and Angle have no card and no published price outside the configurator.
- **Separators:** four prices use "." as the thousands separator (£33.200, £34.559, £38.456 and £34.099). I read them as £33,200, £34,559, £38,456 and £34,099, but they are not machine-safe.
- **Dimensions:** the cards do not say whether dimensions are external or internal. "Hight" is the site's spelling.
- **Changes since 11 Oct:** none. All seven examples cited in the 11-Oct audit (Levno, Apexo, Portal, Roko, Ecke, Edge and L-Shape) still match. The audit omitted CLASSIC 30m2 £48,500, Cabano £34,559, NSPIRO £38,456 and Ofiko £31,157.

## 5. Configurator estimates (D): https://www.pecasa.co.uk/design-your-building/

- **Source:** the iframe at https://webadminservices.com/editor-app/a7221949-fee9-45dc-8b90-7ddc7561961d/app.html (configuration v23).
- **Method:** I clicked each Style tile, changed nothing else and submitted no form. I ran two passes in different orders, and both gave identical values.
- **Label template:** "Estimated price £X (inc. VAT)".
- **Dimensions:** taken from the configurator's Width, Depth and Height inputs.

| Style | Default W × D × H (m) | Displayed price (exact) |
|---|---|---|
| Levno | 4.8 × 3.4 × 2.7 | Estimated price £28,109 (inc. VAT) |
| Apexo | 5 × 3.05 × 2.616 | Estimated price £35,423 (inc. VAT) |
| Pergola | 4 × 3 × 2.5 | Estimated price £9,832 (inc. VAT) |
| Portal | 4 × 3.3 × 2.5667 | Estimated price £29,979 (inc. VAT) |
| Cabano | 4.2 × 4 × 3.3 | Estimated price £35,977 (inc. VAT) |
| Inspiro | 4.6 × 3.4 × 3.27 | Estimated price £28,906 (inc. VAT) |
| Quba | 4 × 2.7 × 2.5 | Estimated price £29,964 (inc. VAT) |
| Roko | 6 × 3.25 × 3 | Estimated price £31,019 (inc. VAT) |
| Ofiko | 3.7 × 2.4 × 2.5 | Estimated price £27,280 (inc. VAT) |
| Ecke (initial default) | 3.3 × 2.4 × 2.5 | Estimated price £26,639 (inc. VAT) |
| Edge | 4.1 × 3.4 × 2.5 | Estimated price £27,043 (inc. VAT) |
| L-Shape | 4 × 3.3 × 2.5 | Estimated price £28,207 (inc. VAT) |
| Veranda | 3 × 3 × 3.25 | Estimated price £35,434 (inc. VAT) |
| Angle | 4.5 × 3 × 2.5 | Estimated price £32,407 (inc. VAT) |

- The Ecke figure of £26,639 matches the 11-Oct observation.
- No item-level or extra prices appear in the configurator UI.
- The configurator's public `configuration.json?v=23` also contains a Levno `sizeMatrix` at `app.serviceData.ProceduralTemplateSets`, with values such as 20684 to 45143 and 500 mm steps. It is never displayed to customers and its units and axes are unlabelled, so it is **not a published price** and should not be quoted. It is stored verbatim in `prices.json` for reference only.

## 6. Planning fees (E): https://www.pecasa.co.uk/faq/

dateModified 2026-09-01. The FAQ page is labelled "Planning Guide" in the menu.

> "We use third party experts who charge, £600 for a full planning consultancy service to acquire planning permission or a Lawful Development Certificate, providing all elevation plans, site and location plans, design and access statement, completing the application and liaising with the Planning Team on your behalf until the planning decision is made. There are additional charges for the following requirements: Tree Plan (£75), Flood Risk Assessment (£75), Heritage, Ecosystems Services and Biodiversity/Wildlife Statements (£50)."
>
> "A separate fee is payable directly to the council upon submission of the application:- / Householder planning consent: £347 / Full planning for an annexe: £613 / Lawful Development Certificate: £216"

| Item | £ | VAT wording |
|---|---|---|
| Third-party planning consultancy (planning permission or LDC) | 600 | not stated |
| Tree Plan | 75 | not stated |
| Flood Risk Assessment | 75 | not stated |
| Heritage, Ecosystems Services and Biodiversity/Wildlife Statements | 50 | not stated |
| Council fee: householder planning consent | 347 | not stated |
| Council fee: full planning for an annexe | 613 | not stated |
| Council fee: Lawful Development Certificate | 216 | not stated |

The site's own cost page (https://www.pecasa.co.uk/garden-room-cost-prices/) warns: "Do not publish or rely on old application-fee figures without checking them."

## 7. Cost ranges on older location pages (F)

These are generic, conflict with A–D, and have no size, style or VAT wording.

| URL | dateModified | Exact wording |
|---|---|---|
| https://www.pecasa.co.uk/garden-rooms-rickmansworth/ | 2025-12-02 | "Costs vary depending on size, materials, and custom features, but smaller units might start around £10,000–£15,000. Larger, more luxurious builds—complete with heating, plumbing, and premium finishes—can cost £30,000–£50,000 or more. We provide transparent quotes and tailor our builds to your budget." |
| https://www.pecasa.co.uk/garden-rooms-kings-langley/ | 2025-12-02 | "Costs can range from £10,000 for a basic setup to £40,000+ for high-end, multi-purpose spaces with premium finishes. …" |
| https://www.pecasa.co.uk/garden-rooms-berkhamsted/ | 2026-10-05 | "Prices vary based on size, materials, and add-ons. You might spend £15,000 on the more basic end or £50,000+ for a high-end, feature-rich studio. We'll give you a tailored quote once we know your specific needs." |
| https://www.pecasa.co.uk/garden-homes-bushey/ | 2025-12-03 | "… Smaller, simpler builds might start around £15,000, while more luxurious Garden Offices with all the bells and whistles can exceed £50,000. We provide free estimates based on your unique requirements. 💵" |

Several location pages also give local house prices and rents. These are market commentary, not Pecasa prices, and I have excluded them.

## 8. Blog figures (G): generic, not Pecasa prices

- **https://www.pecasa.co.uk/garden-annex-vs-garden-room-vs-extension-vs-conservatory/** (2026-03-12)
  - "Cost per m²" table: Garden Room "£1,800 – £3,000"; Garden Annex "£2,500 – £4,000"; Rear Extension "£3,000 – £5,000"; Conservatory "£1,500 – £2,500".
  - "Total Installed Cost Calculator (Concept) … Garden room size: 4 m × 3 m / Estimated base cost: £20,000 / Foundations and groundworks: £2,000 / Electrical installation: £1,200 / Estimated total installed cost: £23,000". The parts sum to £23,200, not £23,000.
- **https://www.pecasa.co.uk/garden-room-roi-calculator/** (2026-03-13)
  - "Sample Scenario" table: Garden Room Cost £20,000 / £30,000 / £40,000 against Property Value £400,000 / £600,000 / £800,000, with Estimated Increase £12,000–£24,000 / £24,000–£48,000 / £32,000–£64,000. These are hypothetical.

## 9. Hidden structured data (H)

- Rank Math `LocalBusiness` JSON-LD on 225 pages: `"priceRange": "£30000"`.
- Older JSON-LD on 20 location pages: `"priceRange": "$"` and `Service.offers.price: "$"`. These 20 pages also give a different phone number (see CONFLICTS.md).

## 10. Checked and not found

- No price-list page or PDF. The only PDF in the media library is `final-brochure.pdf`, and it has no prices.
- No price images (media search: price, pricing, cost, spec, list, offer, promo).
- No prices for extras or upgrades.
- No finance, deposit or payment-terms figures. The Shenley FAQ says only "Depending on current Pecasa promotions or partnerships, you might find flexible financing options."
- No per-m² price from Pecasa itself.
- No price on any case study, and no price on `/garden-room-cost-prices/` itself, which has no figures.
