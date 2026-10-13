# Pecasa garden-room ranges: photo-based modelling brief

Compiled 13 October 2026 for a Three.js / procedural-geometry modeller. This was read-only research. No forms were submitted.

## How to read this

- **Confidence tags:** **[H]** is high: measured from an official render, or a literal value from the planner config. **[M]** is medium: read from a real photo that is a clear match for the range. **[L]** is low: an inference, a loose photo match, or a general building-practice assumption.
- **File references:** every claim names the image it is based on, relative to this folder (for example `levno/photo-1633-…`). Each style folder has a `sources.json` with the source URL, page, pixel size and a match-confidence note for every file.
- **Image kinds:**
  - *Official renders.* These are `render-PECASA-*-CLASSIC-*.png`, 640 px, from https://www.pecasa.co.uk/our-products/. They are screenshots of the 3D planner with dimension labels, and some are customised (for example cedar instead of the default shiplap).
  - *Planner thumbnails.* These are `planner-thumb-R*.png`, 100 px, showing the default config.
  - *Real photos.* These come from the WordPress media library: `/gallery/` (page 1614), `/case-studies/*` and location pages.
- **Important caveat:** Pecasa never captions gallery photos with a range name. **Every photo-to-range assignment below is my visual match**, and the confidence is given per file in `sources.json`. No real photos of a pitched or gable roof exist anywhere in the 605-item media library (checked through `/wp-json/wp/v2/media`). Cabano and Inspiro therefore rely on the render and thumbnail only.
- **Planner geometry source:** `https://webadminservices.com/editor-app/a7221949-fee9-45dc-8b90-7ddc7561961d/configuration.json?v=23` → `buildingSizes[]`. One entry per range, all units in mm. A full dump was taken today and is quoted per style below. This is the geometry the official renders are built from, so treat it as the primary dimensional truth and use the photos for real-world detailing.

### Planner config semantics (shared by all styles)

| Field | Meaning (as interpreted) | Conf. |
|---|---|---|
| `floor[]` (x, y, z) | Footprint polygon. x = width, y = depth, **front = largest-y edge**. `z` = wall-top height at that vertex, so a **mono-pitch is encoded as z rising toward the front**. | H (values), M (front = max-y; door elevations confirm it) |
| `outlineIndex` / `elevation` | Edge *i* runs from vertex *i* to *i+1*. In a rectangle, 0 = back, 1 = right side, 2 = front, 3 = left side. | M |
| `leftOrTop` | **Centre** of an opening in absolute plan coordinates: x for front/back walls, y for side walls. Checked against the corner posts of Ecke, Ofiko and Apexo. | M |
| `porches[]` `relativeX/Y` | How far the roof extends past that wall edge (overhang or canopy depth). | M |
| `decks[]` | How far the deck extends past that edge. | M |
| `ponys[]` | "Pony" fin walls, 180–200 mm thick, extending the side walls out under a canopy. `relativeY` = projection. Angle adds `taper: 400`. | M |
| `horizontalTrims[]` `height` | Fascia or edge-trim depth (mm) on that edge. Colour is in `finishes`. | M |
| `verticalTrims[]` | Corner trims. `width` × `depth` (for example 190×50 frame jambs, or 30×30 corner beads). | M |
| `bulkheads[]` | Dropped band under the roof at the edge of a recess (seen as a cedar band in the Apexo and Portal thumbnails). | L |
| `baseHeight: 150` | Finished floor 150 mm above ground. Doors have `bottom: 150`. | H |
| `claddingOverlap: 100–150` | Cladding drops this far below floor level to form a skirt. | M |
| `wallThickness: 150` | SIP wall thickness. | H |
| Door height | 2100 mm (L-Shape 2040). Glazing depth 68 mm, stacker/slider 130–150 mm. | H |
| Finish keys | `shiplap01` = black, `shiplap02` = white, `shiplap03` = grey, `cedarPlanks` = vertical cedar, `cedarPlanksHorizontal`, `renderWhite`. RAL: 9011 black #27292B, 7016 anthracite #383E42, 7032 pebble #B8B8A7, 7015 slate #51565C, 7004 silver #9D9FA0, 5025 pearl blue #21697C, 6019 pastel green #B9CEAC. | H |
| `building` defaults | `defaultFasciaFinish: RAL7004`, `gutterProfileWidth: 100`, `roofTrimHeight: 50`. | H |

### Common real-world Pecasa detailing (applies to most ranges)

