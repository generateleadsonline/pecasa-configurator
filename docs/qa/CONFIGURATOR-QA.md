# Pecasa configurator v2: QA report

Date: 13 October 2026. Live site: https://pecasa-garden-room-configurator.netlify.app/configurator/

**Result: PASS.** Every suite below ran against the live URL after a single production deploy. Pecasa's open questions are listed separately in [CONFIGURATOR-CONFIRMATIONS.md](CONFIGURATOR-CONFIRMATIONS.md); none of them blocks the preview.

## Deploy

- **Netlify:** site `4a50ab0d-7bfc-46f2-8c8b-4de832d91830`, production deploy `6ace2c1130ba6b8d2a2039ec`, from branch `configurator-v2`.
- **Failed attempt first:** Netlify's secret scan stopped the first attempt (deploy `6ace2ba256a1781d06f8e446`). A Made in Britain web page, saved as research evidence, contained that site's Google Maps browser key. The key was redacted and the commit redeployed. The site was never live with that build.
- **Live files match the build:** all 74 files in `public/` were fetched from the live site and hashed. 73 are byte-identical. The other, `configurator/index.html`, differs only in Netlify's own rewriting: it strips `data-netlify` from the 5 forms and rewrites the 5 `/privacy.html` links to `/privacy`.
- **Headers on the live site:**
  - CSP with script and style hashes and no `unsafe-inline`
  - `X-Robots-Tag: noindex`
  - HSTS
  - immutable caching for hashed assets
  - `/` redirects 302 to `/configurator/`
- **Netlify Forms:** turned on for the site. All five forms are detected, each with a honeypot. **No live form was submitted:** every test POST was intercepted in the test browser, and Netlify shows 0 submissions on every form.

## Suites run against the live URL

