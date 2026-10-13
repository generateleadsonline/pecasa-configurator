# Pecasa planner — what price information the public sees (checked 13 Oct 2026)

Sources: live planner `https://webadminservices.com/editor-app/a7221949-fee9-45dc-8b90-7ddc7561961d/app.html` (the iframe used by https://www.pecasa.co.uk/design-your-building/), its `configuration.json?v=23`, and the planner's own calls to `POST https://webadminservices.com/api/configurator/priceCalculations`. Read-only: no form was submitted, nothing was saved or emailed.

## 1. What a member of the public sees

- **One running total, nothing else.** A single label sits bottom-left of the 3D view: `Estimated price £{price} (inc. VAT)`. While the price loads it says `Calculating price...`. The config's error text is `Price could not be calculated`. The label updates on every change (style, size, finish, items).
- **The label is plain text, not a link.** Its DOM is `<span class="running-price-above-footer-sidebar-left"><span>Estimated price £26,639 (inc. VAT)</span></span>` with cursor `auto`. In `CalculatedPriceController`, the `internal` profile has `openAction: "showSummary"`, so internal users can click through to a breakdown. The `public` profile has no `openAction`, so the public cannot. `DrawingSummaryController` has `enableDebug: true` for internal users and `false` for the public.
- **No option shows its own price.** I opened each main tab: Roof & Porch, Layout & Bathroom, Windows & Doors, Exterior Finish, Interior & Floor, Decking, Kitchen, Furniture & Decorations, Electrics & Lighting and Save. No tile, label, tooltip (`title`) or sub-panel shows a price. A text search of the rendered DOM found exactly one "£" and one "price" string, both in the running-total label. The only way to see what an option costs is to watch the total change.
- **VAT is stated only as fixed label text.** The format string is `Estimated price £{price} (inc. VAT)` with `includeTax: false`. The API returns `taxRate: 0` and `tax: 0`, so `total = price`. The UI shows the API `price` rounded to the nearest pound (e.g. 35422.509 → £35,423; 35433.5 → £35,434) and appends "(inc. VAT)". It never shows a separate VAT figure or an ex-VAT figure.
- **The Save form has no price** (it is actually an enquiry). Its fields are First name, Last name, Email, Phone, Postcode and Notes, with a "Save" button. The config's success message reads "Enquiry Sent… Our representative will be in touch…".

## 2. Published default totals (visible to anyone in the UI)

Each style was selected at its default. The UI label was read from the DOM, and the API value comes from the planner's own request and response, captured in-page. The figures were identical in two separate browser sessions on 13 Oct.

| Style | Default W × D × H (UI, m) | UI label (public) | API `price` | API price template used (range / floorW × floorD mm / template £) | `isStandardSize` |
|---|---|---|---|---|---|
| Levno | 4.8 × 3.4 × 2.7 | **£28,109 (inc. VAT)** | 28109.2607 | Levno / 6500 × 2500 / 29,909 | false |
| Apexo | 5 × 3.05 × 2.616 | **£35,423 (inc. VAT)** | 35422.5095 | Levno / 2500 × 5500 / 29,662 | false |
| Pergola | 4 × 3 × 2.5 | **£9,832 (inc. VAT)** | 9832.30 | Levno / 3000 × 4000 / 25,440 | false |
| Portal | 4 × 3.3 × 2.5667 | **£29,979 (inc. VAT)** | 29979.3143 | Levno / 3000 × 3500 / 24,163 | false |
| Cabano | 4.2 × 4 × 3.3 | **£35,977 (inc. VAT)** | 35976.9964 | Levno / 3000 × 5500 / 30,779 | false |
| Inspiro | 4.6 × 3.4 × 3.27 | **£28,906 (inc. VAT)** | 28906.0024 | Levno / 3500 × 4500 / 27,834 | false |
| Quba | 4 × 2.7 × 2.5 | **£29,964 (inc. VAT)** | 29964.08 | Levno / 3000 × 3500 / 24,163 | false |
| Roko | 6 × 3.25 × 3 | **£31,019 (inc. VAT)** | 31019.10 | Levno / 6500 × 3000 / 30,867 | false |
| Ofiko | 3.7 × 2.4 × 2.5 | **£27,280 (inc. VAT)** | 27280.3227 | Levno / 3000 × 3000 / 22,727 | false |
| Ecke | 3.3 × 2.4 × 2.5 | **£26,639 (inc. VAT)** | 26638.8464 | Levno / 2500 × 3000 / 21,131 | false |
| Edge | 4.1 × 3.4 × 2.5 | **£27,043 (inc. VAT)** | 27043.0681 | Levno / 4000 × 3500 / 26,637 | false |
| L-Shape | 4 × 3.3 × 2.5 | **£28,207 (inc. VAT)** | 28206.6833 | Levno / 3000 × 3500 / 24,163 | false |
| Veranda | 3 × 3 × 3.25 | **£35,434 (inc. VAT)** | 35433.50 | Levno / 3000 × 3000 / 22,727 | **true** |
| Angle | 4.5 × 3 × 2.5 | **£32,407 (inc. VAT)** | 32407.10 | Levno / 3000 × 4500 / 26,637 | false |

Two non-default totals were visible as a side effect of probing the sliders. They are listed only as evidence that the total updates live; they are not defaults:
- Apexo at width 3.8 m (other values default): £30,493.
- Portal at 2.7 × 8 × 3.4667 m: £39,383.

Every default matches the 11 Oct audit's Ecke observation (£26,639). The config is unchanged, so the other 13 totals are expected to be the same as on 11 Oct. They were not individually recorded then.

## 3. What the price API returns (not shown to the public)

`POST /api/configurator/priceCalculations` takes `{applicationId, data: <full design>, userId: null}`. The response has these keys: `templateInfo`, `designInfo` (with `designRoofArea`, `designFloorArea`, `designFloorWidth/Depth`, `designHeight`, `designRange`, `designBasePriceItem`, `designItems`, `otherItems`, `optionalItems`, `isStandardSize`), `price`, `taxRate`, `tax`, `total`, `discountRate` and `discountPrice`.

Evidence on disk:
- `raw/priceCalculations-ecke-default.request.json` is the exact body the planner sent for Ecke. I replayed it once with curl. The response, `raw/priceCalculations-ecke-default.response.json`, returned `price` 26638.8464, which equals the UI's £26,639. This resolves the 11 Oct discrepancy: the earlier hand-reconstructed request had returned £25,989.65.
- `raw/live-resolved-designs-2026-10-13.json` holds the design every style sent at default.

How the price is built (observed; none of it is shown in the UI):
- **Base Price** = `templateBaseRate` × design floor area. The template is always a **Levno** "price template" picked from the size matrix. That matrix (12 × 12, 2.5–8 m, £20,684–£45,143) is in the public config at `app.serviceData.ProceduralTemplateSets`, but the UI never displays it.
- **Plus line items:** Integrated Porch (£80/m²), roof covering (EPDM Black Roof £96/m²), each opening at a fixed "Each" rate, cladding by area (Vertical/Horizontal Cedar £260/m²; Shiplap £180/m²), Integrated Decking (£234/m²), flooring (£/m² of floor area, e.g. Walnut/Sicilia Oak £120) and Plaster White (£100/m²).
- **Every line item has `showPriceInOutput: false`.** Openings also have `showInOutput: false`.

Line-item digests from the planner's own calls. Format: group | description | unit | quantity × rate = total.

**Ecke 3.3 × 2.4 (total 26638.8464)**: Base Price 7.92 × 1184.5867 = 9381.93 · Integrated Porch M2 1.18 × 80 = 94.40 · EPDM Black Roof M2 9.1 × 96 = 873.60 · Folding 3-Part Door 2000 x 2100 Each 1 × 5500 · Tilt'n'turn Window 800 x 2100 Each 1 × 950 · Shiplap Black Cladding (left and rear) M2 15.25 × 180 = 2745 · Horizontal Cedar Cladding (front and right) M2 14.25 × 260 = 3705 · Integrated Decking M2 1.18 × 234 = 276.12 · Sicilia Oak FloorArea 7.92 × 120 = 950.40 · Plaster White M2 21.624 × 100 = 2162.40.

**Levno 4.8 × 3.4 (total 28109.2607)**: Base Price 16.32 × 306.8677 = 5008.08 · Integrated Porch 4.8 × 80 = 384 · EPDM Black Roof 21.12 × 96 = 2027.52 · Sliding 4-Part Door 3200 x 2100 × 4100 · Awning Window Horizontal 1800 x 500 × 800 · Awning Window Horizontal 1800 x 400 × 800 · Vertical Cedar Cladding (front) 12.96 × 260 = 3369.60 · Shiplap Gray Cladding (sides and rear) 31.74 × 180 = 5713.20 · Integrated Decking 1.44 × 234 = 336.96 · Walnut 16.32 × 120 = 1958.40 · Plaster White 36.115 × 100 = 3611.50.

**Pergola 4 × 3 (total 9832.30)**: only a Base Price, 12 × 819.3583 = 9832.30. There are no line items.

**Veranda 3 × 3 (total 35433.50, `isStandardSize: true`)**: Base Price 9 × 1025.4778 = 9229.30 · Integrated Porch 10.95 × 80 = 876 · EPDM Black Roof 19.95 × 96 = 1915.20 · Folding 3-Part Door 2000 x 2100 × 5500 · Fixed Window 800 x 2100 × 1000 · Vertical Cedar Cladding (front, sides and rear) 42.325 × 260 = 11004.50 · Integrated Decking 10.25 × 234 = 2398.50 · Sicilia Oak 9 × 120 = 1080 · Plaster White 24.3 × 100 = 2430.

**Optional rates:** `designInfo.optionalItems` has 87 entries. They are **identical** to the 87 rates recorded on 11 Oct in `research/pecasa-price-api-research.json` (type, finish, unit, description and rate compared one by one; zero differences). The duplicate type variants still exist (e.g. three FixedWindow rates: 285 / 1000 / 2000), so a single rate per option still cannot be assumed.

## 4. Conclusion for the replacement

- **Published (publicly visible):** only the 14 default running totals above, plus whatever total the user's own configuration produces, each labelled "(inc. VAT)".
- **Not published:** per-option prices, the breakdown, the Levno template matrix and the optional rates. These live only in the public config and API, and the UI never shows them.
- I found no per-option price wording anywhere in the UI. The only price wording is `Estimated price £… (inc. VAT)` and `Calculating price...`.