- **Roof:** EPDM flat or low mono-pitch, with a fascia band and a dark metal or EPDM drip trim on top. Mono-pitches always rise **toward the glazed front**, so the side elevation is a wedge (`levno/photo-1635`, `levno/photo-13587`, `portal/photo-14909`) [M]. Gutter and downpipe sit at the low rear corner: a round black downpipe about 68 mm (`projects/detail-14624`, `lshape/photo-1875`) [M].
- **Soffit:** almost every overhang has recessed LED downlights at about 0.6–0.9 m centres, set about 150 mm in from the fascia (`projects/detail-14622`, `levno/photo-1633`, `ecke/photo-13570`) [M]. Soffit boards match the cladding, either running front-to-back or mitred at corners (`projects/detail-14622`) [M].
- **Glazing:** Cortizo aluminium (`projects/detail-14627` shows the Cortizo handle). Frames are **anthracite RAL7016 in most photos** and black RAL9011 on the charred builds (`quba/*`) [M]. Configurations are bifold (3–6 leaves), lift-and-slide or sliding (2–3 panes), French doors, plus full-height fixed lights and letterbox high-level windows. Sill = floor level (150 mm).
- **Wall lights:** cylindrical up/down spots in black or anthracite, usually one each side of the main opening and one at each end (`projects/detail-14621`) [H].
- **Cladding families seen:**
  - Western red cedar, vertical T&G, about **120 mm face**. Scaled from the 2.1 m door in `levno/photo-1633` [M].
  - Composite (Millboard / Envirobuild) vertical boards, about 120–150 mm (`edge/photo-14901`, `projects/detail-1889`) [M]. Board & batten / slatted (`projects/detail-14621`).
  - Horizontal shiplap or weatherboard, about **140 mm course** (`angle/photo-1915`) [M].
  - Charred Shou Sugi Ban vertical boards, about 150 mm (`quba/photo-14896`) [M].
  - Horizontal treated pine (`projects/detail-13539`).
- **Corner trims:**
  - Cedar builds usually butt the boards with no visible trim (`levno/photo-1633`).
  - Horizontal pine uses about 50 mm black corner trims (`projects/detail-13539`) [M].
  - Framed styles use 150–350 mm anthracite or black fins (`angle/*`) [M].
- **Base:**
  - The building sits on ground screws, so no masonry plinth is visible. Cladding stops about 50–100 mm above ground, or a dark skirt or deck fascia shows (`levno/photo-1633`, `quba/photo-14896`) [M].
  - Composite decking is anthracite, black or grey, 150–350 mm high with 1–2 steps and often riser LEDs (`projects/detail-13586`, `edge/photo-14031`) [M].
- **Interiors:** white plastered walls, herringbone LVT, downlights, often a perimeter LED cove. Flat rooflights have deep plastered upstands and come in 1000×1400 / 1400×1400 / 2000×1400 sizes in the planner (`projects/interior-1681`, `projects/interior-13567`) [M].

---

## 1. Levno (template 201)

**Files:** `levno/render-PECASA-LEVNO-CLASSIC-16m2.png`, `levno/planner-thumb-R201.png`, `levno/photo-1635-…`, `levno/photo-1633-…` (best real match), `levno/photo-13587-…`, `levno/photo-14918-…`.

- **Footprint:** rectangle. Planner 4800 W × 3400 D [H, config]; product 4.8 × 3.4 m [H, render label].
  - W:D:H ≈ **1.41 : 1 : 0.79** using the front wall height.
  - The real build in `photo-1633` scales to about 3.6 m wide, using the 2.1 m door and 192 px/m [M].
- **Roof:** **mono-pitch rising to the front.**
  - Wall tops are 2450 at the back and 2700 at the front, a fall of 250 over 3400, so **≈ 4.2°** [H, config].
  - Real photos show the same wedge, visually 4–7° (`photo-1635`, `photo-13587`) [M].
- **Canopy:** the roof projects **1000 mm past the front wall** with no posts (config porch; "1 m" label in the render) [H].
  - Overhang on the sides and back is minimal, about the fascia depth only [M, render].
  - Real builds use 0.4–0.8 m canopies (`photo-1633` about 0.45 m, `photo-13587` about 0.7 m, `photo-14918` about 0.5 m) [M].
- **Fascia:** 110 mm high, RAL9011 black, on all four edges [H, config].
  - In the photos, the front edge shows a black drip trim over the fascia, and the canopy underside is cedar boards running front-to-back with 3–5 LED downlights (`photo-1633`) [M].
- **Front frame:** two 190×50 black vertical trims at the front corners, plus 180 mm pony fins that carry the side walls 300 mm forward under the canopy [H, config].
  - This reads as black "cheeks" framing a cedar front (`planner-thumb-R201`) [H].
  - In `photo-13587` the cedar side wall runs right out to the canopy edge [M].
- **Cladding:**
  - Planner default: **front = vertical cedar; sides and back = grey shiplap (`shiplap03`), horizontal** [H, config + thumb].
  - `photo-1635` matches exactly: vertical cedar about 120 mm on the front, dark grey horizontal shiplap on the side [M].
  - The product render uses pale grey textured horizontal boards on the side [H].
- **Doors and windows:**
  - Front: **4-panel sliding door, 3200 × 2100, centred**, leaving about 800 mm of cedar each side [H, config]. The render shows it open as bifold-like leaves.
  - Left side: awning window 1800 × 500, sill 920. Right side: high-level letterbox 1800 × 400, sill 1780 [H, config].
  - Frames RAL9011 outside / RAL7016 inside [H].
  - Real builds: French pair about 1.6 m wide plus a front letterbox about 0.8 × 0.3 m at door-head height (`photo-1633`); 3-panel anthracite bifold (`photo-14918`) [M].
- **Base:** floor +150. The deck extends 300 mm forward in the config [H].
  - Real builds use a black composite deck about 150 mm high and about 1 m deep that wraps the front (`photo-1633`) [M].
- **Distinctive:** deep cantilever canopy with soffit downlights, mono-pitch rising to the front, black corner cheeks, and contrasting front and side cladding.

