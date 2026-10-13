// The configurator's design model: pure functions only, shared by the page, the PDF, the 3D and
// the checks. Prices come only from what Pecasa publishes (configurator-data.js); a design that
// matches none of it is "Quoted", never given an invented figure.
import {
  STYLES, STYLE_ORDER, CLADDINGS, RAL, OPENINGS, DOWNSIZE, ROOF_FINISHES, ROOFLIGHTS, ADDITIONS, BLINDS, INTERIORS,
  FLOORS, DECK_FINISHES, DECKS, LAYOUTS, KITCHENS, CABINETS, WORKTOPS, HANDLES, ELECTRICS, INTERIOR_LIGHTS,
  EXTERIOR_LIGHTS, USES, PERGOLA_COLOURS, PERGOLA_SIDES, PERGOLA_ROOFS, WINDSCREEN_COLOURS, PANEL_COLOURS,
  PLANNER_ESTIMATES, PRODUCT_CARDS, PRICE_TABLE, TABLE_STYLES, ralName, CONTACT
} from './configurator-data.js';
import {plan, roofKind, wallLabel, footprintArea, internalArea} from './configurator-geometry.js';

export {STYLES, STYLE_ORDER, CLADDINGS, RAL, OPENINGS, ROOF_FINISHES, ROOFLIGHTS, ADDITIONS, BLINDS, INTERIORS, FLOORS, DECK_FINISHES, DECKS,
  LAYOUTS, KITCHENS, CABINETS, WORKTOPS, HANDLES, ELECTRICS, INTERIOR_LIGHTS, EXTERIOR_LIGHTS, USES, PERGOLA_COLOURS, PERGOLA_SIDES,
  PERGOLA_ROOFS, WINDSCREEN_COLOURS, PANEL_COLOURS, plan, roofKind, wallLabel, footprintArea, internalArea, ralName};

export const STEPS = ['style', 'size', 'exterior', 'openings', 'interior', 'quote'];
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const oneOf = (value, object, fallback) => (typeof value === 'string' && has(object, value) ? value : fallback);
const round = (v, dp = 3) => Math.round(v * 10 ** dp) / 10 ** dp;
export const nearest = (list, value) => list.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
const ELECTRIC_KEYS = Object.keys(ELECTRICS);

// ---- Sizes: the planner's sliders step from each style's default ---------------------------
function ladder(start, lo, hi, step) {
  const out = [];
  const k0 = Math.ceil((lo - start) / step - 1e-6), k1 = Math.floor((hi - start) / step + 1e-6);
  for (let k = k0; k <= k1; k++) out.push(round(start + k * step, 4));
  return out;
}
export function sizesFor(style) {
  const s = STYLES[style], d = s.defaults, l = s.limits;
  return {
    widths: ladder(d.width, l.w[0], l.w[1], .1),
    depths: ladder(d.depth, l.d[0], l.d[1], .1),
    heights: ladder(d.height, l.h[0], l.h[1], l.hStep || .05)
  };
}
export const metres = v => `${Number(v).toFixed(Number(v) * 100 % 10 ? 2 : 1)}m`;
export const mm = v => `${Math.round(v * 1000)}mm`;
export function feet(m) {
  const inches = Math.round(m / .0254);
  return `${Math.floor(inches / 12)}ft${inches % 12 ? ` ${inches % 12}in` : ''}`;
}
export const pounds = value => (value === null || value === undefined ? 'Quoted' : '£' + Math.round(value).toLocaleString('en-GB'));

// ---- Published prices -------------------------------------------------------------------
const same = (a, b, tol = .001) => Math.abs(a - b) <= tol;
/**
 * The most specific price Pecasa publishes for this design, or null:
 * 1. its planner's estimate for the style's standard design at the default size,
 * 2. an /our-products/ "from" price at that exact size and height,
 * 3. the published price table for that exact width and depth.
 * Options beyond the standard design are listed for Pecasa to quote, not added to this.
 */
