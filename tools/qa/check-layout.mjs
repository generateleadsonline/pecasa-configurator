// Layout and accessibility across screen widths: at 320, 360, 375, 390, 768, 1024 and 1440px it
// opens every step, every dialog, the menu and the tour the way a shopper does (real clicks), and
// checks that nothing scrolls sideways, that every touch target is at least 44 x 44px, and (with
// axe-core) that there are no accessibility violations.
//
//   PLAYWRIGHT_CORE=/path/to/playwright-core AXE_CORE=/path/to/axe.min.js node tools/qa/check-layout.mjs http://localhost:4812
//
// Inline links inside running text are exempt from the target size (WCAG 2.5.8's inline
// exception); a visually hidden radio or checkbox is measured by its label, which is what is tapped.
import {createRequire} from 'module';
import {readFile} from 'node:fs/promises';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const base = (process.argv[2] || 'http://localhost:4812').replace(/\/$/, '');
const AXE = process.env.AXE_CORE ? await readFile(process.env.AXE_CORE, 'utf8') : null;
const WIDTHS = [320, 360, 375, 390, 768, 1024, 1440];
const AXE_WIDTHS = new Set(WIDTHS);
let failed = 0;
const check = (ok, label, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };

// Runs in the page: sideways overflow and undersized targets in what is visible now.
const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const visible = el => {
    if (el.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open])')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 && !el.matches('input')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const wide = [...document.querySelectorAll('body *')].filter(el => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.right <= vw + 1) return false;
    // Inside a horizontal scroller (a swatch strip) is fine; the page itself must not scroll.
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; }
    return true;
  }).slice(0, 5).map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} right=${Math.round(el.getBoundingClientRect().right)}`);
  const inline = el => el.tagName === 'A' && el.closest('p, li, small, .fine, .note') && !el.matches('.button, .btn, [class*="cta"], [class*="tile"]') && getComputedStyle(el).display === 'inline';
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"], [tabindex="0"]')) {
    let target = el;
    if (el.matches('input[type="radio"], input[type="checkbox"]')) target = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el;
    if (!visible(target) || inline(el)) continue;
    const r = target.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) small.push(`${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''}${target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\s+/).join('.') : ''} "${(target.getAttribute('aria-label') || target.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return {scrollWidth: document.documentElement.scrollWidth, vw, wide, small: [...new Set(small)]};
};

async function states(page) {
  const out = [];
  const settle = () => page.waitForTimeout(250);
  for (let i = 0; i < 6; i++) {
    await page.click(`#steps button[data-step="${i}"]`);
    await settle();
    out.push([`step ${i + 1}`, null]);
  }
  for (const d of ['callback', 'book', 'showroom', 'brochure', 'share']) {
    out.push([`dialog ${d}`, async () => {
      const trigger = page.locator(`[data-dialog="${d}"]:visible`).first();
      if (await trigger.count()) await trigger.click(); else await page.evaluate(id => document.getElementById(id).showModal(), `dlg-${d}`);
      await settle();
    }]);
  }
  out.push(['menu', async () => { if (await page.locator('#menu-toggle:visible').count()) { await page.click('#menu-toggle'); await settle(); } }]);
  out.push(['tour', async () => {
    if (await page.locator('#menu-toggle:visible').count()) { await page.click('#menu-toggle'); await settle(); }
    await page.locator('#menu-tour, #tour-open').filter({visible: true}).first().click(); await settle();
  }]);
  return out;
}

const browser = await chromium.launch({channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const totals = {axe: 0};
for (const width of WIDTHS) {
  const mobile = width < 768;
  const ctx = await browser.newContext({viewport: {width, height: mobile ? 760 : 900}, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, bypassCSP: Boolean(AXE), reducedMotion: 'reduce'});
  await ctx.addInitScript(() => { try { localStorage.setItem('pecasa-cfg-tour-v1', '1'); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(90000);
  // ?qa=1 starts the 3D at once (it changes nothing on screen); waiting for its first verified
  // frame keeps SwiftShader's start-up off the clicks being measured.
  await page.goto(base + '/configurator/?qa=1', {waitUntil: 'load'});
  for (let i = 0; i < 600 && !(await page.evaluate(() => Boolean(window.__cfg?.boot?.verified || window.__cfg?.fallback))); i++) await page.waitForTimeout(300);
  await page.waitForTimeout(300);
  const problems = {overflow: [], small: new Map(), axe: new Map()};
  const visit = async label => {
    // Let opening animations finish (a dialog pops in from 98% scale), then measure.
    await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 2000))]));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(MEASURE);
    if (m.scrollWidth > m.vw + 1 || m.wide.length) problems.overflow.push(`${label}: page ${m.scrollWidth}px in ${m.vw}px ${m.wide.join(', ')}`);
    for (const s of m.small) if (!problems.small.has(s)) problems.small.set(s, label);
    if (AXE && AXE_WIDTHS.has(width)) {
      if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({content: AXE});
      // With a modal dialog open the page behind it is inert, so the dialog is what is checked.
      const res = await page.evaluate(async () => (await window.axe.run(document.querySelector('dialog[open]') || document, {resultTypes: ['violations'], runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']}})).violations
        .map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '), count: v.nodes.length})));
      for (const v of res) { const k = `${v.id} (${v.impact}): ${v.nodes}`; if (!problems.axe.has(k)) problems.axe.set(k, label); }
    }
  };
  await visit('start');
  for (const [label, open] of await states(page)) {
    try {
      if (open) await open();
      await visit(label);
    } catch (err) { problems.overflow.push(`${label}: could not open (${err.message.split('\n')[0]})`); }
    // Close whatever opened: Escape closes dialogs, the tour and the menu.
    if (open) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); if (await page.locator('#menu-sheet:visible').count()) await page.click('#menu-toggle'); }
  }
  check(!problems.overflow.length, `${width}px: no sideways scrolling in any step, dialog, menu or tour`, problems.overflow.slice(0, 4).join(' || '));
  check(!problems.small.size, `${width}px: every touch target at least 44 x 44px`, [...problems.small].slice(0, 8).map(([s, l]) => `${s} (${l})`).join(' || '));
  if (AXE && AXE_WIDTHS.has(width)) { check(!problems.axe.size, `${width}px: axe-core finds no accessibility violations`, [...problems.axe].slice(0, 6).map(([s, l]) => `${s} (${l})`).join(' || ')); totals.axe += problems.axe.size; }
  check(!errors.length, `${width}px: no page errors`, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
if (!AXE) console.log('AXE_CORE not set: accessibility rules not run.');
console.log(failed ? `${failed} failed` : 'All layout checks passed');
process.exit(failed ? 1 : 0);
