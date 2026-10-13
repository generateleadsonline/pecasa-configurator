# Pecasa configurator: points for Pecasa to confirm

Prepared 13 October 2026 for the v2 configurator (`configurator-v2` branch). Where Pecasa's own
sources disagree, the configurator does not guess. It takes the most careful published wording,
or it shows "Quoted". Each item below says what the sources say and what the configurator does
until Pecasa confirms.

Sources:

- The website, crawled in full on 13 October 2026.
- The online planner at /design-your-building/ (configuration v23).
- The brochure: final-brochure.pdf.

The exact wording and URLs are in [`research/2026-10-13/website/CONFLICTS.md`](../../research/2026-10-13/website/CONFLICTS.md) (section letters in brackets below) and [`prices.json`](../../research/2026-10-13/website/prices.json).

## 1. Prices

| # | Question | Sources | The configurator now |
|---|---|---|---|
| 1.1 | Which "from" price is right for a 3m × 2.8m room? | Homepage: £23,000. Price table on /garden-rooms-london/ and five Hertfordshire pages: £22,300 (A1). | Shows neither as a headline "from" price. A 3m × 2.8m design in a table style shows £22,300 as the published table price. |
| 1.2 | Which price applies when the planner, the product cards and the price table differ for the same size? | Levno 4.8 × 3.4m: card £25,457, planner £28,109 (planner height 2.7m). Apexo: £32,345 vs £35,423. Roko: £35,670 vs £31,019. Ecke: £25,500 vs £26,639 (A2 to A4). | At each style's default size and height it shows the planner's estimate (what visitors see today). At a card's exact size and height it shows the card price. At a table size it shows the table price. Any other size is **Quoted**. The source is always named next to the price. |
| 1.3 | Does the price table (3m to 8m by 2.8m to 5m) apply to every style and height? | The table names no style or height (A4). | Applied only to enclosed rectangular styles (Levno, Apexo, Portal, Cabano, Inspiro, Quba, Roko, Ofiko, Ecke, Edge, Angle), at the style's default height or 2.5m. Not applied to Pergola, Veranda or L-Shape. |
| 1.4 | Prices for extras | None are published. The only published charges are planning fees on /faq/. | Every extra is marked **Upgrade** (priced in the written quote) or **Quoted**. No extra has a price. |
| 1.5 | A changed roof type (flat to pitched or back) | Not published. | The design is **Quoted**. |
| 1.6 | The planning fees on /faq/ (£600 consultancy; council £347, £613, £216) | /garden-room-cost-prices/ warns against relying on old fee figures (A9). | Not shown. The planning note says only that Pecasa advises at the survey. |

## 2. What is included as standard

| # | Question | Sources | The configurator now |
|---|---|---|---|
| 2.1 | Heating or air conditioning: standard or upgrade? | Homepage: an upgrade. /the-pecasa-standard/, /the-process/ and the brochure: "Heating or A/C included" (B1). | Wall heater and climate control are marked **Upgrade**, following the homepage. |
| 2.2 | Decking: standard or upgrade? | Homepage: an upgrade. /the-pecasa-standard/, /the-process/ and the brochure: composite decking as standard (B2). | Decking is marked **Upgrade**. The standard designs show decking as Pecasa's planner draws it. |
| 2.3 | Flooring | Homepage: 12mm premium laminate. Elsewhere: composite flooring or luxury vinyl (B3). | The PDF's included list says "12mm premium laminate flooring" (homepage). Floor choices use the planner's names. Tiles are **Upgrade**; OSB is **Quoted**. |
| 2.4 | Is the standard Cabano's copper roof included? | Homepage lists "an EPDM roof" as standard. The planner's standard Cabano has a copper finish. | The standard Cabano's copper roof is shown as included (it is in the planner's estimate). The PDF names it "Copper roof, as on the standard Cabano in Pecasa's planner". Other finishes are **Upgrade**. |
| 2.5 | Are internal walls painted? | /garden-rooms-london/: decoration included. /the-pecasa-standard/: "ready for painting" (B7). | "Plasterboard, tape-and-joint finish" plus the planner's colour, as **Included**. Plywood lining is **Quoted**. |
| 2.6 | Statuses inferred from the homepage's "upgrades such as air conditioning, a shower room or decking" | Not published option by option. | **Upgrade:** sedum roof, rooflights, trellis canopy, veranda and pergola additions, non-standard doors and windows, blinds, corner trims, other roof finishes, partition/cloakroom/shower room/sauna, kitchenette, wall heater, climate control, pergola sides and glazed pergola roof. **Quoted:** non-standard frame colours, plywood interior, OSB floor, electrical supply to the building, site clearance, water, drainage, skips and parking permits. **Included:** extra sockets, TV and data points, external socket, dimmer, smoke alarm, the standard design's doors and windows, and the planner's colour choices for cladding, trims and interior. |
| 2.7 | Are Cortizo doors the "British-manufactured aluminium doors" claimed on /the-pecasa-standard/? | Not stated (B4). | Says "Cortizo aluminium" only. It makes no British-made claim about doors. |

## 3. Claims used as selling points