export function priceFor(state) {
  const s = normalise(state), st = STYLES[s.style], d = st.defaults;
  const standardRoof = s.roofType === 'standard';
  if (standardRoof && same(s.width, d.width) && same(s.depth, d.depth) && same(s.height, d.height, .002)) {
    return {value: PLANNER_ESTIMATES[s.style], source: 'planner', label: `Pecasa's online estimate for the standard ${st.name} at ${metres(d.width)} × ${metres(d.depth)}`, short: 'Pecasa online estimate'};
  }
  const card = PRODUCT_CARDS.find(c => c.style === s.style && same(c.w, s.width) && same(c.d, s.depth) && same(c.h, s.height, .025));
  if (standardRoof && card) return {value: card.price, source: 'card', label: `Pecasa's published "from" price for the ${st.name} at ${metres(card.w)} × ${metres(card.d)}`, short: 'Published from price'};
  const wi = PRICE_TABLE.widths.findIndex(w => same(w, s.width)), di = PRICE_TABLE.depths.findIndex(v => same(v, s.depth));
  if (standardRoof && TABLE_STYLES.includes(s.style) && wi >= 0 && di >= 0 && (same(s.height, d.height, .002) || same(s.height, 2.5, .02))) {
    return {value: PRICE_TABLE.prices[di][wi], source: 'table', label: `Pecasa's published price for a ${metres(s.width)} × ${metres(s.depth)} garden room`, short: 'Published price table'};
  }
  return {value: null, source: null, label: 'Pecasa prices this size in your written quote after a free survey', short: 'Quoted'};
}
/** Every published price for a style: for the "nearest priced sizes" shortcuts. */
export function pricedSizes(style) {
  const st = STYLES[style], d = st.defaults, out = [{w: d.width, d: d.depth, h: d.height, price: PLANNER_ESTIMATES[style], source: 'planner'}];
  for (const c of PRODUCT_CARDS.filter(x => x.style === style)) {
    const {heights} = sizesFor(style);
    out.push({w: c.w, d: c.d, h: nearest(heights, c.h), price: c.price, source: 'card'});
  }
  if (TABLE_STYLES.includes(style)) {
    const {widths, depths} = sizesFor(style);
    PRICE_TABLE.depths.forEach((dp, di) => PRICE_TABLE.widths.forEach((w, wi) => {
      if (widths.some(v => same(v, w)) && depths.some(v => same(v, dp))) out.push({w, d: dp, h: d.height, price: PRICE_TABLE.prices[di][wi], source: 'table'});
    }));
  }
  return out.filter((x, i) => out.findIndex(y => same(y.w, x.w) && same(y.d, x.d) && same(y.h, x.h)) === i);
}
export function nearestPriced(state, n = 3) {
  const s = normalise(state);
  return pricedSizes(s.style).map(x => ({...x, dist: Math.abs(x.w - s.width) + Math.abs(x.d - s.depth) + Math.abs(x.h - s.height) * .5}))
    .sort((a, b) => a.dist - b.dist).slice(0, n);
}

// ---- Doors and windows ------------------------------------------------------------------
let idCounter = 0;
const newId = () => 'o' + (++idCounter).toString(36) + Math.floor(Math.random() * 1296).toString(36);

/**
 * Places openings wall by wall in list order, nearest to where each one asks to be, never
 * overlapping (they may touch: Pecasa's glazing runs in bands) and clear of corners. If one
 * cannot fit it steps down within its family, then is dropped. Returns {openings, changes}.
 */
export function fitOpenings(list, state) {
  const P = plan(state), byId = Object.fromEntries(P.walls.map(w => [w.id, w]));
  const result = [], changes = [], placed = {};
  for (const o of list) {
    const wall = byId[o.wall];
    if (!wall || !has(OPENINGS, o.type)) { if (o && o.wall) changes.push({kind: 'removed', wall: o.wall, type: o.type}); continue; }
    placed[wall.id] ||= [];
    let type = o.type, w = num(o.w) ?? OPENINGS[type].w, spot = null;
    const lo = wall.margin0, hi = wall.len - wall.margin1;
    while (type) {
      spot = freeSpot(placed[wall.id], w, (Number(o.p) || .5) * wall.len, lo, hi);
      if (spot !== null) break;
      const next = DOWNSIZE[type];
      type = next; w = next ? OPENINGS[next].w : 0;
    }
    if (spot === null) { changes.push({kind: 'removed', wall: wall.id, type: o.type}); continue; }
    const spec = OPENINGS[type], resized = type !== o.type;
    if (resized) changes.push({kind: 'resized', wall: wall.id, from: o.type, to: type});
    placed[wall.id].push({c: spot, w});
    const h = resized ? spec.h : num(o.h) ?? spec.h, sill = resized ? spec.sill : num(o.sill) ?? spec.sill;
    result.push({id: o.id || newId(), wall: wall.id, type, w: round(w), h: round(h), sill: round(sill), p: round(spot / wall.len, 5),
      glass: o.glass === 'obscure' || spec.obscure ? 'obscure' : 'clear', std: o.std === true && !resized});
  }
  return {openings: result, changes};
}
const num = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

