// SMART garden room designer: page controller. Pure design rules live in configurator-model.js;
// the 3D scene and the PDF are loaded on demand.
import {shimDialogs} from './configurator-compat.js';
import {createBoot, RUNGS} from './configurator-boot.js';
import {
  RANGES, ROOFS, FRAMES, OPENINGS, WALLS, USES, FLOORS, INTERIORS, DECKS, DECK_FINISHES, BLINDS,
  INTERIOR_LIGHTS, EXTERIOR_LIGHTS, HEATING, LAYOUTS, BASES, ELECTRICS, STEPS, normalise, apply,
  switchRange, addOpening, priceFor, pounds, metres, feet, sizesFor, wallLength, shareURL, fromURL,
  summary, specRows, upgradesOf, claddingOf, claddingName, openingLabel, parseUKPhone, phoneProblem,
  validPostcode, formatPostcode, validEmail
} from './configurator-model.js';
import {RANGE_ORDER, CANOPY_STEPS, USPS, CONTACT} from './configurator-data.js';
import {captureAttribution, attributionFields} from './configurator-attribution.js';
import {createTour} from './configurator-tour.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const tick = `<span class="tick">${icon('check')}</span>`;
const track = (event, values = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({event, ...values}); };
const clone = v => JSON.parse(JSON.stringify(v));
const STORAGE = 'pecasa-room-design-v1';
const QA = new URLSearchParams(location.search).has('qa');
// Read at load: the address is rewritten to the design link once the page starts.
const DEBUG3D = new URLSearchParams(location.search).has('debug3d');
const RECEIPT = 'pecasa-quote-receipt-v1';
// How long after load the 3D starts by itself when the shopper has not touched the page yet.
const IDLE_START_MS = 2500;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const stacked = () => matchMedia('(max-width: 860px)').matches;

let attributionStore; try { attributionStore = sessionStorage; } catch {}
const attribution = captureAttribution({url: location.href, referrer: document.referrer, storage: attributionStore});

let state = normalise({});
let undoStack = [], future = [];
let scene = null, sceneFailed = false, night = false;
let ui = {wall: 'front', opening: null, adding: null, notice: null, view: 'outside'};
let receipt = null, started = false, lastCapture = null;
const tour = createTour({onEvent: track});

// ---- Persistence ------------------------------------------------------------------------
function restore() {
  const linked = fromURL(location.href);
  if (linked) { state = linked; return 'link'; }
  try { const raw = localStorage.getItem(STORAGE); if (raw) { state = normalise(JSON.parse(raw)); return 'device'; } } catch {}
  return null;
}
function persist() {
  const url = new URL(shareURL(state, location.origin + '/configurator/'));
  url.searchParams.set('s', String(state.step));
  window.history.replaceState(null, '', url);
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
}
const specKey = s => JSON.stringify({...normalise(s), step: 0, openings: normalise(s).openings.map(o => [o.wall, o.type, o.p, o.glass])});
const unlocked = () => receipt !== null && receipt === specKey(state);

// ---- Change handling ---------------------------------------------------------------------
const WALL_DIR = {front: [-.28, .2, 1], back: [.28, .22, -1], left: [-1, .22, .28], right: [1, .22, .28]};
function focusFor(key, extra = {}) {
  const s = state;
  switch (key) {
    case 'range': return {tags: [], whole: true, highlight: false};
    case 'use': return {tags: ['furniture'], view: 'inside'};
    case 'size': return {tags: [], whole: true, highlight: false};
    case 'roof': return {tags: ['roof'], dir: [-.55, .95, .95], whole: true};
    case 'base': return {tags: ['base'], dir: [-.75, .12, 1], whole: true};
    case 'cladding': return {tags: ['cladding', 'trims'], dir: [-.62, .28, 1], whole: true};
    case 'frame': return {tags: ['frames'], dir: [-.2, .18, 1], whole: true};
    case 'exteriorLight': return {tags: ['exteriorLights'], dir: [-.25, .2, 1], pad: .9};
    case 'canopy:left': return {tags: ['canopy:left'], dir: [-1, .38, .75], pad: .6};
    case 'canopy:right': return {tags: ['canopy:right'], dir: [1, .38, .75], pad: .6};
    case 'canopy:front': return {tags: ['canopy:front'], dir: [-.3, .35, 1], pad: .6};
    case 'deck': return {tags: ['deck'], dir: [-.35, .55, 1], pad: .6};
    case 'wall': return {tags: ['wall:' + extra.wall], dir: WALL_DIR[extra.wall], pad: .4, highlight: extra.highlight};
    case 'opening': return {tags: ['opening:' + extra.id], dir: WALL_DIR[extra.wall], pad: 1.3, minDistance: 4.2};
    case 'blinds': return {tags: ['blinds'], dir: [-.2, .15, 1], whole: true};
    case 'floor': return {tags: ['floor'], view: 'inside', lookDown: true};
    case 'underfloor': return {tags: ['floor', 'heating'], view: 'inside', lookDown: true};
    case 'interior': return {tags: ['interiorWalls'], view: 'inside'};
    case 'heating': return {tags: ['heating'], view: s.heating === 'climate' ? 'outside' : 'inside', dir: [.4, .5, -1], whole: true};
    case 'lighting': return {tags: ['lighting'], view: 'inside'};
    case 'electrics': return extra.outside ? {tags: ['externalSocket'], dir: [-.2, .15, 1], pad: 1} : {tags: ['electrics'], view: 'inside'};
    case 'layout': return {tags: ['layout'], view: 'plan'};
    default: return null;
  }
}

function change(patch, {key, label, focus = {}} = {}) {
  beginInteraction();
  const result = patch.__range ? {state: switchRange(state, patch.__range), changes: []} : apply(state, patch);
  const next = {...result.state, step: state.step};
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  undoStack.push(clone(state)); if (undoStack.length > 60) undoStack.shift(); future = [];
  state = next;
  ui.notice = result.changes.length ? describeChanges(result.changes) : null;
  if (ui.opening && !state.openings.some(o => o.id === ui.opening)) ui.opening = null;
  render({keepFocus: true, changed: key});
  persist();
  const spec = key && focusFor(key, focus);
  if (spec && scene) scene.focus(spec);
  if (label) toast(label);
  track('configurator_option_change', {option: key || Object.keys(patch).join(','), range: state.range, step: state.step + 1});
}

function describeChanges(changes) {
  return changes.map(c => c.kind === 'removed'
    ? `There was no room for the ${OPENINGS[c.type].name.toLowerCase()} on the ${WALLS[c.wall].toLowerCase()}, so it was removed.`
    : `The ${OPENINGS[c.from].name.toLowerCase()} on the ${WALLS[c.wall].toLowerCase()} became a ${OPENINGS[c.to].name.toLowerCase()} to fit.`).join(' ');
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
  track('configurator_start', {range: state.range});
}

