// Pecasa catalogue for the configurator. Pure data: no DOM, no Three.js.
//
// Sources (checked 13 October 2026; research/2026-10-13/):
// - Pecasa's live planner (https://www.pecasa.co.uk/design-your-building/, Garden Room Planner
//   instance a7221949, configuration.json v23): the 14 styles and their templates (floor polygon,
//   wall-top heights, porches, fins, trims, posts, decks, default doors and windows, finishes),
//   size limits, and every public option list with its exact name.
// - pecasa.co.uk: the published price table (/garden-rooms-london/ and five Hertfordshire pages,
//   identical), the /our-products/ "from" prices, the homepage specification, warranty,
//   installation, survey and quote wording, contact details and showroom.
// Where sources disagree the difference is listed in docs/qa/CONFIGURATOR-CONFIRMATIONS.md.
//
// Prices: Pecasa publishes no price for any upgrade or extra, so none is given one here: they
// are marked `upgrade` (priced in Pecasa's written quotation) or `quoted` (site work).

// The planner's own order of styles.
export const STYLE_ORDER = ['levno', 'apexo', 'pergola', 'portal', 'cabano', 'inspiro', 'quba', 'roko', 'ofiko', 'ecke', 'edge', 'lshape', 'veranda', 'angle'];

// Geometry in metres, read from each planner template (buildingSizes, mm). `fascia` is the
// planner's horizontal trims per edge [height, depth]; `fins` are its ponys; `overhang` its
// porches; `walls` maps wall ids to a finish role ('main' if not listed). Mono-pitch roofs keep
// the template's slope (its `fall` over the default depth, the planner's 2-5 degree "roof
// angle"); gable roofs keep its pitch angle, with the eaves at the ridge height less the rise.
// Sizes step from each style's default, as the planner's sliders do.
export const STYLES = {
  levno: {
    name: 'Levno', template: '201', summary: 'A mono-pitch roof rising to a 1m front canopy, with cedar across the front and shiplap sides.',
    defaults: {width: 4.8, depth: 3.4, height: 2.7}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'mono', fall: .25, thickness: .2}, overhang: {front: 1},
    fascia: {front: [.11, .05], back: [.11, .01], left: [.11, .05], right: [.11, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .3, thick: .18, cap: [.19, .05]}, {corner: 'front-right', along: 'front', proj: .3, thick: .18, cap: [.19, .05]}],
    deck: {front: .3}, soffitLights: true,
    finishes: {main: 'shiplap03', feature: 'cedarPlanks', walls: {front: 'feature'}, fins: 'feature'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'floor-walnut', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'slide4', w: 3.2, p: .5},
      {wall: 'left', type: 'awning1800', w: 1.8, h: .5, sill: .77, p: .507},
      {wall: 'right', type: 'awning1800', w: 1.8, h: .4, sill: 1.63, p: .493}
    ]
  },
  apexo: {
    name: 'Apexo', template: '202', summary: 'A mono-pitch roof over a recessed, corner-glazed entrance lined in cedar.',
    defaults: {width: 5, depth: 3.05, height: 2.616}, limits: {w: [3.7, 10], d: [2.4, 8], h: [2.5, 3.5]},
    plan: 'apexo', roof: {kind: 'mono', fall: .267, thickness: .2}, overhang: {},
    fascia: {front: [.1, .05], back: [.1, .01], left: [.1, .05], right: [.1, .05]},
    glazedCorners: [['front', 'return']], bulkhead: true, deck: {notch: true}, soffitLights: true,
    finishes: {main: 'shiplap02', feature: 'cedarPlanks', walls: {front: 'feature', return: 'feature', 'porch-side': 'feature', step: 'feature'}, bulkhead: 'feature'},
    trim: 'RAL7016', frames: 'RAL7016', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'stacker2150', w: 2.15, p: .6016},
      {wall: 'front', type: 'fixed800', w: .8, p: .1406},
      {wall: 'return', type: 'fixed800', w: .8, p: .573},
      {wall: 'left', type: 'awning1800', w: 1.8, h: .5, sill: .77, p: .5},
      {wall: 'right', type: 'awningV1200', w: .4, h: 1.2, sill: .83, p: .479}
    ]
  },
  pergola: {
    name: 'Pergola', template: '222', summary: 'An open aluminium pergola with a louvred blade roof, for outdoor living.',
    defaults: {width: 4, depth: 3, height: 2.5}, limits: {w: [2, 16], d: [2, 10], h: [2, 3], hStep: .01},
    plan: 'rect', open: true, roof: {kind: 'blades', thickness: .2}, overhang: {},
    fascia: {front: [.2, .15], back: [.2, .15], left: [.2, .15], right: [.2, .15]},
    finishes: {main: 'shiplap01', feature: 'shiplap01'}, frame: 'RAL7015', blades: 'RAL7004',
    trim: 'RAL7015', frames: 'RAL7016', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof', openings: []
  },
  portal: {
    name: 'Portal', template: '203', summary: 'A mono-pitch box with a 1m-deep covered corner porch cut into the front, lined in cedar.',
    defaults: {width: 4, depth: 3.3, height: 2.567}, limits: {w: [2.7, 10], d: [2.4, 8], h: [2.5, 3.5]},
    plan: 'notch', notch: {blockRatio: .4125, depth: 1}, roof: {kind: 'mono', fall: .267, thickness: .2}, overhang: {},
    fascia: {front: [.11, .05], back: [.11, .01], left: [.11, .05], right: [.11, .05]},
    bulkhead: true, deck: {notch: true}, soffitLights: true,
    finishes: {main: 'shiplap01', feature: 'cedarPlanks', walls: {front: 'feature'}, bulkhead: 'feature'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'stacker2150', w: 2.15, p: .4574},
      {wall: 'porch-side', type: 'fixed800', w: .8, p: .55},
      {wall: 'left', type: 'awning1800', w: 1.8, h: .5, sill: .77, p: .5},
      {wall: 'right', type: 'awning1800', w: 1.8, h: .4, sill: 1.63, p: .5187}
    ]
  },
  cabano: {
    name: 'Cabano', template: '922', summary: 'A summer-house gable roof in copper-green shingles, white shiplap and pastel green trims.',
    defaults: {width: 4.2, depth: 4, height: 3.3}, limits: {w: [2, 10], d: [2, 8], h: [3.27, 3.5]},
    plan: 'rect', roof: {kind: 'gable', angle: 23, thickness: .1}, overhang: {front: .1, back: .1, left: .1, right: .1},
    fascia: {front: [.24, .05], back: [.24, .05], left: [.24, .05], right: [.24, .05]},
    finishes: {main: 'shiplap02', feature: 'shiplap02'},
    trim: 'RAL6019', frames: 'RAL6019', floor: 'floor-walnut', interior: 'plaster-e5f3dc', roofFinish: 'roof-copper',
    openings: [
      {wall: 'front', type: 'fold4', w: 2.7, p: .5},
      {wall: 'right', type: 'tntTop', w: .8, h: 1.2, sill: .92, p: .5},
      {wall: 'left', type: 'tntTop', w: .8, h: 1.2, sill: .92, p: .5},
      {wall: 'back', type: 'awning1200', w: 1.2, h: .4, sill: 1.7, p: .5}
    ]
  },
  inspiro: {
    name: 'Inspiro', template: '001-Pitch', summary: 'A gable roof in horizontal cedar, with an anthracite frame round a near full-width glazed front.',
    defaults: {width: 4.6, depth: 3.4, height: 3.27}, limits: {w: [2, 10], d: [2, 8], h: [3.27, 3.5]},
    plan: 'rect', roof: {kind: 'gable', angle: 27, thickness: .1}, overhang: {front: .2},
    fascia: {front: [.24, .05], back: [.05, .01], left: [.05, .05], right: [.05, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .2, thick: .18, cap: [.19, .05]}, {corner: 'front-right', along: 'front', proj: .2, thick: .18, cap: [.19, .05]}],
    deck: {front: .2}, frameFront: true,
    finishes: {main: 'cedarPlanksHorizontal', feature: 'cedarPlanksHorizontal', fins: 'feature'},
    trim: 'RAL7016', frames: 'RAL7032', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'stacker3000', w: 3.6, p: .5},
      {wall: 'right', type: 'fixed800', w: .8, p: .5},
      {wall: 'left', type: 'awning1500', w: 1.5, h: .4, sill: 1.55, p: .485}
    ]
  },
  quba: {
    name: 'Quba', template: '009', summary: 'A pure, flush-edged cube in white render, with hairline black trims.',
    defaults: {width: 4, depth: 2.7, height: 2.5}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'flat', thickness: .2}, overhang: {},
    fascia: {front: [.03, .03], back: [.05, .01], left: [.03, .03], right: [.03, .03]},
    cornerTrims: true,
    finishes: {main: 'renderWhite', feature: 'renderWhite'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'fold3', w: 2, p: .6},
      {wall: 'front', type: 'tnt800', w: .8, p: .25}
    ]
  },
  roko: {
    name: 'Roko', template: '204', summary: 'A long mono-pitch room with a front canopy, an open covered end bay and a cedar corner post.',
    defaults: {width: 6, depth: 3.25, height: 3}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'mono', fall: .25, thickness: .2}, overhang: {front: .8, right: 1},
    fascia: {front: [.11, .05], back: [.11, .01], left: [.11, .05], right: [.11, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .8, thick: .18, cap: [.19, .05]}, {corner: 'back-right', along: 'right', proj: 1, thick: .18, cap: [.19, .05]}],
    posts: [{corner: 'front-right', size: .1, inset: .12}], deck: {front: .8, right: 1}, soffitLights: true,
    finishes: {main: 'shiplap02', feature: 'cedarPlanks', rear: 'shiplap01', walls: {back: 'rear', left: 'rear'}, fins: 'feature'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'floor-walnut', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'slide2', w: 2.41, p: .7163},
      {wall: 'front', type: 'tnt800', w: .8, p: .4488},
      {wall: 'front', type: 'tnt800', w: .8, p: .3155},
      {wall: 'front', type: 'tnt800', w: .8, p: .1822},
      {wall: 'back', type: 'awningDouble', w: 3, h: .5, sill: 1.53, p: .5},
      {wall: 'right', type: 'slidingWindow', w: 1.5, h: .8, sill: .47, p: .4889}
    ]
  },
  ofiko: {
    name: 'Ofiko', template: '003', summary: 'A crisp rendered office with corner glazing and a side entrance, framed in pearl blue.',
    defaults: {width: 3.7, depth: 2.4, height: 2.5}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'flat', thickness: .2}, overhang: {},
    fascia: {front: [.05, .05], back: [.05, .01], left: [.05, .05], right: [.05, .05]},
    glazedCorners: [['front', 'right']],
    finishes: {main: 'renderWhite', feature: 'renderWhite'},
    trim: 'RAL5025', frames: 'RAL5025', floor: 'sicilia-oak', interior: 'plaster-ddf2fc', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'fixed1200', w: 1.2, p: .7973},
      {wall: 'front', type: 'fixed1200', w: 1.2, p: .473},
      {wall: 'right', type: 'single', w: .8, p: .2292},
      {wall: 'left', type: 'awningV1200', w: .5, h: 1.2, sill: .83, p: .4867}
    ]
  },
  ecke: {
    name: 'Ecke', template: '002', summary: 'Corner glazing that opens the room to the garden, inside a black two-sided frame.',
    defaults: {width: 3.3, depth: 2.4, height: 2.5}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'flat', thickness: .23}, overhang: {front: .2, right: .2},
    fascia: {front: [.24, .05], back: [.05, .01], left: [.05, .05], right: [.24, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .2, thick: .18, cap: [.19, .05]}, {corner: 'back-right', along: 'right', proj: .2, thick: .18, cap: [.19, .05]}],
    glazedCorners: [['front', 'right']], deck: {front: .2, right: .2}, soffitLights: true,
    finishes: {main: 'cedarPlanksHorizontal', feature: 'cedarPlanksHorizontal', rear: 'shiplap01', walls: {back: 'rear', left: 'rear'}, fins: 'rear'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'fold3', w: 2, p: .6515},
      {wall: 'right', type: 'tnt800', w: .8, p: .2292}
    ]
  },
  edge: {
    name: 'Edge', template: '004', summary: 'A floating flat roof with a deep grey fascia, overhanging the front and both sides.',
    defaults: {width: 4.1, depth: 3.4, height: 2.5}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'flat', thickness: .23}, overhang: {front: .6, left: .3, right: .3},
    fascia: {front: [.24, .05], back: [.05, .01], left: [.24, .05], right: [.24, .05]}, soffitLights: true,
    finishes: {main: 'cedarPlanks', feature: 'cedarPlanks'},
    trim: 'RAL7032', frames: 'RAL7032', floor: 'floor-walnut', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'stacker3000', w: 3, p: .5976},
      {wall: 'front', type: 'tnt800', w: .8, p: .1341}
    ]
  },
  lshape: {
    name: 'L-Shape', template: '208', summary: 'A true L-shaped plan, with its roof following the walls and glazing in the inside corner.',
    defaults: {width: 4, depth: 3.3, height: 2.5}, limits: {w: [2.7, 10], d: [2.4, 8], h: [2.5, 3.5]},
    plan: 'notch', notch: {blockRatio: .4125, depth: 1}, roof: {kind: 'mono', fall: .115, thickness: .16}, roofOutline: 'follow', overhang: {all: .1, back: 0},
    fascia: {front: [.17, .05], back: [.11, .01], left: [.17, .05], right: [.17, .05]},
    finishes: {main: 'cedarPlanks', feature: 'cedarPlanks'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'floor-oak-farm', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'double', w: 1.5, h: 2.04, p: .3191},
      {wall: 'front', type: 'fixed500', w: .6, h: 2.04, p: .766},
      {wall: 'porch-side', type: 'fixed500', w: .6, h: 2.04, p: .508}
    ]
  },
  veranda: {
    name: 'Veranda', template: '207', summary: 'A cedar room and a covered side veranda with posts and balustrade, under one gable roof.',
    defaults: {width: 3, depth: 3, height: 3.25}, limits: {w: [2, 16], d: [2, 10], h: [3.25, 4], hStep: .01},
    plan: 'rect', roof: {kind: 'gable', angle: 27, thickness: .1}, overhang: {front: .5, right: 2.5, left: .2},
    fascia: {front: [.12, .05], back: [.1, .01], left: [.12, .05], right: [.12, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .5, thick: .18}],
    posts: [{corner: 'front-right', size: .1, inset: .2}, {corner: 'back-right', size: .1, inset: .2}],
    balustrade: 'right', porchCeiling: true, deck: {front: .5, right: 2.5},
    finishes: {main: 'cedarPlanks', feature: 'cedarPlanks', fins: 'feature'},
    trim: 'RAL9011', frames: 'RAL9011', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'fold3', w: 2, p: .5937},
      {wall: 'right', type: 'fixed800', w: .8, p: .1833}
    ]
  },
  angle: {
    name: 'Angle', template: '215', summary: 'A black box with a deep anthracite frame and raked fins around a recessed, fully glazed front.',
    defaults: {width: 4.5, depth: 3, height: 2.5}, limits: {w: [2, 10], d: [2, 8], h: [2.5, 3.5]},
    plan: 'rect', roof: {kind: 'flat', thickness: .2}, overhang: {front: .5},
    fascia: {front: [.21, .05], back: [.21, .01], left: [.21, .05], right: [.21, .05]},
    fins: [{corner: 'front-left', along: 'front', proj: .5, thick: .2, taper: .4, cap: [.21, .05]}, {corner: 'front-right', along: 'front', proj: .5, thick: .2, taper: .4, cap: [.21, .05]}],
    deck: {front: .6}, soffitLights: true,
    finishes: {main: 'shiplap01', feature: 'shiplap01', fins: 'main'},
    trim: 'RAL7016', frames: 'RAL7016', floor: 'sicilia-oak', interior: 'plaster-ffffff', roofFinish: 'roof',
    openings: [
      {wall: 'front', type: 'fold5', w: 3.4, p: .5},
      {wall: 'right', type: 'awning1500', w: 1.5, h: .4, sill: 1.7, p: .5}
    ]
  }
};

