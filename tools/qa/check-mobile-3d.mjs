// Phone and old-browser checks for the 3D designer, in real WebKit (Safari's engine) and Chrome
// through Playwright. Not part of `npm run check`: it needs playwright-core and its WebKit build.
//
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node tools/qa/check-mobile-3d.mjs http://localhost:4933
//
// Scenarios: iPhone load and memory, every range and colour, a lost GPU context (once, then
// repeatedly), no WebGL at all, WebGL1 only, shaders that will not link (all, or only the full
// PBR ones), a GPU that draws nothing, a setup fault after the context exists, early reloads,
// the crash guard, ?debug3d, 2D canvases refused, PDF capture size, Android. Live WebGL contexts
// are counted throughout: a step down must never leave one behind.
import {createRequire} from 'module';
import {RANGES, RANGE_ORDER} from '../../src/configurator-data.js';

const require = createRequire(import.meta.url);
const {webkit, chromium, devices} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const base = (process.argv[2] || 'http://localhost:4933').replace(/\/$/, '');
const only = process.argv[3];
let failed = 0;
const check = (ok, label, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };

// Live canvas memory: every canvas that has had a context, minus those released (0 x 0).
const MEMORY = () => {
  const refs = []; window.__canvases = refs;
  const orig = HTMLCanvasElement.prototype.getContext;
  const contexts = window.__contexts = [];
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    if (/webgl/.test(type)) this.__gl = 1;
    else if (!this.__seen) { this.__seen = 1; refs.push(new WeakRef(this)); }
    const c = orig.call(this, type, ...a);
    if (c && /webgl/.test(type) && !contexts.includes(c)) contexts.push(c);
    return c;
  };
  window.__liveContexts = () => contexts.filter(c => !c.isContextLost()).length;
  window.__liveCanvasMB = () => +(refs.reduce((t, r) => { const c = r.deref(); return t + (c && !c.__gl ? c.width * c.height * 4 : 0); }, 0) / 1048576).toFixed(1);
};
const NO_WEBGL = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : orig.call(this, type, ...a); };
};
const WEBGL1_ONLY = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { return type === 'webgl2' ? null : orig.call(this, type, ...a); };
};
// A GPU that makes a context but cannot link the shaders (seen on CS Garden Offices, Pixel 10).
const NO_LINK = () => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean)) {
    const orig = C.prototype.getProgramParameter;
    C.prototype.getProgramParameter = function (p, name) { return name === this.LINK_STATUS ? false : orig.call(this, p, name); };
  }
};
// Only the full physically based shaders fail (Three's STANDARD and PHYSICAL defines); Lambert links.
const NO_PBR = () => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean)) {
    const src = new WeakMap(), shaderSource = C.prototype.shaderSource, attach = C.prototype.attachShader, param = C.prototype.getProgramParameter;
    C.prototype.shaderSource = function (sh, text) { src.set(sh, text); return shaderSource.call(this, sh, text); };
    C.prototype.attachShader = function (p, sh) { if (/#define (STANDARD|PHYSICAL)/.test(src.get(sh) || '')) p.__pbr = true; return attach.call(this, p, sh); };
    C.prototype.getProgramParameter = function (p, name) { return name === this.LINK_STATUS && p.__pbr ? false : param.call(this, p, name); };
  }
};
// A GPU that takes every draw call and draws nothing.
const NO_DRAW = () => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean)) {
    for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear']) if (C.prototype[f]) C.prototype[f] = function () {};
  }
};
// One throw during scene setup, after the WebGL context exists.
const SETUP_FAULT = () => {
  const RO = window.ResizeObserver; let n = 0;
  window.ResizeObserver = class extends RO { constructor(cb) { if (n++ === 0) throw new Error('injected setup fault'); super(cb); } };
};
// iOS behaviour once the site's canvas budget is spent: getContext('2d') returns null.
const NO_2D = () => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { return type === '2d' && this.width >= 256 ? null : orig.call(this, type, ...a); };
};

