// Renders a matrix of designs in headless Chrome (real WebGL) and fails if any two visible faces
// share a plane and overlap (z-fighting: flicker and blotches on real GPUs). Reused from the SMART
// configurator's tools/qa with a design matrix generated from Pecasa's styles and options.
// Run: node tools/qa/check-zfighting.mjs   (needs Google Chrome; takes a few minutes)
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const run = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = await mkdtemp(path.join(process.env.SHOT_TMP || os.tmpdir(), 'pecasa-zfight-'));
// The matrix: every style at its default, smallest and largest size; each with the other roof
// type; each with every extra at once; every door and window type; every pergola side.
await build({entryPoints: [path.join(repo, 'src/configurator-model.js')], outfile: path.join(tmp, 'model.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent'});
const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')).href);
const q = st => new URL(M.shareURL(st, 'http://x/')).search.slice(1);
const DESIGNS = [];
for (const style of M.STYLE_ORDER) {
  const {widths, depths, heights} = M.sizesFor(style), open = M.STYLES[style].open;
  DESIGNS.push(q(M.normalise({style})));
  DESIGNS.push(q(M.normalise({style, width: widths[0], depth: depths[0], height: heights[0]})));
  DESIGNS.push(q(M.normalise({style, width: widths[widths.length - 1], depth: depths[depths.length - 1], height: heights[heights.length - 1]})));
  if (open) continue;
  DESIGNS.push(q(M.apply(M.normalise({style}), {roofType: M.STYLES[style].roof.kind === 'gable' ? 'flat' : 'pitched'}).state));
  DESIGNS.push(q(M.normalise({style, addition: 'veranda', rooflight: 'r1400', rooflightCount: 2, sedum: true, cornerTrims: true, deck: 'front1000', layout: 'bathroom',
    kitchen: 'kitchenette', blinds: 'white', exteriorLight: 'security', lighting: 'track', electrics: Object.fromEntries(Object.keys(M.ELECTRICS).map(k => [k, true]))})));
  DESIGNS.push(q(M.normalise({style, addition: style === 'roko' ? 'pergola' : 'trellis', layout: 'sauna', exteriorLight: 'wall', lighting: 'strip'})));
}
// Every door and window type, a few to a wall, on a large Levno.
const types = Object.keys(M.OPENINGS);
for (let i = 0; i < types.length; i += 4) {
  const walls = ['back', 'left', 'right', 'back'];
  const openings = types.slice(i, i + 4).map((type, k) => ({wall: walls[k], type, p: k === 3 ? .8 : .3}));
  DESIGNS.push(q(M.normalise({style: 'levno', width: 8, depth: 5, openings: [...M.normalise({style: 'levno'}).openings.filter(o => o.wall === 'front'), ...openings]})));
}
for (const side of Object.keys(M.PERGOLA_SIDES)) DESIGNS.push(q(M.normalise({style: 'pergola', pergolaSides: {front: side, back: side, left: side, right: side}, pergolaRoof: side === 'glass' ? 'glass' : 'blades'})));
const ONLY = process.argv[2] ? DESIGNS.filter(d => d.includes(process.argv[2])) : DESIGNS;
try {
  await build({entryPoints: [path.join(repo, 'tools/qa/harness.js')], outfile: path.join(tmp, 'harness.js'), bundle: true, format: 'esm', logLevel: 'silent'});
  await writeFile(path.join(tmp, 'index.html'), '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}#scene{position:absolute;inset:0}</style><div id="scene"></div><script type="module" src="harness.js"></script>');
  const server = createServer(async (req, res) => {
    const file = path.join(tmp, new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html'));
    try { const body = await readFile(file); res.writeHead(200, {'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'text/html'}); res.end(body); }
    catch { res.writeHead(404); res.end(); }
  }).listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const port = server.address().port;
  let failures = 0;
  // Three at a time: SwiftShader is CPU-bound.
  const PAR = Number(process.env.PAR || 3);
  for (let i = 0; i < ONLY.length; i += PAR) {
    await Promise.all(ONLY.slice(i, i + PAR).map(async q => {
      const {stdout} = await run('node', [path.join(repo, 'tools/qa/shot.mjs'), `http://127.0.0.1:${port}/?${q}`, '320', '240', '-', '--wait', 'window.__ready', '--settle', '200', '--eval', path.join(repo, 'tools/qa/zfight.js'), '--timeout', '200000'], {env: {...process.env, SHOT_TMP: process.env.SHOT_TMP || tmp}, maxBuffer: 1e8});
      const visible = JSON.parse(stdout.slice(stdout.indexOf('['), stdout.lastIndexOf(']') + 1)).filter(f => f.visible);
      if (visible.length) failures++;
      console.log(`${visible.length ? 'FAIL' : 'ok  '} ${q}${visible.map(f => `\n     ${f.pair} normal ${f.normal} near ${f.at}`).join('')}`);
    }));
  }
  server.close();
  if (failures) { console.error(`${failures} design(s) with z-fighting`); process.exitCode = 1; }
  else console.log(`No visible z-fighting in ${ONLY.length} designs.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