// External wall finishes: the planner's ExternalWallFinishes, in its order, with the swatch
// colour sampled from the planner's own swatch images. `kind` picks the board system the
// procedural texture draws; `dir` is the board direction.
export const CLADDINGS = {
  cedarPlanks: {name: 'Vertical Cedar', kind: 'cedar', dir: 'v', hex: '#a9804f'},
  cedarPlanksHorizontal: {name: 'Horizontal Cedar', kind: 'cedar', dir: 'h', hex: '#a9804f'},
  renderWhite: {name: 'Render', kind: 'render', dir: 'v', hex: '#e9e9e6'},
  'envirobuild-cladding/granite-vertical': {name: 'Composite Granite Vertical', kind: 'composite', dir: 'v', hex: '#626262'},
  'envirobuild-cladding/stone-vertical': {name: 'Composite Stone Vertical', kind: 'composite', dir: 'v', hex: '#a4a09d'},
  'envirobuild-cladding/silver-birch-vertical': {name: 'Composite Silver Birch Vertical', kind: 'composite', dir: 'v', hex: '#c4c1bc'},
  'envirobuild-cladding/granite-horizontal': {name: 'Composite Granite Horizontal', kind: 'composite', dir: 'h', hex: '#626262'},
  'envirobuild-cladding/stone-horizontal': {name: 'Composite Stone Horizontal', kind: 'composite', dir: 'h', hex: '#a4a09d'},
  'envirobuild-cladding/silver-birch-horizontal': {name: 'Composite Silver Birch Horizontal', kind: 'composite', dir: 'h', hex: '#c4c1bc'},
  'envirobuild-cladding/walnut-vertical': {name: 'Composite Walnut Vertical', kind: 'composite', dir: 'v', hex: '#917864'},
  'envirobuild-cladding/oak-vertical': {name: 'Composite Oak Vertical', kind: 'composite', dir: 'v', hex: '#b0a593'},
  stone01: {name: 'Stone 01', kind: 'drystone', dir: 'h', hex: '#c0b199'},
  'envirobuild-cladding/walnut-horizontal': {name: 'Composite Walnut Horizontal', kind: 'composite', dir: 'h', hex: '#917864'},
  'envirobuild-cladding/oak-horizontal': {name: 'Composite Oak Horizontal', kind: 'composite', dir: 'h', hex: '#b0a593'},
  stone02: {name: 'Stone 02', kind: 'stoneslip', dir: 'h', hex: '#a57f61'},
  'shadow-line/burnt-cedar-vertical': {name: 'Shadow Line Burnt Cedar Vertical', kind: 'shadowline', dir: 'v', hex: '#2c2c2c'},
  'shadow-line/antique-oak-vertical': {name: 'Shadow Line Antique Oak Vertical', kind: 'shadowline', dir: 'v', hex: '#5a4638'},
  'shadow-line/golden-oak-vertical': {name: 'Shadow Line Golden Oak Vertical', kind: 'shadowline', dir: 'v', hex: '#bb966c'},
  'shadow-line/burnt-cedar-horizontal': {name: 'Shadow Line Burnt Cedar Horizontal', kind: 'shadowline', dir: 'h', hex: '#2c2c2c'},
  'shadow-line/antique-oak-horizontal': {name: 'Shadow Line Antique Oak Horizontal', kind: 'shadowline', dir: 'h', hex: '#5a4638'},
  'shadow-line/golden-oak-horizontal': {name: 'Shadow Line Golden Oak Horizontal', kind: 'shadowline', dir: 'h', hex: '#bb966c'},
  'board-and-batten/burnt-cedar': {name: 'Board & Batten Burnt Cedar', kind: 'boardbatten', dir: 'v', hex: '#2e2e2e'},
  'board-and-batten/antique-oak': {name: 'Board & Batten Antique Oak', kind: 'boardbatten', dir: 'v', hex: '#584537'},
  'board-and-batten/golden-oak': {name: 'Board & Batten Golden Oak', kind: 'boardbatten', dir: 'v', hex: '#b99469'},
  shiplap01: {name: 'Shiplap Black', kind: 'shiplap', dir: 'h', hex: '#3e3e3e'},
  shiplap02: {name: 'Shiplap White', kind: 'shiplap', dir: 'h', hex: '#ecebe7'},
  shiplap03: {name: 'Shiplap Gray', kind: 'shiplap', dir: 'h', hex: '#8b8c8c'},
  planks: {name: 'Pine', kind: 'pine', dir: 'v', hex: '#bb9d7f'}
};