## 2. Apexo (template 202)

**Files:** `apexo/render-PECASA-APEXO-CLASSIC-15m2.png` (primary), `apexo/planner-thumb-R202.png`, `apexo/photo-1907-…` and `apexo/photo-13565-…` (loose real analogues [L–M]).

- **Footprint:** **rectangular roof over a stepped wall line with a recessed, corner-glazed front** [H, config]. Plan, 5000 W × 3050 D:
  - Left solid block 0–1600 runs full depth to y = 3050.
  - The glazed front is recessed **400 mm** (y = 2650) from x 1600 to 4800.
  - The glazing turns the front-right corner, around a 150×150 corner post at (4675, 2575), and returns back to y = 1690.
  - A 200 mm wall stub then meets the right wall at x = 5000.
  - Render labels: 1.6 m block + 3.4 m glazed front + 1.69 m right wall [H].
  - W:D:H ≈ **1.64 : 1 : 0.86**.
- **Roof:** **mono-pitch rising to the front.** z = 2350 at the back and 2617 at the front, so 267/3050 ≈ **5.0°** [H, config].
  - The roof covers the full rectangle. The porch overhang is 400 over the recess and 200 over the return [H].
  - Minimal overhang elsewhere [H, render].
- **Fascia:** 100 mm, **RAL7016** anthracite [H, config]. The render shows a thin black edge.
- **Bulkhead:** a **cedar-clad dropped band** runs under the roof edge across the recess (front and return) (`planner-thumb-R202`, render) [H].
- **Cladding:**
  - Default: **white horizontal shiplap (`shiplap02`)** everywhere except the recessed front and return, which are vertical cedar [H, config].
  - The render uses pale beige vertical boards on the solid parts [H].
- **Doors and windows:**
  - Recessed front: **stacker door 2150**, centred x = 3525, plus an 800 fixed full-height light next to it [H].
  - Return: 800 fixed full-height light, meeting the 150 RAL7016 corner post = **corner glazing** [H].
  - Left wall: awning window 1800 × 500, sill 920. Right wall: **vertical awning 400 × 1200, sill 980** [H].
- **Base:** floor +150. Decks fill the recess (400) and the return (200) [H].
- **Real-world reading:**
  - `photo-1907` shows a corner-glazed box (about 3 panes front, 2 on the return, slim anthracite post) under a slab roof. The roof oversails the side by about 1.5 m to shelter a deck, with a pale soffit and a fascia about 0.3 m [M for detail, L for range].
  - `photo-13565` shows a post-free corner porch with a timber soffit and downlights [M].
- **Distinctive:** shallow full-width recess with a cedar bulkhead band, corner glazing at one front corner, no posts.

## 3. Pergola (template 222)

**Files:** `pergola/planner-thumb-Pergola.png`, `pergola/photo-14667-…`, `pergola/photo-14670-…`, `pergola/photo-14668-…` (real Pecasa install from the 2026 pro shoot).

- **Footprint:** open rectangle, 4000 × 3000, height 2500, `baseHeight 0`. No walls, porches, decks or trims [H, config].
  - W:D:H ≈ 1.33 : 1 : 0.83. Planner width runs 2–16 m and depth 2–10 m.
- **Structure:**
  - **Four square aluminium corner posts** about 150 mm, colour **RAL7015 slate grey** in the config [H] and anthracite in the photos [M].
  - A **deep box perimeter beam** about 200–250 mm forms the "fascia" (config `fasciaWidth 200`) [H/M].
- **Roof:** flat louvred aluminium blades, **RAL7004** silver grey in the config [H].
  - The photo shows blades spanning between two opposite beams, in open (`photo-14667`, visible gaps) and closed (`photo-14670`) states [M].
- **Base:** stands on a composite deck. Posts land directly on the deck, with no plinth (`photo-14670`) [M].
- **Distinctive:** a frame-only structure. Model the louvres as an instanced array with a rotation parameter (0° closed to about 90° open).

## 4. Portal (template 203)

**Files:** `portal/render-PECASA-PORTAL-CLASSIC-15m2.png` (primary), `portal/planner-thumb-R203.png`, `portal/photo-14909-…` [M], `portal/photo-14617-…` and `portal/photo-14625-…` [L–M], `portal/photo-13544-…` [L, "portal frame" interpretation].

- **Footprint:** **rectangular roof over an L-shaped wall plan.** This leaves a recessed corner porch open on the front and one side with no post [H, config + render]. Plan, 4000 × 3300:
  - The front-left block (x 0–1650) runs full depth.
  - The rest of the front wall is set back **1000 mm** (y = 2300), giving a porch 2350 W × 1000 D.
  - Render labels: 2.35 m, 1 m, 2.3 m right wall, 2.517 m height [H].
  - Product size 4.6 × 3.3 m. W:D:H ≈ **1.21 : 1 : 0.78**.
- **Roof:** **mono-pitch rising to the front.** z = 2300 at the back and 2567 at the front, so ≈ **4.6°** [H].
  - The roof continues 1000 mm over the porch (config porch on the recessed edge), giving one clean rectangle [H].
