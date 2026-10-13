// Design model checks: SMART's published prices, every range's options, door and window fitting,
// share links and contact validation. Run: node tools/check-configurator.mjs
// The oracle below was fetched independently from SMART's six range pages on 9 October 2026.
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORACLE = {"key-studio":{"source":"https://www.smartgardenoffices.co.uk/our-range/key-studio-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.4,5.0],"prices":[[13475,14225,15000,15775,16550,17300,18075,18850,19625,20375,21150,21925,22700,23450],[14225,15275,16300,17350,18375,19425,20450,21500,22525,23575,24600,25650,26675,27700],[15000,16300,17625,18925,20225,21525,22825,24125,25450,26750,28050,29350,30650,31950],[15775,17350,18925,20500,22075,23625,25200,26775,28350,29925,31500,null,null,null],[16550,18375,20225,22075,23900,25750,27575,29425,31275,null,null,null,null,null],[17300,19425,21525,23625,25750,27850,29950,32075,null,null,null,null,null,null]]},"evolve":{"source":"https://www.smartgardenoffices.co.uk/our-range/evolve-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.4,5.0],"prices":[[15050,15850,16650,17475,18275,19075,19875,20675,21475,22300,23100,23900,24700,25500],[15850,16975,18100,19225,20350,21450,22575,23700,24825,25950,27050,28175,29300,30425],[16650,18100,19525,20975,22400,23850,25275,26725,28150,29600,31025,32450,33900,35325],[17475,19225,20975,22725,24475,26225,27975,29725,31475,33250,35000,null,null,null],[18275,20350,22400,24475,26550,28625,30675,32750,34825,null,null,null,null,null],[19075,21450,23850,26225,28625,31000,33375,35775,null,null,null,null,null,null]]},"belle":{"source":"https://www.smartgardenoffices.co.uk/our-range/belle-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.4,5.0],"prices":[[14300,15100,15875,16675,17475,18275,19075,19850,20650,21450,22250,23050,23850,24625],[15100,16150,17225,18300,19375,20450,21525,22600,23675,24750,25825,26875,27950,29025],[15875,17225,18575,19925,21275,22625,23975,25325,26675,28025,29375,30725,32075,33425],[16675,18300,19925,21550,23200,24825,26450,28075,29700,31325,32950,null,null,null],[17475,19375,21275,23200,25100,27000,28900,30800,32700,null,null,null,null,null],[18275,20450,22625,24825,27000,29175,31350,33550,null,null,null,null,null,null]]},"suffolk-barn":{"source":"https://www.smartgardenoffices.co.uk/our-range/suffolk-barn-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.4,5.0],"prices":[[16875,17700,18550,19375,20200,21050,21875,22700,23525,24375,25200,26025,26875,27700],[17700,18825,19950,21075,22200,23325,24425,25550,26675,27800,28925,30050,31150,32275],[18550,19950,21350,22775,24175,25600,27000,28400,29825,31225,32625,null,null,null],[19375,21075,22775,24475,26175,27850,29550,31250,32950,34650,36350,null,null,null],[20200,22200,24175,26175,28150,30125,32125,34100,36100,null,null,null,null,null],[21050,23325,25600,27850,30125,32400,34675,36950,null,null,null,null,null,null]]},"ultra":{"source":"https://www.smartgardenoffices.co.uk/our-range/ultra-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.4,5.0],"prices":[[16150,16900,17625,18375,19125,19850,20600,21350,22075,22825,23575,24325,25050,25800],[16900,17925,18950,20000,21025,22050,23100,24125,25175,26200,27225,28275,29300,30325],[17625,18950,20275,21600,22950,24275,25600,26925,28250,29575,30900,32225,33550,34875],[18375,20000,21600,23225,24850,26475,28075,29700,31325,32950,34550,null,null,null],[19125,21025,22950,24850,26750,28675,30575,32500,34400,null,null,null,null,null],[19850,22050,24275,26475,28675,30875,33075,35275,null,null,null,null,null,null]]},"affinity":{"source":"https://www.smartgardenoffices.co.uk/our-range/affinity-range","widths":[1.9,2.5,3.1,3.7,4.4,5.0,5.6,6.2,6.8,7.4,8.0,8.6,9.2,9.8],"depths":[1.9,2.5,3.1,3.7,4.5,5.0],"prices":[[15825,16600,17400,18175,18975,19775,20550,21350,22125,22925,23725,24500,25300,26075],[16600,17700,18800,19900,21000,22100,23200,24300,25400,26500,27600,28700,29800,30900],[17400,18800,20225,21625,23050,24450,25875,27275,28675,30100,31500,32925,34325,35750],[18175,19900,21625,23350,25075,26800,28525,30250,31950,33675,35400,null,null,null],[18975,21000,23050,25075,27100,29150,31175,33200,35225,null,null,null,null,null],[19775,22100,24450,26800,29150,31475,33825,36175,null,null,null,null,null,null]]}};
let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
const equal = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };
const tmp = await mkdtemp(path.join(os.tmpdir(), 'smart-model-'));
try {
  await build({entryPoints: [path.join(repo, 'src/configurator-model.js')], outfile: path.join(tmp, 'model.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  await build({entryPoints: [path.join(repo, 'src/configurator-data.js')], outfile: path.join(tmp, 'data.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')));
  const D = await import(pathToFileURL(path.join(tmp, 'data.mjs')));

  // 1. Every published price cell, through the model, for every range.
  let cells = 0;
  for (const [range, o] of Object.entries(ORACLE)) {
    o.depths.forEach((depth, di) => o.widths.forEach((width, wi) => {
      const expected = o.prices[di][wi];
      const got = M.priceFor({range, width, depth});
      equal(got, expected, `${range} ${width} x ${depth}`);
      cells++;
    }));
  }
  equal(cells, 504, 'all 504 published cells checked');
  equal(M.pounds(null), 'Price on application', 'POA is never shown as zero');

  // 2. Options per range match SMART's planner (public lists) and range pages.
  const names = r => D.RANGES[r].claddings.map(c => c.name);
  equal(names('belle'), ['Light Grey', 'Grey Art', 'Cedar Art', 'Charcoal', 'Coffee', 'Cedar'], 'Belle composite colours');
  equal(names('evolve'), ['Light Grey', 'Charcoal', 'Cedar Art', 'Grey Art', 'Coffee', 'Cedar'], 'Evolve shadow-gap colours');
  equal(names('suffolk-barn').length, 22, 'Suffolk Barn: 21 planner colours plus Wolf Grey');
  for (const r of ['key-studio', 'affinity', 'ultra']) equal(D.RANGES[r].claddings.length, 1, `${r} has its fixed timber`);
  equal(D.RANGES['key-studio'].orientation, 'horizontal', 'Key Studio Thermowood is horizontal, as on its range page');
  equal(Object.keys(D.OPENINGS).filter(k => D.OPENINGS[k].group === 'door').length, 9, 'nine planner doors');
  equal(Object.keys(D.OPENINGS).filter(k => D.OPENINGS[k].group === 'window').length, 8, 'eight planner windows');
  equal(Object.keys(D.FLOORS).filter(k => D.FLOORS[k].kind === 'plank').length, 8, 'eight laminate and vinyl floors');
  for (const [k, s] of Object.entries(D.OPENINGS)) ok(s.status === 'included' ? ['single', 'french', 'slide2', 'solid'].includes(k) || s.group === 'window' : ['slide3', 'slide4', 'bifold2', 'bifold3', 'hidden'].includes(k), `${k} priced as SMART describes it`);
  for (const r of D.RANGE_ORDER) ok(D.RANGES[r].roofs.includes(D.RANGES[r].standardRoof), `${r} standard roof offered`);

  // 3. Fitting: every range and size, default and crowded layouts, never overlap or overrun.
  const {widths: W, depths: Dp} = M.sizesFor('key-studio');
  let layouts = 0;
  const assertFits = (s, ctx) => {
    for (const wall of Object.keys(D.WALLS)) {
      const L = M.wallLength(s, wall), margin = M.wallMargin(s, wall);
      const spans = s.openings.filter(o => o.wall === wall).map(o => [o.p * L - D.OPENINGS[o.type].w / 2, o.p * L + D.OPENINGS[o.type].w / 2]).sort((a, b) => a[0] - b[0]);
      spans.forEach(([a, b], i) => {
        ok(a >= margin - .001 && b <= L - margin + .001, `${ctx} ${wall}: inside the wall (positions are stored to the millimetre)`);
        if (i) ok(a - spans[i - 1][1] >= .1 - .001, `${ctx} ${wall}: 100mm between openings`);
      });
    }
  };
  for (const range of D.RANGE_ORDER) for (const width of M.sizesFor(range).widths) for (const depth of M.sizesFor(range).depths) {
    const s = M.switchRange(M.normalise({width, depth}), range);
    ok(s.openings.some(o => o.wall === 'front' && D.OPENINGS[o.type].group === 'door'), `${range} ${width}x${depth}: has an entrance`);
    assertFits(s, `${range} ${width}x${depth}`);
    let crowded = s;
    for (const type of ['slide4', 'bifold3', 'trebleWin', 'fcFull', 'doubleWin', 'eyeLevel']) for (const wall of Object.keys(D.WALLS)) crowded = M.addOpening(crowded, wall, type).state;
    assertFits(crowded, `${range} ${width}x${depth} crowded`);
    layouts++;
  }
  ok(layouts >= 480, `fitted ${layouts} range and size combinations`);
  const tight = M.addOpening(M.normalise({width: 1.9, depth: 1.9}), 'front', 'slide4');
  equal(tight.id, null, 'a 4m door is refused on a 1.9m wall');

  // 4. Share links: v2 round trip, and the homepage's v1 handover still opens.
  const designs = [M.normalise({}), M.normalise({range: 'suffolk-barn', width: 6.2, depth: 3.7, roof: 'cantilever', cladding: 'traditional-red', deck: 'terrace', blinds: 'int-black', layout: 'shower', electrics: {usb: true, internet: true, mains: false}})];
  designs.push(M.apply(designs[0], {canopy: {left: 3, right: 1, wallLeft: true}, underfloor: true, heating: 'climate'}).state);
  for (const s of designs) {
    const back = M.fromURL(M.shareURL(s, 'https://x.test/configurator/'));
    const strip = v => JSON.stringify({...v, step: 0, openings: v.openings.map(o => [o.wall, o.type, o.p, o.glass])});
    equal(strip(back), strip(s), `round trip ${s.range}`);
  }
  const v1 = M.fromURL('https://x.test/configurator/?v=1&r=belle&w=5&d=3.1&c=cedar&g=sliding&p=left&f=carpet&x=climate');
  equal([v1.range, v1.width, v1.depth, v1.cladding, v1.floor, v1.heating], ['belle', 5, 3.1, 'cedar', 'carpet-biscuit', 'climate'], 'v1 link decoded');
  ok(v1.openings.some(o => o.type === 'slide2'), 'v1 sliding doors kept');
  equal(M.fromURL('https://x.test/configurator/?v=9'), null, 'unknown versions ignored');
  equal(M.normalise({underfloor: true, floor: 'carpet-grey'}).floor, 'lam-light', 'underfloor heating moves carpet to laminate');
  equal(M.normalise({layout: 'shower', width: 3.1, depth: 2.5}).layout, 'open', 'a shower room needs the room for it');
  equal(M.normalise({roof: 'cantilever', range: 'ultra'}).roof, 'hidden', 'roofs limited to each range');

  // 5. Contact validation.
  for (const n of ['07912 345678', '+44 7912 345678', '0044 (0)1284 123456', '01284 123456', '020 7123 4567', '0333 880 6157', '01697 73456']) ok(M.parseUKPhone(n).valid, `accepts ${n}`);
  for (const n of ['', '12345', '07700 900123', '01632 960123', '09012 345678', '07012 345678', '+1 555 123 4567', '0791234567890', 'call me']) ok(!M.parseUKPhone(n).valid, `refuses ${n || 'empty'}`);
  equal(M.parseUKPhone('+447912345678').e164, '+447912345678', 'E.164 kept for the CRM');
  equal(M.parseUKPhone('07912345678').display, '07912 345678', 'mobile formatted');
  for (const p of ['IP31 1SL', 'ip311sl', 'SW1A 1AA', 'M1 1AE', 'B33 8TH', 'CR2 6XH', 'DN55 1PT']) ok(M.validPostcode(p), `postcode ${p}`);
  for (const p of ['', 'IP31', '12345', 'QQ1 1QQ']) ok(!M.validPostcode(p), `refuses postcode ${p}`);

  // 6. Specification rows cover every choice, with honest price status.
  const rows = M.specRows(designs[1]);
  for (const label of ['Range', 'External size', 'Roof', 'Cladding', 'Window and door frames', 'Walls', 'Floor', 'Heating', 'Lighting', 'Layout', 'Base', 'Mains connection']) ok(rows.some(r => r.label === label), `spec includes ${label}`);
  ok(rows.filter(r => r.section === 'Site').every(r => r.status === 'quoted'), 'base and connection are quoted');
  ok(M.upgradesOf(designs[1]).includes('Cantilevered roof'), 'roof upgrade listed');
  console.log(`Configurator model checks passed: ${checks} assertions, 504 price cells, ${layouts} range and size layouts.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