// RAL colours offered for flashing (fascia and trims) and for window and door frames: the
// planner's VerticalFasciaFinishes and WindoorFinishes (the same nine colours, same names).
export const RAL = {
  RAL9016: {name: 'White', code: '9016', hex: '#F6FAF4'},
  RAL6019: {name: 'Pastel Green', code: '6019', hex: '#b9ceac'},
  RAL5025: {name: 'Pearl Blue', code: '5025', hex: '#21697c'},
  RAL1017: {name: 'Saffron Yellow', code: '1017', hex: '#f6a950'},
  RAL7004: {name: 'Silver Grey', code: '7004', hex: '#9D9FA0'},
  RAL7015: {name: 'Slate Grey', code: '7015', hex: '#51565C'},
  RAL7016: {name: 'Dark Grey', code: '7016', hex: '#383e42'},
  RAL7032: {name: 'Pebble Grey', code: '7032', hex: '#B8B8A7'},
  RAL9011: {name: 'Black', code: '9011', hex: '#27292B'}
};
export const ralName = key => (RAL[key] ? `${RAL[key].name} (RAL ${RAL[key].code})` : key);

// Pergola frame and blade colours (the planner's PergolaFinishes: 15 RAL colours).
export const PERGOLA_COLOURS = {
  RAL7016: {name: 'Anthracite', hex: '#383e42'}, RAL7032: {name: 'Pebble Grey', hex: '#B8B8A7'}, RAL9004: {name: 'Signal Black', hex: '#2B2B2C'},
  RAL9005: {name: 'Jet Black', hex: '#0A0A0A'}, RAL9011: {name: 'Graphite', hex: '#27292B'}, RAL9016: {name: 'Traffic White', hex: '#F6FAF4'},
  RAL8007: {name: 'Fawn Brown', hex: '#70462B'}, RAL1013: {name: 'Oyster White', hex: '#EAE6CA'}, RAL1017: {name: 'Saffron Yellow', hex: '#f6a950'},
  RAL5025: {name: 'Pearl Blue', hex: '#21697c'}, RAL6019: {name: 'Light Green', hex: '#b9ceac'}, RAL3001: {name: 'Signal Red', hex: '#A3171A'},
  RAL7004: {name: 'Signal Grey', hex: '#9D9FA0'}, RAL7015: {name: 'Slate Grey', hex: '#51565C'}, RAL5003: {name: 'Sapphire Blue', hex: '#36465e'}
};