// ---- Rendering ---------------------------------------------------------------------------
const STEP_COPY = [
  ['Choose your range', 'Six ranges, all built from the same insulated SMART panels.'],
  ['Size, roof and base', 'Every published SMART size, with the roof that suits your garden.'],
  ['Make the outside yours', 'Cladding, frames, lights, canopies and decking.'],
  ['Doors and windows', 'Place them on any wall. Standard uPVC glazing is unlimited.'],
  ['Make the inside yours', 'Floors, walls, heating, lighting, power and layout.'],
  ['Your SMART room', 'Your design, its building price and your next steps.']
];
const NEXT_LABEL = ['Next: size & roof', 'Next: exterior', 'Next: doors & windows', 'Next: interior', 'See your price'];
const STEP_USPS = [['warranty', 'since', 'reviews'], ['planning', 'build', 'consult'], ['insulated', 'warranty', 'priceMatch'], ['glazing', 'build', 'warranty'], ['electrics', 'insulated', 'reviews'], ['consult', 'warranty', 'reviews']];
const USP_ICON = {warranty: 'shield', build: 'clock', planning: 'check', glazing: 'window', electrics: 'check', insulated: 'house', reviews: 'star', since: 'check', consult: 'calendar', priceMatch: 'check'};

const radio = (name, value, checked, body, {cls = '', disabled = false, label = ''} = {}) =>
  `<label class="opt ${cls}" data-key="${name}:${value}"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${label ? `aria-label="${esc(label)}"` : ''}><span>${body}</span></label>`;
const swatch = (name, value, checked, hex, label, pattern = '') =>
  `<label class="swatch" data-key="${name}:${value}"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span><i class="${pattern}" data-c="${hex}"></i><small>${esc(label)}</small></span></label>`;