- **Fascia:** 110 mm, RAL9011 black, all round [H, config].
- **Bulkhead:** runs along the open porch edge [M].
- **The "portal":** in the planner default this is the **cedar-lined recess**. The recessed front wall is vertical cedar against a **black shiplap box**, so the porch reads as a cedar-framed opening cut into a black volume (`planner-thumb-R203`) [H]. The product render inverts this: cedar outside, black shiplap on the porch return [H].
- **Doors and windows:**
  - Recessed front: **stacker door 2150**, x 1650–3800 [H].
  - Return wall of the solid block, facing into the porch: **800 full-height fixed light** [H].
  - Right wall: high-level letterbox 1800 × 400, sill 1780. Left wall: 1800 × 500, sill 920 [H].
- **Base:** floor +150. The deck fills the porch (1000) [H].
- **Real-world reading:**
  - `photo-14909` (Hendon Home Office case study, Millboard board & batten): solid clad block on the left and glazing set back under one continuous mono-pitch roof with soffit LEDs. The open corner is at the right [M].
  - `photo-14617`/`14625`: a projecting solid block beside a recessed glazed volume with a slatted-soffit canopy [L–M].
  - `photo-13544` shows the alternative reading of "portal": a black projecting picture frame (fascia about 0.35 m, fins about 0.25 m) around a recessed slatted-cedar front with soffit LEDs. **That geometry matches Angle more closely** [L].
- **Distinctive:** a 1 m deep corner porch carved out of a rectangle, with no post, cedar lining, and a black body.

## 5. Cabano (template 922)

**Files:** `cabano/render-PECASA-CABANO-CLASSIC-21m2.png`, `cabano/planner-thumb-R922.png`. No real photos exist on the site.

- **Footprint:** rectangle, planner 4200 W × 4000 D. Product 5.1 × 4.1 m; render labels eaves **2.42 m**, overall **3.32 m** [H].
  - W:D:H(ridge) ≈ 1.05 : 1 : 0.83 (planner); 1.24 : 1 : 0.81 (product).
- **Roof:** **dual-pitch gable, ridge parallel to the front wall.** The gable triangles sit on the two **side** walls [H, render + thumb]. `roofType: "RoofType.Pitched"` [H].
  - Pitch ≈ atan(0.90 / 2.05) ≈ **24°** (ridge 3.32 − eaves 2.42 over half of 4.1 m) [M].
  - Eaves and verge overhang about 100 mm all round (config porches 100 on all 4 edges) [H].
- **Roofing:** config finish `roof-copper`, which renders as **green-grey shingle tiles** [H, render].
- **Fascia and barge:** **RAL6019 pastel green**. Trim height 240 on three edges and 50 on one. The render shows thin green fascia and barge boards following the verges [H].
- **Cladding:** **white horizontal shiplap (`shiplap02`) on all walls**, course about 150 mm [H config, M size]. No corner trims are visible; boards are mitred or butted in the render.
- **Doors and windows:**
  - Front: **4-leaf folding-sliding (bifold) 2700 × 2100, centred** [H]. The render shows it in anthracite.
  - Each side wall: one **box window 800 × 1200, sill 1070, centred**. Back wall: high-level 1200 × 400, sill 1850 [H].
  - Default frame colour is RAL6019 green (`planner-thumb-R922`) [H].
- **Base:** floor +150. A thin dark plinth line shows [H, render]. No deck by default.
- **Distinctive:** a cottage or summer-house look: gable, shingles, white weatherboard and green trim. It is the only range with a coloured roof.

## 6. Inspiro (template 001-Pitch; the site product is spelled "NSPIRO")

**Files:** `inspiro/render-PECASA-NSPIRO-CLASSIC-27m2.png`, `inspiro/planner-thumb-R001-Pitch.png`. No real photos exist on the site.

- **Footprint:** rectangle, planner 4600 × 3400, overall height **3270** [H].
  - Product 6.1 × 4.5 m, eaves label **2.37 m**, overall 3.27 m. The render shows a 0.7 m dimension at the front, probably the deck or overhang [H].
  - W:D:H ≈ 1.35 : 1 : 0.96.
- **Roof:** **dual-pitch gable, ridge parallel to the front**, with gables on the side walls [H, render + thumb]. `roofType: "RoofType.Pitched"` [H].
  - Pitch ≈ atan(0.90 / 2.25) ≈ 22° (product size) to about 28° (planner 3.4 m depth). **Use 25°** [M].
  - Front eave overhang 200 (config porch), with a modest verge overhang [H/M].
  - Black EPDM-look roof covering [H, render].
- **Front frame:** the defining feature.
  - A **black RAL7016 "picture frame"** wraps the front elevation: a 240 mm front fascia, 190 × 50 vertical trims at both front corners, and 180 mm pony fins projecting 200 mm [H, config].
  - The black barge board continues up the gable verges (`planner-thumb-R001-Pitch`, render) [H].
- **Cladding:** **horizontal cedar on all walls** (`cedarPlanksHorizontal`) [H]. The board course looks about 140–150 mm in the render [L].
- **Doors and windows:**
  - Front: **stacker door 3600 × 2100**, x 500–4100, so it is almost full-width [H].
  - Right gable wall: one **tall narrow fixed light 800 × 2100** [H]. Left wall: high-level 1500 × 400, sill 1700 [H].
  - **Frames RAL7032 pebble grey**, light grey in the render [H].