// Roof finishes (planner RoofFinishes) and its Sedum (green) roof.
export const ROOF_FINISHES = {
  roof: {name: 'EPDM Black', kind: 'epdm', hex: '#2f3031', status: 'included'},
  'corrugated-metal-004-sd': {name: 'Corrugated', kind: 'corrugated', hex: '#474c50', status: 'upgrade'},
  'roof-terracotta': {name: 'Terracotta', kind: 'terracotta', hex: '#8b351a', status: 'upgrade', pitchedOnly: true},
  'roof-copper': {name: 'Copper', kind: 'copper', hex: '#505750', status: 'upgrade', pitchedOnly: true}
};
export const ROOF_TYPES = {flat: 'Flat', pitched: 'Pitched'};

// Rooflights (planner Roof & Porch tab), width x depth in metres.
export const ROOFLIGHTS = {
  none: {name: 'No rooflight'},
  r1000: {name: 'Rooflight 1000 x 1400', w: 1, d: 1.4},
  r1400: {name: 'Rooflight 1400 x 1400', w: 1.4, d: 1.4},
  r2000: {name: 'Rooflight 2000 x 1400', w: 2, d: 1.4}
};

// Additions on the Roof & Porch tab. The planner places the canopy and veranda along the
// front (its "integrated porch"), 4.5 x 2m by default; the pergola stands beside the room.
export const ADDITIONS = {
  trellis: {name: 'Trellis Canopy', depth: 2},
  veranda: {name: 'Veranda', depth: 2},
  pergola: {name: 'Pergola', w: 4, d: 3}
};

