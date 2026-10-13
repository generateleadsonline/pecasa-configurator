// Renders a matrix of designs in headless Chrome (real WebGL) and fails if any two visible faces
// share a plane and overlap (z-fighting: flicker and blotches on real GPUs).
// Run: node tools/qa/check-zfighting.mjs   (needs Google Chrome; takes a few minutes)
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const run = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = await mkdtemp(path.join(os.tmpdir(), 'pecasa-zfight-'));
const DESIGNS = [
  'r=key-studio&w=4.4&d=3.1&cn=21100&dk=terrace', 'r=belle&w=5&d=3.1&cn=11010&dk=frame&el=bulkhead',
  'r=evolve&w=5&d=3.1&cn=30100&dk=terrace', 'r=affinity&w=5.6&d=2.5&cn=20200&dk=frame',
  'r=ultra&w=5.6&d=3.1&cn=02010&dk=terrace', 'r=suffolk-barn&w=5&d=3.1&dk=frame&cn=10001',
  'r=ultra&w=5.6&d=3.1&rf=highline&cn=11110', 'r=belle&w=5&d=3.1&rf=lowline&cn=10100&dk=frame',
  'r=key-studio&w=4.4&d=3.1&rf=viewline&cn=01010', 'r=suffolk-barn&w=6.2&d=3.7&rf=cantilever&dk=terrace&cn=10100',
  'r=suffolk-barn&w=3.1&d=5&rf=mono&cn=01010', 'r=affinity&w=5.6&d=3.1&rf=viewline&cn=20100',
  'r=evolve&w=9.8&d=3.1&o=f.single.0600_f.french.1600_f.slide2.2800_f.bifold2.4000_f.solid.5150_f.hidden.6150_f.slide3.8050&bl=int-white&fr=grey&el=lantern',
  'r=belle&w=9.8&d=3.1&o=f.fcSlim.0500_f.fcFull.1300_f.fcTop.2500_f.singleWin.3500_f.doubleWin.4500_f.trebleWin.5800_f.topHung.7200_f.eyeLevel.8600.o&bl=clip-anthracite&fr=white',
  'r=ultra&w=9.8&d=5&o=f.slide4.3000_f.bifold3.7500_bk.trebleWin.5000_l.fcFull.5000_r.doubleWin.5000&b=own&ly=shower&h=climate',
  'r=key-studio&w=1.9&d=1.9', 'r=belle&w=6.2&d=3.7&ly=store&li=panel&i=newengland1&e=usb.external.dimmer.internet.mains&uf=1',
  'r=evolve&w=5.6&d=3.7&ly=cloakroom&li=spots&i=newengland2&u=gym', 'r=key-studio&w=9.8&d=5&rf=highline&u=retreat&dk=terrace&cn=33110'
];
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
  for (let i = 0; i < DESIGNS.length; i += 3) {
    await Promise.all(DESIGNS.slice(i, i + 3).map(async q => {
      const {stdout} = await run('node', [path.join(repo, 'tools/qa/shot.mjs'), `http://127.0.0.1:${port}/?v=2&${q}`, '320', '240', '-', '--wait', 'window.__ready', '--settle', '200', '--eval', path.join(repo, 'tools/qa/zfight.js'), '--timeout', '200000'], {env: {...process.env, SHOT_TMP: process.env.SHOT_TMP || tmp}, maxBuffer: 1e8});
      const visible = JSON.parse(stdout.slice(stdout.indexOf('['), stdout.lastIndexOf(']') + 1)).filter(f => f.visible);
      if (visible.length) failures++;
      console.log(`${visible.length ? 'FAIL' : 'ok  '} ${q}${visible.map(f => `\n     ${f.pair} normal ${f.normal} near ${f.at}`).join('')}`);
    }));
  }
  server.close();
  if (failures) { console.error(`${failures} design(s) with z-fighting`); process.exitCode = 1; }
  else console.log(`No visible z-fighting in ${DESIGNS.length} designs.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
