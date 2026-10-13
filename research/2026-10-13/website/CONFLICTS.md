# Pecasa source conflicts, checked 13 October 2026

Each entry quotes both sides with URLs. "Home" means https://www.pecasa.co.uk/ (dateModified 2026-10-09). Where card or grid dimensions are compared, I read card text "A m x B m" as width × depth; the cards do not say which is which.

---

## A. Prices

### A1. Same size, two different "from" prices: £23,000 vs £22,300

- **Home:** "Prices start from £23,000 including VAT for a 3 m × 2.8 m garden room."
- **Grid** (https://www.pecasa.co.uk/garden-rooms-london/ and 5 Herts pages): row "2.8m deep", column "3m wide": **£22,300**. "Prices include VAT."

### A2. Model cards undercut the grid for the same or larger footprint

Sources: card text from https://www.pecasa.co.uk/our-products/ ("From £… (inc. Vat)"); grid cells from /garden-rooms-london/.

| Card (exact) | Card price | Grid cell for a smaller-or-equal footprint | Grid price |
|---|---|---|---|
| LEVNO 4.8m x 3.4m (16.3 m²) | £25,457 | 4m wide × 3m deep (12 m²) | £28,300 |
| OFIKO 6.8m x 3.6m (24.5 m²) | £31,157 | 6m × 3.5m | £38,300 |
| EDGE 5.2m x 3.7m (19.2 m²) | £30,250 | 5m × 3.5m | £34,300 |
| CABANO 5.1m x 4.1m (20.9 m²) | £34,559 | 5m × 4m | £36,300 |
| NSPIRO 6.1m x 4.5m (27.5 m²) | £38,456 | 6m × 4m | £40,300 |
| ROKO 6m x 3.25m (19.5 m²) | £35,670 | 6m × 3m | £36,300 |

The reverse also occurs:

- **Ecke** 3.3 × 2.4 m (7.9 m²) at £25,500 is above the home "from" price for the larger 3 × 2.8 m (8.4 m²) room, which is £23,000.
- **CLASSIC 30m2** 7 × 4.5 m at £48,500 is above the grid's larger 7m × 5m cell at £48,300.

### A3. Configurator price vs card price at identical width × depth

| Style and size | Card (https://www.pecasa.co.uk/our-products/) | Configurator (https://www.pecasa.co.uk/design-your-building/) |
|---|---|---|
| Levno 4.8 × 3.4 | "From £25,457 (inc. Vat)", height 2.5 m | "Estimated price £28,109 (inc. VAT)", default height 2.7 m |
| Apexo 5 × 3.05 | "From £32,345 (inc. Vat)" | "Estimated price £35,423 (inc. VAT)" |
| Roko 6 × 3.25 | "From £35,670 (inc. Vat)" | "Estimated price £31,019 (inc. VAT)" (default height 3 m vs card 2.5 m) |
| Ecke 3.3 × 2.4 | "From £25,500 (inc. Vat)" | "Estimated price £26,639 (inc. VAT)" |

### A4. Configurator vs grid

| Configurator default | Configurator price | Grid comparison | Grid price |
|---|---|---|---|
| Roko 6 × 3.25 | £31,019 | 6m × 3m, a smaller cell | £36,300 |
| Veranda 3 × 3 | £35,434 | 3m × 3m | £24,300 |
| Quba 4 × 2.7 (10.8 m²) | £29,964 | 4m × 2.8m (11.2 m²) | £26,300 |

The grid states no style, so these may be different products. The site does not reconcile them.

### A5. Older location pages give much lower ranges than the £23,000 "from" price

| Page | Wording |
|---|---|
| https://www.pecasa.co.uk/garden-rooms-rickmansworth/ | "smaller units might start around £10,000–£15,000. Larger, more luxurious builds … can cost £30,000–£50,000 or more." |
| https://www.pecasa.co.uk/garden-rooms-kings-langley/ | "Costs can range from £10,000 for a basic setup to £40,000+ …" |
| https://www.pecasa.co.uk/garden-rooms-berkhamsted/ | "You might spend £15,000 on the more basic end or £50,000+ …" |
| https://www.pecasa.co.uk/garden-homes-bushey/ | "Smaller, simpler builds might start around £15,000, while more luxurious Garden Offices … can exceed £50,000." |

These conflict with the home "Prices start from £23,000 including VAT" and the grid minimum of £22,300.

### A6. Blog example vs grid, and the example's own arithmetic

- **Blog** (https://www.pecasa.co.uk/garden-annex-vs-garden-room-vs-extension-vs-conservatory/): "Garden room size: 4 m × 3 m / Estimated base cost: £20,000 / Foundations and groundworks: £2,000 / Electrical installation: £1,200 / Estimated total installed cost: £23,000".
  - The components sum to £23,200.
  - It treats foundations and electrics as add-ons, whereas home lists both as standard.
- **Grid:** 4m wide × 3m deep is **£28,300**.

### A7. Area labels in the grid

- **Desktop header:** "3m wideApprox. 8m² (e.g. 2.8 × 3.0)". This is correct for 2.8 m depth only.
- **Mobile cards:** the same "Approx. 8m²" … "Approx. 22m²" labels are repeated under every depth. For example, under "5m deep" the card reads "3m wideApprox. 8m² £32,300", although 3 × 5 = 15 m². This appears on all six grid pages.

### A8. Hidden structured-data prices

| Data | Pages |
|---|---|
| JSON-LD `"priceRange": "£30000"` | 225 pages |
| JSON-LD `"priceRange": "$"` and `"offers": {"price": "$", "priceCurrency": "GBP"}` | 20 older location pages, e.g. https://www.pecasa.co.uk/garden-rooms-watford/ |

Neither matches any visible price.

### A9. Planning fees vs the site's own warning

- **https://www.pecasa.co.uk/faq/:** "Householder planning consent: £347 / Full planning for an annexe: £613 / Lawful Development Certificate: £216".
- **https://www.pecasa.co.uk/garden-room-cost-prices/:** "Do not publish or rely on old application-fee figures without checking them. Statutory and local authority fees change…"

---

## B. Inclusions and specification

### B1. Air conditioning or heating: upgrade or standard?

**Upgrade:**

- Home: "Upgrades such as air conditioning, a shower room or decking are priced in your quotation."
- Home: "Air conditioning or heating can be added and is specified in your quotation."
- Home: "Upgrade with Samsung or Mitsubishi air conditioning controlled by Wi-Fi…"
- https://www.pecasa.co.uk/garden-rooms-london/: "Comfort options | AC installation / heating and other upgrades can be specified where required".

**Standard:**

- https://www.pecasa.co.uk/the-pecasa-standard/: "Feature 08 Wi-Fi Smart AC Installation – Heating or A/C Included. … Choice of Wi-Fi electric heating or Air Conditioning as standard."
- The same page: "Unlike competitors who charge extra for essentials like foundations, or heating, Pecasa Premium Garden Rooms come fully equipped."
- https://www.pecasa.co.uk/the-process/: "8- Choice of wi-fi electric heating or Air Conditioning".
- https://www.pecasa.co.uk/garden-rooms/: "fully insulated, AC installation".
- Brochure (final-brochure.pdf) shows the badge "CHOICE OF WI-FI, ELECTRIC HEATING OR AIR CONDITIONING" among standard features.

### B2. Decking: upgrade or standard?

**Upgrade:**

- Home: "Upgrades such as air conditioning, a shower room or decking are priced in your quotation."
- /garden-rooms-london/ "Popular upgrades: … Decking & patio areas".

**Standard:**

- /the-pecasa-standard/: "Feature 10 British-Made Composite Decking … Complete the look with a composite decking area included."
- /the-process/: "Pecasa Premiun Garden Rooms come with British manufactured composite decking, as standard."
- Brochure p.10 shows a "COMPOSITE DECKING AREA" badge.

### B3. Flooring

| Source | Wording |
|---|---|
| Home | "12 mm premium laminate flooring" |
| /the-pecasa-standard/ | "Feature 07 Luxury Composite Flooring — Waterproof, Scratch-Proof … 100% Waterproof" |
| /the-process/ | "scratch /water proof composite flooring, as standard" |
| Brochure p.10 | "SCRATCH AND WATER RESISTANT LUXURY VINYL FLOORING" |
| /garden-rooms-london/ | "Quality flooring included" |

### B4. Doors and windows

- **Home:** "Cortizo aluminium doors and windows"; "Cortizo aluminium French, bi-fold or sliding doors".
- **/the-pecasa-standard/:** "No cheap PVC. We use British-manufactured Aluminium doors".
- **/the-process/** and the brochure list "French or Bi-fold" only. Home adds sliding doors.

The site does not say whether the Cortizo products are the "British-manufactured" doors. Verify with Pecasa before quoting either claim.

### B5. EPDM roof lifespan

- **/the-pecasa-standard/:** "One-piece Firestone-grade EPDM rubber membrane … 50-Year Lifespan: Resistant to UV and cracking."
- **/the-process/:** "EPDM roofs are known for their long lifespan, often lasting 20-30 years with proper maintenance."

### B6. Ground-screw suitability

- **Home:** "Radix ground screws are our standard foundation system, subject to ground conditions and site suitability."
- **/garden-rooms-london/:** "Ground-screw foundation system on suitable sites".
- **/the-process/:** "Suitable for any soil type: Screw foundations can be used in a variety of soil types, including sandy, clay, and rocky soils".

### B7. Internal decoration

- **/garden-rooms-london/ standard list:** "Decoration (painting & lighting)" and "Interior | Tape-and-joint internal finish and decoration".
- **/the-pecasa-standard/:** "smooth, seamless walls ready for painting or wallpapering". This implies the walls are left unpainted.
- **Home** lists no painting.

### B8. Data and electrics

- **/garden-rooms-london/:** "Electrical & data (internal fittings)".
- **Home:** "lighting and electrics designed to your requirements … electrical supply connections to the building … priced separately". Data is not mentioned.

### B9. Kits and sheds

- **Home:** "We do not sell flat-pack kits or off-the-shelf models."
- **https://www.pecasa.co.uk/sip-panels-kits-uk/:** "For a panel-kit enquiry, provide drawings, dimensions…"
- **Shed pages:**
  - https://www.pecasa.co.uk/garden-sheds-middlesex/: "We carefully inspect each Pecasa shed before shipping".
  - https://www.pecasa.co.uk/garden-sheds-buckinghamshire/: "You can browse our wide online inventory".

### B10. Style dimensions: card vs configurator default

| Style | Card (/our-products/) | Configurator default |
|---|---|---|
| Portal | 4.6 × 3.3 | 4 × 3.3 |
| Cabano | 5.1 × 4.1, H 3.32 | 4.2 × 4, H 3.3 |
| Inspiro | 6.1 × 4.5 | 4.6 × 3.4 |
| Ofiko | 6.8 × 3.6 | 3.7 × 2.4 |
| Edge | 5.2 × 3.7 | 4.1 × 3.4 |
| L-Shape | 4.8 × 3.6 | 4 × 3.3 |
| Levno | H 2.5 | H 2.7 |
| Apexo | H 2.5 | H 2.616 |
| Roko | H 2.5 | H 3 |

### B11. Style names

- "Levno" (site and configurator) vs "Lenvo" (brochure p.10).
- "Inspiro" (configurator) vs "NSPIRO" (/our-products/ card and image file name).

### B12. Building size range

- **Home:** "Buildings typically range from 4 m² to 90 m²".
- **Configurator** (non-admin) caps room styles at 10 m × 8 m (80 m²) and has a 2 m × 2 m minimum.
- A case study describes an "83m² Bespoke Garden Room" (https://www.pecasa.co.uk/case-studies/83m%c2%b2-bespoke-garden-room/).

---

## C. Warranties

### C1. Qualified vs unqualified 10-year warranty

**Qualified:**

- Home: "A 10-year IWA insurance-backed warranty on qualifying projects, subject to registration and policy terms."
- https://www.pecasa.co.uk/10-year-iwa-insurance-backed-warranty-and-aftercare/: "Does every PECASA project automatically have IWA cover? The 10-year insurance-backed warranty applies to qualifying PECASA projects, subject to successful registration…"

**Unqualified:**

- /garden-rooms-london/ and the 5 Herts grid pages: "All our buildings are backed by an independent 10 year insurance-backed warranty for complete peace of mind." Badge: "Independent warranty / For total peace of mind".
- Brochure: "10 YEAR WARRANTY" and "Ten year warranty", with no conditions and no insurer named.

### C2. IWA badge alt text

On the grid pages, the IWA logo image linking to the warranty page has `alt="Made In Britain"`. This is cosmetic, but it means the badge is mislabelled for screen readers and SEO.

---

## D. Installation timing

At least nine versions appear across the site.

| Source | Exact wording |
|---|---|
| **Home** (current, most qualified) | "For garden rooms up to 16 m², we guarantee installation within two weeks (10 working days) of the start of work on site, subject to the agreed specification, site access and weather. Typical working days on site: 14–16 m² garden room: 8–10 working days / Up to 30 m²: 10–12 working days / Annexe: 14–16 working days" |
| Home JSON-LD FAQ (hidden) | "Most Pecasa garden rooms are installed in as little as two weeks once manufacturing is complete, depending on size, specification and site conditions." |
| https://www.pecasa.co.uk/our-approach/ (modified 2026-09-28) | "A smaller garden room can take around 12 working days, while a project of approximately 30m² normally takes around 16–18 working days." Repeated on /garden-house-london/ and /garden-rooms-radlett/ |
| /garden-rooms-london/ and 5 Herts grid pages | "Premium builds, precision made. Installed in as little as 16–18 days." / "Quick installation16–18 days (typical)" / "*Timescales vary by project." |
| /garden-rooms-london/ visible FAQ | "Most garden rooms can be completed within 2–4 weeks depending on the design and size." |
| /garden-rooms-london/ JSON-LD FAQ (hidden) | "Most garden rooms can be installed within two to three weeks depending on size, design and site preparation." |
| https://www.pecasa.co.uk/garden-rooms/ (modified 2026-10-05) | "Pecasa guarantee a ready to be used fully installed within 14 days or less!" … "the 14 days or less installation can be guaranteed on all installations" |
| https://www.pecasa.co.uk/garden-homes-potters-bar/ | "Pecasa guarantees a fully installed, ready-to-use garden room within 14 days or less." |
| Brochure | "We provide a two week or less installation guarantee"; "Two week installation guaranteed" |
| https://www.pecasa.co.uk/garden-homes-bushey/ | "from initial consultation to completion, expect anywhere from 4 to 10 weeks" |
| https://www.pecasa.co.uk/garden-rooms-kings-langley/ | "Groundworks (1-2 weeks) … Construction (2-8 weeks) … Finishing Touches (1-2 weeks)" |

Conflicts between versions:

- **Home vs Our Approach:** home says up to 30 m² takes 10–12 working days; Our Approach says ~30 m² takes 16–18 working days.
- **Home vs Our Approach on small rooms:** home guarantees ≤16 m² in 10 working days; Our Approach says "a smaller garden room can take around 12 working days".
- **Scope of the guarantee:** /garden-rooms/ guarantees "14 days or less" on "all installations", whereas home limits the guarantee to ≤16 m² with conditions.

Case-study build times, for reference (https://www.pecasa.co.uk/projects/):

| Project | Size | Build time |
|---|---|---|
| Bricket Wood | 40 m² | 12 days |
| Hendon annexe | ~30 m² | 12 days |
| Wimbledon | 12 m² | 8 days |
| West Hampstead | 4 × 3 m | 8 days |
| Hendon Home Office | 7.5 × 4 m | 11 days |
| Mill Hill | not stated | 10 days |

The Hendon annexe at 12 days is faster than the home "Annexe: 14–16 working days".

---

## E. Company history, experience and reviews

### E1. Years trading and experience

| Source | Wording |
|---|---|
| Home | "Since 2017 we have completed more than 120…"; "100+ Years combined construction experience" |
| Companies House | Incorporated 7 April 2017 as "SHAB CONSTRUCTION LIMITED"; named PECASA LTD only since 1 Feb 2024 |
| /garden-rooms-london/ and 5 Herts pages | "20 Years' construction experience" |
| https://www.pecasa.co.uk/how-pecasa-assembles-garden-rooms-in-as-little-as-two-weeks/ | "Since 1998, Pecasa has been building high–quality garden rooms" |
| https://www.pecasa.co.uk/garden-rooms-watford-how-pecasa-can-redefine-your-garden-spaces-with-customised-living-solutions/ | "With over 15 years' experience in the building industry, Pecasa have become a trusted name" |

### E2. Review counts and ratings

- **Site text (15 pages, e.g. /garden-room-cost-prices/):** "75+ five-star Google reviews".
- **Google Maps profile, 13 Oct 2026:** "5.0 (100 reviews)". The site claim is stale but not contradictory.
- **Trustpilot** (https://uk.trustpilot.com/review/pecasa.co.uk): TrustScore **4.3** from **8** reviews, 100% 5-star. This is not shown on the site.
- **Site widget:** the Elfsight Google widget is configured with `filterMinRating: 5` and `showOverallRating: false`, so it shows only 5-star reviews and no overall score.

---

## F. Contact details and showroom

### F1. Phone numbers

| Number | Where | Visible? |
|---|---|---|
| **020 8146 2200** / +44 20 8146 2200 | All pages (footer), /contact-us/, JSON-LD on 225 pages, Google Maps, Made in Britain listing | Yes |
| **020 3880 5886** | JSON-LD `LocalBusiness.telephone` on 20 location pages: garden-rooms-watford, -finchley, -berkhamsted, -rickmansworth, -kings-langley, -hemel-hempstead, -elstree-borehamwood, -radlett, -design-edgware, garden-house-london, -barnet, -shenley, garden-office-hendon, -chesham, garden-homes-bushey, -potters-bar, garden-buildings-harrow, -amersham, wood-garden-house-hampstead, -beaconsfield | No (hidden data, may surface in search) |
| **0203 649 6213** | `<meta name="description">` / og:description / twitter:description on 5 pages: garden-rooms-bucks, garden-office-in-st-albans, garden-studios-london, modern-summer-houses-hertfordshire, summerhouse-east-london ("Contact us at 0203 649 6213") | In Google snippets |
| WhatsApp `https://wa.me/+4402081462200` | Footer icon on all pages | Link only. It includes the UK trunk "0" after +44; whether WhatsApp resolves it was not tested |

### F2. Opening hours

- **/contact-us/** and Google Maps: "Monday – Friday: 09:00 – 17:00 / Saturday: 10:00 – 14:00 / Sunday: Closed".
- **JSON-LD on the same 20 location pages:** `openingHoursSpecification` Monday–Sunday 07:00–21:00.

### F3. Showroom access and location

| Source | Wording |
|---|---|
| /contact-us/ | "Visit our showroom -by prior booked appointment via our Showroom-" |
| /our-approach/ | "visit our local warehouse (by prior appointment )" |
| https://www.pecasa.co.uk/garden-office-near-me/ | "a Watford showroom that can be visited by prior appointment" |
| https://www.pecasa.co.uk/garden-rooms/ | "Yes, everyone is welcomed to pop in to the showroom at Unit 3, 8 Colonial Way, Watford WD24 4PT" |
| https://www.pecasa.co.uk/garden-sheds-buckinghamshire/ | "Visit our Buckinghamshire showroom, where our friendly staff will tour you around" |

Only the Watford address is published anywhere.

### F4. Name and address variants

| Variant | Where |
|---|---|
| Legal name "PECASA LTD" | Companies House |
| "Pecasa Ltd." | Footer, Google |
| "Pecasa Premium Garden Rooms", given as `legalName` | JSON-LD |
| Per-page business names such as "Garden Rooms Watford" and "Garden Rooms Kings Shenley" | Old JSON-LD |
| Address "Unit 3, 8 Colonial Way, Watford WD24 4PT" | Visible text |
| Address "8 Colonial Way" with no unit | Old JSON-LD |
| `addressLocality: "England"` | Rank Math JSON-LD |

---

## G. Planning

### G1. Absolute vs qualified permitted-development claims

**Absolute:**

- https://www.pecasa.co.uk/faq/: "Garden Rooms are considered to be permitted development, and do not an application for planning permission, unless it is …" (followed by a list of exceptions).
- https://www.pecasa.co.uk/garden-rooms/: "Most garden rooms do not need planning permission due to developments."

**Qualified:**

- Home: "many garden rooms … fall within permitted development and do not need planning permission, provided they meet the relevant size, height and location limits … Flats, listed buildings, conservation areas and self-contained annexes have different rules."
- /garden-rooms-london/: "Many detached garden rooms … can fall within Class E householder permitted-development rights in England, but that is not automatic."

Both say planning is not normally needed, but the FAQ and /garden-rooms/ wording is more absolute. For a configurator, quote the homepage version.

---

## H. Brochure vs current site (summary)

See `brochure/brochure.md`. The brochure (authored Feb 2025) differs from the current homepage on:

- the unconditional two-week guarantee;
- the unconditional ten-year warranty;
- luxury vinyl flooring;
- heating/AC and decking shown as standard features;
- the "Lenvo" spelling.

It also carries no Pecasa name or contact details in its text layer.