// Doors and windows: the planner's Windows & Doors menu, in its order, with its sizes (metres;
// `sill` is above the finished floor). Pecasa's standard glazing is Cortizo aluminium.
export const OPENINGS = {
  single: {name: 'Single', group: 'door', w: .9, h: 2.1, sill: 0, kind: 'door', leaves: 1},
  double: {name: 'Double', group: 'door', w: 1.5, h: 2.1, sill: 0, kind: 'door', leaves: 2},
  slide2: {name: 'Sliding 2-Part', group: 'door', w: 2.4, h: 2.1, sill: 0, kind: 'sliding', leaves: 2},
  slide3: {name: 'Sliding 3-Part', group: 'door', w: 3.6, h: 2.1, sill: 0, kind: 'sliding', leaves: 3},
  slide4: {name: 'Sliding 4-Part', group: 'door', w: 4.8, h: 2.1, sill: 0, kind: 'sliding', leaves: 4},
  fold3: {name: 'Folding 3-Part', group: 'door', w: 2, h: 2.1, sill: 0, kind: 'bifold', leaves: 3},
  fold4: {name: 'Folding 4-Part', group: 'door', w: 2.7, h: 2.1, sill: 0, kind: 'bifold', leaves: 4},
  fold5: {name: 'Folding 5-Part', group: 'door', w: 3.4, h: 2.1, sill: 0, kind: 'bifold', leaves: 5},
  stacker2150: {name: 'Stacker 2150', group: 'door', w: 2.15, h: 2.1, sill: 0, kind: 'stacker', leaves: 3},
  stacker3000: {name: 'Stacker 3000', group: 'door', w: 3, h: 2.1, sill: 0, kind: 'stacker', leaves: 3},
  solid: {name: 'Solid', group: 'door', w: .9, h: 2.1, sill: 0, kind: 'solid', leaves: 1},
  doubleSolid: {name: 'Double Solid', group: 'door', w: 1.5, h: 2.1, sill: 0, kind: 'solid', leaves: 2},
  clad: {name: 'Clad Door', group: 'door', w: .826, h: 2.04, sill: 0, kind: 'clad', leaves: 1},
  georgian: {name: 'Georgian 6 Pane Single Door', group: 'door', w: .9, h: 2.1, sill: 0, kind: 'georgian', leaves: 1},
  fixed500: {name: 'Fixed 500', group: 'window', w: .5, h: 2.1, sill: 0, kind: 'fixed'},
  fixed800: {name: 'Fixed 800', group: 'window', w: .8, h: 2.1, sill: 0, kind: 'fixed'},
  fixed1200: {name: 'Fixed 1200', group: 'window', w: 1.2, h: 2.1, sill: 0, kind: 'fixed'},
  tnt500: {name: "Tilt'n'turn 500", group: 'window', w: .5, h: 2.1, sill: 0, kind: 'casement'},
  tnt800: {name: "Tilt'n'turn 800", group: 'window', w: .8, h: 2.1, sill: 0, kind: 'casement'},
  tntTop: {name: "Tilt'n'turn Top", group: 'window', w: .8, h: 1.2, sill: .9, kind: 'casement'},
  out500: {name: 'Outward Open 500', group: 'window', w: .5, h: 2.1, sill: 0, kind: 'casement', outward: true},
  out800: {name: 'Outward Open 800', group: 'window', w: .8, h: 2.1, sill: 0, kind: 'casement', outward: true},
  outTop: {name: 'Outward Open Top', group: 'window', w: .8, h: 1.2, sill: .9, kind: 'casement', outward: true},
  splitOut: {name: 'Split / Outward', group: 'window', w: 1.2, h: 1.2, sill: .9, kind: 'split', panes: 2, outward: true},
  tripleOut: {name: 'Triple / Outward', group: 'window', w: 1.5, h: 1.2, sill: .9, kind: 'split', panes: 3, outward: true},
  awning1200: {name: 'Awning 1200', group: 'window', w: 1.2, h: .4, sill: 1.7, kind: 'awning'},
  awning1500: {name: 'Awning 1500', group: 'window', w: 1.5, h: .4, sill: 1.7, kind: 'awning'},
  awning1800: {name: 'Awning 1800', group: 'window', w: 1.8, h: .5, sill: 1.6, kind: 'awning'},
  awningV1200: {name: 'Awning 500 x 1200', group: 'window', w: .5, h: 1.2, sill: .9, kind: 'awning'},
  awningV1800: {name: 'Awning 500 x 1800', group: 'window', w: .5, h: 1.8, sill: .3, kind: 'awning'},
  bathroom: {name: 'Bathroom Frost', group: 'window', w: .5, h: .6, sill: 1.5, kind: 'awning', obscure: true},
  topOpen: {name: 'Top Open', group: 'window', w: 1.2, h: .8, sill: 1.3, kind: 'awning'},
  split: {name: 'Split', group: 'window', w: 1.2, h: 1.2, sill: .9, kind: 'split', panes: 2},
  // In some styles' standard designs only (planner templates), not on the public menu.
  awningDouble: {name: 'Awning 3000 (double)', group: 'window', w: 3, h: .5, sill: 1.53, kind: 'awning', panes: 2, template: true},
  slidingWindow: {name: 'Sliding window 1500', group: 'window', w: 1.5, h: .8, sill: .47, kind: 'slidingWindow', template: true}
};
export const MENU_DOORS = Object.keys(OPENINGS).filter(k => OPENINGS[k].group === 'door' && !OPENINGS[k].template);
export const MENU_WINDOWS = Object.keys(OPENINGS).filter(k => OPENINGS[k].group === 'window' && !OPENINGS[k].template);
// When a wall is too short for an opening, it steps down within its family.
export const DOWNSIZE = {
  slide4: 'slide3', slide3: 'slide2', slide2: 'double', fold5: 'fold4', fold4: 'fold3', fold3: 'double', stacker3000: 'stacker2150', stacker2150: 'double',
  double: 'single', doubleSolid: 'solid', fixed1200: 'fixed800', fixed800: 'fixed500', tnt800: 'tnt500', out800: 'out500', tripleOut: 'splitOut',
  awning1800: 'awning1500', awning1500: 'awning1200', awningDouble: 'awning1800', slidingWindow: 'awning1200', split: 'tntTop', splitOut: 'outTop', topOpen: 'awning1200'
};

