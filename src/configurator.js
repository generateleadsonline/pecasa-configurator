// Pecasa garden room designer: page controller. Pure design rules live in configurator-model.js;
// the 3D scene and the PDF load on demand. Built on the SMART configurator's page controller.
import {shimDialogs} from './configurator-compat.js';
import {createBoot, RUNGS} from './configurator-boot.js';
import {
  STYLES, STYLE_ORDER, CLADDINGS, RAL, OPENINGS, ROOF_FINISHES, ROOFLIGHTS, ADDITIONS, BLINDS, INTERIORS, FLOORS,
  DECK_FINISHES, DECKS, LAYOUTS, KITCHENS, CABINETS, WORKTOPS, HANDLES, ELECTRICS, INTERIOR_LIGHTS, EXTERIOR_LIGHTS, USES,
  PERGOLA_COLOURS, PERGOLA_SIDES, PERGOLA_ROOFS, WINDSCREEN_COLOURS, PANEL_COLOURS, STEPS, plan, roofKind, wallLabel,
  footprintArea, internalArea, normalise, apply, switchStyle, addOpening, priceFor, nearestPriced, pricedLabel, pounds, metres, mm, feet,
  sizesFor, shareURL, fromURL, summary, specRows, upgradesOf, openingLabel, claddingName, claddingRoles, ROLE_NAMES,
  parseUKPhone, phoneProblem, validPostcode, formatPostcode, validEmail, ralName
} from './configurator-model.js';
import {USPS, CONTACT, MENU_DOORS, MENU_WINDOWS} from './configurator-data.js';
import {captureAttribution, attributionFields} from './configurator-attribution.js';
import {createTour} from './configurator-tour.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const tick = `<span class="tick">${icon('check')}</span>`;
const track = (event, values = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({event, ...values}); };
const clone = v => JSON.parse(JSON.stringify(v));
const STORAGE = 'pecasa-room-design-v1';
const RECEIPT = 'pecasa-quote-receipt-v1';
const params = new URLSearchParams(location.search);
const QA = params.has('qa');
// Read at load: the address is rewritten to the design link once the page starts.
const DEBUG3D = params.has('debug3d');
// How long after load the 3D starts by itself when the shopper has not touched the page yet.
const IDLE_START_MS = 2500;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const stacked = () => matchMedia('(max-width: 860px)').matches;

let attributionStore; try { attributionStore = sessionStorage; } catch {}
const attribution = captureAttribution({url: location.href, referrer: document.referrer, storage: attributionStore});

let state = normalise({});
let undoStack = [], future = [];
let scene = null, night = false;
let ui = {wall: 'front', opening: null, adding: null, notice: null, view: 'outside', cladRole: 'main'};
let contact = null, sentKey = null, started = false, lastCapture = null;
const tour = createTour({onEvent: track});
const isPergola = () => Boolean(STYLES[state.style].open);

// ---- Persistence ------------------------------------------------------------------------
function restore() {
  const linked = fromURL(location.href);
  if (linked) { state = linked; return 'link'; }
  try { const raw = localStorage.getItem(STORAGE); if (raw) { state = normalise(JSON.parse(raw)); return 'device'; } } catch {}
  return null;
}
function persist() {
  const url = new URL(shareURL(state, location.origin + '/configurator/'));
  url.searchParams.set('st', String(state.step));
  if (QA) url.searchParams.set('qa', '1');
  if (DEBUG3D) url.searchParams.set('debug3d', '');
  window.history.replaceState(null, '', url);
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
}
const specKey = s => JSON.stringify({...normalise(s), step: 0, openings: normalise(s).openings.map(o => [o.wall, o.type, o.w, o.h, o.p, o.glass])});
// The price shows once the shopper has sent a design in this browser session.
const unlocked = () => contact !== null;
const upToDate = () => sentKey === specKey(state);

// ---- Change handling ---------------------------------------------------------------------
function wallDir(id) {
  const w = plan(state).walls.find(x => x.id === id);
  if (!w) return [-.5, .3, 1];
  const [nx, nz] = w.n;
  return [nx + (nz ? -.3 * nz : 0), .22, nz + (nx ? .3 * nx : 0)];
}
function focusFor(key, extra = {}) {
  const s = state;
  switch (key) {
    case 'style': return {tags: [], whole: true, highlight: false};
    case 'use': return {tags: ['furniture'], view: 'inside'};
    case 'size': return {tags: [], whole: true, highlight: false};
    case 'height': return {tags: ['roof'], dir: [-1, .25, .6], whole: true};
    case 'roof': return {tags: ['roof'], dir: [-.55, .95, .95], whole: true};
    case 'rooflight': return {tags: ['rooflights'], dir: [-.4, 1.3, .8], whole: true};
    case 'addition': return {tags: ['addition'], dir: [-.4, .45, 1], whole: true};
    case 'cladding': return {tags: ['cladding:' + (extra.role || 'main')], dir: extra.role === 'rear' ? [.7, .3, -1] : [-.62, .28, 1], whole: true};
    case 'trim': return {tags: ['flashing'], dir: [-.62, .4, 1], whole: true};
    case 'cornerTrims': return {tags: ['cornerTrims'], dir: [-.62, .3, 1], whole: true};
    case 'frame': return {tags: ['frames'], dir: [-.2, .18, 1], whole: true};
    // From low down, under the soffit; with no lights chosen, show where they would have been.
    case 'exteriorLight': return s.exteriorLight === 'none' ? {tags: ['soffit'], dir: [-.3, .04, 1], pad: .2, ground: true, margin: 1} : {tags: ['exteriorLights'], dir: [-.25, .04, 1], pad: .9, ground: true};
    case 'deck': return {tags: ['deck'], dir: [-.35, .55, 1], pad: .6};
    case 'wall': return {tags: ['wall:' + extra.wall], dir: wallDir(extra.wall), pad: .4, highlight: extra.highlight};
    case 'opening': return {tags: ['opening:' + extra.id], dir: wallDir(extra.wall), pad: 1.3, minDistance: 4.2};
    case 'blinds': return {tags: ['blinds'], dir: [-.2, .15, 1], whole: true};
    case 'floor': return {tags: ['floor'], view: 'inside', lookDown: true};
    case 'interior': return {tags: ['interiorWalls'], view: 'inside'};
    case 'layout': return {tags: ['layout'], view: 'plan'};
    case 'kitchen': return {tags: ['kitchen'], view: 'inside'};
    case 'worktop': return {tags: ['worktop'], view: 'inside'};
    case 'lighting': return {tags: ['lighting'], view: 'inside'};
    case 'electrics': return extra.outside ? {tags: ['externalSocket'], dir: [-.2, .15, 1], pad: 1} : {tags: [extra.tag || 'electrics'], view: 'inside'};
    case 'heating': return extra.outside ? {tags: ['heating'], dir: [.4, .5, -1], whole: true} : {tags: ['heating'], view: 'inside'};
    case 'pergola': return {tags: [extra.tag || 'pergola'], dir: extra.dir || [-.6, .5, 1], whole: true};
    default: return null;
  }
}

function change(patch, {key, label, focus = {}} = {}) {
  beginInteraction();
  const result = patch.__style ? {state: switchStyle(state, patch.__style), changes: []} : apply(state, patch);
  const next = {...result.state, step: state.step};
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  undoStack.push(clone(state)); if (undoStack.length > 60) undoStack.shift(); future = [];
  state = next;
  ui.notice = result.changes.length ? describeChanges(result.changes) : null;
  if (ui.opening && !state.openings.some(o => o.id === ui.opening)) ui.opening = null;
  if (!plan(state).walls.some(w => w.id === ui.wall)) ui.wall = 'front';
  render({keepFocus: true, changed: key});
  persist();
  const spec = key && focusFor(key, focus);
  if (spec && scene) scene.focus(spec);
  if (label) toast(label);
  track('configurator_option_change', {option: key || Object.keys(patch).join(','), style: state.style, step: state.step + 1});
}
function describeChanges(changes) {
  return changes.map(c => c.kind === 'removed'
    ? `There was no room for the ${(OPENINGS[c.type]?.name || 'opening').toLowerCase()} on the ${wallLabel(c.wall).toLowerCase()}, so it was removed.`
    : `The ${OPENINGS[c.from].name} on the ${wallLabel(c.wall).toLowerCase()} became a ${OPENINGS[c.to].name} to fit.`).join(' ');
}
let toastTimer = 0;
function toast(text) {
  const el = $('#change-toast');
  el.hidden = false; el.textContent = text;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  $('#announce').textContent = text;
}
function beginInteraction() {
  if (started) return;
  started = true;
  track('configurator_start', {style: state.style});
}

// ---- Rendering ---------------------------------------------------------------------------
const STEP_COPY = () => [
  ['Choose your style', 'Fourteen Pecasa styles, all built from SIP panels made in Watford.'],
  ['Size and roof', 'Set any size in 10cm steps. Sizes with a published Pecasa price are marked.'],
  ['Make the outside yours', isPergola() ? 'Frame and blade colours, and decking underneath.' : 'Cladding, flashing, frames, lights and decking.'],
  isPergola() ? ['Sides and panels', 'Close any side with louvres, glass, a windscreen or a solid panel.'] : ['Doors and windows', 'Cortizo aluminium glazing. Place it on any wall.'],
  isPergola() ? ['Lighting', 'A pergola is open to the garden: choose its lighting.'] : ['Make the inside yours', 'Walls, floor, layout, kitchen, lighting and power.'],
  ['Your Pecasa design', 'Your design, its published price and your next steps.']
];
const NEXT_LABEL = () => ['Next: size & roof', 'Next: exterior', isPergola() ? 'Next: sides' : 'Next: doors & windows', isPergola() ? 'Next: lighting' : 'Next: interior', 'See your price'];
// Each step shows the selling points that support it.
const STEP_USPS = [['factory', 'projects', 'reviews'], ['planning', 'survey', 'install'], ['factory', 'warranty', 'britain'], ['glazing', 'install', 'warranty'], ['finished', 'sips', 'warranty'], ['survey', 'quote', 'warranty']];
const USP_ICON = {factory: 'house', projects: 'check', warranty: 'shield', install: 'clock', survey: 'calendar', quote: 'check', screws: 'check', sips: 'house', glazing: 'window', finished: 'check', planning: 'info', britain: 'star', reviews: 'star'};