const toggle = (name, checked, title, sub, {disabled = false, badge = ''} = {}) =>
  `<label class="switch" data-key="${name}"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="track"></span><span class="opt-text"><strong>${esc(title)} ${badge}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
const badge = status => status === 'upgrade' ? '<span class="badge upgrade">Upgrade</span>' : status === 'quoted' ? '<span class="badge quoted">Quoted</span>' : '<span class="badge included">Included</span>';
const section = (title, note, body, cls = '') => `<section class="section ${cls}"><div class="section-head"><h3>${title}</h3>${note ? `<small>${note}</small>` : ''}</div>${body}</section>`;
const usp = key => `<div class="usp">${icon(USP_ICON[key] || 'check')}<div><strong>${esc(USPS[key].title)}</strong><span>${esc(USPS[key].copy)}</span></div></div>`;

function renderRange() {
  const r = RANGES[state.range];
  return section('What is it for?', 'Sets the furniture shown', `<div class="choices two">${Object.entries(USES).map(([k, u]) => radio('use', k, state.use === k, `<span class="icon">${icon(u.icon)}</span><span class="opt-text"><strong>${esc(u.name)}</strong></span>${tick}`)).join('')}</div>`) +
    section('Choose your range', 'Tap to see it in 3D', `<div class="choices">${RANGE_ORDER.map(k => {
      const x = RANGES[k];
      return radio('range', k, state.range === k, `<img src="/assets/img/range-${k}-480.avif" width="112" height="80" alt="" loading="lazy"><span class="opt-text"><strong>${esc(x.name)}</strong><small>${esc(x.tag)}</small><span class="tags">${x.highlights.map(h => `<span>${esc(h)}</span>`).join('')}</span></span>${tick}`, {cls: 'range-card', label: `${x.name}: ${x.tag}`});
    }).join('')}</div><p class="section-note">${esc(r.name)}: ${esc(r.description)}</p>`) +
    `<div class="usp-row">${usp('warranty')}${usp('since')}</div>`;
}

const PRESETS = {office: [[3.1, 2.5, 'A focused office'], [4.4, 3.1, 'Office with a meeting corner'], [5.6, 3.7, 'Room for two to work']], gym: [[3.7, 2.5, 'Compact home gym'], [4.4, 3.1, 'Space for a routine'], [5.6, 3.7, 'Room for equipment and floor work']], studio: [[3.1, 2.5, 'A corner for creating'], [4.4, 3.1, 'Space to spread out'], [5.6, 3.7, 'Make, store and display']], retreat: [[3.7, 2.5, 'A quiet garden corner'], [4.4, 3.1, 'Room to relax together'], [6.2, 3.7, 'Space for everyone']]};
function renderSize() {
  const r = RANGES[state.range], {widths, depths} = sizesFor(state.range);
  const presets = PRESETS[state.use].filter(([w, d]) => widths.includes(w) && depths.includes(d));
  const step = (dim, list, value) => {
    const i = list.indexOf(value);
    return `<div><label id="${dim}-label">${dim === 'width' ? 'Width (front)' : 'Depth (side)'}</label><div class="row"><button type="button" data-size="${dim}" data-dir="-1" aria-label="Smaller ${dim}" ${i <= 0 ? 'disabled' : ''}>${icon('minus')}</button><output aria-labelledby="${dim}-label" aria-live="polite">${metres(value)}</output><button type="button" data-size="${dim}" data-dir="1" aria-label="Larger ${dim}" ${i >= list.length - 1 ? 'disabled' : ''}>${icon('plus')}</button></div><small>About ${feet(value)}</small></div>`;
  };
  const price = priceFor(state);
  return section('Popular sizes', 'External sizes', `<div class="choices">${presets.map(([w, d, name]) => radio('preset', `${w}x${d}`, state.width === w && state.depth === d, `<span class="opt-text"><strong>${esc(name)}</strong><small>${metres(w)} &times; ${metres(d)} (${(w * d).toFixed(1)}m&sup2;)</small></span>${tick}`)).join('')}</div>`) +
    section('Or set your exact size', `${widths.length} widths, ${depths.length} depths`, `<div class="stepper">${step('width', widths, state.width)}${step('depth', depths, state.depth)}</div><div class="area"><span>External footprint</span><strong>${(state.width * state.depth).toFixed(1)}m&sup2;</strong></div>${price === null ? '<p class="section-note">This size is priced on application: SMART will quote it after your consultation.</p>' : ''}${state.range === 'affinity' ? '<p class="section-note">Affinity is also made 4.5m deep; ask your specialist for that size.</p>' : ''}`) +
    section('Roof', 'Heights are external', `<div class="choices">${r.roofs.map(k => { const x = ROOFS[k]; return radio('roof', k, state.roof === k, `<span class="opt-text"><strong>${esc(x.name)} ${k === r.standardRoof ? badge('included') : badge('upgrade')}</strong><small>${esc(x.copy)} ${(x.heightMm / 1000).toFixed(3)}m high, ${x.planning ? 'planning friendly' : 'may need planning permission'}.</small></span>${tick}`); }).join('')}</div>`) +
    section('Base', 'Quoted for your garden', `<div class="choices">${Object.entries(BASES).map(([k, b]) => radio('base', k, state.base === k, `<span class="opt-text"><strong>${esc(b.name)}</strong><small>${k === 'screws' ? 'Fitted a day or two before installation, with no concrete.' : 'Your specialist checks it is level and the right size.'}</small></span>${tick}`)).join('')}</div>`) +
    usp('planning');
}

function renderExterior() {
  const r = RANGES[state.range];
  const pattern = r.orientation === 'horizontal' ? 'boards-h' : 'boards-v';
  const canopy = side => {
    const key = side === 'left' ? 'wallLeft' : 'wallRight';
    return `<div class="canopy"><p class="section-note"><strong>${side === 'left' ? 'Left' : 'Right'} side</strong> as you face the room</p><div class="segmented" role="radiogroup" aria-label="${side} canopy">${CANOPY_STEPS.map((v, i) => `<label data-key="canopy-${side}:${i}"><input type="radio" name="canopy-${side}" value="${i}" ${state.canopy[side] === i ? 'checked' : ''}><span>${i ? v.toFixed(2) + 'm' : 'None'}</span></label>`).join('')}</div>${state.canopy[side] ? toggle('canopy-wall-' + side, state.canopy[key], 'Add a side wall', 'Clad to match, for shelter and privacy') : ''}</div>`;
  };
  return section('Cladding', esc(r.material), `<div class="swatches">${r.claddings.map(c => swatch('cladding', c.key, state.cladding === c.key, c.hex, c.name, pattern)).join('')}</div><p class="section-note">${r.claddings.length > 1 ? 'Colours on screen are a guide. Your specialist brings samples to your consultation.' : `${esc(r.name)} is clad in ${esc(r.material.toLowerCase())}${r.kind === 'thermowood' || r.kind === 'larch' || r.kind === 'hardwood' ? ', which weathers naturally to a soft silver over time' : ''}.`}</p>`) +
    section('Window and door frames', 'Standard uPVC colours', `<div class="swatches small">${Object.entries(FRAMES).map(([k, f]) => swatch('frame', k, state.frame === k, f.hex, f.name)).join('')}</div><p class="section-note">Black and grey are the most chosen. Aluminium bi-folds and 4m sliders come in black or grey.</p>`) +
    section('Outside lights', 'Included', `<div class="choices two">${Object.entries(EXTERIOR_LIGHTS).map(([k, l]) => radio('exteriorLight', k, state.exteriorLight === k, `<span class="opt-text"><strong>${esc(l.name)}</strong></span>${tick}`)).join('')}</div><button type="button" class="text-button" data-action="dusk">${icon('moon')}<span>See them at dusk</span></button>`) +
    section(`Canopies ${badge('upgrade')}`, 'Covered space beside your room', `${canopy('left')}${canopy('right')}${state.range === 'suffolk-barn' ? toggle('canopy-front', state.canopy.front, 'Front canopy over the entrance', state.roof === 'cantilever' ? 'Included with the cantilevered roof' : '1.2m deep, on posts, with decking', {disabled: state.roof === 'cantilever'}) : ''}<p class="section-note">Canopies come with decking underneath and a downlight.</p>`) +
    section(`Decking ${badge('upgrade')}`, 'Fitted with your room', `<div class="segmented" role="radiogroup" aria-label="Decking">${Object.entries(DECKS).map(([k, x]) => `<label data-key="deck:${k}"><input type="radio" name="deck" value="${k}" ${state.deck === k ? 'checked' : ''}><span>${k === 'none' ? 'None' : k === 'frame' ? '0.9m' : '1.5m'}</span></label>`).join('')}</div>${state.deck !== 'none' || state.canopy.left || state.canopy.right || state.canopy.front ? `<div class="swatches small spaced">${Object.entries(DECK_FINISHES).map(([k, f]) => swatch('deckFinish', k, state.deckFinish === k, f.hex, f.name, 'boards-h')).join('')}</div>` : ''}`) +
    usp('insulated');
}

function renderOpenings() {
  const wall = ui.wall, L = wallLength(state, wall);
  const list = state.openings.filter(o => o.wall === wall);
  const count = w => state.openings.filter(o => o.wall === w).length;
  const tabs = `<div class="wall-tabs" role="tablist" aria-label="Wall">${Object.entries(WALLS).map(([k, name]) => `<button type="button" role="tab" data-wall="${k}" aria-selected="${k === wall}"><span>${esc(name.replace(' side', ''))}</span><small>${count(k)} ${count(k) === 1 ? 'item' : 'items'}</small></button>`).join('')}</div>`;
  const diagram = `<div class="wall-diagram" aria-hidden="true"><span class="len">${metres(L)}</span>${list.map(o => { const s = OPENINGS[o.type]; const left = (o.p * L - s.w / 2) / L * 100, width = s.w / L * 100, height = (s.sill + s.h) / 2.2 * 100, bottom = s.sill / 2.2 * 100; return `<span class="seg ${s.group === 'door' ? 'is-door' : ''} ${o.id === ui.opening ? 'is-active' : ''}" data-open="${o.id}" data-box="${left.toFixed(2)},${width.toFixed(2)},${(height - bottom).toFixed(2)},${bottom.toFixed(2)}"></span>`; }).join('')}</div>`;
  const options = group => Object.entries(OPENINGS).filter(([, s]) => s.group === group);
  const editor = o => {
    const s = OPENINGS[o.type], pos = o.p * L;
    return `<div class="opening-edit"><div><label class="lead" for="type-${o.id}">Type</label><select id="type-${o.id}" data-field="type" data-id="${o.id}">${['door', 'window'].map(g => `<optgroup label="${g === 'door' ? 'Doors' : 'Windows'}">${options(g).map(([k, x]) => `<option value="${k}" ${k === o.type ? 'selected' : ''} ${x.w > L - .4 ? 'disabled' : ''}>${esc(x.name)} (${(x.w * 1000).toFixed(0)}mm)${x.status === 'upgrade' ? ' - upgrade' : ''}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div><label class="lead" for="pos-${o.id}">Position: ${(pos - s.w / 2).toFixed(2)}m from the left corner</label><div class="slide"><button type="button" data-nudge="-1" data-id="${o.id}" aria-label="Move left">${icon('back')}</button><input id="pos-${o.id}" type="range" min="0" max="1000" step="5" value="${Math.round(o.p * 1000)}" data-field="p" data-id="${o.id}"><button type="button" data-nudge="1" data-id="${o.id}" aria-label="Move right">${icon('arrow')}</button></div></div>
      ${s.solid || s.hidden ? '' : `<div class="segmented" role="radiogroup" aria-label="Glass">${['clear', 'obscure'].map(g => `<label><input type="radio" name="glass-${o.id}" value="${g}" data-field="glass" data-id="${o.id}" ${o.glass === g ? 'checked' : ''}><span>${g === 'clear' ? 'Clear glass' : 'Obscure glass'}</span></label>`).join('')}</div>`}
      <div class="opening-actions"><button type="button" class="button ghost small" data-remove="${o.id}">${icon('trash')}<span>Remove</span></button></div></div>`;
  };
  const rows = list.length ? list.map(o => {
    const s = OPENINGS[o.type], active = o.id === ui.opening;
    return `<div class="opening ${active ? 'is-active' : ''}"><button type="button" class="opening-row" data-open="${o.id}" aria-expanded="${active}"><span class="icon">${icon(s.group === 'door' ? 'door' : 'window')}</span><span class="opt-text"><strong>${esc(s.name)} ${s.status === 'upgrade' ? badge('upgrade') : ''}</strong><small>${(s.w * 1000).toFixed(0)} &times; ${(s.h * 1000).toFixed(0)}mm${s.note ? ', ' + esc(s.note) : ''}${o.glass === 'obscure' ? ', obscure glass' : ''}</small></span>${icon(active ? 'minus' : 'plus')}</button>${active ? editor(o) : ''}</div>`;
  }).join('') : `<p class="section-note">No doors or windows on this wall yet.</p>`;
  const picker = ui.adding ? `<div class="choices spaced">${options(ui.adding).map(([k, x]) => `<button type="button" class="opt" data-add="${k}" ${x.w > L - .4 ? 'disabled' : ''}><span><span class="icon">${icon(x.group === 'door' ? 'door' : 'window')}</span><span class="opt-text"><strong>${esc(x.name)} ${x.status === 'upgrade' ? badge('upgrade') : ''}</strong><small>${(x.w * 1000).toFixed(0)} &times; ${(x.h * 1000).toFixed(0)}mm${x.note ? ', ' + esc(x.note) : ''}</small></span></span></button>`).join('')}<button type="button" class="text-button" data-add-cancel>Cancel</button></div>` : `<div class="add-row" role="group" aria-label="Add to this wall"><button type="button" class="button ghost" data-adding="window" aria-label="Add a window">${icon('plus')}<span>Window</span></button><button type="button" class="button ghost" data-adding="door" aria-label="Add a door">${icon('plus')}<span>Door</span></button></div>`;
  const notice = ui.notice ? `<p class="notice" role="status">${icon('info')}<span>${esc(ui.notice)}</span><button type="button" data-undo-notice>Undo</button></p>` : '';
  const blindsType = state.blinds === 'none' ? 'none' : state.blinds.split('-')[0];
  return section('Choose a wall', 'Left and right as you face the room', `${tabs}${diagram}<div class="opening-list">${rows}</div>${notice}${picker}<p class="section-note">Tip: tap any door or window in the 3D view to edit it.</p>`) +
    section(`Blinds ${state.blinds !== 'none' ? badge('upgrade') : ''}`, 'Aluminium venetian', `<div class="segmented" role="radiogroup" aria-label="Blinds">${[['none', 'None'], ['clip', 'Clip-in'], ['int', 'Integral']].map(([k, n]) => `<label data-key="blinds-type:${k}"><input type="radio" name="blinds-type" value="${k}" ${blindsType === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>${blindsType !== 'none' ? `<div class="swatches small spaced">${['white', 'black', 'anthracite'].map(c => swatch('blinds', `${blindsType}-${c}`, state.blinds === `${blindsType}-${c}`, BLINDS[`${blindsType}-${c}`].hex, c[0].toUpperCase() + c.slice(1))).join('')}</div>` : ''}`) +
    section('Mirror the layout', '', `<button type="button" class="button ghost wide" data-action="mirror">${icon('mirror')}<span>Flip doors, windows and canopies</span></button>`) +
    usp('glazing');
}

function renderInterior() {
  const groups = ['Laminate', 'Luxury vinyl', 'Carpet'];
  const floors = groups.map(g => `<p class="section-note"><strong>${g}</strong>${g === 'Carpet' && state.underfloor ? ' (not with underfloor heating)' : ''}</p><div class="swatches small">${Object.entries(FLOORS).filter(([, f]) => f.group === g).map(([k, f]) => swatch('floor', k, state.floor === k, f.hex, f.name, f.kind === 'plank' ? 'planks' : '')).join('')}</div>`).join('');
  const sizeOK = k => { const m = LAYOUTS[k].min; return !m || (state.width >= m[0] && state.depth >= m[1]); };
  return section('Flooring', 'All included', floors) +
    section('Walls', 'Wipe-clean MDF panels', `<div class="choices">${Object.entries(INTERIORS).map(([k, x]) => radio('interior', k, state.interior === k, `<span class="opt-text"><strong>${esc(x.name)} ${badge(x.status)}</strong></span>${tick}`)).join('')}</div>`) +
    section('Heating', '', `<div class="choices">${Object.entries(HEATING).map(([k, h]) => radio('heating', k, state.heating === k, `<span class="opt-text"><strong>${esc(h.name)} ${badge(h.status)}</strong><small>${k === 'radiator' ? 'Wall-mounted, with a thermostat.' : 'Heats in winter and cools in summer.'}</small></span>${tick}`)).join('')}</div>${toggle('underfloor', state.underfloor, 'Underfloor heating', 'Fitted under laminate or vinyl', {badge: badge('upgrade')})}`) +
    section('Lighting', 'Included', `<div class="choices">${Object.entries(INTERIOR_LIGHTS).map(([k, l]) => radio('lighting', k, state.lighting === k, `<span class="opt-text"><strong>${esc(l.name)}</strong></span>${tick}`)).join('')}</div>`) +
    section('Power and data', 'Sockets and switches are unlimited', `${toggle('usb', state.electrics.usb, ELECTRICS.usb, 'Charge without adaptors')}${toggle('external', state.electrics.external, ELECTRICS.external, 'For the garden and the mower')}${toggle('dimmer', state.electrics.dimmer, ELECTRICS.dimmer, '')}${toggle('internet', state.electrics.internet, ELECTRICS.internet, 'A wired data point for reliable calls', {badge: badge('upgrade')})}${toggle('mains', state.electrics.mains, ELECTRICS.mains, 'Your specialist quotes the cable run from your house', {badge: badge('quoted')})}`) +
    section('Layout', '', `<div class="choices">${Object.entries(LAYOUTS).map(([k, x]) => radio('layout', k, state.layout === k, `<span class="opt-text"><strong>${esc(x.name)} ${badge(x.status)}</strong>${!sizeOK(k) ? `<small>Needs at least ${metres(x.min[0])} &times; ${metres(x.min[1])}</small>` : ''}</span>${tick}`, {disabled: !sizeOK(k)})).join('')}</div>`) +
    `<div class="usp-row">${usp('electrics')}${usp('insulated')}</div>`;
}

function renderQuote() {
  const r = RANGES[state.range], price = priceFor(state), open = unlocked();
  $('#quote-summary').innerHTML = `<img id="summary-shot" src="${lastCapture || `/assets/img/range-${state.range}-480.avif`}" alt="" width="120" height="80"><div><strong>${esc(r.name)}</strong><span>${metres(state.width)} &times; ${metres(state.depth)}, ${esc(USES[state.use].name.toLowerCase())}, ${esc(claddingName(state))}</span></div>`;
  $('#quote-locked').hidden = open; $('#quote-unlocked').hidden = !open;
  if (open) {
    $('#price-value').textContent = pounds(price);
    $('#price-for').textContent = `${r.name}, ${metres(state.width)} × ${metres(state.depth)}`;
  }
  $('#pdf-note').textContent = open ? 'Your design, views and specification' : 'Unlocks with your price';
  const rows = specRows(state);
  const sections = [...new Set(rows.map(x => x.section))];
  const stepOf = {Building: 1, Exterior: 2, 'Doors and windows': 3, Interior: 4, Site: 1};
  $('#quote-spec').innerHTML = `<h3>Your specification</h3>` + sections.map(sec => `<h3>${esc(sec)} <button type="button" class="spec-edit" data-goto="${stepOf[sec] ?? 0}">Edit</button></h3><dl>${rows.filter(x => x.section === sec).map(x => `<div class="spec-row"><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd><dd class="spec-status">${badge(x.status)}</dd></div>`).join('')}</dl>`).join('') +
    `<p class="section-note">Included items are part of SMART's published building price. Upgrades and quoted items are priced by SMART after your free site consultation.</p>`;
  $('#quote-proof').innerHTML = ['reviews', 'warranty', 'priceMatch', 'consult', 'since'].map(k => `<li>${icon(USP_ICON[k])}<span><strong>${esc(USPS[k].title)}</strong>${esc(USPS[k].copy)}</span></li>`).join('');
  fillHidden();
}

const RENDERERS = [renderRange, renderSize, renderExterior, renderOpenings, renderInterior];
function render({keepFocus = false, changed = null} = {}) {
  const focusKey = keepFocus ? document.activeElement?.closest('[data-key]')?.dataset.key || null : null;
  const focusSel = keepFocus && !focusKey && document.activeElement?.id ? '#' + document.activeElement.id : null;
  const r = RANGES[state.range], price = priceFor(state), open = unlocked();
  $$('#steps [data-step]').forEach(b => { const i = Number(b.dataset.step); b.toggleAttribute('aria-current', i === state.step); if (i === state.step) b.setAttribute('aria-current', 'step'); b.classList.toggle('is-done', i < state.step); });
  $('#panel-count').textContent = `Step ${state.step + 1} of 6`;
  $('#panel-title').textContent = STEP_COPY[state.step][0];
  $('#panel-intro').textContent = STEP_COPY[state.step][1];
  $$('[data-panel]').forEach(p => { p.hidden = Number(p.dataset.panel) !== state.step; });
  if (state.step < 5) { const p = $(`[data-panel="${state.step}"]`); p.innerHTML = RENDERERS[state.step](); paint(p); }
  else renderQuote();
  $('#stage-title').textContent = `Your ${r.name}`;
  $('#stage-sub').textContent = `${metres(state.width)} × ${metres(state.depth)}, ${ROOFS[state.roof].short.toLowerCase()} roof`;
  $('#stage-price').classList.toggle('is-unlocked', open);
  $('#stage-price-text').textContent = open ? `${pounds(price)}${price ? ' inc. VAT' : ''}` : 'Get your building price';
  $('#stage-price').querySelector('use').setAttribute('href', open ? '#i-check' : '#i-lock');
  $('#stage-usps').innerHTML = STEP_USPS[state.step].map(k => `<li>${icon(USP_ICON[k])}${esc(USPS[k].title)}</li>`).join('');
  $('#back').hidden = state.step === 0;
  const last = state.step === 5;
  $('#next-label').textContent = last ? (open ? 'Book a discovery call' : 'Show my price') : NEXT_LABEL[state.step];
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !future.length;
  $('#fallback-photo').src = `/assets/img/range-${state.range}-960.webp`;
  $('#fallback-photo').alt = `A real SMART ${r.name}`;
  $('#scene').setAttribute('aria-label', `3D view of a SMART ${r.name}, ${state.width} by ${state.depth} metres, ${claddingName(state)} cladding, ${state.openings.length} doors and windows.`);
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
  const map = {cladding: 'cladding:' + state.cladding, frame: 'frame:' + state.frame, roof: 'roof:' + state.roof, base: 'base:' + state.base, use: 'use:' + state.use, range: 'range:' + state.range, floor: 'floor:' + state.floor, interior: 'interior:' + state.interior, heating: 'heating:' + state.heating, lighting: 'lighting:' + state.lighting, layout: 'layout:' + state.layout, exteriorLight: 'exteriorLight:' + state.exteriorLight, deck: 'deck:' + state.deck};
  return map[key] || key;
}

function fillHidden() {
  const s = summary(state), price = priceFor(state), r = RANGES[state.range];
  const values = {
    'design-link': s.designLink, 'building-price': price === null ? 'Price on application' : String(price), 'building-range': r.name,
    'room-use': USES[state.use].name, 'room-width': String(state.width), 'room-depth': String(state.depth), roof: s.roof, cladding: s.cladding,
    frames: s.frame, 'doors-windows': state.openings.map(o => `${WALLS[o.wall]}: ${openingLabel(o)}`).join('; '), interior: `${INTERIORS[state.interior].name}; ${FLOORS[state.floor].group} ${FLOORS[state.floor].name.toLowerCase()}`,
    'selected-upgrades': upgradesOf(state).join('; '), 'design-summary': s.rows.map(x => `${x.section} | ${x.label}: ${x.value} (${x.status})`).join('\n'),
    'preferred-range': r.name, ...attributionFields(attribution)
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
    if (state.step === 0 || state.step === 2 || state.step === 5) scene.focus({tags: [], whole: true, highlight: false, dir: state.step === 2 ? [-.62, .3, 1] : undefined});
    if (state.step === 1) scene.focus({tags: [], whole: true, highlight: false, dir: [-.5, .55, 1]});
    if (state.step === 3) scene.focus(focusFor('wall', {wall: ui.wall, highlight: false}));
    if (state.step === 4) scene.setView('inside');
  }
  if (focusHeading) { $('#panel-title').focus({preventScroll: true}); $('#panel-body').scrollTop = 0; if (stacked()) $('#panel').scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'}); }
  track('configurator_step_view', {step: state.step + 1, step_name: STEPS[state.step]});
  if (state.step === 5) { track('configurator_quote_view', {range: state.range}); captureThumb(); }
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
  if (name === 'range') return change({__range: v}, {key: 'range', label: `${RANGES[v].name}: doors and windows set to its standard layout`});
  if (name === 'use') return change({use: v}, {key: 'use', label: `Furnished as a ${USES[v].name.toLowerCase()}`});
  if (name === 'preset') { const [w, d] = v.split('x').map(Number); return change({width: w, depth: d}, {key: 'size', label: `${metres(w)} × ${metres(d)}`}); }
  if (name === 'roof') return change({roof: v}, {key: 'roof', label: ROOFS[v].name});
  if (name === 'base') return change({base: v}, {key: 'base', label: BASES[v].name});
  if (name === 'cladding') return change({cladding: v}, {key: 'cladding', label: `${claddingName({...state, cladding: v})} cladding`});
  if (name === 'frame') return change({frame: v}, {key: 'frame', label: `${FRAMES[v].name} frames`});
  if (name === 'exteriorLight') return change({exteriorLight: v}, {key: 'exteriorLight', label: EXTERIOR_LIGHTS[v].name});
  if (name.startsWith('canopy-wall-')) { const side = name.slice(12); return change({canopy: {...state.canopy, [side === 'left' ? 'wallLeft' : 'wallRight']: el.checked}}, {key: 'canopy:' + side, label: el.checked ? 'Side wall added to the canopy' : 'Canopy side wall removed'}); }
  if (name === 'canopy-left' || name === 'canopy-right') {
    const side = name.slice(7), i = Number(v), key = side === 'left' ? 'wallLeft' : 'wallRight';
    // As in SMART's planner, a new canopy starts with its side wall.
    const wall = i === 0 ? false : state.canopy[side] === 0 ? true : state.canopy[key];
    return change({canopy: {...state.canopy, [side]: i, [key]: wall}}, {key: i ? 'canopy:' + side : 'cladding', label: i ? `${side === 'left' ? 'Left' : 'Right'} canopy ${CANOPY_STEPS[i].toFixed(2)}m` : 'Canopy removed'});
  }
  if (name === 'canopy-front') return change({canopy: {...state.canopy, front: el.checked}}, {key: el.checked ? 'canopy:front' : 'cladding', label: el.checked ? 'Front canopy added' : 'Front canopy removed'});
  if (name === 'deck') return change({deck: v}, {key: v === 'none' ? 'cladding' : 'deck', label: DECKS[v].name});
  if (name === 'deckFinish') return change({deckFinish: v}, {key: 'deck', label: DECK_FINISHES[v].name});
  if (name === 'blinds-type') return change({blinds: v === 'none' ? 'none' : `${v}-${state.blinds.split('-')[1] || 'white'}`}, {key: 'blinds', label: v === 'none' ? 'Blinds removed' : `${v === 'clip' ? 'Clip-in' : 'Integral'} blinds`});
  if (name === 'blinds') return change({blinds: v}, {key: 'blinds', label: `${BLINDS[v].name} blinds`});
  if (name === 'floor') return change({floor: v, underfloor: FLOORS[v].kind === 'carpet' ? false : state.underfloor}, {key: 'floor', label: `${FLOORS[v].group}, ${FLOORS[v].name.toLowerCase()}${FLOORS[v].kind === 'carpet' && state.underfloor ? '. Underfloor heating needs laminate or vinyl, so it was turned off' : ''}`});
  if (name === 'interior') return change({interior: v}, {key: 'interior', label: `${INTERIORS[v].name} walls`});
  if (name === 'heating') return change({heating: v}, {key: 'heating', label: HEATING[v].name});
  if (name === 'underfloor') return change({underfloor: el.checked}, {key: 'underfloor', label: el.checked ? `Underfloor heating${FLOORS[state.floor].kind === 'carpet' ? ', with light oak laminate' : ''}` : 'Underfloor heating removed'});
  if (name === 'lighting') return change({lighting: v}, {key: 'lighting', label: INTERIOR_LIGHTS[v].name});
  if (['usb', 'external', 'dimmer', 'internet', 'mains'].includes(name)) return change({electrics: {...state.electrics, [name]: el.checked}}, {key: 'electrics', focus: {outside: name === 'external'}, label: `${ELECTRICS[name]}${el.checked ? ' added' : ' removed'}`});
  if (name === 'layout') return change({layout: v}, {key: 'layout', label: LAYOUTS[v].name});
});
panel.addEventListener('input', e => { if (e.target.type === 'range' && e.target.dataset.field) onOpeningField(e.target, true); });
panel.addEventListener('click', e => {
  const b = e.target.closest('button, [data-open]');
  if (!b) return;
  if (b.dataset.size) {
    const {widths, depths} = sizesFor(state.range), dim = b.dataset.size, list = dim === 'width' ? widths : depths;
    const next = list[Math.max(0, Math.min(list.length - 1, list.indexOf(state[dim]) + Number(b.dataset.dir)))];
    return change({[dim]: next}, {key: 'size', label: `${dim === 'width' ? 'Width' : 'Depth'} ${metres(next)}`});
  }
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
    if (!res.id) { ui.notice = `There is no room for a ${OPENINGS[b.dataset.add].name.toLowerCase()} on the ${WALLS[ui.wall].toLowerCase()}. Try a smaller one, or another wall.`; render(); return; }
    ui.opening = res.id;
    change({openings: res.state.openings}, {key: 'opening', focus: {id: res.id, wall: ui.wall}, label: `${OPENINGS[b.dataset.add].name} added to the ${WALLS[ui.wall].toLowerCase()}`});
    return;
  }
  if (b.dataset.remove) {
    const o = state.openings.find(x => x.id === b.dataset.remove);
    ui.opening = null;
    change({openings: state.openings.filter(x => x.id !== b.dataset.remove)}, {key: 'wall', focus: {wall: o.wall, highlight: true}, label: `${OPENINGS[o.type].name} removed. Undo is at the bottom of the 3D view.`});
    return;
  }
  if (b.dataset.nudge) {
    const o = state.openings.find(x => x.id === b.dataset.id), L = wallLength(state, o.wall);
    const p = Math.max(0, Math.min(1, o.p + Number(b.dataset.nudge) * .1 / L));
    return change({openings: state.openings.map(x => x.id === o.id ? {...x, p} : x)}, {key: 'opening', focus: {id: o.id, wall: o.wall}});
  }
  if (b.hasAttribute('data-undo-notice')) { $('#undo').click(); return; }
  if (b.dataset.action === 'mirror') return mirror();
  if (b.dataset.action === 'dusk') { setNight(true); return; }
});
function onOpeningField(el, live = false) {
  const id = el.dataset.id, o = state.openings.find(x => x.id === id);
  if (!o) return;
  const field = el.dataset.field;
  const value = field === 'p' ? Number(el.value) / 1000 : el.value;
  const patch = {openings: state.openings.map(x => x.id === id ? {...x, [field]: value} : x)};
  const L = wallLength(state, o.wall);
  if (field === 'p') {
    // The slider moves the opening live; the whole drag becomes one undo step when released.
    if (!drag || drag.id !== id) drag = {id, before: clone(state)};
    const res = apply(state, patch);
    state = {...res.state, step: state.step};
    scene?.update(state); scene?.select(['opening:' + id]);
    const moved = state.openings.find(x => x.id === id);
    const label = el.closest('.opening-edit')?.querySelector(`label[for="pos-${id}"]`);
    if (label && moved) label.textContent = `Position: ${(moved.p * L - OPENINGS[moved.type].w / 2).toFixed(2)}m from the left corner`;
    if (!live) {
      undoStack.push(drag.before); future = []; drag = null;
      persist(); render({keepFocus: true});
      scene?.focus({...focusFor('opening', {id, wall: o.wall}), highlight: false});
      track('configurator_option_change', {option: 'opening-position', range: state.range, step: 4});
    }
    return;
  }
  change(patch, {key: 'opening', focus: {id, wall: o.wall}, label: field === 'type' ? `${OPENINGS[value].name} on the ${WALLS[o.wall].toLowerCase()}` : field === 'glass' ? `${value === 'obscure' ? 'Obscure' : 'Clear'} glass` : undefined});
}
let drag = null;
function mirror() {
  const flip = {left: 'right', right: 'left', front: 'front', back: 'back'};
  const openings = state.openings.map(o => ({...o, wall: flip[o.wall], p: 1 - o.p}));
  const c = state.canopy;
  change({openings, canopy: {...c, left: c.right, right: c.left, wallLeft: c.wallRight, wallRight: c.wallLeft}}, {key: 'cladding', label: 'Layout mirrored'});
}

// ---- Stage controls -----------------------------------------------------------------------
function setView(v) {
  ui.view = v;
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#stage-hint').textContent = v === 'inside' ? 'Drag to look around the room. Use + and - to zoom.' : v === 'plan' ? 'Seen from above, roof off. Drag to move, scroll to zoom.' : 'Drag to look around. Scroll or pinch to zoom.';
  $('#stage-hint').classList.remove('is-faded');
  clearTimeout(setView.t); setView.t = setTimeout(() => $('#stage-hint').classList.add('is-faded'), 4000);
}
function setNight(on) {
  night = on; scene?.setNight(on);
  $('#dusk').setAttribute('aria-pressed', String(on));
  $('#dusk').setAttribute('aria-label', on ? 'Show it in daylight' : 'Show it at dusk');
  $('#dusk use').setAttribute('href', on ? '#i-sun' : '#i-moon');
  track('configurator_dusk', {on});
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => { scene?.setView(b.dataset.view); setView(b.dataset.view); track('configurator_view_change', {view: b.dataset.view}); }));
$('#zoom-in').addEventListener('click', () => scene?.zoom(1));
$('#zoom-out').addEventListener('click', () => scene?.zoom(-1));
$('#reset-view').addEventListener('click', () => { scene?.setView('outside'); setView('outside'); });
$('#dusk').addEventListener('click', () => setNight(!night));
$('#fullscreen').addEventListener('click', () => { const s = $('#stage'); if (document.fullscreenElement) document.exitFullscreen(); else s.requestFullscreen?.().catch(() => {}); });
$('#undo').addEventListener('click', () => { if (!undoStack.length) return; future.push(clone(state)); const step = state.step; state = {...undoStack.pop(), step}; ui.notice = null; render(); persist(); toast('Undone'); track('configurator_undo'); });
$('#redo').addEventListener('click', () => { if (!future.length) return; undoStack.push(clone(state)); const step = state.step; state = {...future.pop(), step}; render(); persist(); toast('Redone'); track('configurator_redo'); });
$('#stage-price').addEventListener('click', () => goToQuote('stage'));
$$('#steps [data-step]').forEach(b => b.addEventListener('click', () => selectStep(Number(b.dataset.step))));
$('#back').addEventListener('click', () => selectStep(state.step - 1));
$('#next').addEventListener('click', () => {
  if (state.step < 5) return selectStep(state.step + 1);
  if (unlocked()) { window.open(CONTACT.booking, '_blank', 'noopener'); track('configurator_booking_click', {placement: 'footer'}); return; }
  $('#quote-form').requestSubmit();
});
document.addEventListener('click', e => {
  const goto = e.target.closest('[data-goto]'); if (goto) selectStep(Number(goto.dataset.goto));
  const cta = e.target.closest('[data-cta]'); if (cta) track('cta_click', {cta: cta.dataset.cta});
  const dlg = e.target.closest('[data-dialog]'); if (dlg) openDialog(dlg.dataset.dialog, dlg);
  const close = e.target.closest('[data-close]'); if (close) close.closest('dialog')?.close();
});