async function open(browserType, device, {init = [], query = '?qa=1', fresh = true} = {}) {
  // Headless Chrome has no GPU here: SwiftShader gives it real (slow) WebGL.
  const browser = await browserType.launch(browserType === chromium ? {channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']} : {});
  const ctx = await browser.newContext({...devices[device]});
  for (const f of [MEMORY, ...init]) await ctx.addInitScript(typeof f === 'string' ? {content: f} : f);
  // Skip the first-run tour so it does not cover the stage.
  if (fresh) await ctx.addInitScript(() => { try { localStorage.setItem('pecasa-cfg-tour-v1', '1'); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + '/configurator/' + query, {waitUntil: 'load'});
  await waitFor(page, () => window.__cfg && (window.__cfg.scene || window.__cfg.fallback), null, 90000);
  return {browser, page, errors};
}
const status = page => page.evaluate(() => ({
  ready: Boolean(window.__cfg.scene), fallback: window.__cfg.fallback || null,
  fallbackShown: !document.getElementById('stage-fallback').hidden, loader: !document.getElementById('stage-loader').hidden,
  retry: !document.getElementById('fallback-retry').hidden, caption: document.getElementById('fallback-caption').textContent,
  quality: window.__cfg.scene?.quality(), canvasMB: window.__liveCanvasMB(), attempt: window.__cfg.attempt,
  rung: window.__cfg.rung, contexts: window.__liveContexts(), canvases: document.querySelectorAll('#scene canvas').length,
  steps: window.__cfg.boot.log.filter(e => e.event === 'step').map(e => e.detail)
}));
// Polls with plain evaluate calls: waitForFunction evaluates a string in the page, which the
// live CSP refuses.
async function waitFor(page, fn, arg, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(fn, arg)) return;
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('timed out waiting for ' + fn);
}
// Playwright's screenshot injects a stylesheet the live CSP refuses, so page errors are read
// before any screenshot.
// Waits for the boot to finish: a verified frame on some rung, or the photo.
const settle = async page => { await waitFor(page, () => window.__cfg.fallback || window.__cfg.boot.verified, null, 90000); await frames(page); };
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300)))));