const radio = (name, value, checked, body, {cls = '', disabled = false, label = ''} = {}) =>
  `<label class="opt ${cls}" data-key="${name}:${esc(value)}"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${label ? `aria-label="${esc(label)}"` : ''}><span>${body}</span></label>`;
const swatch = (name, value, checked, hex, label, pattern = '') =>
  `<label class="swatch" data-key="${name}:${esc(value)}"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} aria-label="${esc(label)}"><span><i class="${pattern}" data-c="${hex}"></i><small>${esc(label)}</small></span></label>`;
const toggle = (name, checked, title, sub, {disabled = false, badge: b = ''} = {}) =>
  `<label class="switch" data-key="${name}"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="track"></span><span class="opt-text"><strong>${esc(title)} ${b}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
const badge = status => status === 'upgrade' ? '<span class="badge upgrade">Upgrade</span>' : status === 'quoted' ? '<span class="badge quoted">Quoted</span>' : '<span class="badge included">Included</span>';
const section = (title, note, body, cls = '') => `<section class="section ${cls}"><div class="section-head"><h3>${title}</h3>${note ? `<small>${note}</small>` : ''}</div>${body}</section>`;
const usp = key => `<div class="usp">${icon(USP_ICON[key] || 'check')}<div><strong>${esc(USPS[key].title)}</strong><span>${esc(USPS[key].copy)}</span></div></div>`;
const segmented = (name, label, options, value) => `<div class="segmented" role="radiogroup" aria-label="${esc(label)}">${options.map(([k, n, dis]) => `<label data-key="${name}:${k}"><input type="radio" name="${name}" value="${k}" ${value === k ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${esc(n)}</span></label>`).join('')}</div>`;
const posterSrc = (style, w = 480) => `/assets/posters/${style}-${w}.webp`;

function renderStyle() {
  const st = STYLES[state.style];
  const uses = {office: 'office', gym: 'gym', studio: 'studio', lounge: 'sofa', guest: 'bed'};
  return section('Choose your style', 'Tap one to see it in 3D', `<div class="choices style-grid">${STYLE_ORDER.map(k => {
    const x = STYLES[k], p = priceFor({style: k});
    return radio('style', k, state.style === k, `<img src="${posterSrc(k)}" srcset="${posterSrc(k, 320)} 320w, ${posterSrc(k)} 480w" sizes="(max-width: 520px) 46vw, 190px" width="160" height="107" alt="" loading="lazy"><span class="opt-text"><strong>${esc(x.name)}</strong><small>${esc(metres(x.defaults.width))} &times; ${esc(metres(x.defaults.depth))}, ${pounds(p.value)}</small></span>${tick}`, {cls: 'style-card', label: `${x.name}: ${x.summary}`});
  }).join('')}</div><p class="section-note"><strong>${esc(st.name)}:</strong> ${esc(st.summary)} Prices shown are Pecasa's own online estimates for each standard design, including VAT.</p>`) +
    (isPergola() ? '' : section('What is it for?', 'Sets the furniture shown', `<div class="choices two">${Object.entries(USES).map(([k, u]) => radio('use', k, state.use === k, `<span class="icon">${icon(uses[k])}</span><span class="opt-text"><strong>${esc(u.name)}</strong></span>${tick}`)).join('')}</div>`)) +
    `<div class="usp-row">${usp('factory')}${usp('projects')}</div>`;
}

