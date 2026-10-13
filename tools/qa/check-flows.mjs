// End-to-end shopper flows in Chrome: the 3D loads only when needed; the first-visit tour and
// replaying it from Help; outside, inside and plan views with dimensions in plan; zoom by buttons,
// scroll and pinch; the header and price-page calls to action; every form's validation (UK phone
// numbering, required fields) and its payload (separate names, E.164 phone, the full specification
// and a link to the design); and the analytics events. Every form POST is intercepted and answered
// here, so nothing reaches Netlify Forms, and external pages are blocked.
//
//   PLAYWRIGHT_CORE=/path/to/playwright-core node tools/qa/check-flows.mjs http://localhost:4812
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const {chromium, devices} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const base = (process.argv[2] || 'http://localhost:4812').replace(/\/$/, '');
let failed = 0;
const check = (ok, label, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };
const browser = await chromium.launch({channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});

async function context(opts = {}, {tour = false} = {}) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce', ...opts});
  if (!tour) await ctx.addInitScript(() => { try { localStorage.setItem('pecasa-cfg-tour-v1', '1'); } catch {} });
  // Nothing leaves this machine: forms are answered here, other sites are refused.
  const posts = [];
  await ctx.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'POST') { posts.push({url: req.url(), body: Object.fromEntries(new URLSearchParams(req.postData() || ''))}); return route.fulfill({status: 200, contentType: 'text/html', body: 'ok'}); }
    if (url.origin !== new URL(base).origin) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return {ctx, page, posts, errors};
}
const ready = async page => { for (let i = 0; i < 600 && !(await page.evaluate(() => Boolean(window.__cfg?.boot?.verified || window.__cfg?.fallback))); i++) await page.waitForTimeout(300); };
const events = page => page.evaluate(() => (window.dataLayer || []).map(e => e.event));
const distance = page => page.evaluate(() => { const d = window.__cfg.scene._debug(); return d.view === 'inside' ? 100 - d.camera.fov : d.camera.position.distanceTo(d.controls.target); });

// ---- 1. The 3D loads only when needed --------------------------------------------------------
{
  const {ctx, page} = await context();
  const scripts = [];
  page.on('request', r => { if (/\/assets\/js\/scene/.test(r.url())) scripts.push(r.url()); });
  await page.goto(base + '/configurator/', {waitUntil: 'load'});
  await page.waitForTimeout(800);
  check(scripts.length === 0 && await page.isVisible('#stage-poster'), '3D on demand: no 3D code before it is needed; the style poster shows instead');
  await page.click('#steps button[data-step="1"]');
  await page.waitForFunction(() => window.dataLayer?.some(e => e.event === 'configurator_3d_start'), null, {timeout: 120000}).catch(() => {});
  check(scripts.length === 1, '3D on demand: the first interaction loads it', scripts.map(s => s.split('/').pop()).join(', '));
  await ctx.close();
}

// ---- 2. Tour: shown on a first visit, replayable from Help -------------------------------------
{
  const {ctx, page} = await context({}, {tour: true});
  // The real page (the tour stays out of ?qa runs): it starts once the 3D is up.
  await page.goto(base + '/configurator/', {waitUntil: 'load'});
  await page.waitForSelector('#tour-card', {state: 'visible', timeout: 180000}).catch(() => {});
  check(await page.isVisible('#tour-card'), 'Tour: opens on a first visit');
  let n = 0;
  while (await page.isVisible('#tour-card') && n < 12) { await page.click('#tour-next'); n++; await page.waitForTimeout(120); }
  check(n >= 3 && !(await page.isVisible('#tour-card')), `Tour: ${n} short steps, then it closes`);
  await page.reload({waitUntil: 'load'}); await page.waitForTimeout(1200);
  check(!(await page.isVisible('#tour-card')), 'Tour: not shown again on the next visit');
  await page.click('#tour-open');
  check(await page.isVisible('#tour-card'), 'Tour: replays from Help');
  await page.click('#tour-skip');
  await ctx.close();
}