- **Base:** floor +150, deck +200 at the front (dark) [H].
- **Distinctive:** a gable cabin with a bold anthracite front frame and pale grey frames against horizontal cedar.

## 7. Quba (template 009)

**Files:** `quba/planner-thumb-R009.png`, `quba/photo-14896-…` (front elevation, good for proportions), `quba/photo-14895-…`, `quba/photo-1627-…` (Wimbledon case study, 4 × 3 m, black Shou Sugi Ban).

- **Footprint:** rectangle, planner 4000 × 2700 × 2500 [H]. W:D:H ≈ **1.48 : 1 : 0.93**.
  - `photo-14896` (4 × 3 m build) scales to about 4.4–4.5 m wide by 2.47 m high to the roof edge, using 2.1 m door frames at 116 px/m [M].
- **Roof:** **flat** (z constant 2500) [H]. **No overhang on any side.** The roof edge is flush with the walls and finished with a thin black edge trim: 30 × 30 RAL9011 (back 50) [H, config], and a thin metal drip about 50 mm in `photo-14895` [M].
- **Corner trims:** **30 × 30 black corner beads on all four vertical corners** [H, config]. On the charred build the boards return without visible trims (`photo-1627`) [M].
- **Cladding:**
  - Default: **white render on all walls** [H, config + thumb].
  - Real build: vertical charred timber boards about 150 mm, black (`photo-14896`, `photo-1627`) [M].
  - For a real render finish, see the rendered room in `veranda/photo-13582` [M].
- **Doors and windows:** front: **3-leaf bifold 2000 × 2100** (x 1400–3400) plus an **800 tilt-and-turn full-height** next to it (x 600–1400), a continuous 2.8 m glazed band [H]. Frames RAL9011 black.
  - `photo-14896`: 3-leaf bifold about 2.2 m wide, plus a separate portrait window about 0.6 × 1.4 m, sill about 0.75 m, black frames [M].
- **Base:** floor +150, no deck. The real build sits straight on a porcelain patio, with only about 50–100 mm of cladding skirt visible (`photo-14896`) [M].
- **Distinctive:** a pure minimal cube with no overhang and hairline trims.

## 8. Roko (template 204)

**Files:** `roko/render-PECASA-ROKO-CLASSIC-19m2.png`, `roko/planner-thumb-R204.png`, `roko/photo-14025-…` and `roko/photo-14026-…` (**high-confidence real match**), `roko/photo-14133-…` (same building, case study "Premium outdoor workspace and relaxation area", described as about 7 × 4 m with a large covered veranda/canopy), `roko/cgi-1094-…` (marketing CGI).

- **Footprint:** rectangle room, planner 6000 × 3250 [H].
  - The **roof extends 800 over the front and 1000 past the right end**, so the overall roof is about 7.0 × 4.05 m [H, config].
  - W:D:H ≈ **1.85 : 1 : 0.92** (room).
  - Real build (`photo-14133`, 53 px/m from the 2.1 m door): enclosed room about 6 m, **open covered end-bay about 2.4 m wide**, overall about 8.5 m [M].
- **Roof:** **mono-pitch rising to the front.** z = 2750 at the back and 3000 at the front, so ≈ **4.4°** [H].
  - Real build: front fascia top about 3.1 m above the deck, soffit about 2.5 m [M].
- **Fascia:** 110 mm, RAL9011 black, wrapping all edges. It reads as a continuous black frame round the roof slab in the thumb and render [H]. The real build has a black edge trim over a dark soffit with downlights (`photo-14025`) [M].
- **Porches and posts:**
  - Front canopy 800 deep runs the full length [H].
  - The right-hand end bay is open-fronted and covered. **One 100 × 100 timber post at the outer front corner** (config posts h = 2000, `cedarPlanks`) [H]. The post is cedar-clad in `photo-14133` [M].
  - Pony fin walls close the left end of the front porch (800 projection) and the rear part of the right porch (1000) [H, config + render].
- **Cladding:**
  - Default: **white shiplap on the front and right**, black shiplap on the back and left, with **cedar pony fins** at both ends (`planner-thumb-R204`) [H].
  - Real build and render: **vertical cedar all round**, including the porch back wall [H/M].
- **Doors and windows:**
  - Front: **sliding door 2410** (x 3093–5503) plus **three 800 full-height tilt-and-turn lights** (x 693–3093), a continuous glazed band about 4.8 m of the 6 m front [H].
  - Back: high-level 3000 × 500, sill 1680. The right wall facing into the porch has a sliding window 1500 × 800, sill 620 [H].
  - Real build: 2-pane anthracite slider, plus **corner glazing** where the room meets the porch (`photo-14025`) [M].
- **Base:** floor +150. **Deck along the full front (800) and under the end porch (1000)**, anthracite [H]. Real build: black composite deck about 0.25 m with steps, wrapping the front and porch (`photo-14133`) [M].
- **Distinctive:** a long room with a front canopy and an **open covered end bay with a single corner post**.

## 9. Ofiko (template 003)

**Files:** `ofiko/render-PECASA-OFIKO-CLASSIC-24.5m2.png`, `ofiko/planner-thumb-R003.png`, `ofiko/photo-14036-…`, `ofiko/photo-13546-…`, `ofiko/photo-1901-…` (all [M] office-type matches).