function freeSpot(taken, w, desired, lo0, hi0) {
  const lo = lo0 + w / 2, hi = hi0 - w / 2;
  if (hi < lo - 1e-9) return null;
  const blocks = taken.map(t => [t.c - t.w / 2 - w / 2 + 1e-6, t.c + t.w / 2 + w / 2 - 1e-6]).sort((a, b) => a[0] - b[0]);
  const free = [];
  let start = lo;
  for (const [a, b] of blocks) {
    if (a > start) free.push([start, Math.min(a, hi)]);
    start = Math.max(start, b);
  }
  if (start <= hi) free.push([start, hi]);
  let best = null;
  for (const [a, b] of free) {
    if (b < a - 1e-9) continue;
    const c = Math.min(Math.max(desired, a), b);
    if (best === null || Math.abs(c - desired) < Math.abs(best - desired)) best = c;
  }
  return best;
}

export function defaultOpenings(style, width, depth, height) {
  const st = STYLES[style];
  return fitOpenings(st.openings.map(o => ({...o, id: newId(), std: true})), {...baseState(style), width, depth, height}).openings;
}

export function addOpening(state, wall, type) {
  const taken = state.openings.filter(o => o.wall === wall);
  const L = plan(state).walls.find(w => w.id === wall)?.len || 1;
  const candidates = [.5, .25, .75, .15, .85];
  let p = .5, best = -1;
  for (const c of candidates) {
    const room = Math.min(...taken.map(o => Math.abs(o.p * L - c * L) - o.w / 2), 99);
    if (room > best) { best = room; p = c; }
  }
  const id = newId(), spec = OPENINGS[type];
  const fitted = fitOpenings([...state.openings, {id, wall, type, w: spec.w, h: spec.h, sill: spec.sill, p}], state);
  return {state: {...state, openings: fitted.openings}, id: fitted.openings.some(o => o.id === id) ? id : null, changes: fitted.changes};
}

/** Lower case for running text, keeping names and RAL codes intact. */
export function lower(text) {
  return String(text).replace(/^[A-Z][a-z]/, m => m.toLowerCase());
}

// ---- The design ---------------------------------------------------------------------------
const PERGOLA_SIDE_KEYS = ['front', 'back', 'left', 'right'];
export const ELECTRIC_DEFAULTS = Object.fromEntries(ELECTRIC_KEYS.map(k => [k, false]));
// Pecasa's planner opens on Ecke, its initial default design.
export const DEFAULT_STYLE = 'ecke';

function baseState(style) {
  const d = STYLES[style].defaults;
  return {style, width: d.width, depth: d.depth, height: d.height, roofType: 'standard', deck: 'standard'};
}
function styleDefaults(style) {
  const st = STYLES[style];
  return {
    cladding: {main: st.finishes.main, feature: st.finishes.feature, rear: st.finishes.rear || st.finishes.main},
    trim: st.trim, frames: st.frames, floor: st.floor, interior: st.interior, roofFinish: st.roofFinish,
    exteriorLight: st.soffitLights ? 'soffit' : 'updown', cornerTrims: Boolean(st.cornerTrims)
  };
}
/** Which cladding roles a style uses (its walls, fins and bulkhead). */
export function claddingRoles(style) {
  const f = STYLES[style].finishes, roles = new Set(['main']);
  for (const r of Object.values(f.walls || {})) roles.add(r);
  if (f.fins) roles.add(f.fins);
  if (f.bulkhead) roles.add(f.bulkhead);
  // Every style can take a feature finish on its front, as the planner lets any wall change.
  roles.add('feature');
  return ['main', 'feature', 'rear'].filter(r => roles.has(r));
}
export const ROLE_NAMES = {main: 'Main walls', feature: 'Feature walls', rear: 'Back and side walls'};