// ---- Dialogs ------------------------------------------------------------------------------
function openDialog(name, from) {
  const d = $('#dlg-' + name);
  if (!d) return;
  $('#menu-sheet').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
  fillHidden();
  if (name === 'share') { $('#share-link').value = shareURL(state, location.origin + '/configurator/'); $('#share-status').hidden = true; }
  d.querySelector('.dialog-done') && (d.querySelector('.dialog-done').hidden = true);
  d.querySelector('form') && (d.querySelector('form').hidden = false);
  d.showModal();
  d.querySelector('input:not([type=hidden]):not([tabindex="-1"]), button')?.focus();
  d.addEventListener('close', () => from?.isConnected && from.focus({preventScroll: true}), {once: true});
  track('cta_click', {cta: name, step: state.step + 1});
}
shimDialogs();
$$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
$('#menu-toggle').addEventListener('click', () => { const open = $('#menu-sheet').hidden; $('#menu-sheet').hidden = !open; $('#menu-toggle').setAttribute('aria-expanded', String(open)); });
$('#share-copy').addEventListener('click', async () => {
  const link = $('#share-link').value; const status = $('#share-status');
  try { await navigator.clipboard.writeText(link); status.textContent = 'Link copied. Paste it anywhere to open this exact design.'; }
  catch { $('#share-link').select(); status.textContent = 'Select the link above and copy it.'; }
  status.hidden = false; track('configurator_share');
});
$('#new-design').addEventListener('click', () => { undoStack.push(clone(state)); future = []; state = normalise({}); receipt = null; render(); persist(); $('#dlg-share').close(); toast('A fresh design. Undo brings your last one back.'); });
$('#br-printed').addEventListener('change', e => { $('#br-address-field').hidden = !e.target.checked; $('#br-address').required = e.target.checked; });
$('#tour-open').addEventListener('click', e => tour.start(e.currentTarget));
$('#menu-tour').addEventListener('click', () => {
  $('#menu-sheet').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false');
  tour.start($('#menu-toggle'));
});