- **Footprint:** rectangle.
  - Planner 3700 × 2400 × 2500, W:D:H ≈ 1.54 : 1 : 1.04 [H].
  - Product 6.8 × 3.6 × 2.5 m, W:D:H ≈ 1.89 : 1 : 0.69 [H].
- **Roof:** **flat** (z constant) [H]. **No porch overhang.** The fascia is a thin 50 mm trim on all edges, **RAL5025 pearl blue** by default [H].
  - The product render shows a thin dark fascia with negligible overhang [H].
  - Real offices show a 0.15–0.3 m overhang with a 0.2–0.4 m clad fascia band and soffit LEDs (`photo-13546`, `photo-14036`) [M].
- **Cladding:**
  - Default: **white render** [H].
  - Render and real builds: **vertical cedar or light-oak composite** (`photo-13546`, `photo-1901`). `photo-1901` has **horizontal boards on the side wall** [M].
- **Doors and windows:** default is **corner glazing at the front-right**.
  - Front: two 1200 full-height fixed lights (x 1150–3550) [H].
  - Right return: a **single glazed door 800**, beside a 150 corner post [H].
  - Left wall: vertical awning 500 × 1200, sill 980 [H]. Frames RAL5025 [H].
  - Product render: front with a casement window (left), a 2-pane slider, and a French door plus side light (right), in black frames [H].
  - Real builds: a glazed single door between two casements at about 1.0 m sill (`photo-13546`); multiple windows including a corner window pair (`photo-14036`) [M].
- **Base:** floor +150, `claddingOverlap 100`. A downpipe sits at the back [H]. Real builds use separate composite step boxes (`photo-13546`) [M].
- **Distinctive:** an office-style elevation with several windows plus a door, rather than one big opening. Corner glazing with a side-entry door. Thin flush fascia.

## 10. Ecke (template 002; German for "corner")

**Files:** `ecke/render-PECASA-ECKE-CLASSIC-8m2.png`, `ecke/planner-thumb-R002.png`, `ecke/photo-13570-…`, `ecke/photo-13569-…`, `ecke/photo-13568-…` (same building, **high-confidence corner-glazing match**), `ecke/photo-13542-…` [M].

- **Footprint:** rectangle, 3300 × 2400 × 2500 [H]. W:D:H ≈ **1.375 : 1 : 1.04**. This is the smallest range.
- **Roof:** **flat** [H]. **Overhang 200 on the front and right only**; back and left are flush (render shows 0.2 m labels) [H].
- **Frame:** a black RAL9011 **"L" picture frame** wraps the two show faces (front and right) [H, config + render]:
  - 240 mm fascia on the front and right edges, 50 mm on the back and left.
  - **190 × 50 vertical jambs** at the front-left and back-right corners.
  - 180 mm pony fins projecting 200.
  - The open, glazed corner is at the front-right.
- **Cladding:**
  - **Horizontal cedar** on the front and right; **black shiplap** on the back and left [H].
  - Real build: pale greige vertical composite on all faces, with fascia and soffit in the same material and **LED downlights on both overhangs** (`photo-13569`, `photo-13570`) [M].
- **Doors and windows:** **corner glazing** at the front-right [H].
  - **3-leaf bifold 2000** on the front (x 1150–3150), **150 × 150 corner post**, and an 800 tilt-and-turn full-height on the right return (y 1450–2250) [H].
  - Real build: bifolds on both faces that open to a **post-free corner**, with leaves stacking on each side (`photo-13570`) [M].
- **Base:** floor +150. Deck +200 on the front and right, anthracite [H]. Real build: composite skirt about 0.15 m, with a block step at the corner (`photo-13570`) [M].
- **Distinctive:** corner-opening glazing and a two-sided black frame.

## 11. Edge (template 004)

**Files:** `edge/render-PECASA-EDGE-CLASSIC-20m2.png`, `edge/planner-thumb-R004.png`, `edge/photo-14901-…` and `edge/photo-14031-…` (same building; the site attaches it to the Mill Hill case study [M]).

- **Footprint:** rectangle.
  - Planner 4100 × 3400 × 2500, W:D:H ≈ **1.21 : 1 : 0.74** [H].
  - Product 5.2 × 3.7 m [H].
  - Real build: walls about 7.0 m wide, wall height about 2.3 m to the soffit, and about 2.7 m to the fascia top above the deck (`photo-14901`, 121 px/m) [M].
- **Roof:** **flat slab that oversails three sides.**
  - Porch overhangs: **front 600, sides 300 each, back 0** [H, config].
  - Real build: about 0.4–0.45 m at each side and about 0.3–0.5 m at the front (`photo-14901`) [M].
- **Fascia:** **240 mm deep on the front and both sides**, 50 at the back [H].
  - Colour **RAL7032 pebble grey** in the config and thumb [H]; dark in the product render [H]; **mid/slate grey, about 0.3–0.35 m** in the real build (`photo-14901`) [M].