/** Turns any input (saved JSON, a share link, a partial patch) into a complete valid design. */
export function normalise(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const style = oneOf(input.style, STYLES, DEFAULT_STYLE), st = STYLES[style], defs = styleDefaults(style);
  const {widths, depths, heights} = sizesFor(style);
  const width = nearest(widths, num(input.width) ?? st.defaults.width);
  const depth = nearest(depths, num(input.depth) ?? st.defaults.depth);
  const height = nearest(heights, num(input.height) ?? st.defaults.height);
  const open = Boolean(st.open), gableStyle = st.roof.kind === 'gable';
  let roofType = ['standard', 'flat', 'pitched'].includes(input.roofType) ? input.roofType : 'standard';
  if (open || (gableStyle && roofType === 'pitched') || (!gableStyle && roofType === 'flat')) roofType = 'standard';
  const pitched = !open && (roofType === 'pitched' || gableStyle && roofType === 'standard');
  let roofFinish = oneOf(input.roofFinish, ROOF_FINISHES, defs.roofFinish);
  if (!pitched && ROOF_FINISHES[roofFinish].pitchedOnly) roofFinish = 'roof';
  const c = input.cladding && typeof input.cladding === 'object' ? input.cladding : {};
  const cladding = {main: oneOf(c.main, CLADDINGS, defs.cladding.main), feature: oneOf(c.feature, CLADDINGS, defs.cladding.feature), rear: oneOf(c.rear, CLADDINGS, defs.cladding.rear)};
  const e = input.electrics && typeof input.electrics === 'object' ? input.electrics : {};
  const electrics = Object.fromEntries(ELECTRIC_KEYS.map(k => [k, e[k] === true]));
  let layout = oneOf(input.layout, LAYOUTS, 'open');
  const min = LAYOUTS[layout].min;
  if (open || min && (width < min[0] || depth < min[1])) layout = 'open';
  const ps = input.pergolaSides && typeof input.pergolaSides === 'object' ? input.pergolaSides : {};
  const state = {
    v: 1, style, use: oneOf(input.use, USES, 'office'), width, depth, height, roofType, roofFinish,
    sedum: !open && !pitched && input.sedum === true,
    rooflight: !open && !pitched ? oneOf(input.rooflight, ROOFLIGHTS, 'none') : 'none',
    rooflightCount: Math.min(3, Math.max(1, Math.round(num(input.rooflightCount) || 1))),
    addition: !open ? oneOf(input.addition, {none: 1, ...ADDITIONS}, 'none') : 'none',
    cladding, trim: oneOf(input.trim, RAL, defs.trim), frames: oneOf(input.frames, RAL, defs.frames),
    cornerTrims: open ? false : typeof input.cornerTrims === 'boolean' ? input.cornerTrims : defs.cornerTrims,
    openings: [], blinds: oneOf(input.blinds, BLINDS, 'none'),
    deck: oneOf(input.deck, DECKS, 'standard'), deckFinish: oneOf(input.deckFinish, DECK_FINISHES, 'deck/wood-grain/Anthracite'),
    interior: oneOf(input.interior, INTERIORS, defs.interior), floor: oneOf(input.floor, FLOORS, defs.floor), layout,
    kitchen: open ? 'none' : oneOf(input.kitchen, KITCHENS, 'none'), kitchenFinish: oneOf(input.kitchenFinish, CABINETS, 'Masisa/Blanco-Liso'),
    worktop: oneOf(input.worktop, WORKTOPS, 'Rocks/Alicante'), handles: oneOf(input.handles, HANDLES, 'Bar'),
    lighting: oneOf(input.lighting, INTERIOR_LIGHTS, 'ceiling'), exteriorLight: oneOf(input.exteriorLight, EXTERIOR_LIGHTS, defs.exteriorLight), electrics,
    pergolaRoof: oneOf(input.pergolaRoof, PERGOLA_ROOFS, 'blades'), pergolaFrame: oneOf(input.pergolaFrame, PERGOLA_COLOURS, st.frame || 'RAL7015'),
    pergolaBlades: oneOf(input.pergolaBlades, PERGOLA_COLOURS, st.blades || 'RAL7004'),
    pergolaSides: Object.fromEntries(PERGOLA_SIDE_KEYS.map(k => [k, oneOf(ps[k], PERGOLA_SIDES, 'none')])),
    panelColour: oneOf(input.panelColour, PANEL_COLOURS, 'RAL7016'), windscreenColour: oneOf(input.windscreenColour, WINDSCREEN_COLOURS, 'SCM33'),
    step: Math.min(STEPS.length - 1, Math.max(0, Math.floor(num(input.step) || 0)))
  };
  if (state.kitchen === 'kitchenette' && width < 2.6) state.kitchen = 'none';
  if (!open) {
    const list = Array.isArray(input.openings) ? input.openings.filter(o => o && typeof o === 'object').slice(0, 30) : null;
    state.openings = list ? markStandard(fitOpenings(list, state).openings, state) : defaultOpenings(style, width, depth, height);
  }
  return state;
}

/** Marks the openings that are exactly the style's standard design (included in its price). */
function markStandard(openings, state) {
  const defaults = defaultOpenings(state.style, state.width, state.depth, state.height);
  return openings.map(o => ({...o, std: defaults.some(d => d.wall === o.wall && d.type === o.type && Math.abs(d.w - o.w) < .001 && Math.abs(d.h - o.h) < .001 && Math.abs(d.p - o.p) < .02 && o.glass === d.glass)}));
}

/** Applies a change and reports any doors or windows the new shape moved or removed. */
export function apply(state, patch) {
  const merged = {...state, ...patch};
  if (patch.roofType && patch.roofType !== state.roofType) {
    // A new roof type starts at a sensible height: Pecasa's 2.5m for flat, a pitch above eaves.
    const st = STYLES[merged.style], {heights} = sizesFor(merged.style);
    merged.height = patch.roofType === 'pitched' ? nearest(heights, Math.max(st.defaults.height, 3.2)) : patch.roofType === 'flat' ? heights[0] : st.defaults.height;
  }
  const next = normalise({...merged, openings: []});
  if (STYLES[next.style].open) return {state: next, changes: []};
  if (!Array.isArray(merged.openings)) return {state: {...next, openings: defaultOpenings(next.style, next.width, next.depth, next.height)}, changes: []};
  const fitted = fitOpenings(merged.openings, next);
  return {state: {...next, openings: markStandard(fitted.openings, next)}, changes: fitted.changes};
}