// ---- 3. Views, plan dimensions, zoom, calls to action, forms, analytics --------------------------
{
  const {ctx, page, posts, errors} = await context();
  await page.goto(base + '/configurator/?qa=1&v=1&s=levno', {waitUntil: 'load'});
  await ready(page);
  for (const v of ['inside', 'plan', 'outside']) {
    await page.click(`.view-switch [data-view="${v}"]`); await page.waitForTimeout(300);
    const got = await page.evaluate(() => window.__cfg.scene.view);
    check(got === v, `Views: ${v}`);
    if (v === 'plan') {
      const labels = await page.evaluate(() => [...document.querySelectorAll('.scene-overlay text')].map(t => t.textContent));
      check(labels.includes('4.8m') && labels.includes('3.4m') && labels.includes('3.2m') && labels.filter(t => t === '1.8m').length === 2 && labels.some(t => /inside/.test(t)), 'Plan view: overall and inside sizes, every door and window width', labels.slice(0, 8).join(' | '));
    }
  }
  // Zoom by the buttons and by scrolling, outside and inside.
  const d0 = await distance(page);
  await page.click('#zoom-in'); await page.waitForTimeout(350);
  const d1 = await distance(page);
  await page.click('#zoom-out'); await page.click('#zoom-out'); await page.waitForTimeout(350);
  const d2 = await distance(page);
  check(d1 < d0 && d2 > d1, 'Zoom: + and - buttons move the camera in and out', `${d0.toFixed(2)} -> ${d1.toFixed(2)} -> ${d2.toFixed(2)}`);
  const box = await page.locator('#scene canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600); await page.waitForTimeout(500);
  check(await distance(page) < d2, 'Zoom: the scroll wheel zooms in');
  await page.click('.view-switch [data-view="inside"]'); await page.waitForTimeout(300);
  const f0 = await distance(page); await page.click('#zoom-in'); await page.waitForTimeout(200);
  check(await distance(page) > f0, 'Zoom: + narrows the view inside the room');
  await page.click('.view-switch [data-view="outside"]');

  // Selling points beside each step.
  const usps = [];
  for (let i = 0; i < 6; i++) { await page.click(`#steps button[data-step="${i}"]`); await page.waitForTimeout(150); usps.push(await page.textContent('#stage-usps')); }
  check(usps.every(u => u.trim().length > 10) && new Set(usps).size >= 4, 'Selling points: shown beside every step, matched to it', usps.map(u => u.trim().slice(0, 28)).join(' | '));

  // Header calls to action.
  await page.click('#steps button[data-step="0"]');
  check(await page.getAttribute('.header a[href^="tel:"]', 'href') === 'tel:+442081462200', 'Header: phone number links to 020 8146 2200');
  for (const [d, title] of [['callback', '#callback-title'], ['showroom', '#showroom-title'], ['brochure', '#brochure-title']]) {
    await page.click(`.header [data-dialog="${d}"]`); await page.waitForTimeout(200);
    check(await page.isVisible(title), `Header: ${d} opens its form`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  }
  // Price page: Book a call and Download PDF (locked until the design is sent).
  await page.click('#steps button[data-step="5"]'); await page.waitForTimeout(200);
  await page.locator('[data-dialog="book"]:visible').first().click(); await page.waitForTimeout(200);
  check(await page.isVisible('#book-title'), 'Price page: Book a call opens the booking form');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.click('#pdf-download'); await page.waitForTimeout(200);
  check(/details/.test(await page.textContent('#pdf-status')) && await page.evaluate(() => document.activeElement.id) === 'q-first', 'Price page: Download PDF asks for details first, then focuses the form');

  // Forms: empty, a reserved number, then valid; every POST captured here.
  const fill = async (prefix, phone) => {
    const id = n => prefix === 'q' ? `#q-${{'first-name': 'first', 'last-name': 'last'}[n] || n}` : `#${prefix}-${n}`;
    await page.fill(id('first-name'), 'Alex'); await page.fill(id('last-name'), 'Example');
    await page.fill(id('email'), 'alex@example.com'); await page.fill(id('phone'), phone); await page.fill(id('postcode'), 'wd24 4pt');
  };
  const forms = [
    {name: 'pecasa-design-quote', prefix: 'q', open: null, form: '#quote-form'},
    {name: 'pecasa-callback', prefix: 'cb', open: 'callback', form: 'form[name="pecasa-callback"]'},
    {name: 'pecasa-book-call', prefix: 'bk', open: 'book', form: 'form[name="pecasa-book-call"]'},
    {name: 'pecasa-showroom-visit', prefix: 'sv', open: 'showroom', form: 'form[name="pecasa-showroom-visit"]'},
    {name: 'pecasa-brochure', prefix: 'br', open: 'brochure', form: 'form[name="pecasa-brochure"]'}
  ];
  for (const f of forms) {
    if (f.open) { await page.evaluate(d => document.querySelector(`[data-dialog="${d}"]`).click(), f.open); await page.waitForTimeout(200); }
    // Once details are given, every other form opens filled in; clear it to test validation.
    if (f.prefix !== 'q') check(await page.inputValue(`${f.form} [name="first-name"]`) === 'Alex' && await page.inputValue(`${f.form} [name="phone"]`) === '07912 345678', `${f.name}: opens filled in with the details already given`);
    for (const n of ['first-name', 'last-name', 'email', 'phone', 'postcode']) await page.fill(`${f.form} [name="${n}"]`, '');
    const before = posts.length;
    await page.click(`${f.form} [type="submit"]`); await page.waitForTimeout(200);
    const shown = await page.evaluate(sel => [...document.querySelectorAll(`${sel} .field-error`)].filter(e => !e.hidden).length, f.form);
    check(posts.length === before && shown >= 5, `${f.name}: empty form refused, ${shown} fields flagged`);
    await fill(f.prefix, '07700 900123');
    if (f.prefix === 'bk') {
      const day = new Date(Date.now() + 7 * 864e5); if (day.getDay() === 0) day.setDate(day.getDate() + 1);
      await page.fill('#bk-date', day.toISOString().slice(0, 10)); await page.selectOption('#bk-time', {index: 2});
    }
    await page.click(`${f.form} [type="submit"]`); await page.waitForTimeout(200);
    const phoneError = await page.evaluate(sel => document.querySelector(`${sel} [name="phone"]`).getAttribute('aria-invalid') === 'true' && document.querySelector(`${sel} [name="phone"]`).closest('.field').querySelector('.field-error').textContent, f.form);
    check(posts.length === before && /reserved/.test(phoneError || ''), `${f.name}: a reserved (Ofcom drama) number is refused`, phoneError || '');
    await page.fill(`${f.form} [name="phone"]`, '07912 345678');
    await page.click(`${f.form} [type="submit"]`);
    await page.waitForFunction(n => window.dataLayer.filter(e => e.event === 'generate_lead').length >= n, forms.indexOf(f) + 1, {timeout: 20000}).catch(() => {});
    const sent = posts.slice(before);
    const b = sent[0]?.body || {};
    check(sent.length === 1 && new URL(sent[0].url).pathname === '/configurator/', `${f.name}: one POST to Netlify Forms (intercepted)`);
    check(b['form-name'] === f.name && b['first-name'] === 'Alex' && b['last-name'] === 'Example' && b.email === 'alex@example.com' && b['phone-e164'] === '+447912345678' && b.postcode && b.company === '',
      `${f.name}: separate first and last names, email, E.164 phone, postcode; honeypot empty`, `${b.phone} ${b['phone-e164']} ${b.postcode}`);
    check(/^https?:\/\/.+\/configurator\/\?v=1&s=levno/.test(b['design-link'] || '') && /Levno/.test(b['design-summary'] || '') && (b['design-summary'] || '').split('\n').length > 15 && b.style === 'Levno',
      `${f.name}: the full specification and a link to the design are attached`, `${(b['design-summary'] || '').split('\n').length} lines`);
    if (f.prefix === 'q') check(await page.isVisible('#quote-unlocked') && /£28,109/.test(await page.textContent('#quote-unlocked')) && await page.isVisible('#quote-unlocked [data-dialog="book"]'), 'Quote: the price shows after sending, with Book a call');
    else { check(await page.isVisible(`#dlg-${f.open} .dialog-done`), `${f.name}: confirmation shown`); await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
  }
  check(posts.length === 5, 'Forms: exactly five intercepted POSTs, none sent anywhere', `${posts.length}`);

  // Analytics: every step and every call to action.
  const ev = await events(page);
  const need = ['configurator_view', 'configurator_step_view', 'configurator_view_change', 'configurator_zoom', 'cta_click', 'dialog_open', 'configurator_form_error', 'configurator_enquiry_saved', 'generate_lead', 'configurator_pdf_locked'];
  check(need.every(e => ev.includes(e)), 'Analytics: views, steps, zoom, calls to action, form errors and leads all reach the dataLayer', need.filter(e => !ev.includes(e)).join(', '));
  const steps = await page.evaluate(() => [...new Set(window.dataLayer.filter(e => e.event === 'configurator_step_view').map(e => e.step))].sort());
  check(steps.length === 6, 'Analytics: a step event for each of the six steps', steps.join(','));
  check(!errors.length, 'No page errors through the whole journey', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ---- 4. Pinch to zoom on a phone ----------------------------------------------------------------
{
  const {ctx, page} = await context({...devices['Pixel 7'], reducedMotion: 'reduce'});
  await page.goto(base + '/configurator/?qa=1', {waitUntil: 'load'});
  await ready(page);
  const box = await page.locator('#scene canvas').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(page);
  const d0 = await distance(page);
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: cx - 30, y: cy, id: 1}, {x: cx + 30, y: cy, id: 2}]});
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: cx - 30 - i * 9, y: cy, id: 1}, {x: cx + 30 + i * 9, y: cy, id: 2}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await page.waitForTimeout(500);
  const d1 = await distance(page);
  check(d1 < d0 - .1, 'Pinch: spreading two fingers zooms in on a phone', `${d0.toFixed(2)} -> ${d1.toFixed(2)}`);
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} failed` : 'All flow checks passed');
process.exit(failed ? 1 : 0);
