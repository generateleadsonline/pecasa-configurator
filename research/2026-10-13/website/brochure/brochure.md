# Pecasa brochure, price list and spec sheets, checked 13 October 2026

## What exists

| Item | Status |
|---|---|
| Brochure PDF | **Found, downloaded without any form.** https://www.pecasa.co.uk/wp-content/uploads/2025/05/final-brochure.pdf |
| Price list (PDF or page) | **Not found** |
| Spec sheet or data sheet | **Not found** |
| Brochure request form | **Not found.** No page mentions "brochure"; site text and WP search both return 0 hits |
| Flipbook embed (issuu, flipsnack, heyzine, yumpu) | **Not found** in any of the 225 pages |
| Calendly, HubSpot or other booking widget | **Not found** |

### How the brochure was found

The PDF is not linked from any page. I found it through the WordPress REST API with `/wp-json/wp/v2/media?mime_type=application/pdf`. This returned exactly 1 PDF in a library of 630 media items: ID 1936, uploaded 2025-05-13, title "final-brochure".

I also searched the media library for "price", "pricing", "spec", "list", "catalogue", "offer", "promo" and the style names. These returned only the /our-products/ card images. The `wp-content/uploads/` directory listing is disabled (HTTP 403).

The homepage sentence "See the full price list and what is included." has no link, and no price list exists on the site.

### Files saved in this folder

| File | Content |
|---|---|
| `final-brochure.pdf` | 3,075,993 bytes; SHA-256 `632aaebc45683f34f7781812176bfcbca5af46ff540dcb66a426a739e1499c03` |
| `final-brochure.headers.txt` | HTTP response headers. Server `last-modified: Wed, 18 Mar 2026 17:28:30 GMT` |
| `final-brochure.txt` | Raw text layer extracted with macOS PDFKit |

The extracted text has these limits:

- The circular badge text comes out one letter per line.
- Page 10 repeats its badge text twice.
- Most content is images, so the text layer is sparse.

PDF metadata: Creator "Adobe InDesign 20.1 (Macintosh)"; CreationDate 2025-02-18 10:39:43 UTC; ModDate 2025-02-18 10:48:48 UTC; 11 pages.

## Summary of contents

The brochure is branded "Premium GARDEN ROOMS". **The word "Pecasa" does not appear in the text layer.** The text layer also has **no** phone number, email, address or URL. The last page has a "CONTACT DETAILS" panel that is empty.

| Page | Content (exact text where quoted) |
|---|---|
| 1 | Cover: "Premium GARDEN ROOMS" over a photo of a black-clad garden room |
| 2 | "We are proud to offer Premium Garden Rooms." / "We are offering a unique experience with minimal disruption to you." / "We provide a two week or less installation guarantee without compromising in quality so you can enjoy your extra space without delay!" Badge: "TWO WEEK INSTALMENT GUARANTEED / 10 YEAR WARRANTY" |
| 3 | "Why us? Bespoke Design Premium Quality" / "TWO WEEK INSTALLATION / HASSLE FREE EXPERIENCE" / "Our Premium Garden Rooms and Annexes offer cost effective options with fully insulated practical space solutions for expanding your home and creating quality space for year-round use." SIPs badge: "Pre-assembled in our local warehouse • The structure is constructed in one day" |
| 4 | "Comfort & Relaxation"; popular use "GAMES / MUSIC ROOM". Badge "INTERNAL DRY WALL – EXPERTLY CRAFTED PLASTER BOARDED WALLS" |
| 5 | "Physical Health"; "MEDITATION ROOM". Badges "FRENCH OR BI-FOLD DOORS – ALUMINUM DOORS (Secure, Ultra durable, Maintenance free)", "COMPOSITE DECKING AREA – BRITISH MANUFACTURED & MAINTENANCE FREE – Our composite decking is anti-slip and eco-friendly.", "CHOICE OF WI-FI, ELECTRIC HEATING OR AIR CONDITIONING" |
| 6 | "Productivity"; "OFFICE SPACE", "GYM". Badges "LATEST INNOVATIVE SCREW FOUNDATIONS – Installed by our in-house team, screw foundations are superior to standard concrete foundations." and "EPDM RUBBER ROOFING" |
| 7 | "Mental Health"; "CINEMA ROOM" |
| 8 | "Privacy"; "ART STUDIO", "PLAYROOM". Badge "COMPOSITE FASCIA – BRITISH MANUFACTURED & MAINTENANCE FREE – We offer a range of eco-friendly fascia colours" |
| 9 | "Relationships"; "We firmly believe.. Investing in extra space with our Premium Garden Rooms is investing in your well being, as well as the value of your home!" |
| 10 | **Range page.** 3D renders labelled **Portal, Apexo, Roko, Ecke, Edge, Quba, Lenvo [sic], L-Shape.** Ten feature badges: Screw foundations; SIPs; EPDM rubber roofing; Composite fascia; Internal dry wall; LED lighting ("INTERNAL AND EXTERNAL BESPOKE DESIGN"); "SCRATCH AND WATER RESISTANT LUXURY VINYL FLOORING (Long lasting, Easy to clean, A choice of colours)"; Wi-Fi electric heating or air conditioning; Aluminium French or bi-fold doors; Composite decking area. Footer: "Bespoke Design - Premium Quality" / "Two week installation guaranteed -Ten year warranty" |
| 11 | Back cover: "TWO WEEK INSTALMENT GUARANTEED / 10 YEAR WARRANTY" badge; empty "CONTACT DETAILS" box |

### What the brochure does not contain

| Topic | Status |
|---|---|
| Ranges | 8 of the 14 configurator styles, by name and render only. Missing: Pergola, Cabano, Inspiro, Ofiko, Veranda, Angle |
| Sizes and dimensions | **None** |
| Prices | **None** |
| Specification | Feature badges only; no thicknesses, U-values or product names. Flooring is "luxury vinyl" |
| Options | Heating or AC (Wi-Fi electric heating, AC), French or bi-fold aluminium doors, composite decking, composite fascia colours. **No prices** |
| Colour lists | **None** in text. It says only "a range of eco-friendly fascia colours" and that flooring comes in "A choice of colours" |
| Warranty | "10 YEAR WARRANTY" / "Ten year warranty", stated without conditions and without naming IWA or insurance backing |
| Install time | "two week or less installation guarantee" and "Two week installation guaranteed", stated without conditions |

### Points to treat with care

- **Brochure vs current homepage:** these brochure claims conflict with the current homepage (all detailed in `../CONFLICTS.md`):
  - It gives an unconditional "Two week installation guaranteed". The homepage limits the guarantee to rooms "up to 16 m²… subject to the agreed specification, site access and weather".
  - It gives an unconditional "Ten year warranty". The homepage says "on qualifying projects, subject to registration and policy terms".
  - It lists "Luxury vinyl flooring" as standard, whereas the homepage says "12 mm premium laminate flooring" and /the-pecasa-standard/ says "Luxury Composite Flooring".
  - It shows heating/AC and composite decking as standard feature badges, whereas the homepage says AC and decking are upgrades priced in the quotation.
- **Spelling:** the brochure spells the style "Lenvo"; the site and configurator use "Levno".
- **Age:** the brochure predates the current site copy. It was authored in February 2025, and the server file date is 18 Mar 2026. Use it for imagery and positioning only, not for any spec, price or guarantee claim.