- **Cladding:** **vertical cedar on all walls** [H]. Real build: light-oak composite vertical boards about 120 mm (`photo-14901`) [M].
- **Doors and windows:**
  - Front: **stacker door 3000** (x 950–3950) plus an **800 tilt-and-turn** at the left end, so the front is almost fully glazed [H]. Frames RAL7032.
  - The render shows a fixed light plus French pair.
  - Real build: a **6-leaf bifold about 4.1 m** that stacks to one side (`photo-14901`) [M].
- **Base:** floor +150. A downpipe sits at the back [H]. Real build: timber-look composite deck about 0.35 m in two steps, running full width and about 0.6 m beyond the walls (`photo-14031`) [M].
- **Distinctive:** a "floating" roof slab with a deep grey fascia overhanging the front and both sides.

## 12. L-Shape (template 208)

**Files:** `lshape/render-PECASA-L-SHAPE-CLASSIC-16m2.png`, `lshape/planner-thumb-R208.png`, `lshape/photo-1875-…` (**high**), `lshape/photo-13574-…` and `lshape/photo-13573-…` (**high**), `lshape/photo-14035-…` [M].

- **Footprint:** **true L.** The polygon is the same as Portal's: 4000 × 3300 overall, with the left 1650 wing projecting 1000 forward of the main front at y = 2300 [H].
  - Product 4.8 × 3.6 m. W:D:H ≈ **1.21 : 1 : 0.76** [H].
  - Real builds are much larger L plans. In `photo-1875` the right wing projects about 1.2 m+, with a wing front about 2.35 m and walls about 2.4 m [M].
- **Roof:** **L-shaped roof following the walls**, with a **100 mm overhang on every edge** [H, config].
  - Very shallow mono-pitch rising to the front: z = 2385 → 2465 → 2500, so ≈ **2°** [H]. It reads as flat in the render and photos.
  - `roofThickness 160`. Black EPDM [H].
- **Fascia:** **170 mm**, RAL9011 black (back 110) [H]. Real builds use a thin anthracite or black fascia, 0.1–0.2 m (`photo-13574`, `photo-1875`) [M].
- **Cladding:**
  - **Vertical cedar on all walls** [H].
  - Real builds: cedar (`photo-13574`); grey horizontal composite with **brick-slip** inner-corner walls (`photo-1875`); dark grey vertical composite (`photo-14035`) [M].
- **Doors and windows:** **glazing concentrated in the inner corner** [H].
  - Recessed front: **French double door 1500 × 2040** next to the inner corner, plus a 600 fixed light [H].
  - Wing return: 600 fixed full-height [H]. Frames RAL9011.
  - Product render: top-hung window on the return, fixed light plus a 3-leaf bifold on the inner front, and a casement on the right [H].
  - `photo-1875`: a 4-leaf bifold about 3.2 m in the inner corner, plus French doors on the wing front [M].
- **Base:** floor +150. No deck by default [H]. Real builds sit on paving or lawn with no deck (`photo-1875`, `photo-13574`) [M].
- **Distinctive:** the roof outline follows the L, which is the key difference from Portal (where the roof stays rectangular). The doors sit in the re-entrant corner.

## 13. Veranda (template 207)

**Files:** `veranda/planner-thumb-R207.png` (primary; no product render), `veranda/photo-13582-…` and `veranda/photo-13583-…` (large covered veranda, flat-roof variant [M]), `veranda/photo-14663-…` and `veranda/photo-14664-…` (open timber canopy with exposed rafters [M]).

- **Footprint:** room 3000 × 3000, height 3250 [H].
  - **The roof extends 500 at the front, 2500 to the right and 200 to the left**, so the overall roof is about 5.7 W × 3.5 D [H, config].
  - Decks: right 2500 and front 500 [H].
  - Room W:D:H = 1 : 1 : 1.08.
  - Planner width runs 2–16 m and depth 2–10 m.
- **Roof:** **gable, ridge parallel to the front**, spanning the room and the veranda bay. The gable end over the veranda shows **exposed timber framing** (`planner-thumb-R207`) [H].
  - `roofType: 2`, `roofThickness 100`, `roofWidth 1000` [H].
  - Pitch from the thumbnail about 25–30° [L]. Black roof covering [H].
- **Fascia:** 170. Trims 120 mm, RAL9011 (back 100) [H].
- **Veranda bay:**
  - **Two 100 × 100 cedar posts** at the outer corners, h 2000 [H].
  - **Balustrade** of timber spindles on the open side (`Balustrades` movable on elevation 1) [H].
  - **Porch ceiling in cedar planks**; room ceiling plastered [H].
  - Pony fins close part of the front and back [H].
- **Cladding:** **vertical cedar on all walls** [H]. Real flat-roof version: slatted cedar-look fascia band about 0.5 m deep and slatted cladding inside the covered area. The adjoining room is in **white render** (`photo-13582`) [M].
- **Doors and windows:**
  - Front: **3-leaf bifold 2000** [H].
  - Right wall facing the veranda: 800 full-height fixed light [H].
  - Downpipe [H]. Frames are the default colour (no finish set) [H]. Real builds use anthracite sliders (`photo-13582`) [M].
- **Base:** floor +150. The deck runs under the veranda and along the front [H]. Real build: grey composite, two steps (`photo-13582`) [M].
- **Distinctive:** a small room plus a big covered side veranda with posts and balustrade, under one gable. The exposed rafters and cedar ceiling are shown in `photo-14664` [M].