/** A new style brings its own size, finishes and standard doors and windows. */
export function switchStyle(state, style) {
  const st = STYLES[style], d = st.defaults, defs = styleDefaults(style);
  return normalise({...state, style, width: d.width, depth: d.depth, height: d.height, roofType: 'standard', openings: null, deck: 'standard',
    ...defs, sedum: false, rooflight: 'none', addition: 'none', blinds: 'none', layout: st.open ? 'open' : state.layout});
}

// ---- Share links -------------------------------------------------------------------------
const CLAD_KEYS = Object.keys(CLADDINGS), FLOOR_KEYS = Object.keys(FLOORS), DECK_KEYS = Object.keys(DECK_FINISHES), INT_KEYS = Object.keys(INTERIORS);
const CAB_KEYS = Object.keys(CABINETS), WT_KEYS = Object.keys(WORKTOPS);
const WALL_CODES = {front: 'f', right: 'r', back: 'b', left: 'l', 'front-left': 'fl', 'porch-side': 'ps', return: 'rt', step: 'st'};
const WALL_FROM = Object.fromEntries(Object.entries(WALL_CODES).map(([k, v]) => [v, k]));
const ral = k => k.replace('RAL', '');
export function encode(state) {
  const s = normalise(state);
  const q = {v: '1', s: s.style, w: s.width, d: s.depth, h: s.height};
  if (s.roofType !== 'standard') q.rt = s.roofType;
  if (s.roofFinish !== STYLES[s.style].roofFinish) q.rf = Object.keys(ROOF_FINISHES).indexOf(s.roofFinish);
  if (s.sedum) q.sd = 1;
  if (s.rooflight !== 'none') { q.rl = s.rooflight; q.rc = s.rooflightCount; }
  if (s.addition !== 'none') q.ad = s.addition;
  q.c = ['main', 'feature', 'rear'].map(r => CLAD_KEYS.indexOf(s.cladding[r])).join('.');
  q.tr = ral(s.trim); q.fr = ral(s.frames);
  if (s.cornerTrims !== Boolean(STYLES[s.style].cornerTrims)) q.ct = s.cornerTrims ? 1 : 0;
  if (!STYLES[s.style].open) {
    q.o = s.openings.map(o => {
      const spec = OPENINGS[o.type], parts = [WALL_CODES[o.wall], o.type, Math.round(o.p * 10000)];
      const extra = [];
      if (Math.abs(o.w - spec.w) > .0005) extra.push('w' + Math.round(o.w * 1000));
      if (Math.abs(o.h - spec.h) > .0005) extra.push('h' + Math.round(o.h * 1000));
      if (Math.abs(o.sill - spec.sill) > .0005) extra.push('s' + Math.round(o.sill * 1000));
      if (o.glass === 'obscure' && !spec.obscure) extra.push('o');
      return [...parts, ...extra].join('.');
    }).join('_');
  }
  if (s.blinds !== 'none') q.bl = s.blinds;
  if (s.deck !== 'standard') q.dk = s.deck;
  q.df = DECK_KEYS.indexOf(s.deckFinish); q.i = INT_KEYS.indexOf(s.interior); q.f = FLOOR_KEYS.indexOf(s.floor);
  if (s.layout !== 'open') q.ly = s.layout;
  if (s.kitchen !== 'none') { q.k = s.kitchen; q.kf = CAB_KEYS.indexOf(s.kitchenFinish); q.wt = WT_KEYS.indexOf(s.worktop); q.hd = s.handles; }
  q.li = s.lighting; q.el = s.exteriorLight; q.u = s.use;
  const e = ELECTRIC_KEYS.filter(k => s.electrics[k]);
  if (e.length) q.e = e.join('.');
  if (STYLES[s.style].open) {
    q.pr = s.pergolaRoof; q.pf = ral(s.pergolaFrame); q.pb = ral(s.pergolaBlades);
    q.ps = PERGOLA_SIDE_KEYS.map(k => Object.keys(PERGOLA_SIDES).indexOf(s.pergolaSides[k])).join('');
    q.pc = ral(s.panelColour); q.wc = s.windscreenColour;
  }
  return q;
}
export function shareURL(state, base) {
  const u = new URL(base);
  u.hash = ''; u.search = '';
  Object.entries(encode(state)).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}