| # | Question | Sources | The configurator now |
|---|---|---|---|
| 3.1 | Installation time | At least nine versions (D). | Uses the homepage's qualified guarantee: "Installed in 10 working days … for rooms up to 16m² from the start of work on site, subject to specification, access and weather." |
| 3.2 | Warranty | Homepage: qualified. Price pages and brochure: unqualified (C1). | "10-year IWA insurance-backed warranty, on qualifying projects, subject to registration and policy terms." |
| 3.3 | Experience | "Since 2017 … more than 120", "100+ years combined", "20 years", "since 1998", "over 15 years" (E1). | Uses only "120+ garden rooms since 2017". |
| 3.4 | Reviews | Google: 5.0 from 100 reviews (13 Oct 2026). Site text: "75+ five-star reviews". Trustpilot: 4.3 from 8 (E2). | "5.0 on Google, from 100 Google reviews (checked October 2026)". Trustpilot is not mentioned. Confirm before this goes live, as review counts change. |
| 3.5 | Made in Britain membership since January 2025, and the Watford factory | Homepage and the Made in Britain listing. | Used as published. |

## 4. Contact, showroom and booking

| # | Question | Sources | The configurator now |
|---|---|---|---|
| 4.1 | Which phone number? | 020 8146 2200 is visible everywhere. 020 3880 5886 and 0203 649 6213 appear only in hidden page data and search snippets (F1). | 020 8146 2200 only. Pecasa may want to remove the other two from its pages. |
| 4.2 | Opening hours | Contact page: Monday to Friday 9 to 5, Saturday 10 to 2, Sunday closed. Hidden page data: 7am to 9pm daily (F2). | Uses the contact page. |
| 4.3 | Showroom: by appointment, or can people pop in? | Contact page and two others: by prior appointment. /garden-rooms/: "everyone is welcomed to pop in" (F3). | "Visit showroom" says visits are by appointment, shows the address, hours and map, and asks for an optional preferred day. Pecasa then confirms by phone or email. |
| 4.4 | Online booking | No booking calendar found on Pecasa's site. | "Book a call" is a request form: the customer picks a preferred day and time and Pecasa calls to confirm. If Pecasa has a booking calendar (Calendly, HubSpot or similar), send the link and it replaces the form. |
| 4.5 | Brochure | final-brochure.pdf (Feb 2025) has no Pecasa name or contact details in its text, and uses older claims: an unconditional two-week guarantee and warranty, vinyl flooring, and "Lenvo" (H). | "Download brochure" opens that PDF after a short form. Confirm it is still the current brochure. |
| 4.6 | Where do enquiries go? | Not applicable. | Netlify Forms on the preview site: design quote, callback, book a call, showroom visit and brochure. Each carries the full specification and a link to the design. Pecasa needs to name the inbox or CRM that should receive them. No live form has been submitted in testing. |
| 4.7 | Privacy notice | No privacy page was found on pecasa.co.uk. | The preview has its own privacy notice (Pecasa Ltd 10714739, info@pecasa.co.uk). Pecasa should approve it or supply its own. |
| 4.8 | Overseas numbers | Not applicable. | The phone field accepts UK numbers only, to Ofcom's numbering plan. Overseas visitors are asked to call 020 8146 2200. |
| 4.9 | Analytics | Not applicable. | Every call to action and step is pushed to `dataLayer`, ready for a Google Tag Manager container. Send the GTM ID to wire it up. |

## 5. Ranges and sizes

| # | Question | Sources | The configurator now |
|---|---|---|---|
| 5.1 | Default sizes: product cards or planner? | They differ for Portal, Cabano, Inspiro, Ofiko, Edge, L-Shape, and on height for Levno, Apexo and Roko (B10). | Opens at the planner's default size. The card sizes are offered as one-tap priced sizes. |
| 5.2 | Height limits for gable styles | Planner: Cabano and Inspiro 3.27m to 3.5m; Veranda 3.25m to 4m; Pergola 2m to 3m. | Uses the planner's limits. Every gable design is over 2.5m, so the planning note always shows for them. |
| 5.3 | L-Shape minimum width 2.7m, and the 10m × 8m maximum | Planner limits. The homepage says buildings range from 4m² to 90m² (B12). | Uses the planner's limits (2m × 2m to 10m × 8m for room styles; Pergola to 16m × 10m). |
| 5.4 | Style names | "Levno" vs "Lenvo" (brochure); "Inspiro" (planner) vs "NSPIRO" (product card) (B11). | Levno and Inspiro. |
| 5.5 | "Classic 30m²" card (7m × 4.5m, £48,500) | Product card with no style named. | Not offered, since no style matches it. |
| 5.6 | Two openings appear only in standard designs: Roko's double awning and its sliding window | In the planner's templates but not in its add-a-window menu. | Kept on the standard designs where the planner has them; not offered in the add menu. |
| 5.7 | Planning wording | The FAQ and /garden-rooms/ are more absolute than the homepage (G1). | Uses the homepage's qualified wording: a garden room within 2m of a boundary must be no more than 2.5m high under England's permitted development, and Pecasa advises at the survey. |
