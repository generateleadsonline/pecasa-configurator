// Proves every option visibly changes the 3D model. For each option value it sets a baseline
// design in the real page (?qa=1), applies the option the way the panel does (so the camera turns
// to the part, as a shopper sees it), renders that exact view, puts the baseline back without
// moving the camera, renders again and counts the pixels that differ. An option that changes
// nothing on screen fails.
//
//   PLAYWRIGHT_CORE=/path/to/playwright-core node tools/qa/check-options.mjs http://localhost:4812 [filter|filter] [--shots dir]
//
// Runs in Chrome with SwiftShader (real WebGL, no GPU needed) and reduced motion, so camera moves
// are instant. About 250 option values plus a no-change control; split across browsers with PAR (default 2).
import {createRequire} from 'module';
import {build} from 'esbuild';
import {mkdtemp, writeFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const base = (args[0] || 'http://localhost:4812').replace(/\/$/, '');
const filter = args[1] && !args[1].startsWith('--') ? args[1] : null;
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
// A pixel counts as changed when a colour channel moves by more than DELTA (out of 255): enough
// for a pale finish (white walls to light green) yet far above the renderer's noise, which the
// control below proves is zero.
const MIN_PIXELS = 8, DELTA = 8;

const tmp = await mkdtemp(path.join(os.tmpdir(), 'pecasa-options-'));
await build({entryPoints: [path.join(repo, 'src/configurator-model.js')], outfile: path.join(tmp, 'model.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent'});
const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')).href);

// ---- The option list ----------------------------------------------------------------------
const V = [];
const add = (group, label, baseline, patch, key, focus) => V.push({group, label, baseline, patch, key, focus});
const levno = {style: 'levno'}, cabano = {style: 'cabano'}, roko = {style: 'roko'}, pergola = {style: 'pergola'};
const others = (obj, current) => Object.keys(obj).filter(k => k !== current);
// Control: re-rendering the same design and view must change nothing at all.
add('control', 'no change (noise floor)', levno, {}, null);
for (const s of M.STYLE_ORDER.filter(s => s !== 'levno')) add('style', s, levno, {__style: s}, 'style');
for (const u of others(M.USES, 'office')) add('use', u, levno, {use: u}, 'use');
add('size', 'width 6.0', levno, {width: 6}, 'size'); add('size', 'depth 4.0', levno, {depth: 4}, 'size'); add('size', 'height 3.0', levno, {height: 3}, 'height');
add('roof', 'pitched', levno, {roofType: 'pitched'}, 'roof'); add('roof', 'flat on Cabano', cabano, {roofType: 'flat'}, 'roof');
for (const f of others(M.ROOF_FINISHES, 'roof-copper')) add('roofFinish', f, cabano, {roofFinish: f}, 'roof');
add('roofFinish', 'corrugated (flat)', levno, {roofFinish: 'corrugated-metal-004-sd'}, 'roof');
add('roof', 'sedum', levno, {sedum: true}, 'roof');
for (const r of others(M.ROOFLIGHTS, 'none')) add('rooflight', r, levno, {rooflight: r}, 'rooflight');
add('rooflight', 'count 2', {...levno, width: 6, rooflight: 'r1000'}, {rooflightCount: 2}, 'rooflight');
for (const a of Object.keys(M.ADDITIONS)) add('addition', a, levno, {addition: a}, 'addition');
for (const c of others(M.CLADDINGS, 'shiplap03')) add('cladding main', c, levno, {cladding: {main: c, feature: 'cedarPlanks', rear: 'shiplap03'}}, 'cladding', {role: 'main'});
add('cladding feature', 'shadow-line', levno, {cladding: {main: 'shiplap03', feature: 'shadow-line/golden-oak-vertical', rear: 'shiplap03'}}, 'cladding', {role: 'feature'});
add('cladding rear', 'cedar', roko, {cladding: {main: 'shiplap02', feature: 'cedarPlanks', rear: 'cedarPlanks'}}, 'cladding', {role: 'rear'});
for (const r of others(M.RAL, 'RAL9011')) add('trim', r, levno, {trim: r}, 'trim');
add('trim', 'corner trims', levno, {cornerTrims: true}, 'cornerTrims');
for (const r of others(M.RAL, 'RAL9011')) add('frames', r, levno, {frames: r}, 'frame');
for (const l of others(M.EXTERIOR_LIGHTS, 'soffit')) add('exteriorLight', l, levno, {exteriorLight: l}, 'exteriorLight');
add('deck', 'front1000', levno, {deck: 'front1000'}, 'deck'); add('deck', 'none', levno, {deck: 'none'}, 'deck');
for (const f of others(M.DECK_FINISHES, 'deck/wood-grain/Anthracite')) add('deckFinish', f, levno, {deckFinish: f}, 'deck');
const L0 = M.normalise({style: 'levno', width: 6, depth: 4});
for (const t of Object.keys(M.OPENINGS).filter(k => !M.OPENINGS[k].template)) {
  const spec = M.OPENINGS[t];
  add('opening', t, {style: 'levno', width: 6, depth: 4, openings: L0.openings}, {openings: [...L0.openings, {wall: 'back', type: t, w: spec.w, h: spec.h, sill: spec.sill, p: .5}]}, 'wall', {wall: 'back'});
}
add('opening', 'obscure glass', levno, {openings: M.normalise(levno).openings.map((o, i) => (i === 0 ? {...o, glass: 'obscure'} : o))}, 'wall', {wall: 'front'});
for (const b of others(M.BLINDS, 'none')) add('blinds', b, levno, {blinds: b}, 'blinds');
for (const i of others(M.INTERIORS, 'plaster-ffffff')) add('interior', i, levno, {interior: i}, 'interior');
for (const f of others(M.FLOORS, 'floor-walnut')) add('floor', f, levno, {floor: f}, 'floor');
for (const l of others(M.LAYOUTS, 'open')) add('layout', l, {...levno, width: 6, depth: 4}, {layout: l}, 'layout');
add('kitchen', 'kitchenette', {...levno, width: 6}, {kitchen: 'kitchenette'}, 'kitchen');
const K = {...levno, width: 6, kitchen: 'kitchenette'};
for (const c of others(M.CABINETS, 'Masisa/Blanco-Liso')) add('kitchenFinish', c, K, {kitchenFinish: c}, 'kitchen');
for (const w of others(M.WORKTOPS, 'Rocks/Alicante')) add('worktop', w, K, {worktop: w}, 'worktop');
for (const h of others(M.HANDLES, 'Bar')) add('handles', h, K, {handles: h}, 'kitchen');
for (const l of others(M.INTERIOR_LIGHTS, 'ceiling')) add('lighting', l, levno, {lighting: l}, 'lighting');
const FOCUS = {extSocket: {outside: true}, airCon: {outside: true}, tvSocket: {tag: 'tv'}, dataPoint: {tag: 'data'}, dimmer: {tag: 'switches'}, smokeAlarm: {tag: 'smokeAlarm'}, doubleSockets: {tag: 'sockets'}};
for (const k of Object.keys(M.ELECTRICS)) add('electrics', k, levno, {electrics: {...M.normalise(levno).electrics, [k]: true}}, k === 'wallHeater' || k === 'airCon' ? 'heating' : 'electrics', FOCUS[k] || {});
add('pergola', 'glazed roof', pergola, {pergolaRoof: 'glass'}, 'pergola', {tag: 'blades'});
for (const c of others(M.PERGOLA_COLOURS, 'RAL7015')) add('pergolaFrame', c, pergola, {pergolaFrame: c}, 'pergola', {tag: 'frame'});
for (const c of others(M.PERGOLA_COLOURS, 'RAL7004')) add('pergolaBlades', c, pergola, {pergolaBlades: c}, 'pergola', {tag: 'blades', dir: [-.4, 1.2, .8]});
const DIRS = {front: [0, .3, 1], back: [0, .3, -1], left: [-1, .3, 0], right: [1, .3, 0]};
for (const kind of others(M.PERGOLA_SIDES, 'none')) for (const side of ['front', 'left']) add('pergolaSide', `${side} ${kind}`, pergola, {pergolaSides: {front: 'none', back: 'none', left: 'none', right: 'none', [side]: kind}}, 'pergola', {tag: 'pergola:' + side, dir: DIRS[side]});
const PL = {...pergola, pergolaSides: {front: 'loggia', back: 'none', left: 'none', right: 'none'}}, PW = {...pergola, pergolaSides: {front: 'windscreen', back: 'none', left: 'none', right: 'none'}};
for (const c of others(M.PANEL_COLOURS, 'RAL7016')) add('panelColour', c, PL, {panelColour: c}, 'pergola', {tag: 'pergolaSide', dir: DIRS.front});
for (const c of others(M.WINDSCREEN_COLOURS, 'SCM33')) add('windscreenColour', c, PW, {windscreenColour: c}, 'pergola', {tag: 'pergolaSide', dir: DIRS.front});
// The filter matches "group label" text; separate alternatives with | (e.g. "interior|worktop").
const LIST = filter ? V.filter(v => filter.split('|').some(f => `${v.group} ${v.label}`.includes(f))) : V;

// ---- Run ------------------------------------------------------------------------------------
async function worker(items, id) {
  const browser = await chromium.launch({channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
  await ctx.addInitScript(() => { try { localStorage.setItem('pecasa-cfg-tour-v1', '1'); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/configurator/?qa=1', {waitUntil: 'load'});
  for (let i = 0; i < 400 && !(await page.evaluate(() => Boolean(window.__cfg?.boot?.verified))); i++) await new Promise(r => setTimeout(r, 300));
  const results = [];
  for (const v of items) {
    const r = await page.evaluate(async ({v, DELTA}) => {
      const cfg = window.__cfg, frames = n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const pixels = async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      cfg.set(cfg.normalise({...v.baseline, step: 0}));
      cfg.scene.setView('outside', {animate: false});
      await frames(2);
      if (v.key) cfg.change(v.patch, v.key, v.focus);
      await frames(3);
      const after = cfg.scene.capture(['view'], {width: 720, height: 480}).view;
      const changedState = JSON.stringify(cfg.state);
      cfg.set(cfg.normalise({...v.baseline, step: 0}));
      await frames(2);
      const before = cfg.scene.capture(['view'], {width: 720, height: 480}).view;
      if (!after || !before) return {diff: -1};
      const a = await pixels(after), b = await pixels(before);
      let diff = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > DELTA) diff++;
      return {diff, stateChanged: changedState !== JSON.stringify(cfg.state), after, before};
    }, {v, DELTA});
    const ok = v.group === 'control' ? r.diff === 0 : r.diff >= MIN_PIXELS;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${v.group}: ${v.label}  ${r.diff} px`);
    if (shotsDir && (!ok || process.env.ALL_SHOTS)) {
      await mkdir(shotsDir, {recursive: true});
      const slug = `${v.group}-${v.label}`.replace(/[^a-z0-9]+/gi, '-');
      for (const k of ['after', 'before']) if (r[k]) await writeFile(path.join(shotsDir, `${slug}-${k}.jpg`), Buffer.from(r[k].split(',')[1], 'base64'));
    }
    results.push({...v, diff: r.diff, ok});
  }
  if (errors.length) console.log(`worker ${id} page errors:`, errors.slice(0, 5).join(' | '));
  await browser.close();
  return results;
}
const PAR = Number(process.env.PAR || 2);
const chunks = Array.from({length: PAR}, (_, i) => LIST.filter((_, k) => k % PAR === i));
const all = (await Promise.all(chunks.map((c, i) => worker(c, i)))).flat();
const failed = all.filter(r => !r.ok);
const options = all.filter(r => r.group !== 'control'), control = all.find(r => r.group === 'control');
console.log(failed.length ? `${failed.length} of ${all.length} checks failed: ${failed.map(f => `${f.group}: ${f.label} (${f.diff} px)`).join('; ')}` : `All ${options.length} options visibly change the 3D model${control ? ` (noise control: ${control.diff} px)` : ''}.`);
process.exit(failed.length ? 1 : 0);
