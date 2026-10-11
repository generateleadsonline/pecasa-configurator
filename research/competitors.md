# Competitor research and recommended Pecasa experience

Research date: 11 October 2026. Sources were the current public Noah and SMART HTML, SMART's readable live page and local source, and existing related configurator source. No competitor form was submitted and no external message was sent. Root owns the browser UI walkthrough; this report covers fetched interface/source and full PDF inspection.

## Live benchmark

- Noah: https://start.noahgardenrooms.co.uk/configurator/
- SMART: https://smart-modular-buildings-homepage.netlify.app/configurator/
- Saved Noah HTML: `research/noah-current.html` (869 KB), retrieved 11 October.
- Saved SMART HTML: `research/smart-current.html` (76 KB), retrieved 11 October.

| Area | Noah current configurator | SMART current configurator | Pecasa opportunity |
|---|---|---|---|
| Steps | Six for garden rooms: range, shape/size, structure/cladding, doors/windows, finishes, price. Nine for annexes. Jump-to-step nav and skip-to-price from step 2. | Five: room, size, style, glazing, quote. Clear task-specific next buttons. | Four purposeful stages with a useful configured room visible immediately; allow early quote CTA without forcing all optional choices. |
| Sizing | Popular sizes, feet/metres toggle, numeric steppers, dimension arrows on the model; one-foot increments. Width/depth are not conventional sliders. | Dropdown width and depth plus three use-specific preset cards. Range grid constraints are reconciled with a change notice. | Large accessible range sliders plus numeric readouts, popular-fit shortcuts and real-time footprint. Respect verified Pecasa increments and limits. |
| Preview | Rich parametric 3D, viewpoint tools, wall-specific edits, furniture/interior, sun-hour range slider and onboarding tour. View choices respond to the feature being edited. | 3D/floor plan/real room tabs; outside/front/inside views, zoom, main window side, mirror layout. Real photo is explicitly an example, not the exact design. | Architectural presentation, instant visual reaction to every choice, view controls with plain labels, dimensioned floor plan, appropriate furniture and authentic Pecasa photography clearly captioned. |
| Saving | Design encoded in share URL; undo history (80); saved reference can reopen quote; save and email actions. | Choices auto-save locally; share URL excludes contact information; undo history (35), reset and resumed-design notices. | Local draft + privacy-safe share link; durable accepted lead with server-issued reference; keep customer contact out of shared design URL. |
| Gate | Exact total reserved for thank-you. Five mandatory fields: first/last name, email, UK phone, postcode, followed by email confirmation. However range starting prices and option deltas remain visible earlier. | Name/email/postcode required; phone, timing, budget, notes optional. Price and PDF unlock after accepted submission of current exact design; changes require updated submission. | Explain the reward before the form. Name/email/postcode required, phone optional unless Pecasa needs it operationally. No price total or selected option prices in pre-submit interface. PDF must be gated server-side, not merely a hidden button. |
| Trust/scope | Inclusions, exclusions, VAT/delivery terms, postcode delivery hint, guarantee and review link; building price distinction for individually quoted extras. | Persistent inclusions and separately quoted base, mains, site work, upgrades, location surcharge. Structural guarantee/review rating and discovery call. | Use only verified Pecasa promises. Label figure accurately, explain VAT and scope, distinguish published/base quote from selected upgrades that need review. |
| Form friction | Mandatory phone, separated names, confirmation code and dense scope text add effort, although fields preserve data and show targeted errors. | Clear errors, optional commercial context, separate opt-in, focus to invalid field and saved design on error. Successful submission gets primary discovery-call action and six-page PDF. | A short form with one strong unlock CTA; separate optional consent, honest privacy copy, useful loading/errors/retry. Persist draft through failures. |
| Mobile | Split viewer/panel with scrollable steps; complex option content. | Collapsible preview when quoting, adaptive tablet scroll, sticky action, large selection cards. | Keep sliders and CTA thumb-friendly; mobile sticky action, preview-collapse control, no duplicate competing CTAs; clean one-column quote form. |

Noah's current live app is more advanced than the old local `noah-github-sync/site/configurator-app` industrial configurator; do not treat that old app as the live garden-room journey. The current live HTML includes full application modules inline.

## CRO recommendations

