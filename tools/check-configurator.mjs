// Design model checks: Pecasa's published prices, every style's sizes and options, door and window
// fitting, share links, contact validation and the specification. Run: node tools/check-configurator.mjs
// The price oracle is research/2026-10-13/website/prices.json, read independently from pecasa.co.uk
// and Pecasa's own planner on 13 October 2026 (quoted verbatim there, nothing inferred).
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORACLE = JSON.parse(await readFile(path.join(repo, 'research/2026-10-13/website/prices.json'), 'utf8'));
let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
const equal = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };
const close = (a, b, tol = .011) => Math.abs(a - b) < tol;
const tmp = await mkdtemp(path.join(os.tmpdir(), 'pecasa-model-'));
try {
  for (const f of ['model', 'geometry', 'data']) await build({entryPoints: [path.join(repo, `src/configurator-${f}.js`)], outfile: path.join(tmp, f + '.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')));
  const G = await import(pathToFileURL(path.join(tmp, 'geometry.mjs')));
  const {PLANNER_ESTIMATES, PRODUCT_CARDS, PRICE_TABLE, TABLE_STYLES} = await import(pathToFileURL(path.join(tmp, 'data.mjs')));
  const key = name => ({'l-shape': 'lshape', nspiro: 'inspiro'})[name.toLowerCase()] || name.toLowerCase();

  // 1. Prices match the published sources exactly; nothing else is ever shown as a price.
  const estimates = ORACLE.configurator_displayed_estimates.estimates;
  equal(Object.keys(PLANNER_ESTIMATES).sort(), estimates.map(e => key(e.style)).sort(), 'one planner estimate per planner style');
  for (const e of estimates) {
    const style = key(e.style), st = M.STYLES[style];
    equal(PLANNER_ESTIMATES[style], e.price_gbp, `${e.style}: planner estimate`);
    ok(close(st.defaults.width, e.default_width_m) && close(st.defaults.depth, e.default_depth_m) && close(st.defaults.height, e.default_height_m, .002), `${e.style}: default size matches the planner`);
    const p = M.priceFor(M.normalise({style}));
    equal([p.value, p.source], [e.price_gbp, 'planner'], `${e.style}: default design shows the planner's estimate`);
  }
  const cards = ORACLE.product_examples.cards;
  const styled = cards.filter(c => c.style_as_written !== 'CLASSIC 30m2');
  equal(PRODUCT_CARDS.length, styled.length, 'every styled /our-products/ card, and the unstyled "Classic 30m2" left out');
  for (const c of styled) {
    const style = key(c.title_exact.replace(/^PECASA /, '').replace(/ CLASSIC.*$/, ''));
    const mine = PRODUCT_CARDS.find(x => x.style === style);
    ok(mine, `${c.title_exact}: card present`);
    equal([mine.w, mine.d, mine.h, mine.price], [c.width_m, c.depth_m, c.height_m, c.price_gbp], `${c.title_exact}: size and price`);
    const s = M.normalise({style, width: c.width_m, depth: c.depth_m, height: c.height_m});
    if (close(s.width, c.width_m) && close(s.depth, c.depth_m) && close(s.height, c.height_m, .025)) {
      const p = M.priceFor(s);
      ok(p.value === c.price_gbp || p.source === 'planner', `${c.title_exact}: the card's size shows its price`);
    }
  }
  for (const [page, info] of Object.entries(ORACLE.price_grid.pages)) {
    for (const cell of info.cells_desktop || []) {
      const di = PRICE_TABLE.depths.indexOf(cell.depth_m), wi = PRICE_TABLE.widths.indexOf(cell.width_m);
      ok(di >= 0 && wi >= 0, `${page}: ${cell.width_m} x ${cell.depth_m} in the table`);
      equal(PRICE_TABLE.prices[di][wi], cell.price_gbp, `${page}: ${cell.width_m} x ${cell.depth_m} price`);
    }
  }
  const published = new Set([...Object.values(PLANNER_ESTIMATES), ...PRODUCT_CARDS.map(c => c.price), ...PRICE_TABLE.prices.flat()]);
  let priced = 0, quoted = 0;
  for (const style of M.STYLE_ORDER) {
    const {widths, depths, heights} = M.sizesFor(style);
    for (const width of widths) for (const depth of depths) for (const height of [heights[0], M.STYLES[style].defaults.height, heights[heights.length - 1]]) {
      const s = M.normalise({style, width, depth, height});
      const p = M.priceFor(s);
      if (p.value === null) { quoted++; ok(p.source === null && M.pounds(p.value) === 'Quoted', `${style} ${width}x${depth}: unpriced shows "Quoted"`); continue; }
      priced++;
      ok(published.has(p.value), `${style} ${width}x${depth}x${height}: £${p.value} is a published price`);
      if (p.source === 'table') ok(TABLE_STYLES.includes(style), `${style}: table prices only for enclosed rectangular rooms`);
    }
    for (const roofType of ['pitched', 'flat']) {
      const s = M.apply(M.normalise({style}), {roofType}).state;
      if (s.roofType !== 'standard') equal(M.priceFor(s).value, null, `${style}: a changed roof is quoted, not priced`);
    }
  }
  ok(priced > 0 && quoted > 0, `price lookups: ${priced} priced, ${quoted} quoted`);
  const srcFiles = (await readdir(path.join(repo, 'src'))).filter(f => /\.(js|html)$/.test(f) && f !== 'configurator-pdf-assets.js');
  for (const f of srcFiles) {
    const text = await readFile(path.join(repo, 'src', f), 'utf8');
    const amounts = [...text.matchAll(/£\s?(\d[\d,]*)/g)].map(m => Number(m[1].replace(/,/g, '')));
    ok(amounts.every(a => published.has(a)), `${f}: no hard-coded price that is not published (${amounts.join(', ') || 'none'})`);
  }

  // 2. Every style: defaults inside its limits, size ladders inside the limits, an entrance.
  for (const style of M.STYLE_ORDER) {
    const st = M.STYLES[style], {widths, depths, heights} = M.sizesFor(style);
    const s = M.normalise({style});
    equal([s.width, s.depth, s.height], [st.defaults.width, st.defaults.depth, st.defaults.height], `${style}: opens at its default size`);
    for (const [list, [lo, hi], name] of [[widths, st.limits.w, 'width'], [depths, st.limits.d, 'depth'], [heights, st.limits.h, 'height']]) {
      ok(list.every(v => v >= lo - 1e-9 && v <= hi + 1e-9), `${style}: ${name} ladder inside ${lo}-${hi}`);
      ok(list.some(v => close(v, lo, .051)) && list.some(v => close(v, hi, .051)), `${style}: ${name} ladder reaches both limits`);
    }
    if (!st.open) ok(s.openings.some(o => M.OPENINGS[o.type].group === 'door'), `${style}: has an entrance door`);
    equal(M.normalise({style, width: 99, depth: 99, height: 99}).width, widths[widths.length - 1], `${style}: oversize clamped`);
  }

  // 3. Fitting: every style and size, default and crowded walls, inside the margins, no overlaps.
  let layouts = 0;
  const assertFits = (s, ctx) => {
    for (const wall of G.plan(s).walls) {
      const spans = s.openings.filter(o => o.wall === wall.id).map(o => [o.p * wall.len - o.w / 2, o.p * wall.len + o.w / 2]).sort((a, b) => a[0] - b[0]);
      spans.forEach(([a, b], i) => {
        ok(a >= wall.margin0 - .001 && b <= wall.len - wall.margin1 + .001, `${ctx} ${wall.id}: inside the wall's margins`);
        if (i) ok(a >= spans[i - 1][1] - .001, `${ctx} ${wall.id}: openings do not overlap`);
      });
    }
    ok(s.openings.every(o => G.plan(s).walls.some(w => w.id === o.wall)), `${ctx}: every opening is on a wall of this plan`);
  };
  for (const style of M.STYLE_ORDER.filter(x => !M.STYLES[x].open)) {
    const {widths, depths} = M.sizesFor(style);
    const pick = list => list.filter((_, i) => i % 3 === 0 || i === list.length - 1);
    for (const width of pick(widths)) for (const depth of pick(depths)) {
      const s = M.normalise({style, width, depth});
      assertFits(s, `${style} ${width}x${depth}`);
      let crowded = s;
      for (const type of ['stacker3000', 'fold4', 'fixed1200', 'awning1800', 'single', 'tnt800']) for (const wall of G.plan(s).walls) if (M.OPENINGS[type]) crowded = M.addOpening(crowded, wall.id, type).state;
      assertFits(M.normalise(crowded), `${style} ${width}x${depth} crowded`);
      layouts++;
    }
  }
  ok(layouts > 300, `fitted ${layouts} style and size layouts`);

  // 4. Share links round-trip, and unknown versions are ignored.
  const designs = [M.normalise({}), M.normalise({style: 'cabano', width: 5, depth: 4.5, roofFinish: Object.keys(M.ROOF_FINISHES).find(k => M.ROOF_FINISHES[k].pitchedOnly), layout: 'bathroom', kitchen: 'kitchenette', blinds: 'white', deck: 'front1000', rooflight: 'none'}),
    M.normalise({style: 'pergola', width: 6, depth: 4, pergolaSides: {front: 'glass', back: 'solid', left: 'loggia', right: 'none'}}),
    M.normalise({style: 'portal', sedum: true, rooflight: 'r1400', rooflightCount: 2, addition: 'veranda', cornerTrims: true, electrics: {airCon: true, wallHeater: true}})];
  designs.push(M.addOpening(designs[0], 'back', 'awning1800').state);
  for (const s of designs) {
    const back = M.fromURL(M.shareURL(s, 'https://x.test/configurator/'));
    const strip = v => JSON.stringify({...M.normalise(v), step: 0, openings: M.normalise(v).openings.map(o => [o.wall, o.type, o.w, o.h, o.sill, o.glass])});
    equal(strip(back), strip(s), `round trip ${s.style}`);
    // Positions travel as four decimals of the wall: within 0.1mm on a 10m wall.
    ok(M.normalise(back).openings.every((o, i) => Math.abs(o.p - M.normalise(s).openings[i].p) <= .00006), `round trip ${s.style}: positions`);
  }
  equal(M.fromURL('https://x.test/configurator/?v=9&s=levno'), null, 'unknown versions ignored');
  equal(M.normalise({style: 'nonsense'}).style, M.DEFAULT_STYLE, 'unknown style falls back to the default');

  // 5. Contact validation (Ofcom numbering, Royal Mail postcode format).
  for (const n of ['07912 345678', '+44 7912 345678', '0044 (0)1923 123456', '01923 123456', '020 8146 2200', '0333 880 6157', '01697 73456', '07624 123456']) ok(M.parseUKPhone(n).valid, `accepts ${n}`);
  for (const n of ['', '12345', '07700 900123', '01632 960123', '020 7946 0123', '09012 345678', '07012 345678', '+1 555 123 4567', '0791234567890', 'call me', '07777777777']) ok(!M.parseUKPhone(n).valid, `refuses ${n || 'empty'}`);
  equal(M.parseUKPhone('+447912345678').e164, '+447912345678', 'E.164 kept for the CRM');
  equal(M.parseUKPhone('07912345678').display, '07912 345678', 'mobile formatted');
  equal(M.parseUKPhone('02081462200').display, '020 8146 2200', 'London number formatted');
  ok(M.phoneProblem('07700 900123').includes('reserved'), 'reserved numbers explained');
  for (const p of ['WD24 4PT', 'wd244pt', 'SW1A 1AA', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT']) ok(M.validPostcode(p), `postcode ${p}`);
  for (const p of ['', 'WD24', '12345', 'QQ1 1QQ']) ok(!M.validPostcode(p), `refuses postcode ${p}`);
  for (const e of ['a@b.co', 'first.last+tag@example.co.uk']) ok(M.validEmail(e), `email ${e}`);
  for (const e of ['', 'a@b', 'a b@c.com', 'nobody']) ok(!M.validEmail(e), `refuses email ${e || 'empty'}`);

  // 6. Specification rows cover every choice with an honest status, and never a price for an extra.
  for (const s of designs) {
    const rows = M.specRows(s);
    ok(rows.every(r => ['included', 'upgrade', 'quoted'].includes(r.status)), `${s.style}: statuses are included, upgrade or quoted`);
    ok(rows.every(r => !/£\s?\d/.test(r.value)), `${s.style}: no price against any line`);
    for (const label of ['Style', 'External size', 'Height', 'Foundations']) ok(rows.some(r => r.label === label), `${s.style}: spec includes ${label}`);
    ok(rows.filter(r => r.section === 'Site' && r.label !== 'Foundations').every(r => r.status === 'quoted'), `${s.style}: site work quoted`);
  }
  const full = M.specRows(designs[3]);
  for (const label of ['Green roof', 'Rooflights', 'Addition', 'Heating and cooling']) ok(full.some(r => r.label === label && r.status === 'upgrade'), `${label} marked Upgrade`);
  ok(M.upgradesOf(designs[1]).some(u => u.startsWith('Kitchen')), 'kitchenette listed as an upgrade');
  ok(M.specRows(designs[0]).filter(r => r.section === 'Doors and windows').every(r => r.status === 'included'), 'standard doors and windows included');
  console.log(`Configurator model checks passed: ${checks} assertions; ${priced} priced and ${quoted} quoted size lookups; ${layouts} style and size layouts.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