function sizeControl(dim, list, value, label) {
  const i = list.findIndex(v => Math.abs(v - value) < 1e-6);
  return `<div class="size-control"><label id="${dim}-label" for="${dim}-range">${label}</label><div class="row"><button type="button" data-size="${dim}" data-dir="-1" aria-label="Smaller ${dim}" ${i <= 0 ? 'disabled' : ''}>${icon('minus')}</button><output id="${dim}-out" aria-live="polite">${metres(value)}</output><button type="button" data-size="${dim}" data-dir="1" aria-label="Larger ${dim}" ${i >= list.length - 1 ? 'disabled' : ''}>${icon('plus')}</button></div><input type="range" id="${dim}-range" data-range="${dim}" min="0" max="${list.length - 1}" step="1" value="${Math.max(0, i)}" aria-valuetext="${metres(value)}"><small>About ${feet(value)}</small></div>`;
}
function renderSize() {
  const st = STYLES[state.style], {widths, depths, heights} = sizesFor(state.style), P = plan(state), price = priceFor(state);
  const shortcuts = nearestPriced(state, 4);
  const priced = `<div class="choices priced">${shortcuts.map(x => {
    const on = Math.abs(x.w - state.width) < 1e-6 && Math.abs(x.d - state.depth) < 1e-6 && Math.abs(x.h - state.height) < .03;
    const src = x.source === 'planner' ? 'Standard design' : x.source === 'card' ? 'Published model' : 'Price table';
    return `<button type="button" class="opt priced-size ${on ? 'is-on' : ''}" data-priced="${x.w}x${x.d}x${x.h}" aria-pressed="${on}"><span><span class="opt-text"><strong>${metres(x.w)} &times; ${metres(x.d)}</strong><small>${src}${x.source === 'planner' ? '' : `, ${metres(x.shownH ?? x.h)} high`}</small></span></span></button>`;
  }).join('')}</div>`;
  const status = price.value === null
    ? `<p class="price-hint quoted">${icon('info')}<span>Pecasa prices this exact size in your written quote. Choose a size above to see a published price.</span></p>`
    : `<p class="price-hint">${icon('check')}<span>${esc(price.short)}: available for this size.</span></p>`;
  const roofTypes = isPergola() ? '' : (() => {
    const gableStyle = st.roof.kind === 'gable';
    const opts = gableStyle ? [['standard', 'Pitched (standard)'], ['flat', 'Flat']] : [['standard', st.roof.kind === 'mono' ? 'Flat with fall (standard)' : 'Flat (standard)'], ['pitched', 'Pitched']];
    const kind = roofKind(state);
    const finishes = Object.entries(ROOF_FINISHES).map(([k, f]) => radio('roofFinish', k, state.roofFinish === k, `<span class="opt-text"><strong>${esc(f.name)} ${badge(f.status)}</strong>${f.pitchedOnly && kind !== 'gable' ? '<small>For pitched roofs</small>' : ''}</span>${tick}`, {disabled: f.pitchedOnly && kind !== 'gable'})).join('');
    return section('Roof', 'Pecasa’s roof options', `${segmented('roofType', 'Roof type', opts, state.roofType)}<div class="choices two spaced">${finishes}</div>
      ${kind !== 'gable' ? toggle('sedum', state.sedum, 'Green (sedum) roof', 'A living roof over the membrane', {badge: badge('upgrade')}) : ''}
      ${kind !== 'gable' ? `<div class="field inline"><label for="rooflight">Rooflights ${state.rooflight !== 'none' ? badge('upgrade') : ''}</label><div class="row-2"><select id="rooflight" name="rooflight">${Object.entries(ROOFLIGHTS).map(([k, r]) => `<option value="${k}" ${state.rooflight === k ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>${state.rooflight !== 'none' ? `<select name="rooflightCount" aria-label="How many rooflights">${[1, 2, 3].map(n => `<option value="${n}" ${state.rooflightCount === n ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</div></div>` : '<p class="section-note">Rooflights and green roofs are offered on flat roofs.</p>'}`);
  })();
  const additions = isPergola() ? section('Roof', '', segmented('pergolaRoof', 'Pergola roof', Object.entries(PERGOLA_ROOFS).map(([k, r]) => [k, r.name]), state.pergolaRoof)) :
    section(`Add to your room ${state.addition !== 'none' ? badge('upgrade') : ''}`, 'From Pecasa’s Roof & Porch options', segmented('addition', 'Addition', [['none', 'None'], ...Object.entries(ADDITIONS).map(([k, a]) => [k, a.name])], state.addition));
  return section('Sizes with a published price', 'Tap to use', priced + status) +
    section('Or set your exact size', 'Outside wall dimensions', `<div class="stepper three">${sizeControl('width', widths, state.width, 'Width (front)')}${sizeControl('depth', depths, state.depth, 'Depth (side)')}${sizeControl('height', heights, state.height, st.roof.kind === 'gable' ? 'Height (to ridge)' : 'Height')}</div>
      <div class="area"><span>Footprint</span><strong>${footprintArea(state).toFixed(1)}m&sup2;</strong>${isPergola() ? '' : `<span>Inside, about</span><strong>${internalArea(state).toFixed(1)}m&sup2;</strong>`}</div>
      ${P.maxHeight > 2.5 ? `<p class="section-note">${icon('info')} At ${metres(P.maxHeight)} high this design is over 2.5m: within 2m of a boundary it would need planning permission in England. Pecasa advises at your free survey.</p>` : ''}`) +
    roofTypes + additions + usp('planning');
}

const CLAD_GROUPS = [['Timber', ['cedarPlanks', 'cedarPlanksHorizontal', 'planks']], ['Shiplap', ['shiplap01', 'shiplap02', 'shiplap03']],
  ['Composite (Envirobuild)', Object.keys(CLADDINGS).filter(k => k.startsWith('envirobuild'))], ['Millboard', Object.keys(CLADDINGS).filter(k => k.startsWith('shadow-line') || k.startsWith('board-and-batten'))],
  ['Render and stone', ['renderWhite', 'stone01', 'stone02']]];
function renderExterior() {
  if (isPergola()) {
    const pc = (name, value) => `<div class="swatches small">${Object.entries(PERGOLA_COLOURS).map(([k, c]) => swatch(name, k, value === k, c.hex, `${c.name} (${k.replace('RAL', 'RAL ')})`)).join('')}</div>`;
    return section('Frame colour', '15 RAL colours', pc('pergolaFrame', state.pergolaFrame)) +
      section('Blade colour', 'The louvred roof', pc('pergolaBlades', state.pergolaBlades)) +
      section(`Decking ${state.deck !== 'none' ? badge('upgrade') : ''}`, '', segmented('deck', 'Decking', [['standard', 'Under the pergola'], ['none', 'None']], state.deck === 'none' ? 'none' : 'standard') + (state.deck !== 'none' ? deckSwatches() : '')) +
      usp('factory');
  }
  const roles = claddingRoles(state.style);
  const role = roles.includes(ui.cladRole) ? ui.cladRole : 'main';
  const roleTabs = roles.length > 1 ? `<div class="wall-tabs role-tabs" role="tablist" aria-label="Which walls">${roles.map(r => `<button type="button" role="tab" data-role="${r}" aria-selected="${r === role}"><span>${ROLE_NAMES[r]}</span><small>${esc(claddingName(state.cladding[r]))}</small></button>`).join('')}</div>` : '';
  const sw = CLAD_GROUPS.map(([g, keys]) => `<p class="section-note"><strong>${g}</strong></p><div class="swatches">${keys.map(k => swatch('cladding', k, state.cladding[role] === k, CLADDINGS[k].hex, CLADDINGS[k].name, CLADDINGS[k].kind === 'render' || CLADDINGS[k].kind.startsWith('stone') || CLADDINGS[k].kind === 'drystone' ? '' : CLADDINGS[k].dir === 'h' ? 'boards-h' : 'boards-v')).join('')}</div>`).join('');
  const ralSw = (name, value) => `<div class="swatches small">${Object.entries(RAL).map(([k, c]) => swatch(name, k, value === k, c.hex, `${c.name} (RAL ${c.code})`)).join('')}</div>`;
  const P = plan(state);
  return section('Cladding', 'External cladding in your choice of finish is standard', `${roleTabs}${sw}<p class="section-note">${role === 'feature' ? 'Feature walls: the front and any recessed or framed parts of this style.' : role === 'rear' ? 'The back and the side away from the garden.' : 'Colours on screen are a guide; Pecasa brings samples to your survey.'}</p>`) +
    section('Flashing and fascia', 'Composite fascia, nine colours', ralSw('trim', state.trim) + toggle('cornerTrims', state.cornerTrims, 'Vertical corner trims', '30mm trims on the outside corners', {badge: STYLES[state.style].cornerTrims ? '' : badge('upgrade')})) +
    section('Window and door frames', 'Cortizo aluminium', ralSw('frames', state.frames)) +
    section('Outside lights', 'Included', `<div class="choices two">${Object.entries(EXTERIOR_LIGHTS).map(([k, l]) => radio('exteriorLight', k, state.exteriorLight === k, `<span class="opt-text"><strong>${esc(l.name)}</strong></span>${tick}`)).join('')}</div><button type="button" class="text-button" data-action="dusk">${icon('moon')}<span>See them at dusk</span></button>`) +
    section(`Decking ${P.decks.length ? badge('upgrade') : ''}`, 'Priced in your quotation', segmented('deck', 'Decking', Object.entries(DECKS).map(([k, x]) => [k, x.name]), state.deck) + (P.decks.length ? deckSwatches() : '')) +
    usp('warranty');
}
const deckSwatches = () => `<div class="swatches small spaced">${Object.entries(DECK_FINISHES).map(([k, f]) => swatch('deckFinish', k, state.deckFinish === k, f.hex, f.name, 'boards-h')).join('')}</div>`;

function renderOpenings() {
  if (isPergola()) {
    const side = k => `<div class="field"><label for="side-${k}">${k[0].toUpperCase() + k.slice(1)} side ${state.pergolaSides[k] !== 'none' ? badge('upgrade') : ''}</label><select id="side-${k}" name="pergolaSide" data-side="${k}">${Object.entries(PERGOLA_SIDES).map(([v, x]) => `<option value="${v}" ${state.pergolaSides[k] === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
    const used = Object.values(state.pergolaSides);
    return section('Sides', 'Front, back, left and right', ['front', 'back', 'left', 'right'].map(side).join('')) +
      (used.some(v => v === 'loggia' || v === 'solid') ? section('Panel colour', '', `<div class="swatches small">${Object.entries(PANEL_COLOURS).map(([k, c]) => swatch('panelColour', k, state.panelColour === k, c.hex, c.name)).join('')}</div>`) : '') +
      (used.includes('windscreen') ? section('Windscreen colour', '', `<div class="swatches small">${Object.entries(WINDSCREEN_COLOURS).map(([k, c]) => swatch('windscreenColour', k, state.windscreenColour === k, c.hex, c.name)).join('')}</div>`) : '');
  }
  const P = plan(state), walls = P.walls;
  const wall = walls.find(w => w.id === ui.wall) || walls[0], L = wall.len;
  const list = state.openings.filter(o => o.wall === wall.id);
  const count = id => state.openings.filter(o => o.wall === id).length;
  const order = ['front', 'front-left', 'porch-side', 'return', 'step', 'right', 'back', 'left'];
  const tabs = `<div class="wall-tabs" role="tablist" aria-label="Wall">${walls.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)).map(w => `<button type="button" role="tab" data-wall="${w.id}" aria-selected="${w.id === wall.id}"><span>${esc(wallLabel(w.id).replace(' side', ''))}</span><small>${count(w.id)} ${count(w.id) === 1 ? 'item' : 'items'}</small></button>`).join('')}</div>`;
  const diagram = `<div class="wall-diagram" aria-hidden="true"><span class="len">${metres(L)}</span>${list.map(o => { const s = OPENINGS[o.type]; const left = (o.p * L - o.w / 2) / L * 100, width = o.w / L * 100, height = (o.sill + o.h) / 2.4 * 100, bottom = o.sill / 2.4 * 100; return `<span class="seg ${s.group === 'door' ? 'is-door' : ''} ${o.id === ui.opening ? 'is-active' : ''}" data-open="${o.id}" data-box="${left.toFixed(2)},${width.toFixed(2)},${(height - bottom).toFixed(2)},${bottom.toFixed(2)}"></span>`; }).join('')}</div>`;
  const maxW = L - wall.margin0 - wall.margin1;
  const typeOptions = (current) => [['Doors', MENU_DOORS], ['Windows', MENU_WINDOWS]].map(([g, keys]) => `<optgroup label="${g}">${(OPENINGS[current]?.template ? [current] : []).concat(keys).map(k => `<option value="${k}" ${k === current ? 'selected' : ''} ${OPENINGS[k].w > maxW + 1e-6 ? 'disabled' : ''}>${esc(OPENINGS[k].name)} (${mm(OPENINGS[k].w)})</option>`).join('')}</optgroup>`).join('');
  const editor = o => {
    const pos = o.p * L;
    return `<div class="opening-edit"><div><label class="lead" for="type-${o.id}">Type</label><select id="type-${o.id}" data-field="type" data-id="${o.id}">${typeOptions(o.type)}</select></div>
      <div><label class="lead" for="pos-${o.id}">Position: ${(pos - o.w / 2).toFixed(2)}m from the left corner</label><div class="slide"><button type="button" data-nudge="-1" data-id="${o.id}" aria-label="Move left">${icon('back')}</button><input id="pos-${o.id}" type="range" min="0" max="1000" step="5" value="${Math.round(o.p * 1000)}" data-field="p" data-id="${o.id}"><button type="button" data-nudge="1" data-id="${o.id}" aria-label="Move right">${icon('arrow')}</button></div></div>
      ${OPENINGS[o.type].kind === 'solid' || OPENINGS[o.type].kind === 'clad' ? '' : segmented('glass-' + o.id, 'Glass', [['clear', 'Clear glass', OPENINGS[o.type].obscure], ['obscure', 'Obscure glass']], o.glass).replace(/name="glass-[^"]+"/g, m => m + ` data-field="glass" data-id="${o.id}"`)}
      <div class="opening-actions"><button type="button" class="button ghost small" data-remove="${o.id}">${icon('trash')}<span>Remove</span></button></div></div>`;
  };
  const rows = list.length ? list.map(o => {
    const s = OPENINGS[o.type], active = o.id === ui.opening;
    return `<div class="opening ${active ? 'is-active' : ''}"><button type="button" class="opening-row" data-open="${o.id}" aria-expanded="${active}"><span class="icon">${icon(s.group === 'door' ? 'door' : 'window')}</span><span class="opt-text"><strong>${esc(s.name)} ${badge(o.std ? 'included' : 'upgrade')}</strong><small>${mm(o.w)} &times; ${mm(o.h)}${o.sill ? `, ${mm(o.sill)} above the floor` : ''}${o.glass === 'obscure' ? ', obscure glass' : ''}</small></span>${icon(active ? 'minus' : 'plus')}</button>${active ? editor(o) : ''}</div>`;
  }).join('') : '<p class="section-note">No doors or windows on this wall yet.</p>';
  const picker = ui.adding ? `<div class="choices spaced">${(ui.adding === 'door' ? MENU_DOORS : MENU_WINDOWS).map(k => { const x = OPENINGS[k]; return `<button type="button" class="opt" data-add="${k}" ${x.w > maxW + 1e-6 ? 'disabled' : ''}><span><span class="icon">${icon(x.group === 'door' ? 'door' : 'window')}</span><span class="opt-text"><strong>${esc(x.name)}</strong><small>${mm(x.w)} &times; ${mm(x.h)}</small></span></span></button>`; }).join('')}<button type="button" class="text-button" data-add-cancel>Cancel</button></div>`
    : `<div class="add-row" role="group" aria-label="Add to this wall"><button type="button" class="button ghost" data-adding="window">${icon('plus')}<span>Window</span></button><button type="button" class="button ghost" data-adding="door">${icon('plus')}<span>Door</span></button></div>`;
  const notice = ui.notice ? `<p class="notice" role="status">${icon('info')}<span>${esc(ui.notice)}</span><button type="button" data-undo-notice>Undo</button></p>` : '';
  return section('Choose a wall', 'Left and right as you face the room', `${tabs}${diagram}<div class="opening-list">${rows}</div>${notice}${picker}<p class="section-note">Doors and windows in the standard ${esc(STYLES[state.style].name)} design are included; added or changed ones are upgrades priced in your quote. Tap any door or window in the 3D view to edit it.</p>`) +
    section(`Blinds ${state.blinds !== 'none' ? badge('upgrade') : ''}`, 'Five options', `<div class="swatches small">${Object.entries(BLINDS).map(([k, b]) => swatch('blinds', k, state.blinds === k, b.hex || '#fcfcfc', b.name)).join('')}</div>`) +
    usp('glazing');
}

function renderInterior() {
  if (isPergola()) return section('Outside lights', 'Included', `<div class="choices two">${Object.entries(EXTERIOR_LIGHTS).map(([k, l]) => radio('exteriorLight', k, state.exteriorLight === k, `<span class="opt-text"><strong>${esc(l.name)}</strong></span>${tick}`)).join('')}</div>`) +
    `<p class="section-note">A pergola has no walls or floor inside. Pecasa can add electrics outside; ask in your survey.</p>`;
  const floors = `<div class="swatches small">${Object.entries(FLOORS).map(([k, f]) => swatch('floor', k, state.floor === k, f.hex, f.name, f.kind === 'tile' ? '' : 'planks')).join('')}</div>`;
  const sizeOK = k => { const m = LAYOUTS[k].min; return !m || (state.width >= m[0] && state.depth >= m[1]); };
  const kitchen = state.kitchen === 'kitchenette' ? `<p class="section-note"><strong>Units</strong></p><div class="swatches small">${Object.entries(CABINETS).map(([k, c]) => swatch('kitchenFinish', k, state.kitchenFinish === k, c.hex, c.name)).join('')}</div>
    <p class="section-note"><strong>Worktop</strong></p><div class="swatches small">${Object.entries(WORKTOPS).map(([k, c]) => swatch('worktop', k, state.worktop === k, c.hex, c.name)).join('')}</div>
    <p class="section-note"><strong>Handles</strong></p>${segmented('handles', 'Handles', Object.entries(HANDLES).map(([k, h]) => [k, h.name]), state.handles)}` : '';
  const elec = (k, sub, extra = {}) => toggle(k, state.electrics[k], ELECTRICS[k].name, sub, {badge: badge(ELECTRICS[k].status), ...extra});
  return section('Walls', 'Plasterboard, tape-and-joint finish', `<div class="swatches small">${Object.entries(INTERIORS).map(([k, x]) => swatch('interior', k, state.interior === k, x.hex, x.name, x.ply ? 'planks' : '')).join('')}</div>`) +
    section('Floor', '12mm premium laminate as standard', floors + `<p class="section-note">Tiles are an upgrade; OSB is quoted.</p>`) +
    section('Layout & bathroom', '', `<div class="choices">${Object.entries(LAYOUTS).map(([k, x]) => radio('layout', k, state.layout === k, `<span class="opt-text"><strong>${esc(x.name)} ${badge(x.status)}</strong>${!sizeOK(k) ? `<small>Needs at least ${metres(x.min[0])} &times; ${metres(x.min[1])}</small>` : ''}</span>${tick}`, {disabled: !sizeOK(k)})).join('')}</div>`) +
    section(`Kitchen ${state.kitchen !== 'none' ? badge('upgrade') : ''}`, '', segmented('kitchen', 'Kitchen', Object.entries(KITCHENS).map(([k, x]) => [k, x.name, k === 'kitchenette' && state.width < 2.6]), state.kitchen) + kitchen) +
    section('Lighting', 'Included', `<div class="choices two">${Object.entries(INTERIOR_LIGHTS).map(([k, l]) => radio('lighting', k, state.lighting === k, `<span class="opt-text"><strong>${esc(l.name)}</strong></span>${tick}`)).join('')}</div>`) +
    section('Power and data', 'Electrics designed to your requirements', `${elec('doubleSockets', 'Extra sockets where you need them')}${elec('tvSocket', '')}${elec('dataPoint', 'A wired point for reliable calls')}${elec('extSocket', 'For the garden')}${elec('dimmer', '')}${elec('smokeAlarm', '')}`) +
    section('Heating and cooling', 'Priced in your quotation', `${elec('wallHeater', 'A slim electric panel heater')}${elec('airCon', 'Heats in winter and cools in summer, Wi-Fi controlled')}`) +
    `<div class="usp-row">${usp('finished')}${usp('sips')}</div>`;
}

function renderQuote() {
  const st = STYLES[state.style], price = priceFor(state), open = unlocked();
  $('#quote-summary').innerHTML = `<img id="summary-shot" src="${lastCapture || posterSrc(state.style)}" alt="" width="120" height="80"><div><strong>Pecasa ${esc(st.name)}</strong><span>${metres(state.width)} &times; ${metres(state.depth)}${isPergola() ? '' : `, ${esc(USES[state.use].name.toLowerCase())}`}</span></div>`;
  $('#quote-locked').hidden = open; $('#quote-unlocked').hidden = !open;
  if (open) {
    $('#price-value').textContent = price.value === null ? 'Quoted' : pounds(price.value);
    $('#price-label').textContent = price.value === null ? 'Your price' : 'Your price, including VAT';
    $('#price-for').textContent = `${st.name}, ${metres(state.width)} × ${metres(state.depth)}`;
    const nearestHtml = price.value === null ? `<span class="price-near">Published prices for this style: ${nearestPriced(state, 3).map(x => `<button type="button" class="text-button" data-priced="${x.w}x${x.d}x${x.h}">${pricedLabel(x)}: ${pounds(x.price)}</button>`).join(' ')}</span>` : '';
    $('#price-note').innerHTML = `${esc(price.label)}.${price.value === null ? '' : ' Upgrades and site work marked below are priced in your written quotation.'} ${nearestHtml}${upToDate() ? '' : `<span class="resend"><button type="button" class="button ghost small" id="resend">${icon('arrow')}<span>Send this updated design to Pecasa</span></button></span>`}`;
    const first = contact?.first || '';
    $('#thanks-title').textContent = first ? `Thanks, ${first}. Your design is with Pecasa.` : 'Thanks. Your design is with Pecasa.';
  }
  $('#pdf-note').textContent = open ? 'Your design, views and specification' : 'Unlocks with your price';
  const rows = specRows(state), sections = [...new Set(rows.map(x => x.section))];
  const stepOf = {Building: 1, Exterior: 2, 'Doors and windows': 3, Sides: 3, Interior: 4, Site: 1};
  $('#quote-spec').innerHTML = `<h3>Your specification</h3>` + sections.map(sec => `<h3>${esc(sec)} <button type="button" class="spec-edit" data-goto="${stepOf[sec] ?? 0}">Edit</button></h3><dl>${rows.filter(x => x.section === sec).map(x => `<div class="spec-row"><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd><dd class="spec-status">${badge(x.status)}</dd></div>`).join('')}</dl>`).join('') +
    `<p class="section-note">Included items are part of Pecasa's standard specification. Upgrades are priced in Pecasa's written quotation, normally within 7 days of your free survey; quoted items depend on your site.</p>`;
  $('#quote-proof').innerHTML = ['warranty', 'install', 'survey', 'factory', 'reviews'].map(k => `<li>${icon(USP_ICON[k])}<span><strong>${esc(USPS[k].title)}</strong>${esc(USPS[k].copy)}</span></li>`).join('');
  fillHidden();
}

const RENDERERS = [renderStyle, renderSize, renderExterior, renderOpenings, renderInterior];
function render({keepFocus = false, changed = null} = {}) {
  const focusKey = keepFocus ? document.activeElement?.closest('[data-key]')?.dataset.key || null : null;
  const focusSel = keepFocus && !focusKey && document.activeElement?.id ? '#' + document.activeElement.id : null;
  const st = STYLES[state.style], price = priceFor(state), open = unlocked(), copy = STEP_COPY();
  $$('#steps [data-step]').forEach(b => { const i = Number(b.dataset.step); b.removeAttribute('aria-current'); if (i === state.step) b.setAttribute('aria-current', 'step'); b.classList.toggle('is-done', i < state.step); });
  $('#step-4-name').textContent = isPergola() ? 'Sides' : 'Doors & windows';
  $('#panel-count').textContent = `Step ${state.step + 1} of 6`;
  $('#panel-title').textContent = copy[state.step][0];
  $('#panel-intro').textContent = copy[state.step][1];
  $$('[data-panel]').forEach(p => { p.hidden = Number(p.dataset.panel) !== state.step; });
  if (state.step < 5) { const p = $(`[data-panel="${state.step}"]`); p.innerHTML = RENDERERS[state.step](); paint(p); }
  else renderQuote();
  $('#stage-title').textContent = `Your Pecasa ${st.name}`;
  $('#stage-sub').textContent = `${metres(state.width)} × ${metres(state.depth)}, ${metres(plan(state).maxHeight)} high`;
  $('#stage-price').classList.toggle('is-unlocked', open);
  $('#stage-price-text').textContent = open ? (price.value === null ? 'Quoted: see published sizes' : `${pounds(price.value)} inc. VAT`) : 'See your price';
  $('#stage-price').querySelector('use').setAttribute('href', open ? '#i-check' : '#i-lock');
  $('#stage-usps').innerHTML = STEP_USPS[state.step].map(k => `<li>${icon(USP_ICON[k])}${esc(USPS[k].title)}</li>`).join('');
  $('#back').hidden = state.step === 0;
  const last = state.step === 5;
  $('#next-label').textContent = last ? (open ? 'Book a call' : 'Show my price') : NEXT_LABEL()[state.step];
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !future.length;
  $('#stage-poster').src = posterSrc(state.style, 960);
  $('#fallback-photo').src = posterSrc(state.style, 960);
  $('#fallback-photo').alt = `The Pecasa ${st.name}`;
  $('#scene').setAttribute('aria-label', `3D view of a Pecasa ${st.name}, ${state.width} by ${state.depth} metres${isPergola() ? '' : `, ${claddingName(state.cladding.main)} cladding, ${state.openings.length} doors and windows`}.`);
  if (scene) {
    try {
      scene.update(state);
      scene.select(ui.opening && state.step === 3 ? ['opening:' + ui.opening] : []);
    } catch (err) { console.error(err); }
  }
  if (changed) {
    const el = document.querySelector(`[data-key="${CSS.escape(changedKey(changed))}"]`);
    if (el && !reduced()) { el.classList.remove('is-changed'); void el.offsetWidth; el.classList.add('is-changed'); }
  }
  if (focusKey) document.querySelector(`[data-key="${CSS.escape(focusKey)}"] input`)?.focus({preventScroll: true});
  else if (focusSel) document.querySelector(focusSel)?.focus({preventScroll: true});
}
// The page's CSP forbids inline style attributes, so colours and positions are set through CSSOM.
function paint(root) {
  root.querySelectorAll('[data-c]').forEach(el => el.style.setProperty('--c', el.dataset.c));
  root.querySelectorAll('[data-box]').forEach(el => { const [l, w, h, b] = el.dataset.box.split(','); Object.assign(el.style, {left: l + '%', width: w + '%', height: h + '%', bottom: b + '%'}); });
}
function changedKey(key) {
  const map = {style: 'style:' + state.style, use: 'use:' + state.use, trim: 'trim:' + state.trim, frame: 'frames:' + state.frames, floor: 'floor:' + state.floor, interior: 'interior:' + state.interior, layout: 'layout:' + state.layout, lighting: 'lighting:' + state.lighting, exteriorLight: 'exteriorLight:' + state.exteriorLight};
  return map[key] || key;
}

function fillHidden() {
  const s = summary(state), price = s.price;
  const values = {
    'design-link': s.designLink, 'design-summary': s.rows.map(x => `${x.section} | ${x.label}: ${x.value} (${x.status})`).join('\n'),
    style: STYLES[state.style].name, size: s.size, height: s.height, 'published-price': price.value === null ? 'Quoted' : String(price.value),
    'price-source': price.label, 'selected-upgrades': s.upgrades.join('; '), ...attributionFields(attribution)
  };
  for (const form of document.forms) for (const [name, value] of Object.entries(values)) { const el = form.elements.namedItem(name); if (el && !(el instanceof RadioNodeList)) el.value = value; }
}

// ---- Steps and navigation ------------------------------------------------------------------
function selectStep(i, {focusHeading = true} = {}) {
  beginInteraction();
  state.step = Math.max(0, Math.min(5, i));
  ui.adding = null;
  if (state.step !== 3) ui.opening = null;
  render();
  persist();
  scene?.setDimensions(state.step === 1);
  if (scene) {
    if (state.step === 0 || state.step === 5) scene.focus({tags: [], whole: true, highlight: false});
    if (state.step === 1) scene.focus({tags: [], whole: true, highlight: false, dir: [-.5, .55, 1]});
    if (state.step === 2) scene.focus({tags: [], whole: true, highlight: false, dir: [-.62, .3, 1]});
    if (state.step === 3) scene.focus(isPergola() ? {tags: [], whole: true, highlight: false} : focusFor('wall', {wall: ui.wall, highlight: false}));
    if (state.step === 4 && !isPergola()) scene.setView('inside');
  }
  if (focusHeading) { $('#panel-title').focus({preventScroll: true}); $('#panel-body').scrollTop = 0; if (stacked()) $('#panel').scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'}); }
  track('configurator_step_view', {step: state.step + 1, step_name: STEPS[state.step]});
  if (state.step === 5) { track('configurator_quote_view', {style: state.style}); captureThumb(); }
}
function captureThumb() {
  if (!scene) return;
  requestAnimationFrame(() => {
    const shots = scene.capture(['hero'], {width: 480, height: 320});
    if (shots.hero) { lastCapture = shots.hero; const img = $('#summary-shot'); if (img) img.src = lastCapture; }
  });
}
function goToQuote(placement) {
  track('configurator_quote_cta', {placement});
  selectStep(5);
  if (!unlocked()) setTimeout(() => $('#q-first').focus(), reduced() ? 0 : 350);
}

// ---- Panel events ------------------------------------------------------------------------
const panel = $('#panel-body');
panel.addEventListener('change', e => {
  const el = e.target, name = el.name, v = el.value;
  if (el.dataset.field) return onOpeningField(el);
  if (el.dataset.range) return;
  if (name === 'style') return change({__style: v}, {key: 'style', label: `${STYLES[v].name}: its standard size, finishes and glazing`});
  if (name === 'use') return change({use: v}, {key: 'use', label: `Furnished as a ${USES[v].name.toLowerCase()}`});
  if (name === 'roofType') return change({roofType: v}, {key: 'roof', label: v === 'pitched' ? 'Pitched roof' : v === 'flat' ? 'Flat roof' : 'Standard roof'});
  if (name === 'roofFinish') return change({roofFinish: v}, {key: 'roof', label: `${ROOF_FINISHES[v].name} roof`});
  if (name === 'sedum') return change({sedum: el.checked}, {key: 'roof', label: el.checked ? 'Green roof added' : 'Green roof removed'});
  if (name === 'rooflight') return change({rooflight: v}, {key: 'rooflight', label: ROOFLIGHTS[v].name});
  if (name === 'rooflightCount') return change({rooflightCount: Number(v)}, {key: 'rooflight', label: `${v} rooflight${v === '1' ? '' : 's'}`});
  if (name === 'addition') return change({addition: v}, {key: v === 'none' ? 'style' : 'addition', label: v === 'none' ? 'Addition removed' : ADDITIONS[v].name + ' added'});
  if (name === 'pergolaRoof') return change({pergolaRoof: v}, {key: 'pergola', focus: {tag: 'blades'}, label: PERGOLA_ROOFS[v].name});
  if (name === 'pergolaFrame') return change({pergolaFrame: v}, {key: 'pergola', focus: {tag: 'frame'}, label: `${PERGOLA_COLOURS[v].name} frame`});
  if (name === 'pergolaBlades') return change({pergolaBlades: v}, {key: 'pergola', focus: {tag: 'blades', dir: [-.4, 1.2, .8]}, label: `${PERGOLA_COLOURS[v].name} blades`});
  if (name === 'pergolaSide') { const side = el.dataset.side; return change({pergolaSides: {...state.pergolaSides, [side]: v}}, {key: 'pergola', focus: {tag: 'pergola:' + side, dir: {front: [0, .3, 1], back: [0, .3, -1], left: [-1, .3, 0], right: [1, .3, 0]}[side]}, label: `${side[0].toUpperCase() + side.slice(1)} side: ${PERGOLA_SIDES[v].name}`}); }
  if (name === 'panelColour') return change({panelColour: v}, {key: 'pergola', focus: {tag: 'pergolaSide'}, label: `${PANEL_COLOURS[v].name} panels`});
  if (name === 'windscreenColour') return change({windscreenColour: v}, {key: 'pergola', focus: {tag: 'pergolaSide'}, label: `${WINDSCREEN_COLOURS[v].name} windscreen`});
  if (name === 'cladding') { const role = claddingRoles(state.style).includes(ui.cladRole) ? ui.cladRole : 'main'; return change({cladding: {...state.cladding, [role]: v}}, {key: 'cladding', focus: {role}, label: `${ROLE_NAMES[role]}: ${claddingName(v)}`}); }
  if (name === 'trim') return change({trim: v}, {key: 'trim', label: `${ralName(v)} flashing`});
  if (name === 'cornerTrims') return change({cornerTrims: el.checked}, {key: 'cornerTrims', label: el.checked ? 'Corner trims added' : 'Corner trims removed'});
  if (name === 'frames') return change({frames: v}, {key: 'frame', label: `${ralName(v)} frames`});
  if (name === 'exteriorLight') return change({exteriorLight: v}, {key: 'exteriorLight', label: EXTERIOR_LIGHTS[v].name});
  if (name === 'deck') return change({deck: v}, {key: v === 'none' ? 'style' : 'deck', label: DECKS[v]?.name || 'Decking'});
  if (name === 'deckFinish') return change({deckFinish: v}, {key: 'deck', label: DECK_FINISHES[v].name});
  if (name === 'blinds') return change({blinds: v}, {key: 'blinds', label: v === 'none' ? 'Blinds removed' : `${BLINDS[v].name} blinds`});
  if (name === 'interior') return change({interior: v}, {key: 'interior', label: `${INTERIORS[v].name} walls`});
  if (name === 'floor') return change({floor: v}, {key: 'floor', label: `${FLOORS[v].name} floor`});
  if (name === 'layout') return change({layout: v}, {key: 'layout', label: LAYOUTS[v].name});
  if (name === 'kitchen') return change({kitchen: v}, {key: 'kitchen', label: v === 'none' ? 'Kitchen removed' : 'Kitchenette added'});
  if (name === 'kitchenFinish') return change({kitchenFinish: v}, {key: 'kitchen', label: `${CABINETS[v].name} units`});
  if (name === 'worktop') return change({worktop: v}, {key: 'worktop', label: `${WORKTOPS[v].name} worktop`});
  if (name === 'handles') return change({handles: v}, {key: 'kitchen', label: `${HANDLES[v].name} handles`});
  if (name === 'lighting') return change({lighting: v}, {key: 'lighting', label: INTERIOR_LIGHTS[v].name});
  if (Object.prototype.hasOwnProperty.call(ELECTRICS, name)) {
    const outside = name === 'extSocket' || name === 'airCon';
    const key = name === 'wallHeater' || name === 'airCon' ? 'heating' : 'electrics';
    const tag = {tvSocket: 'tv', dataPoint: 'data', dimmer: 'switches', smokeAlarm: 'smokeAlarm', doubleSockets: 'sockets'}[name];
    return change({electrics: {...state.electrics, [name]: el.checked}}, {key, focus: {outside, tag}, label: `${ELECTRICS[name].name}${el.checked ? ' added' : ' removed'}`});
  }
});
panel.addEventListener('input', e => {
  const el = e.target;
  if (el.type === 'range' && el.dataset.field) return onOpeningField(el, true);
  if (el.dataset.range) {
    // Size sliders: the label follows the thumb; the 3D rebuilds when the thumb is released.
    const dim = el.dataset.range, list = sizesFor(state.style)[dim + 's'], v = list[Number(el.value)];
    $(`#${dim}-out`).textContent = metres(v); el.setAttribute('aria-valuetext', metres(v));
  }
});
panel.addEventListener('change', e => {
  const el = e.target;
  if (!el.dataset.range) return;
  const dim = el.dataset.range, list = sizesFor(state.style)[dim + 's'], v = list[Number(el.value)];
  change({[dim]: v}, {key: dim === 'height' ? 'height' : 'size', label: `${dim[0].toUpperCase() + dim.slice(1)} ${metres(v)}`});
  $(`#${dim}-range`)?.focus({preventScroll: true});
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-priced]');
  if (!b) return;
  const [w, d, h] = b.dataset.priced.split('x').map(Number);
  change({width: w, depth: d, height: h}, {key: 'size', label: `${metres(w)} × ${metres(d)}, a size with a published price`});
  track('configurator_priced_size', {style: state.style, width: w, depth: d});
});
panel.addEventListener('click', e => {
  const b = e.target.closest('button, [data-open]');
  if (!b || b.dataset.priced) return;
  if (b.dataset.size) {
    const dim = b.dataset.size, list = sizesFor(state.style)[dim + 's'];
    const i = list.findIndex(v => Math.abs(v - state[dim]) < 1e-6);
    const next = list[Math.max(0, Math.min(list.length - 1, i + Number(b.dataset.dir)))];
    return change({[dim]: next}, {key: dim === 'height' ? 'height' : 'size', label: `${dim[0].toUpperCase() + dim.slice(1)} ${metres(next)}`});
  }
  if (b.dataset.role) { ui.cladRole = b.dataset.role; render(); scene?.focus(focusFor('cladding', {role: ui.cladRole})); $(`[data-role="${ui.cladRole}"]`)?.focus(); return; }
  if (b.dataset.wall) { ui.wall = b.dataset.wall; ui.opening = null; ui.adding = null; render(); scene?.focus(focusFor('wall', {wall: ui.wall})); $(`[data-wall="${ui.wall}"]`)?.focus(); return; }
  if (b.dataset.open) {
    ui.opening = ui.opening === b.dataset.open ? null : b.dataset.open; ui.adding = null; render();
    const o = state.openings.find(x => x.id === b.dataset.open);
    if (o && ui.opening) scene?.focus(focusFor('opening', {id: o.id, wall: o.wall}));
    document.querySelector(`.opening-row[data-open="${b.dataset.open}"]`)?.focus();
    return;
  }
  if (b.dataset.adding) { ui.adding = b.dataset.adding; render(); panel.querySelector('[data-add]:not(:disabled)')?.focus(); return; }
  if (b.hasAttribute('data-add-cancel')) { ui.adding = null; render(); return; }
  if (b.dataset.add) {
    const res = addOpening(state, ui.wall, b.dataset.add);
    ui.adding = null;
    if (!res.id) { ui.notice = `There is no room for a ${OPENINGS[b.dataset.add].name} on the ${wallLabel(ui.wall).toLowerCase()}. Try a smaller one, or another wall.`; render(); return; }
    ui.opening = res.id;
    change({openings: res.state.openings}, {key: 'opening', focus: {id: res.id, wall: ui.wall}, label: `${OPENINGS[b.dataset.add].name} added to the ${wallLabel(ui.wall).toLowerCase()}`});
    return;
  }
  if (b.dataset.remove) {
    const o = state.openings.find(x => x.id === b.dataset.remove);
    ui.opening = null;
    change({openings: state.openings.filter(x => x.id !== b.dataset.remove)}, {key: 'wall', focus: {wall: o.wall, highlight: true}, label: `${OPENINGS[o.type].name} removed. Undo is on the 3D view.`});
    return;
  }
  if (b.dataset.nudge) {
    const o = state.openings.find(x => x.id === b.dataset.id), L = plan(state).walls.find(w => w.id === o.wall).len;
    const p = Math.max(0, Math.min(1, o.p + Number(b.dataset.nudge) * .1 / L));
    return change({openings: state.openings.map(x => x.id === o.id ? {...x, p} : x)}, {key: 'opening', focus: {id: o.id, wall: o.wall}});
  }
  if (b.hasAttribute('data-undo-notice')) { $('#undo').click(); return; }
  if (b.dataset.action === 'dusk') { setNight(true); }
});
let drag = null;
function onOpeningField(el, live = false) {
  const id = el.dataset.id, o = state.openings.find(x => x.id === id);
  if (!o) return;
  const field = el.dataset.field;
  if (field === 'p') {
    const value = Number(el.value) / 1000;
    if (!drag || drag.id !== id) drag = {id, before: clone(state)};
    const res = apply(state, {openings: state.openings.map(x => x.id === id ? {...x, p: value} : x)});
    state = {...res.state, step: state.step};
    scene?.update(state); scene?.select(['opening:' + id]);
    const moved = state.openings.find(x => x.id === id), L = plan(state).walls.find(w => w.id === o.wall).len;
    const label = el.closest('.opening-edit')?.querySelector(`label[for="pos-${id}"]`);
    if (label && moved) label.textContent = `Position: ${(moved.p * L - moved.w / 2).toFixed(2)}m from the left corner`;
    if (!live) {
      undoStack.push(drag.before); future = []; drag = null;
      persist(); render({keepFocus: true});
      scene?.focus({...focusFor('opening', {id, wall: o.wall}), highlight: false});
      track('configurator_option_change', {option: 'opening-position', style: state.style, step: 4});
    }
    return;
  }
  if (field === 'type') {
    const spec = OPENINGS[el.value];
    return change({openings: state.openings.map(x => x.id === id ? {...x, type: el.value, w: spec.w, h: spec.h, sill: spec.sill, glass: spec.obscure ? 'obscure' : x.glass} : x)}, {key: 'opening', focus: {id, wall: o.wall}, label: `${spec.name} on the ${wallLabel(o.wall).toLowerCase()}`});
  }
  change({openings: state.openings.map(x => x.id === id ? {...x, glass: el.value} : x)}, {key: 'opening', focus: {id, wall: o.wall}, label: `${el.value === 'obscure' ? 'Obscure' : 'Clear'} glass`});
}

// ---- Stage controls -----------------------------------------------------------------------
function setView(v) {
  ui.view = v;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#stage-hint').textContent = v === 'inside' ? 'Drag to look around the room. Use + and - to zoom.' : v === 'plan' ? 'Seen from above, roof off, with dimensions. Drag to move, scroll or pinch to zoom.' : 'Drag to look around. Scroll or pinch to zoom.';
  $('#stage-hint').classList.remove('is-faded');
  clearTimeout(setView.t); setView.t = setTimeout(() => $('#stage-hint').classList.add('is-faded'), 4000);
  scene?.setDimensions(v === 'plan' || state.step === 1);
}
function setNight(on) {
  night = on; scene?.setNight(on);
  $('#dusk').setAttribute('aria-pressed', String(on));
  $('#dusk').setAttribute('aria-label', on ? 'Show it in daylight' : 'Show it at dusk');
  $('#dusk use').setAttribute('href', on ? '#i-sun' : '#i-moon');
  track('configurator_dusk', {on});
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => { scene?.setView(b.dataset.view); setView(b.dataset.view); track('configurator_view_change', {view: b.dataset.view}); }));
$('#zoom-in').addEventListener('click', () => { scene?.zoom(1); track('configurator_zoom', {direction: 'in'}); });
$('#zoom-out').addEventListener('click', () => { scene?.zoom(-1); track('configurator_zoom', {direction: 'out'}); });
$('#reset-view').addEventListener('click', () => { scene?.setView('outside'); setView('outside'); });
$('#dusk').addEventListener('click', () => setNight(!night));
$('#fullscreen').addEventListener('click', () => { const s = $('#stage'); if (document.fullscreenElement) document.exitFullscreen(); else s.requestFullscreen?.().catch(() => {}); track('configurator_fullscreen'); });
$('#undo').addEventListener('click', () => { if (!undoStack.length) return; future.push(clone(state)); const step = state.step; state = {...undoStack.pop(), step}; ui.notice = null; render(); persist(); toast('Undone'); track('configurator_undo'); });
$('#redo').addEventListener('click', () => { if (!future.length) return; undoStack.push(clone(state)); const step = state.step; state = {...future.pop(), step}; render(); persist(); toast('Redone'); track('configurator_redo'); });
$('#stage-price').addEventListener('click', () => goToQuote('stage'));
$$('#steps [data-step]').forEach(b => b.addEventListener('click', () => selectStep(Number(b.dataset.step))));
$('#back').addEventListener('click', () => selectStep(state.step - 1));
$('#next').addEventListener('click', () => {
  if (state.step < 5) return selectStep(state.step + 1);
  if (unlocked()) { openDialog('book', $('#next')); return; }
  $('#quote-form').requestSubmit();
});
document.addEventListener('click', e => {
  const goto = e.target.closest('[data-goto]'); if (goto) selectStep(Number(goto.dataset.goto));
  const cta = e.target.closest('[data-cta]'); if (cta) track('cta_click', {cta: cta.dataset.cta, step: state.step + 1});
  const dlg = e.target.closest('[data-dialog]'); if (dlg) openDialog(dlg.dataset.dialog, dlg);
  const close = e.target.closest('[data-close]'); if (close) close.closest('dialog')?.close();
  if (e.target.closest('#resend')) resend();
});

// ---- Dialogs ------------------------------------------------------------------------------
function openDialog(name, from) {
  const d = $('#dlg-' + name);
  if (!d) return;
  $('#menu-sheet').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
  fillHidden();
  if (name === 'share') { $('#share-link').value = shareURL(state, location.origin + '/configurator/'); $('#share-status').hidden = true; }
  if (name === 'book') {
    // The earliest day is tomorrow; Sundays are closed.
    const t = new Date(Date.now() + 864e5); if (t.getDay() === 0) t.setDate(t.getDate() + 1);
    $('#bk-date').min = t.toISOString().slice(0, 10);
  }
  // Details already given in this session fill the next form.
  if (contact) for (const [n, v] of Object.entries({'first-name': contact.first, 'last-name': contact.last, email: contact.email, phone: contact.phone, postcode: contact.postcode})) { const el = d.querySelector(`[name="${n}"]`); if (el && !el.value) el.value = v; }
  d.querySelector('.dialog-done') && (d.querySelector('.dialog-done').hidden = true);
  d.querySelector('form') && (d.querySelector('form').hidden = false);
  d.showModal();
  d.querySelector('input:not([type=hidden]):not([tabindex="-1"]), select, button')?.focus();
  d.addEventListener('close', () => from?.isConnected && from.focus({preventScroll: true}), {once: true});
  track('cta_click', {cta: name, step: state.step + 1});
  track('dialog_open', {dialog: name});
}
shimDialogs();
$$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
$('#menu-toggle').addEventListener('click', () => { const open = $('#menu-sheet').hidden; $('#menu-sheet').hidden = !open; $('#menu-toggle').setAttribute('aria-expanded', String(open)); track('menu_toggle', {open}); });
$('#share-copy').addEventListener('click', async () => {
  const link = $('#share-link').value; const status = $('#share-status');
  try { await navigator.clipboard.writeText(link); status.textContent = 'Link copied. Paste it anywhere to open this exact design.'; }
  catch { $('#share-link').select(); status.textContent = 'Select the link above and copy it.'; }
  status.hidden = false; track('configurator_share');
});
$('#new-design').addEventListener('click', () => { undoStack.push(clone(state)); future = []; state = normalise({}); render(); persist(); $('#dlg-share').close(); toast('A fresh design. Undo brings your last one back.'); track('configurator_new_design'); });
$('#tour-open').addEventListener('click', e => { tour.start(e.currentTarget); track('cta_click', {cta: 'help'}); });
$('#menu-tour').addEventListener('click', () => {
  $('#menu-sheet').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
  tour.start($('#menu-toggle'));
});

// ---- Forms --------------------------------------------------------------------------------
function fieldError(input, message) {
  const err = input.closest('.field')?.querySelector('.field-error');
  input.setAttribute('aria-invalid', String(Boolean(message)));
  input.classList.toggle('is-valid', !message && Boolean(input.value.trim()));
  if (err) { err.hidden = !message; err.textContent = message || ''; }
  return !message;
}
function check(input) {
  const v = input.value.trim(), name = input.name;
  if (input.closest('[hidden]')) return true;
  if (!input.required && !v) return fieldError(input, '');
  if (name === 'first-name' || name === 'last-name') return fieldError(input, !v ? `Enter your ${name === 'first-name' ? 'first' : 'last'} name.` : /^[\p{L}][\p{L}' .-]*$/u.test(v) ? '' : 'Use letters only, please.');
  if (name === 'email') return fieldError(input, validEmail(v) ? '' : 'Enter an email address like name@example.co.uk.');
  if (name === 'phone') return fieldError(input, phoneProblem(v));
  if (name === 'postcode') return fieldError(input, validPostcode(v) ? '' : 'Enter a UK postcode, such as WD24 4PT.');
  if (name === 'call-date') { const d = new Date(v + 'T12:00:00'); return fieldError(input, !v ? 'Choose a day.' : d.getDay() === 0 ? 'Pecasa is closed on Sundays. Choose another day.' : v < input.min ? 'Choose a day from tomorrow.' : ''); }
  if (name === 'call-time') return fieldError(input, v ? '' : 'Choose a time.');
  return fieldError(input, '');
}
const checked = form => [...form.querySelectorAll('input[required], select[required], input[name=postcode]')];
for (const form of document.forms) {
  form.addEventListener('focusout', e => {
    const input = e.target;
    if (!input.matches?.('input[required], select[required], input[name=postcode]')) return;
    if (input.name === 'phone') { const p = parseUKPhone(input.value); if (p.valid) input.value = p.display; }
    if (input.name === 'postcode' && validPostcode(input.value)) input.value = formatPostcode(input.value);
    if (input.value || input.getAttribute('aria-invalid') === 'true') check(input);
  });
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
  form.addEventListener('submit', submit);
}
let formViewed = false, formStarted = false;
$('#quote-form').addEventListener('focusin', () => { if (!formViewed) { formViewed = true; track('configurator_form_view', {style: state.style}); } });
$('#quote-form').addEventListener('input', () => { if (!formStarted) { formStarted = true; track('configurator_form_start', {style: state.style}); } });

async function post(form) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const body = new URLSearchParams(new FormData(form)).toString();
    const res = await fetch('/configurator/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body, signal: controller.signal});
    if (!res.ok) throw new Error('Not saved');
  } finally { clearTimeout(timer); }
}
async function submit(e) {
  e.preventDefault();
  const form = e.currentTarget, kind = form.dataset.kind || 'quote';
  if (form.dataset.busy) return;
  fillHidden();
  const bad = checked(form).filter(i => !check(i));
  const status = form.querySelector('.form-status');
  track(kind === 'quote' ? 'configurator_submit_attempt' : `${kind}_attempt`, {style: state.style});
  if (bad.length) { bad[0].focus(); status.hidden = false; status.classList.remove('ok'); status.textContent = bad.length === 1 ? 'Please check the highlighted field.' : `Please check the ${bad.length} highlighted fields.`; track('configurator_form_error', {form: kind, field: bad[0].name}); return; }
  status.hidden = true;
  const phone = parseUKPhone(form.elements.phone.value);
  form.elements['phone-e164'].value = phone.e164;
  form.elements.phone.value = phone.display;
  const button = form.querySelector('[type=submit]'); button.classList.add('is-busy'); form.dataset.busy = '1';
  const sending = clone(state);
  try {
    await post(form);
    const first = form.elements['first-name'].value.trim();
    contact = {first, last: form.elements['last-name'].value.trim(), email: form.elements.email.value.trim(), phone: phone.display, postcode: formatPostcode(form.elements.postcode.value)};
    try { sessionStorage.setItem(RECEIPT, JSON.stringify(contact)); } catch {}
    if (kind === 'quote') {
      sentKey = specKey(sending);
      try { sessionStorage.setItem(RECEIPT + '-sent', sentKey); } catch {}
      render();
      $('#quote-unlocked').scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'});
      const price = priceFor(sending);
      toast(price.value === null ? 'Your design is with Pecasa. This size is priced in your quote.' : `Your price: ${pounds(price.value)} including VAT`);
      const lead = {lead_type: 'pecasa_design_quote', style: sending.style, value: price.value, currency: 'GBP', price_source: price.source || 'quoted'};
      track('configurator_enquiry_saved', lead); track('generate_lead', lead);
    } else {
      const done = form.closest('dialog').querySelector('.dialog-done');
      form.hidden = true; done.hidden = false;
      const copy = {
        callback: `Thanks, ${first}. Pecasa will call you on ${phone.display}, with your design in front of them.`,
        book: `Thanks, ${first}. Pecasa will confirm your call for ${new Date(form.elements['call-date'].value + 'T12:00:00').toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'})}, ${form.elements['call-time'].value}, on ${phone.display}.`,
        visit: `Thanks, ${first}. Pecasa will call or email to arrange your showroom visit in Watford.`,
        brochure: `Thanks, ${first}. The brochure is opening in a new tab.`
      }[kind];
      done.querySelector('.done-copy').textContent = copy;
      done.querySelector('h2').focus();
      if (kind === 'brochure') window.open(CONTACT.brochure, '_blank', 'noopener');
      track('generate_lead', {lead_type: `pecasa_${kind}`, style: sending.style});
      if (unlocked()) render();
    }
  } catch {
    status.hidden = false; status.classList.remove('ok');
    status.textContent = 'That did not send. Your design is safe: please try again, or call Pecasa on 020 8146 2200.';
    track('configurator_submit_error', {form: kind});
  } finally { button.classList.remove('is-busy'); delete form.dataset.busy; }
}
// After the price is shown, a changed design goes back to Pecasa with the same details.
async function resend() {
  const form = $('#quote-form');
  fillHidden();
  for (const [n, v] of Object.entries({'first-name': contact.first, 'last-name': contact.last, email: contact.email, phone: contact.phone, postcode: contact.postcode})) form.elements[n].value = v;
  form.elements['phone-e164'].value = parseUKPhone(contact.phone).e164 || '';
  const button = $('#resend'); if (button) button.disabled = true;
  try {
    await post(form);
    sentKey = specKey(state);
    try { sessionStorage.setItem(RECEIPT + '-sent', sentKey); } catch {}
    toast('Your updated design is with Pecasa.');
    track('configurator_quote_updated', {style: state.style});
    render();
  } catch { toast('That did not send. Please try again, or call 020 8146 2200.'); if (button) button.disabled = false; }
}

// ---- PDF ----------------------------------------------------------------------------------
$('#pdf-download').addEventListener('click', async () => {
  const status = $('#pdf-status');
  track('cta_click', {cta: 'download-pdf', step: state.step + 1});
  if (!unlocked()) { status.textContent = 'Enter your details above to unlock your price and PDF.'; $('#q-first').focus(); track('configurator_pdf_locked'); return; }
  const button = $('#pdf-download'); button.disabled = true;
  status.textContent = 'Drawing your design views and building your PDF. This takes a few seconds.';
  try {
    const views = scene ? scene.capture(['hero', 'front', 'right', 'back', 'left', 'interior', 'interior2', 'plan', 'dusk'], {width: 1800, height: 1125}) : {};
    const mod = await import(/*PDF*/'/assets/js/configurator-pdf.js');
    await mod.downloadPDF(state, views, {contactName: contact?.first || ''});
    status.textContent = 'Your PDF has downloaded: your design from every side, inside and in plan, your specification and price, and how to book your call.';
    track('configurator_design_download', {style: state.style, format: 'pdf'});
  } catch (err) {
    console.error(err);
    status.textContent = 'The PDF could not be made on this device. Your design link has been copied instead; call 020 8146 2200 and Pecasa will help.';
    try { await navigator.clipboard.writeText(shareURL(state, location.origin + '/configurator/')); } catch {}
  } finally { button.disabled = false; }
});

// ---- Start --------------------------------------------------------------------------------
const loadedFrom = restore();
try { contact = JSON.parse(sessionStorage.getItem(RECEIPT) || 'null'); sentKey = sessionStorage.getItem(RECEIPT + '-sent'); } catch {}
render();
persist();
setView('outside');
track('configurator_view', {style: state.style, resumed: Boolean(loadedFrom)});
track('configurator_step_view', {step: state.step + 1, step_name: STEPS[state.step]});
if (loadedFrom === 'link') toast('This shared design is ready to make your own.');
else if (loadedFrom === 'device') toast('Welcome back. Your design is as you left it.');
if (params.has('book')) setTimeout(() => openDialog('book', null), 300);
window.addEventListener('pagehide', e => { if (!e.persisted) scene?.dispose(); });

// ---- 3D ------------------------------------------------------------------------------------
// configurator-boot.js (from the SMART configurator) runs the preview: it picks the renderer and
// tier, retries, steps down, guards against crash loops and keeps the diagnostics.
const FALLBACK_TEXT = {
  context: "The 3D view couldn't start this time. Your design is saved, so loading it again is safe.",
  setup: "The 3D view couldn't start this time. Your design is saved, so loading it again is safe.",
  load: "The 3D view didn't download. Check your connection and load it again; your design is saved.",
  build: "The 3D view couldn't draw this design. Your choices and price still work, and Pecasa sees every detail."
};
const TIER_PARAM = QA && params.get('tier');
function preferredRung() {
  const memory = navigator.deviceMemory || 8;
  if (memory <= 2) return 'low';
  const coarse = matchMedia('(pointer: coarse)').matches;
  return coarse || memory <= 4 || Math.min(screen.width, screen.height) < 700 ? 'medium' : 'high';
}
function pickPart(hit) {
  if (hit.kind === 'opening') {
    const o = state.openings.find(x => x.id === hit.id); if (!o) return;
    ui.wall = o.wall; ui.opening = o.id; ui.adding = null;
    if (state.step !== 3) selectStep(3, {focusHeading: false}); else render();
    scene?.focus(focusFor('opening', {id: o.id, wall: o.wall}));
    document.querySelector(`.opening-row[data-open="${o.id}"]`)?.scrollIntoView({block: 'nearest', behavior: reduced() ? 'auto' : 'smooth'});
    track('configurator_3d_pick', {part: 'opening'});
  } else {
    const step = {roof: 1, deck: 2, fins: 2, cladding: 2, floor: 4, heating: 4, kitchen: 4, layout: 4, furniture: 0, pergolaSide: 3}[hit.part];
    if (step !== undefined && step !== state.step) { selectStep(step, {focusHeading: false}); toast('Showing the options for what you tapped'); track('configurator_3d_pick', {part: hit.part}); }
  }
}
const storage = name => { try { return window[name]; } catch { return null; } };
let sceneError = null, firstScene = true;
const boot = createBoot({
  container: $('#scene'),
  load: level => (level === 1 ? import(/*SCENE_GL1*/'/assets/js/scene-gl1.js') : import(/*SCENE*/'/assets/js/scene.js')),
  design: () => state,
  preferred: preferredRung(),
  override: RUNGS.includes(TIER_PARAM) ? TIER_PARAM : null,
  session: storage('sessionStorage'),
  local: storage('localStorage'),
  track,
  sceneOptions: {onViewChange: v => setView(v), onPick: pickPart},
  onChange(phase, detail) {
    if (phase === 'loading' || phase === 'down') {
      scene = null;
      if (!firstScene) $('#stage-loader-text').textContent = 'Reloading the 3D view';
      $('#stage-loader').hidden = false;
    } else if (phase === 'ready') sceneReady(detail);
    else if (phase === 'failed') sceneFailed3d(detail.reason, detail.error);
    debug3d();
  }
});

function sceneReady(next) {
  scene = next;
  scene.setDimensions(state.step === 1 || ui.view === 'plan');
  scene.select(ui.opening && state.step === 3 ? ['opening:' + ui.opening] : []);
  const view = firstScene ? (state.step === 4 && !isPergola() ? 'inside' : 'outside') : ui.view;
  if (view && view !== 'outside') scene.setView(view, {animate: firstScene});
  $('#stage-loader').hidden = true;
  $('#stage-fallback').hidden = true;
  $('#stage-poster').hidden = true;
  $('#stage-start').hidden = true;
  $$('.view-switch, .stage-tools, .history, #stage-hint').forEach(el => { el.hidden = false; });
  if (boot.rung === 'svg') toast('Showing a simplified 3D view on this device. Every choice and your price work as normal.');
  if (!firstScene) return;
  firstScene = false;
  if (!tour.seen() && !QA) setTimeout(() => tour.start(), 400);
  else setTimeout(() => $('#stage-hint').classList.add('is-faded'), 4000);
}

function sceneFailed3d(reason, err) {
  if (err) console.error(err);
  scene = null;
  $('#stage-loader').hidden = true; $('#stage-fallback').hidden = false; $('#stage-poster').hidden = true; $('#stage-start').hidden = true;
  $('#fallback-caption').textContent = FALLBACK_TEXT[reason] || FALLBACK_TEXT.context;
  $('#fallback-retry').hidden = false;
  $$('.view-switch, .stage-tools, .history, #stage-hint').forEach(el => { el.hidden = true; });
  $('#stage').dataset.fallback = reason;
  sceneError = err ? String(err) : reason;
  track('configurator_3d_fallback', {reason, webgl: boot.gl, error: err ? String(err).slice(0, 120) : undefined});
  if (firstScene && !tour.seen() && !QA) setTimeout(() => tour.start(), 400);
  firstScene = false;
}

// ?debug3d on any device shows what the 3D is running on and every step it took, with Copy
// report, so a phone that misbehaves can say why without a cable and a desktop inspector.
function debug3d() {
  if (!DEBUG3D) return;
  let box = $('#debug3d');
  if (!box) {
    box = document.createElement('aside'); box.id = 'debug3d'; box.className = 'debug3d';
    box.innerHTML = '<pre></pre><button type="button" class="button ghost small">Copy report</button>';
    document.body.append(box);
    box.querySelector('button').addEventListener('click', () => navigator.clipboard?.writeText(box.querySelector('pre').textContent).catch(() => {}));
  }
  const d = boot.diagnostics(), s = d.scene || {};
  const fallback = $('#stage').dataset.fallback;
  box.querySelector('pre').textContent = [
    `3D: ${fallback ? 'photo (' + fallback + ')' : (d.rung || '-') + (d.verified ? '' : ' (starting)')} | WebGL ${d.gl}`,
    `GPU: ${s.gpu || '-'}`,
    `ratio ${s.ratio ?? '-'} | buffer ${s.buffer ? s.buffer.join('x') : '-'} | antialias ${s.context?.antialias ?? '-'} | max texture ${s.maxTexture ?? '-'}`,
    `extensions: ${s.extensions?.join(', ') || '-'}`,
    `textures ${s.textures?.textures ?? '-'} (scale ${s.textures?.scale ?? '-'}, flat ${s.textures?.failures ?? 0}) | frames ${s.frames ?? '-'}`,
    `first frame: ${s.samples?.length ? JSON.stringify(s.samples[0]) : '-'} | gl errors ${s.glErrors?.join(',') || '-'}`,
    `shader errors: ${s.shaderErrors?.join(' || ') || '-'}`,
    `error: ${sceneError || s.lastError || '-'}`,
    'steps:',
    ...d.log.map(e => `  +${e.t}ms ${e.rung || '-'} ${e.event}${e.detail ? ': ' + e.detail : ''}`),
    `screen ${screen.width}x${screen.height} @${devicePixelRatio} | memory ${navigator.deviceMemory || '?'}GB`,
    navigator.userAgent
  ].join('\n');
}

$('#fallback-retry').addEventListener('click', () => {
  track('configurator_3d_retry', {reason: $('#stage').dataset.fallback});
  persist();
  location.reload();
});

// QA hook for headless checks: ?qa=1 exposes the live scene, the design and the boot's report.
if (QA) {
  window.__cfg = {
    get scene() { return scene; }, get state() { return state; },
    get rung() { return boot.rung; }, get boot() { return boot.diagnostics(); },
    get attempt() { return Math.max(0, boot.diagnostics().log.filter(e => e.event === 'ready').length - 1); },
    get fallback() { return $('#stage').dataset.fallback || null; },
    change: (patch, key, focus) => change(patch, {key, focus}), set: s => { state = normalise({...s, step: state.step}); render(); },
    step: i => selectStep(i, {focusHeading: false}), normalise
  };
}

// The 3D is the heaviest part of the page (Three.js, generated textures), so it starts when it is
// needed: on the shopper's first touch, click, key or scroll, or once the page has loaded and
// been idle for a moment. Until then the stage shows a render of the chosen style, which is also
// the page's largest image. ?qa and ?debug3d start it at once.
let booted = false;
function start3d(why) {
  if (booted) return;
  booted = true;
  for (const type of WAKE) removeEventListener(type, wake, true);
  track('configurator_3d_start', {trigger: why});
  $('#stage-start').hidden = true;
  boot.start();
}
const WAKE = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
const wake = e => start3d(e.type);
$('#stage-start').addEventListener('click', () => start3d('button'));
if (QA || DEBUG3D) start3d('qa');
else {
  for (const type of WAKE) addEventListener(type, wake, {capture: true, passive: true});
  const idle = () => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => start3d('idle'), {timeout: 1500});
  const later = () => setTimeout(idle, IDLE_START_MS);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, {once: true});
}