// ---- Forms --------------------------------------------------------------------------------
function fieldError(input, message) {
  const err = input.closest('.field')?.querySelector('.field-error');
  input.setAttribute('aria-invalid', String(Boolean(message)));
  input.classList.toggle('is-valid', !message && Boolean(input.value.trim()));
  if (err) { err.hidden = !message; err.textContent = message || ''; if (err.id) input.setAttribute('aria-describedby', [input.id + '-hint', err.id].filter(id => document.getElementById(id)).join(' ')); }
  return !message;
}
function check(input) {
  const v = input.value.trim(), name = input.name;
  if (input.closest('[hidden]')) return true;
  if (!input.required && !v) return fieldError(input, '');
  if (name === 'first-name' || name === 'last-name') return fieldError(input, !v ? `Enter your ${name === 'first-name' ? 'first' : 'last'} name.` : /^[\p{L}][\p{L}' .-]*$/u.test(v) ? '' : 'Use letters only, please.');
  if (name === 'email') return fieldError(input, validEmail(v) ? '' : 'Enter an email address like name@example.co.uk.');
  if (name === 'phone') return fieldError(input, phoneProblem(v));
  if (name === 'postcode') return fieldError(input, validPostcode(v) ? '' : 'Enter a UK postcode, such as IP31 1SL.');
  if (name === 'address') return fieldError(input, v.length >= 6 ? '' : 'Enter the address to post your brochure to.');
  return fieldError(input, '');
}
for (const form of document.forms) {
  form.addEventListener('focusout', e => {
    const input = e.target;
    if (!input.matches?.('input[required], input[name=postcode], input[name=address]')) return;
    if (input.name === 'phone') { const p = parseUKPhone(input.value); if (p.valid) input.value = p.display; }
    if (input.name === 'postcode' && validPostcode(input.value)) input.value = formatPostcode(input.value);
    if (input.value || input.getAttribute('aria-invalid') === 'true') check(input);
  });
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
  form.addEventListener('submit', submit);
}
const formName = form => form.getAttribute('name');
let formViewed = false, formStarted = false;
$('#quote-form').addEventListener('focusin', () => { if (!formViewed) { formViewed = true; track('configurator_form_view', {range: state.range}); } });
$('#quote-form').addEventListener('input', () => { if (!formStarted) { formStarted = true; track('configurator_form_start', {range: state.range}); } });

async function submit(e) {
  e.preventDefault();
  const form = e.currentTarget, kind = form.dataset.kind || 'quote';
  if (form.dataset.busy) return;
  fillHidden();
  const inputs = [...form.querySelectorAll('input[required], input[name=postcode], input[name=address]')];
  const bad = inputs.filter(i => !check(i));
  const status = form.querySelector('.form-status');
  track(kind === 'quote' ? 'configurator_submit_attempt' : `${kind}_attempt`, {range: state.range});
  if (bad.length) { bad[0].focus(); status.hidden = false; status.classList.remove('ok'); status.textContent = bad.length === 1 ? 'Please check the highlighted field.' : `Please check the ${bad.length} highlighted fields.`; track('configurator_form_error', {form: kind, field: bad[0].name}); return; }
  status.hidden = true;
  const phone = parseUKPhone(form.elements.phone.value);
  form.elements['phone-e164'].value = phone.e164;
  form.elements.phone.value = phone.display;
  const button = form.querySelector('[type=submit]'); button.classList.add('is-busy'); form.dataset.busy = '1';
  const sending = clone(state), key = specKey(sending);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const body = new URLSearchParams(new FormData(form)).toString();
    const res = await fetch('/configurator/', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body, signal: controller.signal});
    if (!res.ok) throw new Error('Not saved');
    const first = form.elements['first-name'].value.trim();
    if (kind === 'quote') {
      receipt = key;
      try { sessionStorage.setItem(RECEIPT, key); sessionStorage.setItem(RECEIPT + '-name', first); } catch {}
      render();
      $('#thanks-title').textContent = `Thanks, ${first}. Your design is with SMART.`;
      $('#quote-unlocked').scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'});
      toast(`Your building price: ${pounds(priceFor(sending))}`);
      const lead = {lead_type: 'smart_configurator_quote', range: sending.range, building_price: priceFor(sending), currency: 'GBP'};
      track('configurator_enquiry_saved', lead); track('generate_lead', lead);
    } else {
      const done = form.closest('dialog').querySelector('.dialog-done');
      form.hidden = true; done.hidden = false;
      done.querySelector('.done-copy').textContent = kind === 'callback'
        ? `Thanks, ${first}. A SMART garden room specialist will call you on ${phone.display}, with your design in front of them.`
        : kind === 'visit' ? `Thanks, ${first}. SMART will call you on ${phone.display} to arrange a visit to a SMART room near you.`
        : `Thanks, ${first}. Your range and price guide is downloading${form.elements['printed-copy'].checked ? ', and the printed brochure is on its way' : ''}.`;
      done.querySelector('h2').focus();
      if (kind === 'brochure') { const a = document.createElement('a'); a.href = CONTACT.guidePdf; a.download = ''; document.body.append(a); a.click(); a.remove(); }
      track('generate_lead', {lead_type: `smart_${kind}`, range: sending.range});
    }
  } catch {
    status.hidden = false; status.classList.remove('ok');
    status.textContent = 'That did not send. Your design is safe: please try again, or call SMART on 0333 880 6157.';
    track('configurator_submit_error', {form: kind});
  } finally { clearTimeout(timer); button.classList.remove('is-busy'); delete form.dataset.busy; }
}