// Pergola sides (planner Windows & Doors, Pergola group) and their colours.
export const PERGOLA_SIDES = {
  none: {name: 'Open'},
  loggia: {name: 'Loggia panels'},
  glass: {name: 'Glass panels'},
  windscreen: {name: 'Windscreen'},
  solid: {name: 'Solid Panel'}
};
export const PERGOLA_ROOFS = {blades: {name: 'Blades Roof'}, glass: {name: 'Glazed Roof'}};
export const WINDSCREEN_COLOURS = {SCM31: {name: 'Pebble', hex: '#b9b2a4'}, SCM73: {name: 'Gold', hex: '#b39a5f'}, SCM33: {name: 'Grey', hex: '#7c7d7c'}, SC3030: {name: 'Black', hex: '#262626'}, N0207: {name: 'White', hex: '#efefec'}};
export const PANEL_COLOURS = {RAL7016: {name: 'Anthracite', hex: '#383e42'}, RAL7032: {name: 'Pebble Grey', hex: '#B8B8A7'}, RAL8007: {name: 'Fawn Brown', hex: '#70462B'}, RAL7004: {name: 'Signal Grey', hex: '#9D9FA0'}, RAL7015: {name: 'Slate Grey', hex: '#51565C'}};

export const BLINDS = {
  none: {name: 'No Blinds'},
  white: {name: 'White', hex: '#F3F3F1'},
  silver: {name: 'Silver', hex: '#A8A99E'},
  brown: {name: 'Brown', hex: '#4E3524'},
  grey: {name: 'Grey', hex: '#373A36'}
};

// Interior walls (planner InternalFinishes; two are both called "Light Blue" there).
export const INTERIORS = {
  'plaster-ffffff': {name: 'White', hex: '#f7f6f6'},
  'plaster-cbd4d9': {name: 'Light Blue', hex: '#cbd4d9'},
  'plaster-f0dcc0': {name: 'Light Yellow', hex: '#f0dcc0'},
  'plaster-e5f3dc': {name: 'Light Green', hex: '#e5f3dc'},
  'plaster-ddf2fc': {name: 'Light Blue (pale)', hex: '#ddf2fc'},
  plywood: {name: 'Plywood', hex: '#e8bd85', ply: true}
};

// Floors: the planner's public FlooringFinishes (five more exist but are hidden from customers).
// Swatch colours sampled from its images; `kind` sets the plank or tile pattern.
export const FLOORS = {
  osb: {name: 'Osb', hex: '#ba906b', kind: 'osb'},
  'floor-walnut': {name: 'Walnut', hex: '#856346', kind: 'plank'},
  'floor-oak-farm': {name: 'Farm Oak', hex: '#9e928c', kind: 'plank'},
  tiles03: {name: 'Tiles', hex: '#76706a', kind: 'tile'},
  'aspen-oak': {name: 'Aspen Oak', hex: '#b4a68d', kind: 'plank'},
  oxford: {name: 'Oxford Oak', hex: '#9d9a91', kind: 'plank'},
  phantom: {name: 'Phantom Oak', hex: '#383838', kind: 'plank'},
  victorian: {name: 'Victorian Oak', hex: '#5e4a3c', kind: 'herringbone'},
  westchester: {name: 'Westchester Oak', hex: '#a07f51', kind: 'plank'},
  'wiltshire-english': {name: 'Wiltshire English Oak', hex: '#ada694', kind: 'herringbone'},
  'loft-midnight-oak': {name: 'Loft Midnight Oak', hex: '#888883', kind: 'plank'},
  'loft-dark-grey': {name: 'Loft Dark Grey Oak', hex: '#968a80', kind: 'plank'},
  'sicilia-oak': {name: 'Sicilia Oak', hex: '#bb916a', kind: 'plank'},
  'farm-house-dark-oak': {name: 'Farm House Dark Oak', hex: '#5c4033', kind: 'plank'},
  'liguiria-oak': {name: 'Liguiria Oak', hex: '#96734f', kind: 'plank'},
  'rhino-oak': {name: 'Rhino Oak', hex: '#969696', kind: 'plank'},
  'natural-oak': {name: 'Natural Oak', hex: '#c4ab7a', kind: 'plank'},
  'farm-house-light-oak': {name: 'Farm House Light Oak', hex: '#d0d0ce', kind: 'plank'}
};

// Decking (planner DeckingFinishes).
export const DECK_FINISHES = {
  deck: {name: 'Hardwood', hex: '#a1673a'},
  'deck/treatedPlanksHorizontal': {name: 'Treated', hex: '#a4916d'},
  'deck/wood-grain/Ivory': {name: 'Ivory Wood Grain', hex: '#cdc4b5'},
  'deck/wood-grain/Clay': {name: 'Clay Wood Grain', hex: '#b8906a'},
  'deck/wood-grain/Fawn': {name: 'Fawn Wood Grain', hex: '#7e6d56'},
  'deck/wood-grain/Natural': {name: 'Natural Wood Grain', hex: '#b6afac'},
  'deck/wood-grain/Agate': {name: 'Agate Wood Grain', hex: '#a6a5af'},
  'deck/wood-grain/Pewter': {name: 'Pewter Wood Grain', hex: '#6f6c73'},
  'deck/wood-grain/Anthracite': {name: 'Anthracite Wood Grain', hex: '#55525b'},
  'deck/wood-grain/Aura': {name: 'Aura', hex: '#a99260'},
  'deck/wood-grain/Slate': {name: 'Slate', hex: '#8f8f90'},
  'deck/wood-grain/Mocca': {name: 'Mocca', hex: '#795c48'},
  'deck/wood-grain/IceGrey': {name: 'Ice Grey', hex: '#b7b5b6'},
  'deck/wood-grain/CoolSand': {name: 'Cool Sand', hex: '#c7b699'}
};
// The planner's decking is drawn along the building and stretches to at most 1m deep.
export const DECKS = {
  standard: {name: 'Decking as designed'},
  front1000: {name: '1m deck along the front', depth: 1},
  none: {name: 'No decking'}
};