const scenarios = {
  async iphone() {
    const {browser, page, errors} = await open(webkit, 'iPhone 15 Pro');
    await settle(page);
    let s = await status(page);
    check(s.ready && !s.fallbackShown, 'iPhone: 3D starts', JSON.stringify(s.quality));
    check(s.quality?.tier === 'medium' && s.quality.scale === .5 && s.quality.ratio <= 1.5, 'iPhone: phone tier (half-size textures, ratio <= 1.5)');
    check(s.canvasMB < 4, 'iPhone: canvases released after upload', `${s.canvasMB}MB live`);
    // Every range, then every Suffolk Barn colour, the way a shopper browses.
    const designs = RANGE_ORDER.flatMap(range => RANGES[range].claddings.map(c => ({range, cladding: c.key})));
    const peak = await page.evaluate(async designs => {
      const {scene} = window.__cfg; let peak = 0, maxTextures = 0;
      const frame = () => new Promise(r => requestAnimationFrame(() => r()));
      for (const d of designs) {
        scene.update({...window.__cfg.state, ...d}); await frame();
        peak = Math.max(peak, window.__liveCanvasMB()); maxTextures = Math.max(maxTextures, scene.quality().textures);
      }
      return {designs: designs.length, peak, maxTextures, after: window.__liveCanvasMB(), lost: scene.quality().lost};
    }, designs);
    check(peak.peak < 16 && peak.after < 4 && !peak.lost, 'iPhone: canvas memory stays small across every range and colour', JSON.stringify(peak));
    check(peak.maxTextures <= 30, 'iPhone: texture cache stays bounded', `${peak.maxTextures} textures at most`);
    // The PDF views render smaller on a phone.
    const shot = await page.evaluate(async () => {
      const out = window.__cfg.scene.capture(['hero'], {width: 1800, height: 1125});
      const img = new Image(); img.src = out.hero; await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    });
    check(shot[0] === 1440 && shot[1] === 900, 'iPhone: PDF capture at 1440 x 900', shot.join(' x '));
    check(!errors.length, 'iPhone: no page errors', errors.slice(0, 3).join(' | '));
    await page.screenshot({path: process.env.SHOTS ? process.env.SHOTS + '/iphone-3d.png' : 'iphone-3d.png'});
    s = await status(page);
    await browser.close();
  },

  async lost() {
    const {browser, page} = await open(webkit, 'iPhone 15 Pro');
    await settle(page);
    // Settled: past attempt n with a scene that has its context, or showing the photo. A
    // function, not a string: the live CSP refuses eval.
    const settled = n => window.__cfg.attempt >= n && (window.__cfg.fallback || (window.__cfg.scene && !window.__cfg.scene.quality().lost));
    await page.evaluate(() => document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await waitFor(page, settled, 1);
    await settle(page);
    const s = await status(page);
    check(s.ready && !s.fallbackShown && !s.loader, 'Lost context: preview rebuilds itself', JSON.stringify(s.quality));
    check(s.quality.tier === 'low' && !s.quality.lost, 'Lost context: rebuilt at the light tier');
    check(s.canvases === 1 && s.contexts === 1, 'Lost context: old canvas removed, one live context', `${s.canvases} canvases, ${s.contexts} contexts`);
    // Losing it again and again ends in the flat SVG 3D, not a loop and not a photo.
    for (let i = 0; i < 3 && await page.evaluate(() => Boolean(document.querySelector('#scene canvas'))); i++) {
      await page.evaluate(() => document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
      await waitFor(page, settled, i + 2);
      await settle(page);
    }
    const f = await status(page);
    check(f.ready && !f.fallbackShown && f.quality.tier === 'svg' && f.quality.svg.paths > 50, 'Repeated loss: low, then safe, then the SVG 3D', f.steps.join(' / '));
    await browser.close();
  },

  async nowebgl() {
    const {browser, page, errors} = await open(webkit, 'iPhone 15 Pro', {init: [NO_WEBGL]});
    await settle(page);
    const s = await status(page);
    check(s.ready && !s.fallbackShown && s.quality?.tier === 'svg' && s.quality.svg.paths > 50, 'No WebGL: the 3D is drawn as SVG', JSON.stringify(s.quality));
    // Every view and a zoom still work in SVG.
    const views = await page.evaluate(async () => {
      const out = {}, sc = window.__cfg.scene, wait = ms => new Promise(r => setTimeout(r, ms));
      for (const v of ['inside', 'plan', 'outside']) { sc.setView(v, {animate: false}); await wait(400); out[v] = sc.quality().svg.paths; }
      return out;
    });
    check(Object.values(views).every(n => n > 20), 'No WebGL: outside, inside and plan all draw', JSON.stringify(views));
    check(s.quality.svg.ms < 400, 'No WebGL: an SVG frame draws fast enough to orbit', `${s.quality.svg.ms}ms`);
    check(!errors.length, 'No WebGL: no page errors (CSP allows the SVG)', errors.slice(0, 3).join(' | '));
    await page.screenshot({path: process.env.SHOTS ? process.env.SHOTS + '/iphone-svg.png' : 'iphone-svg.png'});
    await browser.close();
  },

  async webgl1() {
    const {browser, page, errors} = await open(webkit, 'iPhone 15 Pro', {init: [WEBGL1_ONLY]});
    await settle(page);
    const s = await status(page);
    check(s.ready && s.quality?.webgl === 1 && s.quality.tier === 'low', 'WebGL1 only: 3D starts on the r162 build', JSON.stringify(s.quality));
    check(!errors.length, 'WebGL1 only: no page errors', errors.slice(0, 3).join(' | '));
    await page.screenshot({path: process.env.SHOTS ? process.env.SHOTS + '/iphone-webgl1.png' : 'iphone-webgl1.png'});
    await browser.close();
  },

  async no2d() {
    const {browser, page} = await open(webkit, 'iPhone 15 Pro', {init: [NO_2D]});
    await settle(page);
    const s = await status(page);
    check(s.ready && !s.fallbackShown && s.quality.failures > 0, 'Canvas budget spent: 3D still starts with flat colours', JSON.stringify(s.quality));
    await browser.close();
  },

  async broken() {
    const {browser, page} = await open(webkit, 'iPhone 15 Pro', {init: [NO_LINK]});
    await settle(page);
    const s = await status(page);
    check(s.ready && s.rung === 'svg' && !s.fallbackShown, 'No shader links: safe tier tried, then the SVG 3D', s.steps.join(' / '));
    check(s.contexts === 0, 'No shader links: no WebGL context left behind', `${s.contexts} live`);
    await browser.close();
  },

  async pbr() {
    const {browser, page, errors} = await open(webkit, 'iPhone 15 Pro', {init: [NO_PBR]});
    await settle(page);
    const s = await status(page);
    check(s.ready && s.rung === 'safe' && s.quality.webgl === 2, 'Full shaders fail, simple ones link: real 3D on the safe tier', s.steps.join(' / '));
    check(s.contexts === 1 && s.canvases === 1, 'Full shaders fail: one live context, one canvas', `${s.contexts} contexts, ${s.canvases} canvases`);
    const shot = await page.evaluate(async () => { const out = window.__cfg.scene.capture(['hero'], {width: 1800, height: 1125}); return Boolean(out.hero); });
    check(shot, 'Safe tier: the PDF still gets real renders');
    await browser.close();
  },

  async blank() {
    const {browser, page} = await open(webkit, 'iPhone 15 Pro', {init: [NO_DRAW]});
    await settle(page);
    const s = await status(page);
    check(s.ready && s.rung === 'svg', 'GPU draws nothing: detected, safe tried, then the SVG 3D', s.steps.join(' / '));
    check(s.contexts === 0, 'GPU draws nothing: no WebGL context left behind', `${s.contexts} live`);
    await browser.close();
  },

  async setup() {
    const {browser, page, errors} = await open(webkit, 'iPhone 15 Pro', {init: [SETUP_FAULT]});
    await settle(page);
    const s = await status(page);
    check(s.ready && s.rung === 'low' && s.quality.webgl === 2, 'Setup fault after the context exists: one rung down, still WebGL', s.steps.join(' / '));
    check(s.contexts === 1 && s.canvases === 1, 'Setup fault: the failed attempt left no context or canvas behind', `${s.contexts} contexts, ${s.canvases} canvases`);
    await browser.close();
  },

  async reloads() {
    // Two reloads before the first frame (an impatient pull-to-refresh on mobile data), then a
    // normal load: the old guard counted both as crashes and showed the flat view.
    const {browser, page} = await open(chromium, 'Pixel 7');
    for (let i = 0; i < 2; i++) { await page.goto(base + '/configurator/?qa=1', {waitUntil: 'domcontentloaded'}); await page.waitForTimeout(150); }
    await page.goto(base + '/configurator/?qa=1', {waitUntil: 'load'});
    await waitFor(page, () => window.__cfg && (window.__cfg.scene || window.__cfg.fallback), null, 90000);
    await settle(page);
    const s = await status(page);
    check(s.ready && s.rung === 'medium', 'Early reloads are not crashes: full phone 3D on the next load', s.rung);
    check(s.contexts === 1, 'Early reloads: one live context (the probe releases its own)', `${s.contexts} live`);
    await browser.close();
  },

  async crashguard() {
    for (const [crashed, expect] of [['medium', 'low'], ['low', 'safe']]) {
      const {browser, page} = await open(webkit, 'iPhone 15 Pro', {init: [`try { sessionStorage.setItem('pecasa-3d-boot', JSON.stringify({rung: '${crashed}', at: Date.now()})); } catch {}`]});
      await settle(page);
      const s = await status(page);
      check(s.ready && s.rung === expect, `Crash guard: the tab died building ${crashed} -> starts at ${expect}`, s.rung);
      const left = await page.evaluate(() => [sessionStorage.getItem('pecasa-3d-boot'), JSON.parse(localStorage.getItem('pecasa-3d-ceiling') || 'null')?.rung]);
      check(left[0] === null && left[1] === expect, `Crash guard: cleared after a good frame; ${expect} is this device's ceiling for a day`, JSON.stringify(left));
      await browser.close();
    }
  },

  async debug() {
    const {browser, page} = await open(webkit, 'iPhone 15 Pro', {query: '?qa=1&debug3d'});
    await waitFor(page, () => /verified/.test(document.querySelector('#debug3d pre')?.textContent || ''), null);
    const text = await page.evaluate(() => document.querySelector('#debug3d pre').textContent);
    check(/3D: medium/.test(text) && /WebGL 2/.test(text) && /GPU: \S/.test(text) && /verified/.test(text), '?debug3d: panel names the tier, WebGL level, GPU and each boot step', text.split('\n').slice(0, 2).join(' | '));
    await browser.close();
  },

  async android() {
    const {browser, page, errors} = await open(chromium, 'Pixel 7');
    await settle(page);
    const s = await status(page);
    check(s.ready && !s.fallbackShown && s.quality.tier === 'medium', 'Android Chrome: 3D starts at the phone tier', JSON.stringify(s.quality));
    check(!errors.length, 'Android Chrome: no page errors', errors.slice(0, 3).join(' | '));
    await page.screenshot({path: process.env.SHOTS ? process.env.SHOTS + '/android-3d.png' : 'android-3d.png'});
    await browser.close();
  }
};

for (const [name, run] of Object.entries(scenarios)) {
  if (only && only !== name) continue;
  try { await run(); } catch (err) { check(false, `${name}: scenario crashed`, err.message.split('\n')[0]); }
}
console.log(failed ? `${failed} failed` : 'All mobile 3D checks passed');
process.exit(failed ? 1 : 0);