// ---- PDF ----------------------------------------------------------------------------------
$('#pdf-download').addEventListener('click', async () => {
  const status = $('#pdf-status');
  if (!unlocked()) { status.textContent = 'Enter your details above to unlock your price and PDF.'; $('#q-first').focus(); track('configurator_pdf_locked'); return; }
  const button = $('#pdf-download'); button.disabled = true;
  status.textContent = 'Drawing your design views and building your PDF. This takes a few seconds.';
  try {
    const views = scene ? scene.capture(['hero', 'front', 'rear', 'aerial', 'interior', 'interior2', 'plan', 'dusk'], {width: 1800, height: 1125}) : {};
    const mod = await import(/*PDF*/'/assets/js/configurator-pdf.js');
    let name = ''; try { name = sessionStorage.getItem(RECEIPT + '-name') || ''; } catch {}
    await mod.downloadPDF(state, views, {contactName: name});
    status.textContent = 'Your PDF has downloaded. It includes eight views of your design, your specification and price, and how to book your discovery call.';
    track('configurator_design_download', {range: state.range, format: 'pdf'});
  } catch (err) {
    console.error(err);
    status.textContent = 'The PDF could not be made on this device. Your design link has been copied instead; call 0333 880 6157 and we will send it to you.';
    try { await navigator.clipboard.writeText(shareURL(state, location.origin + '/configurator/')); } catch {}
  } finally { button.disabled = false; }
});