// Layout & Bathroom presets (planner: Bathroom, Cloakroom, Sauna, partition walls, doors).
export const LAYOUTS = {
  open: {name: 'One open room', status: 'included'},
  partition: {name: 'Partition wall with interior door', status: 'upgrade', min: [3, 2.2]},
  cloakroom: {name: 'Cloakroom (WC and basin)', status: 'upgrade', min: [3, 2.2]},
  bathroom: {name: 'Shower room', status: 'upgrade', min: [3.5, 2.2]},
  sauna: {name: 'Sauna', status: 'upgrade', min: [3.5, 2.2]}
};

// Kitchen (planner Kitchen tab): a kitchenette run, with its cabinet, worktop and handle lists.
export const KITCHENS = {none: {name: 'No kitchen'}, kitchenette: {name: 'Kitchenette', status: 'upgrade'}};
export const CABINETS = {
  'Masisa/Blanco-Liso': {name: 'White', hex: '#efefef'}, 'Masisa/Santorini': {name: 'Beach', hex: '#cdbba0'}, 'Abet-Laminati/Olmo-Perlato': {name: 'Elm', hex: '#c7b9a6'},
  'Masisa/Olmo-Alpino': {name: 'Oak', hex: '#b99a77'}, 'Masisa/Teca-Italia': {name: 'Teak', hex: '#8a6343'}, 'Kitchen/Cream': {name: 'Cream', hex: '#fffdd0'},
  'Kitchen/Gray': {name: 'Gray', hex: '#8d9091'}, 'Kitchen/Black': {name: 'Black', hex: '#424242'}, 'Kitchen/Green': {name: 'Green', hex: '#b9ceac'},
  'Kitchen/Blue': {name: 'Blue', hex: '#4d668f'}, 'slatted/ash': {name: 'Silver Ash', hex: '#c9c4bb'}, 'slatted/midnight': {name: 'Midnight Charcoal', hex: '#3b3c3e'},
  'slatted/spiced-oak': {name: 'Smoked Oak', hex: '#7b5a3e'}, 'slatted/natural-oak': {name: 'Natural Oak', hex: '#b48b5b'}, 'slatted/light-oak': {name: 'Light Oak', hex: '#cfb38a'},
  'slatted/silver-grey-vertical': {name: 'Silver Grey', hex: '#a7a7a3'}, 'slatted/charcoal-vertical': {name: 'Charcoal', hex: '#4a4a48'}, 'slatted/coffee-vertical': {name: 'Coffee', hex: '#5e4a3c'},
  'slatted/teak-vertical': {name: 'Teak', hex: '#9b6c43'}, 'slatted/stone-grey-vertical': {name: 'Stone Grey', hex: '#8c8a84'}, 'slatted/walnut-vertical': {name: 'Walnut', hex: '#6a4c36'}
};
export const WORKTOPS = {
  'Rocks/Alicante': {name: 'Rocks Alicante', hex: '#d8d2c6'}, 'Rocks/Ardesia': {name: 'Rocks Ardesia', hex: '#4a4a4a'}, 'Rocks/Royale': {name: 'Rocks Royale', hex: '#e9e6e0'},
  'Rocks/Statuario': {name: 'Rocks Statuario', hex: '#efefed'}, 'Rocks/Greige': {name: 'Rocks Greige', hex: '#bdb3a6'}, 'Rocks/Urban-Style': {name: 'Rocks Urban', hex: '#8b8984'},
  'Rocks/Zement': {name: 'Rocks Zement', hex: '#9c9a95'}, 'Graniot/Negro-San': {name: 'Graniot Negro', hex: '#232323'}, 'Granito/Gris-Mara': {name: 'Granito Gris', hex: '#8e8d8b'},
  worktop: {name: 'Apple Tree', hex: '#c09466'}
};
export const HANDLES = {Concealed: {name: 'Concealed'}, Bar: {name: 'Bar'}, Knob: {name: 'Knob'}, Mushroom: {name: 'Mushroom'}};

// Electrics & Lighting (planner tab). Lighting and electrics are standard ("designed to your
// requirements"); climate control and the wall heater are upgrades priced in the quote.
export const ELECTRICS = {
  doubleSockets: {name: 'Double sockets', group: 'Sockets', status: 'included'},
  tvSocket: {name: 'TV socket', group: 'Sockets', status: 'included'},
  dataPoint: {name: 'Data point', group: 'Sockets', status: 'included'},
  extSocket: {name: 'External socket', group: 'Sockets', status: 'included'},
  dimmer: {name: 'Dimmer switch', group: 'Switches', status: 'included'},
  smokeAlarm: {name: 'Smoke alarm', group: 'Other', status: 'included'},
  wallHeater: {name: 'Wall Heater', group: 'Heating and cooling', status: 'upgrade'},
  airCon: {name: 'Climate control', group: 'Heating and cooling', status: 'upgrade'}
};
export const INTERIOR_LIGHTS = {
  ceiling: {name: 'Ceiling lights'}, panel: {name: 'Panel Light'}, track: {name: 'Track light ceiling'}, strip: {name: 'Strip Light'}, linear: {name: 'Linear Wall Light'}
};
export const EXTERIOR_LIGHTS = {
  updown: {name: 'Up/down light'}, wall: {name: 'Wall light'}, soffit: {name: 'External Ceiling light'}, security: {name: 'Security Light with PIR'}, none: {name: 'No outside lights'}
};