## 14. Angle (template 215)

**Files:** `angle/planner-thumb-R215.png` (primary; no product render), `angle/photo-1675-…`, `angle/photo-1674-…`, `angle/photo-1915-…`, `angle/photo-1673-…`. These are real builds with an **anthracite framed recessed front**, the closest real analogue [M]. **None shows the tapered fin**.

- **Footprint:** rectangle, 4500 × 3000 × 2500. W:D:H ≈ **1.5 : 1 : 0.83** [H].
  - Real builds are larger. `photo-1915` is about 6.3 m wide by about 2.8 m high including the frame (the 2.1 m door at about 132 px/m) [M].
- **Roof:** **flat** (z constant) [H]. `roofThickness 200`, `roofWidth 200`, `roofType 1` [H].
  - Front porch overhang **500**; deck +600 at the front [H].
- **Front frame:** this is the defining feature [H, config + thumb].
  - **210 mm deep RAL7016 fascia** on all edges.
  - **210 × 50 vertical jambs** at both front corners.
  - **200 mm pony fins projecting 500 with `taper: 400`.** Each fin's leading edge is **raked**: about 500 deep at the roof and about 100 deep at the deck. The frame therefore flares outward toward the top, which is the "angle" (`planner-thumb-R215`) [M on the taper direction].
  - Real builds (`photo-1915`, `photo-1675`) show the same frame **with vertical fins**: fascia face about 0.35 m, fin face about 0.25–0.35 m, recess about 0.3–0.5 m, with soffit LEDs inside the frame [M].
- **Cladding:** **black shiplap on all walls** [H]. Real builds use grey vertical composite (`photo-1675`), cream horizontal shiplap about 140 mm (`photo-1915`), or dark grey vertical (`photo-1673`). The frame contrasts in anthracite [M].
- **Doors and windows:**
  - Front: **5-leaf folding-sliding 3400 × 2100, centred** (x 550–3950) [H].
  - Right wall: high-level 1500 × 400, sill 1850 [H]. Frames RAL7016.
  - Real builds: 3-pane slider about 3.5 m plus a narrow fixed light about 0.5 m (`photo-1915`); a single door plus 3-pane slider (`photo-1675`) [M].
- **Base:** floor +150. Deck about 600 in front, anthracite with a `#51565C` face [H]. Real builds: dark composite deck running the full frame width (`photo-1915`, `photo-1675`) [M].
- **Distinctive:** an anthracite picture frame around a recessed front, with raked side fins.

---

## Projects folder (construction detail, `projects/`)

| File | What to take from it |
|---|---|
| `detail-14622-mitred-slatted-soffit-downlight.jpg` | Soffit boards mitred at the corner (picture-frame layout), recessed LED about 150 mm from the edge. |
| `detail-14624-cladding-junction-downpipe-fascia.jpg` | Horizontal side boards stop against a vertical slatted return; round black downpipe at the corner; grey EPDM edge trim; deck edge. |
| `detail-14621-slatted-cladding-wall-light.jpg` | Slatted composite rhythm (narrow slats with dark grooves); standard black up/down PIR wall light. |
| `detail-14627-cortizo-door-handle-frame.jpg` | Cortizo frame and handle in RAL7016 anthracite (slim aluminium profile). |
| `detail-14662-cedar-end-wall-roof-edge.jpg` | Plain vertical cedar end wall, boards about 100–120 mm; black roof-edge trim with fixings; cladding stops just above the deck. |
| `detail-13539-horizontal-pine-black-corner-trims.jpeg` | Horizontal treated pine about 120 mm; **black corner trims about 50 mm**; black casement; soffit downlights. |
| `detail-1889-composite-cladding-soffit-deck.jpeg` | Light-oak composite vertical boards; **flush concealed door** cut into the cladding; timber-look fascia and soffit with downlights; deck with LED. |
| `detail-13586-deck-steps-lights-soffit.jpg` | Two-step composite deck with riser lights; soffit LEDs. |
| `interior-1681-flat-rooflights-herringbone.jpg` | Two flat rooflights with deep plastered wells; sliding door; herringbone LVT. |
| `interior-13567-rooflight-panelled-walls.jpeg` | Rooflight, panel-moulded walls, herringbone. |

## Gaps and caveats

1. **No real photos exist on pecasa.co.uk** for Cabano, Inspiro or any gable roof, and none for Angle's tapered fins. Model those from the render, the thumbnail and the config.
2. Photo-to-range mapping is visual. It is strongest for Levno, Roko, Ecke, L-Shape, Pergola and Quba; medium for Edge, Ofiko and Angle; weakest for Apexo and Portal. Product renders on `/our-products/` are planner screenshots, so they are reliable for geometry, but some use non-default cladding.
3. The `roofType` enum values are not decoded. `"RoofType.Pitched"` is explicit. Veranda uses `2` and shows a gable. L-Shape and Angle use `1` and look flat. The parallel planner-screenshot task should confirm this.
4. `fasciaWidth` and `roofWidth` semantics are unclear; the raw values are quoted. `roofWidth: 1000` on the gable ranges may be verge or eave related.
5. The Mill Hill case study text describes a tapered triangular plan, but the attached photo (`edge/photo-14901`) shows a rectangular front. The taper is not visible.
