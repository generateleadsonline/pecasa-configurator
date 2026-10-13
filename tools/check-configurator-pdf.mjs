// Server-side PDF checks: render real "Your SMART room" PDFs in Node (no WebGL, so SMART's range
// photography and a drawn plan stand in for the 3D views) and read them back with pypdf.
// Run: node tools/check-configurator-pdf.mjs   (SMART_PDF_QA_DIR=/path keeps the samples)
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = await mkdtemp(path.join(os.tmpdir(), 'smart-pdf-'));
const keep = process.env.SMART_PDF_QA_DIR;
let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
let python = null;
for (const candidate of [process.env.SMART_PDF_PYTHON, 'python3'].filter(Boolean)) {
  try { execFileSync(candidate, ['-c', 'import pypdf'], {stdio: 'pipe'}); python = candidate; break; } catch {}
}
try {
  await build({entryPoints: [path.join(repo, 'src/configurator-pdf.js')], outfile: path.join(tmp, 'pdf.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  await build({entryPoints: [path.join(repo, 'src/configurator-model.js')], outfile: path.join(tmp, 'model.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  const {downloadPDF} = await import(pathToFileURL(path.join(tmp, 'pdf.mjs')));
  const M = await import(pathToFileURL(path.join(tmp, 'model.mjs')));
  const designs = [
    {range: 'key-studio'},
    {range: 'suffolk-barn', width: 6.2, depth: 3.7, roof: 'cantilever', cladding: 'boothbay-blue', layout: 'shower', heating: 'climate', underfloor: true, blinds: 'clip-black'},
    {range: 'ultra', width: 9.8, depth: 5, canopy: {left: 3, right: 3, wallLeft: true}, deck: 'terrace'},
    {range: 'affinity', width: 1.9, depth: 1.9}
  ];
  if (keep) await mkdir(keep, {recursive: true});
  for (const input of designs) {
    const state = M.normalise(input);
    const out = await downloadPDF(state, {}, {save: false, contactName: 'Alex Example', preparedAt: '2026-10-12T10:00:00Z', siteURL: 'https://smart-modular-buildings-homepage.netlify.app/configurator/'});
    const bytes = Buffer.from(out.bytes);
    ok(bytes.subarray(0, 5).toString() === '%PDF-', `${state.range}: a PDF`);
    ok(bytes.length > 20000 && bytes.length < 4_000_000, `${state.range}: size ${bytes.length}`);
    ok(/^SMART-[a-z0-9.-]+\.pdf$/i.test(out.filename), `${state.range}: filename ${out.filename}`);
    const file = path.join(keep || tmp, out.filename);
    await writeFile(file, bytes);
    if (python) {
      const text = execFileSync(python, ['-c', 'import sys,pypdf;r=pypdf.PdfReader(sys.argv[1]);print(len(r.pages));print("\\n".join(p.extract_text() for p in r.pages));print("LINKS"," ".join(a.get_object()["/A"].get("/URI","") for p in r.pages for a in (p.get("/Annots") or [])))', file], {encoding: 'utf8'});
      const [pages] = text.split('\n');
      ok(Number(pages) === 6, `${state.range}: six pages`);
      const price = M.priceFor(state);
      ok(text.toUpperCase().includes(M.pounds(price).toUpperCase()), `${state.range}: building price ${M.pounds(price)} printed`);
      ok(text.includes(M.RANGES[state.range].name.replace('®', '')), `${state.range}: range named`);
      ok(text.includes('meetings-eu1.hubspot.com/luisa-holmes/discovery-call'), `${state.range}: booking link`);
      ok(text.includes('?v=2&r=' + state.range), `${state.range}: link back to the design`);
      for (const u of M.upgradesOf(state)) ok(text.replace(/\s+/g, ' ').includes(u.split(' (')[0].slice(0, 18)), `${state.range}: upgrade listed: ${u}`);
    }
  }
  console.log(`PDF checks passed: ${checks} assertions${python ? ', text and links read back with pypdf' : ' (pypdf not found: text not read back)'}.`);
} finally { await rm(tmp, {recursive: true, force: true}); }