export function fromURL(url) {
  let p;
  try { p = new URL(url).searchParams; } catch { return null; }
  if (p.get('v') !== '1' || !p.has('s')) return null;
  const idx = (list, v) => (v !== null && v !== undefined && v !== '' && list[Number(v)] !== undefined ? list[Number(v)] : undefined);
  const c = (p.get('c') || '').split('.');
  const openings = !p.has('o') ? null : (p.get('o') || '').split('_').filter(Boolean).map(token => {
    const [w, type, pos, ...extra] = token.split('.');
    const o = {wall: WALL_FROM[w], type, p: Number(pos) / 10000, glass: 'clear'};
    for (const x of extra) {
      if (x === 'o') o.glass = 'obscure';
      else if (x[0] === 'w') o.w = Number(x.slice(1)) / 1000;
      else if (x[0] === 'h') o.h = Number(x.slice(1)) / 1000;
      else if (x[0] === 's') o.sill = Number(x.slice(1)) / 1000;
    }
    return o;
  }).filter(o => o.wall && has(OPENINGS, o.type) && Number.isFinite(o.p));
  const e = (p.get('e') || '').split('.');
  const ps = (p.get('ps') || '').split('');
  const style = p.get('s');
  return normalise({
    style, width: p.get('w'), depth: p.get('d'), height: p.get('h'), roofType: p.get('rt') || 'standard',
    roofFinish: idx(Object.keys(ROOF_FINISHES), p.get('rf')) ?? (STYLES[style] ? STYLES[style].roofFinish : undefined),
    sedum: p.get('sd') === '1', rooflight: p.get('rl'), rooflightCount: p.get('rc'), addition: p.get('ad'),
    cladding: {main: idx(CLAD_KEYS, c[0]), feature: idx(CLAD_KEYS, c[1]), rear: idx(CLAD_KEYS, c[2])},
    trim: p.has('tr') ? 'RAL' + p.get('tr') : undefined, frames: p.has('fr') ? 'RAL' + p.get('fr') : undefined,
    cornerTrims: p.has('ct') ? p.get('ct') === '1' : undefined, openings, blinds: p.get('bl'), deck: p.get('dk'),
    deckFinish: idx(DECK_KEYS, p.get('df')), interior: idx(INT_KEYS, p.get('i')), floor: idx(FLOOR_KEYS, p.get('f')),
    layout: p.get('ly'), kitchen: p.get('k'), kitchenFinish: idx(CAB_KEYS, p.get('kf')), worktop: idx(WT_KEYS, p.get('wt')), handles: p.get('hd'),
    lighting: p.get('li'), exteriorLight: p.get('el'), use: p.get('u'),
    electrics: Object.fromEntries(ELECTRIC_KEYS.map(k => [k, e.includes(k)])),
    pergolaRoof: p.get('pr'), pergolaFrame: p.has('pf') ? 'RAL' + p.get('pf') : undefined, pergolaBlades: p.has('pb') ? 'RAL' + p.get('pb') : undefined,
    pergolaSides: Object.fromEntries(PERGOLA_SIDE_KEYS.map((k, i) => [k, Object.keys(PERGOLA_SIDES)[Number(ps[i])]])),
    panelColour: p.has('pc') ? 'RAL' + p.get('pc') : undefined, windscreenColour: p.get('wc'), step: p.get('st')
  });
}

// ---- Specification -------------------------------------------------------------------------
export function openingLabel(o) {
  return `${OPENINGS[o.type].name} (${mm(o.w)} × ${mm(o.h)})${o.glass === 'obscure' ? ', obscure glass' : ''}`;
}
export function claddingName(key) { return CLADDINGS[key]?.name || key; }

