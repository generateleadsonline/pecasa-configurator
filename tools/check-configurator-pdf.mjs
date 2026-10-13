// Server-side PDF checks: render real "Your Pecasa design" PDFs in Node (no WebGL, so Pecasa's
// style photography and a drawn plan stand in for the 3D views) and read them back with pypdf.
// Run: node tools/check-configurator-pdf.mjs   (PECASA_PDF_QA_DIR=/path keeps the samples)
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = await mkdtemp(path.join(os.tmpdir(), 'pecasa-pdf-'));
const keep = process.env.PECASA_PDF_QA_DIR;
let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
let python = null;
for (const candidate of [process.env.PECASA_PDF_PYTHON, 'python3'].filter(Boolean)) {
  try { execFileSync(candidate, ['-c', 'import pypdf'], {stdio: 'pipe'}); python = candidate; break; } catch {}
}
const SITE = 'https://pecasa-garden-room-configurator.netlify.app/configurator/';
try {
  for (const f of ['pdf', 'model', 'data']) await build({entryPoints: [path.join(repo, `src/configurator-${f}.js`)], outfile: path.join(tmp, f + '.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  const {downloadPDF} = await import(pathToFileURL(path.join(tmp, 'pdf.mjs')));
  const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')));
  const D = await import(pathToFileURL(path.join(tmp, 'data.mjs')));
  const published = new Set([...Object.values(D.PLANNER_ESTIMATES), ...D.PRODUCT_CARDS.map(c => c.price), ...D.PRICE_TABLE.prices.flat()]);
  const designs = [
    {style: 'ecke'},
    {style: 'cabano', width: 5.5, depth: 4.4, layout: 'bathroom', kitchen: 'kitchenette', blinds: 'white', deck: 'front1000', electrics: {airCon: true}},
    {style: 'pergola', pergolaSides: {front: 'glass', back: 'solid', left: 'none', right: 'loggia'}},
    {style: 'levno', width: 4, depth: 3, height: 2.7},
    {style: 'lshape', width: 2.7, depth: 2.4, sedum: true, rooflight: 'r1000', addition: 'trellis'},
    // As much as a design can hold: its specification runs onto a second page.
    {style: 'apexo', width: 8, depth: 6, sedum: true, rooflight: 'r1400', rooflightCount: 2, addition: 'veranda', cornerTrims: true, deck: 'front1000', blinds: 'white', layout: 'bathroom',
      kitchen: 'kitchenette', frames: 'RAL7016', interior: 'plywood', floor: 'osb', exteriorLight: 'security', lighting: 'track', extraOpenings: true}
  ];
  if (keep) await mkdir(keep, {recursive: true});
  for (const input of designs) {
    let state = M.normalise({...input, electrics: input.extraOpenings ? Object.fromEntries(Object.keys(M.ELECTRICS).map(k => [k, true])) : input.electrics});
    if (input.extraOpenings) for (const wall of ['back', 'left', 'right', 'back']) state = M.addOpening(state, wall, 'fixed800').state;
    const out = await downloadPDF(state, {}, {save: false, contactName: 'Alex Example', preparedAt: '2026-10-13T10:00:00Z', siteURL: SITE});
    const bytes = Buffer.from(out.bytes);
    ok(bytes.subarray(0, 5).toString() === '%PDF-', `${state.style}: a PDF`);
    ok(bytes.length > 20000 && bytes.length < 6_000_000, `${state.style}: size ${bytes.length}`);
    ok(/^Pecasa-[A-Za-z-]+-[\d.]+x[\d.]+-design\.pdf$/.test(out.filename), `${state.style}: filename ${out.filename}`);
    const file = path.join(keep || tmp, out.filename);
    await writeFile(file, bytes);
    if (!python) continue;
    const text = execFileSync(python, ['-c', 'import sys,pypdf;r=pypdf.PdfReader(sys.argv[1]);print(len(r.pages));print("\\n".join(p.extract_text() for p in r.pages));print("LINKS"," ".join(a.get_object()["/A"].get("/URI","") for p in r.pages for a in (p.get("/Annots") or [])))', file], {encoding: 'utf8'});
    const flat = text.replace(/\s+/g, ' ');
    const [pages] = text.split('\n');
    ok(Number(pages) === out.pages && out.pages >= 6, `${state.style}: ${out.pages} pages`);
    if (input.extraOpenings) ok(out.pages === 7, `${state.style}: a long specification continues on a second page`);
    for (const row of M.specRows(state)) ok(flat.includes(row.label.slice(0, 14)) && flat.includes(row.value.slice(0, 14)), `${state.style}: specification line "${row.label}" printed in full`);
    const price = M.priceFor(state);
    ok(flat.toUpperCase().includes(M.pounds(price.value).toUpperCase()), `${state.style}: price ${M.pounds(price.value)} printed`);
    const amounts = [...flat.matchAll(/£\s?(\d[\d,]*)/g)].map(m => Number(m[1].replace(/,/g, '')));
    ok(amounts.every(a => published.has(a)), `${state.style}: every price printed is a published one (${amounts.join(', ')})`);
    ok(flat.toUpperCase().includes(M.STYLES[state.style].name.toUpperCase()), `${state.style}: style named`);
    const links = text.slice(text.lastIndexOf('LINKS'));
    ok(links.includes('book=1'), `${state.style}: booking link`);
    ok(links.includes(`v=1&s=${state.style}`), `${state.style}: link back to the design`);
    ok(links.includes('tel:') || flat.includes('020 8146 2200'), `${state.style}: Pecasa's phone number`);
    for (const word of ['Specification', 'Next steps', 'Alex']) ok(flat.toLowerCase().includes(word.toLowerCase()), `${state.style}: mentions ${word}`);
    for (const u of M.upgradesOf(state)) ok(flat.includes(u.split(':')[0].slice(0, 16)), `${state.style}: upgrade listed: ${u}`);
  }
  console.log(`PDF checks passed: ${checks} assertions${python ? ', text and links read back with pypdf' : ' (pypdf not found: text not read back)'}.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