// What the room is for: sets the illustrative furniture only (Furniture & Decorations).
export const USES = {
  office: {name: 'Garden office'}, gym: {name: 'Gym & wellbeing'}, studio: {name: 'Creative studio'},
  lounge: {name: 'Lounge & entertaining'}, guest: {name: 'Guest room'}
};

export const WALL_ORDER = ['front', 'front-left', 'porch-side', 'return', 'step', 'right', 'back', 'left'];

// ---- Published prices --------------------------------------------------------------------
// 1. The planner's own estimate for each style's standard design at its default size: shown to
//    every visitor as "Estimated price £X (inc. VAT)". Read 13 Oct 2026 (two passes, identical).
export const PLANNER_ESTIMATES = {
  levno: 28109, apexo: 35423, pergola: 9832, portal: 29979, cabano: 35977, inspiro: 28906, quba: 29964,
  roko: 31019, ofiko: 27280, ecke: 26639, edge: 27043, lshape: 28207, veranda: 35434, angle: 32407
};
// 2. /our-products/ "From £X (inc. Vat)" cards: style, width x depth, height (as published).
export const PRODUCT_CARDS = [
  {style: 'levno', w: 4.8, d: 3.4, h: 2.5, price: 25457},
  {style: 'apexo', w: 5, d: 3.05, h: 2.5, price: 32345},
  {style: 'portal', w: 4.6, d: 3.3, h: 2.5, price: 33200},
  {style: 'roko', w: 6, d: 3.25, h: 2.5, price: 35670},
  {style: 'cabano', w: 5.1, d: 4.1, h: 3.32, price: 34559},
  {style: 'inspiro', w: 6.1, d: 4.5, h: 3.27, price: 38456},
  {style: 'ofiko', w: 6.8, d: 3.6, h: 2.5, price: 31157},
  {style: 'ecke', w: 3.3, d: 2.4, h: 2.5, price: 25500},
  {style: 'edge', w: 5.2, d: 3.7, h: 2.5, price: 30250},
  {style: 'lshape', w: 4.8, d: 3.6, h: 2.5, price: 34099}
];
// 3. The published price table (/garden-rooms-london/ and five Hertfordshire pages, identical):
//    width 3-8m by depth, including VAT. Not tied to a style.
export const PRICE_TABLE = {
  widths: [3, 4, 5, 6, 7, 8],
  depths: [2.8, 3, 3.5, 4, 5],
  prices: [
    [22300, 26300, 30300, 34300, 38300, 42300],
    [24300, 28300, 32300, 36300, 40300, 44300],
    [26300, 30300, 34300, 38300, 42300, 46300],
    [28300, 32300, 36300, 40300, 44300, 48300],
    [32300, 36300, 40300, 44300, 48300, 52300]
  ]
};
// The table describes enclosed garden rooms; it is not applied to the open pergola, the
// veranda (half its roof covers an open veranda) or the L-plan (less floor than its outline).
export const TABLE_STYLES = ['levno', 'apexo', 'portal', 'cabano', 'inspiro', 'quba', 'roko', 'ofiko', 'ecke', 'edge', 'angle'];

// ---- Selling points, each from Pecasa's own pages (research/2026-10-13/website/company.md) ----
export const USPS = {
  factory: {title: 'Made in our Watford factory', copy: 'Pecasa manufactures its own SIP panels in Watford and installs with its own team.'},
  projects: {title: '120+ garden rooms since 2017', copy: 'Garden rooms, offices and annexes across London and Hertfordshire.'},
  warranty: {title: '10-year IWA insurance-backed warranty', copy: 'On qualifying projects, subject to registration and policy terms.'},
  install: {title: 'Installed in 10 working days', copy: 'Guaranteed for rooms up to 16m² from the start of work on site, subject to specification, access and weather.'},
  survey: {title: 'Free survey and 3D design', copy: 'Usually 10 to 30 minutes at your home, with a written, VAT-inclusive quote normally within 7 days.'},
  quote: {title: 'Quotes held for three months', copy: 'Your written quotation remains valid for three months.'},
  screws: {title: 'Radix ground screw foundations', copy: 'Standard, subject to ground conditions: no concrete slab.'},
  sips: {title: 'SIP walls, floor and roof', copy: 'EPS70 insulation as standard, from 75mm to 250mm, with PIR available as an upgrade.'},
  glazing: {title: 'Cortizo aluminium glazing', copy: 'Slim aluminium doors and windows come as standard.'},
  finished: {title: 'A finished room, not a shell', copy: 'Plasterboard walls with a tape-and-joint finish, 12mm laminate flooring, lighting and electrics.'},
  planning: {title: 'Planning guidance at your survey', copy: 'Within 2m of a boundary a garden room must be no more than 2.5m high under England’s guidance.'},
  britain: {title: 'Made in Britain member', copy: 'A member of Made in Britain since January 2025.'},
  reviews: {title: '5.0 on Google', copy: 'From 100 Google reviews (checked October 2026).'}
};

export const CONTACT = {
  company: 'Pecasa Ltd', number: '10714739',
  phone: '020 8146 2200', tel: '+442081462200', email: 'info@pecasa.co.uk',
  site: 'https://www.pecasa.co.uk', contact: 'https://www.pecasa.co.uk/contact-us/',
  showroom: {address: 'Unit 3, 8 Colonial Way, Watford WD24 4PT', hours: [['Monday to Friday', '9am to 5pm'], ['Saturday', '10am to 2pm'], ['Sunday', 'Closed']],
    map: 'https://www.google.com/maps/search/?api=1&query=Pecasa+Ltd+Unit+3+8+Colonial+Way+Watford+WD24+4PT'},
  brochure: 'https://www.pecasa.co.uk/wp-content/uploads/2025/05/final-brochure.pdf',
  google: 'https://www.google.com/maps/search/?api=1&query=Pecasa+Ltd+Watford',
  planner: 'https://www.pecasa.co.uk/design-your-building/'
};