| Suite | What it proves | Result |
|---|---|---|
| `npm test`: model | Every planner estimate, product card and price-table cell matches `research/2026-10-13/website/prices.json`. Every price shown for any style, size and height is a published one; everything else is "Quoted". No source file hard-codes a price. Size ladders sit inside the planner's limits. 8,144 style and size layouts, default and crowded, fit inside the wall margins without overlaps. Share links round-trip. UK phone numbers follow Ofcom's plan (drama ranges refused). Postcode and email are validated. Spec statuses are only included, upgrade or quoted. | 455,244 assertions pass |
| `npm test`: PDF | Six designs, including one large enough to need a second spec page: page count, price, every spec line, booking and design links, phone number, and only published prices, read back with pypdf. | 250 assertions pass |
| `npm test`: attribution | Campaign capture, sanitising, storage failure, form field contract. | 11 tests pass |
| `check-options.mjs` | Each of 253 option values is applied as the panel applies it. The view the camera turns to is rendered before and after, and the pixels are compared. A part is outlined, except for whole-building changes (style, size) and removed parts (such as no decking). A no-change control renders 0 changed pixels. | All 253 change the model. 236 outline the part; 16 are whole-building changes; 1 removes the part (no decking). The control renders 0px. |
| `check-zfighting.mjs --url` | Coplanar overlapping faces (flicker or blotches), checked in the live page across 95 designs. These cover every style at its default, smallest and largest size, the other roof type, every extra at once, a second extras design, every door and window type and every pergola side. | No visible z-fighting in any of the 95 |
| `check-mobile-3d.mjs` | iPhone 15 Pro in WebKit (Safari's engine) and Pixel 7 in Chrome. The phone quality tier, released canvas memory across all 14 styles and 28 claddings, and the PDF capture size. Forced failures: lost context once and repeatedly, no WebGL, WebGL1 only, shaders that won't link, PBR-only failure, a GPU that draws nothing, a setup fault, early reloads, the crash guard, `?debug3d`, the 2D canvas budget spent, and a 1GB-memory phone. Never a "3D unavailable" message: the last resort is the flat SVG drawing. | 38 checks pass |
| `check-layout.mjs` | At 320, 360, 375, 390, 768, 1024 and 1440px it opens every step, all five dialogs, the menu and the tour. No sideways scrolling; every touch target is at least 44 × 44px; axe-core (WCAG 2.0 to 2.2 A and AA plus best practice) finds no violations, at every width. | 28 checks pass, 0 axe violations |
| `check-flows.mjs` | The flows a shopper uses: <ul><li>3D code loads only on the first interaction</li><li>the tour on a first visit, not on a return visit, replayable from Help</li><li>outside, inside and plan views, with dimensions in plan</li><li>zoom by buttons, scroll wheel and pinch</li><li>selling points beside each step</li><li>header phone, callback, showroom and brochure</li><li>price-page Book a call and Download PDF</li><li>all five forms: empty and reserved-number submissions refused; payload has separate names, E.164 phone, postcode, the full specification and a link to the design; pre-fill after the first form; confirmation</li><li>analytics for every step and call to action</li><li>no page errors</li></ul> | 59 checks pass |
| Lighthouse 12.6 (mobile) | Three runs on the live page. | Performance 99, 99, 100; Accessibility 100; Best Practices 100; SEO 69 |

SEO is 69 only because the preview is deliberately `noindex`, so it doesn't compete with pecasa.co.uk; that one audit, "is-crawlable", is the only failure. Every other SEO audit passes. The full report is in [lighthouse/mobile-live.html](lighthouse/mobile-live.html). Core metrics: FCP 0.9s, LCP 1.6s, TBT 0ms, CLS 0.008.

## PDF, checked by eye

Two PDFs were made in the browser with real 3D renders, by clicking Download PDF. They are in [docs/examples](../examples/).

- A priced Levno: 6 pages, £28,109 (Pecasa's online estimate).
- A quoted Apexo carrying every extra: 7 pages, because its specification runs onto a second page.

Every page was rendered to an image and reviewed: [pdf-pages-levno.jpg](pdf-pages-levno.jpg) and [pdf-pages-apexo.jpg](pdf-pages-apexo.jpg).

That review found and fixed:

1. **Back view:** the garden's trees hid the building. The four side views now leave out the planting.
2. **Plan drawing:** side-wall window widths overlapped the wall lines. They now run along the wall, outside it.
3. **Spec table, cramped:** section headings were crowded. A wrapped label crossed the next row because rows were measured in the wrong font.
4. **Spec table, truncated:** a long specification was cut off at the page foot. It now continues on as many pages as it needs, and page numbers count the total.
5. **Inside box:** it had a fixed height with empty space. It now fits its content.
6. **Contact tiles:** the three tiles were 2mm short of the button width.
7. **Shower-room designs:** the interior "looking back" view was taken from inside the shower room. It now looks from the open room.
8. **Duplicate sizes:** "Published prices" listed one size twice, from the planner and the card at different heights, with no height shown. Every published size now gives its height.
9. **Wording:** fixed "Plasterboard, tape-and-joint finish: Plywood"; "Osb" is now "OSB". The cladding names no longer repeat, and the RAL code stays in capitals.
10. **Standard roof:** the PDF said "EPDM roof" on Cabano, whose planner standard is copper. It now names the style's own standard roof.

## Found and fixed in this QA pass

**3D model**

- **Outside corners:** both wall cores filled the corner square. Any door or window at the corner margin then shared a plane with the other wall's lining. This flickered on Portal's porch, on 2m rooms, and where Levno's sliding doors meet its fins. The side wall now fills the corner.
- **Sockets:** on shower-room designs they were placed behind the shower tiles. Fittings now avoid enclosed rooms and each other.
- **Office rug:** it ran through Portal's and L-Shape's recessed front wall. On sauna designs it also ran into the sauna wall. Rugs are now clamped to the open floor.
- **Partition and sauna walls:** their ends lay in the plane of the walls they meet. They now run into those walls.
- **Desk:** it stood in front of the kitchenette. Back-wall furniture now goes beside the kitchen when there is room.

**Every option visibly changes the model**

The first full run of the option check found 6 options that changed nothing on screen:

- **"No outside lights":** the camera looked down on the soffit. It now looks up under it, from the front.
- **The worktop:** it was hidden by the desk (see above). Worktop changes now frame the worktop.
- **Pale finishes:** two plaster colours, cream cabinets and two light worktops changed less than the coarse threshold of 24 levels per colour channel. The threshold is now 8, and a zero-noise control proves it is still well above render noise.

**Layout and accessibility**

- **Touch targets under 44px:**
  - logo link
  - header icons
  - step circles at 320px
  - view switch
  - dialog close buttons
  - checkbox labels
  - callback-time chips
  - the spec "Edit" buttons
- **Sticky stage covered fields:** on phones it covered fields scrolled or tabbed into view (WCAG 2.2 focus not obscured). Scroll padding now reserves room for the header, steps, stage and footer.
- **axe violations:**
  - `#scene` had a label with no role.
  - The menu links sat outside any landmark.
  - Header hover text was 4.48:1, just under the 4.5:1 minimum.
- **Hidden step names:** these used `display:none`, so screen readers heard "2" instead of "2 Size & roof". They are now visually hidden only.

**Prices and sizes**

- Height ladders stepped from each style's default, so Apexo and Portal never reached their 2.5m minimum (they stopped at 2.516m). They now include each limit, and the 2.5m product cards match exactly.

**Earlier in this rebuild (before this pass)**

- Pergola builds crashed.
- An empty cladding value in a share link reopened as cedar.
- Touching openings broke the wall triangulation (Ofiko's missing windows, a stray triangle on Edge).
- Colour bled round corners.
- The camera framed the origin for newly built parts.
- Small interior parts were too far away to see.
- Door thresholds, inner sills, rooflight wells, wall-light lamps, additions against fascias, and deck boards through fins all z-fought.

## Not covered by automation

- **Real phones:** the 3D was tested in Safari's engine (WebKit) as an iPhone, and in Chrome with SwiftShader (a software GPU) as an Android phone. It was not tested on physical phones. The forced-failure scenarios cover the failures seen on real GPUs.
- **Live form delivery:** forms were not submitted to the live site, as asked. Delivery from Netlify Forms to Pecasa's inbox or CRM still needs a destination (confirmations item 4.6).
- **Analytics:** events go to `dataLayer`. No Google Tag Manager container is connected yet (item 4.9).

## 16 Oct 2026: only the price form unlocks the price

**Why.** John's rule of 16 Oct 2026: as on Oeco, only the price step's own form unlocks the price. Before this change, `unlocked()` was `contact !== null`. Any form (callback, Book a call, showroom visit or brochure) stored the contact details, which revealed the price, Book a call and Download PDF.

**What changed** (`src/configurator.js`):
- **The lock.** `unlocked()` now also needs `sentKey`, which only the price form (and its "send this updated design" resend) sets. The other forms still post to Netlify Forms with the specification and design link. Their details fill the price form, so the visitor just presses Show my price.
- **A bug fixed on the way.** The confirmation copy was built eagerly, so for every form other than Book a call it read the missing `call-date` field and threw. Callback, showroom and brochure therefore showed a blank confirmation. The brochure tab never opened, `generate_lead` never fired, and the new prefill could not run. Only Book a call reads its date now.

| Check | Result |
| --- | --- |
| `npm test`, `sh build.sh` | Pass |
| `check-flows.mjs` (local) | All flow checks passed |
| Unlock check, local, fresh visitor | Callback, showroom, brochure, then Book a call, each with its confirmation text. Price still locked, the price form prefilled, and the PDF locked ("Enter your details above…"). Then the price form: £26,639 shown, Book a call shown, PDF `Pecasa-ecke-3.3x2.4-design.pdf` downloaded |
| Same check on live before the change (POSTs answered in the browser) | FAIL: after the callback the price showed and the PDF downloaded |

## How to repeat

```sh
L=https://pecasa-garden-room-configurator.netlify.app
npm test
PLAYWRIGHT_CORE=… node tools/qa/check-options.mjs $L
PLAYWRIGHT_CORE=… node tools/qa/check-zfighting.mjs --url $L
PLAYWRIGHT_CORE=… node tools/qa/check-mobile-3d.mjs $L
PLAYWRIGHT_CORE=… AXE_CORE=…/axe.min.js node tools/qa/check-layout.mjs $L
PLAYWRIGHT_CORE=… node tools/qa/check-flows.mjs $L
npx lighthouse $L/configurator/ --form-factor=mobile
```