/** Ordered spec rows: {section, label, value, status}. status: included | upgrade | quoted. */
export function specRows(state) {
  const s = normalise(state), st = STYLES[s.style], P = plan(s), rows = [];
  const add = (section, label, value, status = 'included') => rows.push({section, label, value, status});
  const defs = styleDefaults(s.style);
  add('Building', 'Style', `Pecasa ${st.name}`);
  add('Building', 'External size', `${metres(s.width)} wide × ${metres(s.depth)} deep (${footprintArea(s).toFixed(1)}m² footprint${st.open ? '' : `, about ${internalArea(s).toFixed(1)}m² inside`})`);
  add('Building', 'Height', `${metres(P.maxHeight)} at the highest point${P.maxHeight > 2.5 ? ' (over 2.5m: see planning note)' : ''}`);
  if (st.open) {
    add('Building', 'Roof', PERGOLA_ROOFS[s.pergolaRoof].name, s.pergolaRoof === 'blades' ? 'included' : 'upgrade');
    add('Exterior', 'Frame colour', `${PERGOLA_COLOURS[s.pergolaFrame].name} (RAL ${ral(s.pergolaFrame)})`);
    add('Exterior', 'Blade colour', `${PERGOLA_COLOURS[s.pergolaBlades].name} (RAL ${ral(s.pergolaBlades)})`);
    for (const k of PERGOLA_SIDE_KEYS) if (s.pergolaSides[k] !== 'none') {
      const kind = s.pergolaSides[k];
      add('Sides', `${k[0].toUpperCase() + k.slice(1)} side`, `${PERGOLA_SIDES[kind].name}${kind === 'windscreen' ? `, ${WINDSCREEN_COLOURS[s.windscreenColour].name}` : kind === 'loggia' || kind === 'solid' ? `, ${PANEL_COLOURS[s.panelColour].name}` : ''}`, 'upgrade');
    }
    if (s.deck !== 'none') add('Exterior', 'Decking', `Under the pergola, ${DECK_FINISHES[s.deckFinish].name}`, 'upgrade');
    add('Exterior', 'Outside lights', EXTERIOR_LIGHTS[s.exteriorLight].name);
  } else {
    const roofName = P.roof.kind === 'gable' ? 'Pitched (gable) roof' : P.roof.kind === 'mono' ? 'Flat roof with a mono-pitch fall' : 'Flat roof';
    add('Building', 'Roof', `${roofName}, ${ROOF_FINISHES[s.roofFinish].name}`, s.roofType === 'standard' && s.roofFinish === defs.roofFinish ? 'included' : 'upgrade');
    if (s.sedum) add('Building', 'Green roof', 'Sedum roof', 'upgrade');
    if (s.rooflight !== 'none') add('Building', 'Rooflights', `${s.rooflightCount} × ${ROOFLIGHTS[s.rooflight].name}`, 'upgrade');
    if (s.addition !== 'none') add('Building', 'Addition', ADDITIONS[s.addition].name, 'upgrade');
    add('Building', 'Construction', 'SIP walls, floor and roof (EPS70 insulation as standard)');
    add('Building', 'Use', `${USES[s.use].name} (furniture shown is illustrative)`);
    for (const role of claddingRoles(s.style)) add('Exterior', `Cladding: ${ROLE_NAMES[role].toLowerCase()}`, claddingName(s.cladding[role]));
    add('Exterior', 'Flashing and fascia', ralName(s.trim));
    if (s.cornerTrims) add('Exterior', 'Corner trims', `Vertical trims, ${ralName(s.trim)}`, defs.cornerTrims ? 'included' : 'upgrade');
    add('Exterior', 'Window and door frames', `Cortizo aluminium, ${ralName(s.frames)}`, s.frames === defs.frames ? 'included' : 'quoted');
    add('Exterior', 'Outside lights', EXTERIOR_LIGHTS[s.exteriorLight].name);
    if (P.decks.length) add('Exterior', 'Decking', `${DECKS[s.deck].name}, ${DECK_FINISHES[s.deckFinish].name}`, 'upgrade');
    for (const wall of P.walls) {
      const list = s.openings.filter(o => o.wall === wall.id);
      if (list.length) add('Doors and windows', wallLabel(wall.id), list.map(openingLabel).join('; '), list.every(o => o.std) ? 'included' : 'upgrade');
    }
    if (s.blinds !== 'none') add('Doors and windows', 'Blinds', `${BLINDS[s.blinds].name} blinds`, 'upgrade');
    add('Interior', 'Walls', `Plasterboard, tape-and-joint finish: ${INTERIORS[s.interior].name}`, INTERIORS[s.interior].ply ? 'quoted' : 'included');
    add('Interior', 'Floor', FLOORS[s.floor].name, s.floor === 'tiles03' ? 'upgrade' : s.floor === 'osb' ? 'quoted' : 'included');
    add('Interior', 'Layout', LAYOUTS[s.layout].name, LAYOUTS[s.layout].status);
    if (s.kitchen === 'kitchenette') add('Interior', 'Kitchen', `Kitchenette: ${CABINETS[s.kitchenFinish].name} units, ${WORKTOPS[s.worktop].name} worktop, ${HANDLES[s.handles].name.toLowerCase()} handles`, 'upgrade');
    add('Interior', 'Lighting', INTERIOR_LIGHTS[s.lighting].name);
    const extras = ELECTRIC_KEYS.filter(k => s.electrics[k] && ELECTRICS[k].status === 'included').map(k => ELECTRICS[k].name);
    add('Interior', 'Electrics', ['Sockets, switches and consumer unit'].concat(extras).join(', '));
    for (const k of ['wallHeater', 'airCon']) if (s.electrics[k]) add('Interior', 'Heating and cooling', ELECTRICS[k].name, 'upgrade');
  }
  add('Site', 'Foundations', 'Radix ground screws, subject to ground conditions');
  add('Site', 'Electrical supply to the building', 'Connection from your house', 'quoted');
  add('Site', 'Other site work', 'Site clearance, water and drainage, skips and parking permits, if needed', 'quoted');
  return rows;
}