1. Start with a complete attractive default Pecasa room, not an empty scene. Offer a few use presets (office, gym, creative studio, retreat) with genuine geometry/furniture changes. Let users immediately see ownership through customisation.
2. Sliders should show the current metres prominently and move the building while dragged. Keep precise keyboard/numeric adjustment, visible min/max, `aria-valuetext` and units. Preserve focus during renders. Save a single history entry per drag, not per pixel.
3. Reduce cognitive load with four stages: Space, Exterior, Interior/details, Your estimate. Put optional advanced controls in accessible disclosure panels; selections are always editable. Caption what is included/extra without exposing prices before the requested gate.
4. Present the lead reward before the form: personalised price, exact selected specification, illustrated PDF and return link. Show a genuine PDF preview/thumbnail. Ask only required contact information, label optional qualification fields, and never promise an emailed PDF without implemented email delivery.
5. Unlock only after durable server acceptance. Keep pricing out of the public client catalog and pre-submit API response. Receipt/session should identify the immutable accepted specification. A PDF endpoint must check an accepted receipt and ownership; do not allow visitors to make up a price/reference and obtain a document.
6. After submission, show price with honest scope and the PDF prominently. Offer one helpful next step (contact Pecasa or book a conversation only if verified booking URL exists) and a quieter refine-design action. Customer should not feel that a second lead form is required.
7. Share links should carry product selections only. Keep contact details server-side. Retry with an idempotency key to avoid duplicate leads. Do not fire `generate_lead` until storage succeeds.
8. Measure funnel view → design start → step view → form start → server acceptance → PDF download → qualified opportunity. Break down device/source. A dramatic conversion uplift is a goal, not an achieved/measured fact.

## Attached competitor PDF: fully inspected

File: `/Users/johnparnell/Downloads/Noah-building-design-1ba2cc9c-bc80-429d-a5af-8ada35d8a90e.pdf`

This supplied document is **a Noah industrial steel building concept, not a garden-room quote PDF**. Four A4 portrait pages, 32,896 bytes, created 26 September 2026 by pdf-lib. All four pages were extracted with pypdf, rendered through Poppler at 100 dpi and visually inspected. PNGs are in `research/pdf-review/noah-1.png` to `noah-4.png`.

- Page 1, “Your building design”: large Noah logo on charcoal masthead, quote UUID/date, three dark KPI tiles (5 × 10 m / 50 m² / 3 m eave), simple rectangular plan and front/left elevations, roof/material/access summary, return-to-design button and concept footer.
- Page 2, “Your specification”: building and finish rows plus personal/project requirements. No image. Substantial white space beneath the tables.
- Page 3, “Doors, openings & review”: selected opening schedule and two provisional fire doors. No image. Substantial white space after the short schedule.
- Page 4, “Technical review & next steps”: two red flags (4 m shutter requires taller eave; shutter does not fit front wall), dense technical assumptions, return-to-design button and explanation of private-data-free shared link.
- No price, itemised investment, garden-room lifestyle value, authentic project photo or 3D room render. It explicitly says the document records a request and is not a price/confirmed order/approved structural drawing.

Strengths: disciplined brand hierarchy, clear sizing, exact specification, text-selectable vector drawings, footer/page numbers and editable design link. Limitations for Pecasa: impersonal UUID, sparse detail pages, heavily technical tone, no price reward, no desirability imagery, no useful visual finish samples and no dominant commercial follow-up action.

## Recommended luxe Pecasa PDF

Four or five substantial, visually balanced A4 pages is preferable to adding filler merely to exceed the competitor page count:

1. **Your Pecasa, made personal.** Authentic logo, deep teal/charcoal + mint, personalised name/date/short reference. Large rendered current room, exact width/depth/footprint, gated indicative price including VAT where verified, clear one-line scope and a subtle authentic project photo.
2. **Designed around your day.** Front/side or interior configured view alongside the dimensioned floor plan, selected use and furniture. Label the plan illustrative, externally dimensioned and not for construction. Actual cladding/floor swatches from Pecasa imagery, without claiming a reference photo depicts the exact room.
3. **Every detail, considered.** Well-spaced selected exterior/glazing/interior/upgrades table, included standard package, selected extra options and package-dependent notes. Same immutable server-validated snapshot as the quote and lead.
4. **Your investment and next steps.** Transparent estimate basis, VAT, included/separately quoted costs and source/check date. Steps from discussion/site review to final written quote. Verified Pecasa contact and clickable edit-design link; QR useful if dependency available. No fabricated guarantees, lead times, payment terms or planning permissions.
5. Optional fifth page only if genuine product detail warrants it: authentic craftsmanship photography + verified construction/comfort specification + useful site/access checklist.