// ---- Start --------------------------------------------------------------------------------
const loadedFrom = restore();
try { receipt = sessionStorage.getItem(RECEIPT); } catch {}
render();
persist();
setView('outside');
track('configurator_view', {range: state.range, resumed: Boolean(loadedFrom)});
track('configurator_step_view', {step: state.step + 1, step_name: STEPS[state.step]});
if (loadedFrom === 'link') toast('This shared design is ready to make your own.');
else if (loadedFrom === 'device') toast('Welcome back. Your design is as you left it.');
window.addEventListener('pagehide', e => { if (!e.persisted) scene?.dispose(); });

// ---- 3D ------------------------------------------------------------------------------------
// configurator-boot.js runs the preview: it picks the renderer and tier, retries, steps down,
// guards against crash loops and keeps the diagnostics. The page only shows what it reports.
const FALLBACK_TEXT = {
  context: "The 3D view couldn't start this time. Your design is saved, so loading it again is safe.",
  setup: "The 3D view couldn't start this time. Your design is saved, so loading it again is safe.",
  load: "The 3D view didn't download. Check your connection and load it again; your design is saved.",
  build: "The 3D view couldn't draw this design. Your choices and price still work, and the specialist sees every detail."
};
const TIER_PARAM = QA && new URLSearchParams(location.search).get('tier');
// Phones and tablets share a small memory budget across the site's tabs.
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
    const step = {roof: 1, 'canopy:left': 2, 'canopy:right': 2, deck: 2, cladding: 2, floor: 4, heating: 4, furniture: 0}[hit.part];
    if (step !== undefined && step !== state.step) { selectStep(step, {focusHeading: false}); toast('Showing the options for what you tapped'); }
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
  scene.setDimensions(state.step === 1);
  scene.select(ui.opening && state.step === 3 ? ['opening:' + ui.opening] : []);
  // A rebuilt preview comes back to the view the shopper was using.
  const view = firstScene ? (state.step === 4 ? 'inside' : 'outside') : ui.view;
  if (view && view !== 'outside') scene.setView(view, {animate: firstScene});
  $('#stage-loader').hidden = true;
  $('#stage-fallback').hidden = true;
  $$('.view-switch, .stage-tools, .history, #stage-hint').forEach(el => { el.hidden = false; });
  if (boot.rung === 'svg') toast('Showing a simplified 3D view on this device. Every choice and your price work as normal.');
  if (!firstScene) return;
  firstScene = false;
  if (!tour.seen()) setTimeout(() => tour.start(), 400);
  else setTimeout(() => $('#stage-hint').classList.add('is-faded'), 4000);
}