export function upgradesOf(state) {
  return specRows(state).filter(r => r.status === 'upgrade').map(r => `${r.label}: ${r.value}`);
}

export function summary(state, base = typeof location !== 'undefined' ? location.origin + '/configurator/' : 'https://pecasa-garden-room-configurator.netlify.app/configurator/') {
  const s = normalise(state), st = STYLES[s.style], P = plan(s), price = priceFor(s);
  return {
    style: st.name, styleKey: s.style, size: `${metres(s.width)} × ${metres(s.depth)}`, height: metres(P.maxHeight),
    area: footprintArea(s).toFixed(1) + 'm²', use: USES[s.use].name, price, upgrades: upgradesOf(s), rows: specRows(s), designLink: shareURL(s, base)
  };
}
// ---- Contact validation ---------------------------------------------------------------------

const POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|[A-HK-Y][0-9]{1,2}|[0-9][A-HJKS-UW]|[A-HK-Y][0-9][ABEHMNPRV-Y]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
export function validPostcode(value) {
  return POSTCODE.test(String(value || '').trim());
}
export function formatPostcode(value) {
  const v = String(value || '').toUpperCase().replace(/\s+/g, '');
  return v.length > 3 ? `${v.slice(0, -3)} ${v.slice(-3)}` : v;
}

// Ofcom's numbering plan: geographic 01/02, non-geographic 03, mobiles 071-075 and 077-079 (and
// 07624), corporate 055/056 and freephone 0800/0808. Premium 09, personal 070 and pagers are
// refused, as are Ofcom's reserved drama ranges, which never connect.
const UK_NUMBER = /^0(?:1\d{8,9}|2\d{9}|3[0347]\d{8}|5[56]\d{8}|7(?:[1-57-9]\d{8}|624\d{6})|80[08]\d{6,7})$/;
const DRAMA = [/^07700900\d{3}$/, /^01632960\d{3}$/, /^0113496\d{4}$/, /^0114496\d{4}$/, /^0115496\d{4}$/, /^0116496\d{4}$/, /^0117496\d{4}$/, /^0118496\d{4}$/, /^01414960\d{3}$/, /^01314960\d{3}$/, /^02079460\d{3}$/, /^02890180\d{3}$/, /^02920180\d{3}$/, /^0191498\d{4}$/, /^03069990\d{3}$/, /^08081570\d{3}$/, /^09098790\d{3}$/];

/** Returns {valid, national, e164, display, kind, reason}. Accepts +44, 0044 and (0) forms. */
export function parseUKPhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return {valid: false, reason: 'empty'};
  if (/[^\d\s()+.\-]/.test(raw)) return {valid: false, reason: 'characters'};
  let digits = raw.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+44')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('0044')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('44') && digits.length >= 12) digits = '0' + digits.slice(2);
  else if (digits.startsWith('+')) return {valid: false, reason: 'international'};
  if (digits.startsWith('00')) return {valid: false, reason: 'international'};
  if (!digits.startsWith('0')) digits = '0' + digits;
  if (!UK_NUMBER.test(digits)) return {valid: false, reason: digits.length < 10 ? 'short' : digits.length > 11 ? 'long' : 'range'};
  if (DRAMA.some(re => re.test(digits)) || /^0\d(\d)\1{7,8}$/.test(digits)) return {valid: false, reason: 'fictional'};
  const kind = digits.startsWith('07') ? 'mobile' : digits.startsWith('01') || digits.startsWith('02') ? 'landline' : 'other';
  let display;
  if (digits.startsWith('02')) display = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  else if (digits.startsWith('07') || digits.startsWith('01') || digits.startsWith('05')) display = `${digits.slice(0, 5)} ${digits.slice(5)}`;
  else display = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return {valid: true, national: digits, e164: '+44' + digits.slice(1), display, kind};
}
export function phoneProblem(input) {
  const r = parseUKPhone(input);
  if (r.valid) return '';
  return {
    empty: 'Enter a UK phone number so a specialist can call you about your design.',
    characters: 'Use numbers only, for example 07700 123456.',
    international: 'Enter a UK number. For an overseas project, call Pecasa on 020 8146 2200.',
    short: 'That number looks too short. UK numbers have 10 or 11 digits, such as 07700 123456.',
    long: 'That number looks too long. UK numbers have 10 or 11 digits, such as 07700 123456.',
    range: 'That does not look like a UK mobile or landline. Check the number, such as 07700 123456 or 020 7946 1234.',
    fictional: 'That number is reserved and cannot be called. Enter the number we can reach you on.'
  }[r.reason];
}
export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}