Use embedded branding/fonts and consistent footer/page count. A missing WebGL capture should fall back to verified Pecasa imagery and configuration-specific vector drawing, not a blank box. Final QA must render every page and inspect wrapping, image quality, price/spec agreement, links and clipping with longest customer/specification strings.

## Useful implementation patterns and exact local paths

| Pattern | Local code | What to reuse/adapt |
|---|---|---|
| Durable lead acceptance and accepted session | `/Users/johnparnell/projects/haus-garden-configurator/server/quote-service.mjs` | Strong-consistency Netlify Blobs, origin check, strict schema/body bounds, validated lead+design, opaque HttpOnly session, acceptance tied to stored lead, idempotency, no-store responses. This is the best gate pattern. |
| Protected PDF storage/download | `/Users/johnparnell/projects/haus-garden-configurator/server/pdf-service.mjs` | Download checks accepted server session; reference belongs to saved design/lead; validated PDF size/header/EOF; no-store and private response. Parent can simplify by generating PDF server-side from stored snapshot. |
| Isolated production stores | `/Users/johnparnell/projects/outdoor-modular-spaces-configurator/netlify/functions/lib/storage.mjs` | Stable production store across deployments; separate preview/development store. |
| Proposal-data gate | `/Users/johnparnell/projects/outdoor-modular-spaces-configurator/netlify/functions/lib/api.mjs` and `proposal-data.mjs` | Token-backed access to durable accepted proposal data with rate-limit path; inspect before adapting to Pecasa. |
| Photo/render PDF with fallback | `/Users/johnparnell/projects/outdoor-modular-spaces-configurator/src/proposal.mjs` | jsPDF helpers: image aspect-ratio fit, vector room fallback, plan, overflow-aware tables, branded investment section, clickable buttons and next steps. Three useful pages with thoughtful layout. |
| Richer illustrated PDF | `/Users/johnparnell/projects/smart-modular-buildings-homepage/src/configurator-pdf.js` | Six-page jsPDF generator, embedded real logo/fonts/photos in `configurator-pdf-assets.js`, multi-view shots, dimensioned openings plan, included/excluded scope, QR and clear call CTA. Do not copy SMART branding/content. |
| Shared geometric source of truth | `/Users/johnparnell/projects/smart-modular-buildings-homepage/src/configurator-model.js` | `openingLayout()` feeds 3D and plan/PDF; `normalise()` enforces constraints; privacy-safe `shareURL()`/`fromURL()` round trip. |
| Production 3D scene | `/Users/johnparnell/projects/smart-modular-buildings-homepage/src/configurator-scene.js` | Procedural timber/roof textures, orbital cameras, soft shadows, reduced-motion, scene resource disposal, snapshotViews. |
| WebGL failure recovery | `/Users/johnparnell/projects/outdoor-modular-spaces-configurator/src/room-view.mjs` | SVG room fallback, context-loss handling, requestAnimationFrame build batching, camera modes, image capture and dispose. |
| Reference React parametrised preview | `/Users/johnparnell/projects/haus-garden-configurator/src/RoomPreview.jsx` and `/Users/johnparnell/projects/designer-garden-rooms-configurator/src/RoomPreview.jsx` | Simple React project integration when a full Three.js scene is unnecessary. |

Do not copy live customer details, secrets, existing data/store names or competitor trust claims into Pecasa. Source price datasets should remain server-only for the requested meaningful gate.

## Browser walkthrough corroboration from root

Root additionally inspected both live interfaces on 11 October. Noah has a persistent 3D toolbar with mirror, measurements, sun, see-in-garden, share and help controls, and Outside/Inside/Plan/Sizes views; this reinforces the case for discoverable meaningful scene controls. Noah's range starting prices are visible before submission. SMART offers Undo/Redo, exterior/front/interior/dusk, zoom/reset, saved-on-device status, the three preview modes and a six-page guide. Its required name/email/postcode and optional phone/timeline/budget/notes plus unchecked marketing opt-in are the strongest low-friction form baseline. Pecasa should equal those conveniences, use sliders in place of the observed SMART dropdowns, and simplify optional configuration without reducing useful visual control.