function sceneFailed3d(reason, err) {
  if (err) console.error(err);
  scene = null; sceneFailed = true;
  $('#stage-loader').hidden = true; $('#stage-fallback').hidden = false;
  $('#fallback-caption').textContent = FALLBACK_TEXT[reason] || FALLBACK_TEXT.context;
  // Browsers block new contexts on a page that lost several, so trying again means a fresh load.
  $('#fallback-retry').hidden = false;
  $$('.view-switch, .stage-tools, .history, #stage-hint').forEach(el => { el.hidden = true; });
  $('#stage').dataset.fallback = reason;
  sceneError = err ? String(err) : reason;
  track('configurator_3d_fallback', {reason, webgl: boot.gl, error: err ? String(err).slice(0, 120) : undefined});
  if (firstScene && !tour.seen()) setTimeout(() => tour.start(), 400);
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
    // Rebuilds so far: every 'ready' after the first.
    get attempt() { return Math.max(0, boot.diagnostics().log.filter(e => e.event === 'ready').length - 1); },
    get fallback() { return $('#stage').dataset.fallback || null; }
  };
}
// The 3D is the heaviest part of the page (Three.js, generated textures), so it starts when it is
// needed: on the shopper's first touch, click, key or scroll, or once the page has loaded and
// been idle for a moment. Until then the stage shows a render of the chosen style, which is also
// the page's largest image. ?qa starts it at once for the headless checks.
let booted = false;
function start3d(why) {
  if (booted) return;
  booted = true;
  for (const type of WAKE) removeEventListener(type, wake, true);
  track('configurator_3d_start', {trigger: why});
  boot.start();
}
const WAKE = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
const wake = e => start3d(e.type);
if (QA || DEBUG3D) start3d('qa');
else {
  for (const type of WAKE) addEventListener(type, wake, {capture: true, passive: true});
  const idle = () => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => start3d('idle'), {timeout: 1500});
  const later = () => setTimeout(idle, IDLE_START_MS);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, {once: true});
}
