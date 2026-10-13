// "Your SMART room" PDF: the visitor's design in eight rendered views, its full specification,
// the published building price and the next steps. The same generator runs in the browser (with
// views captured from the 3D scene) and in the Netlify function (with SMART's range photography
// and a drawn plan instead, since there is no WebGL there).
import {jsPDF} from 'jspdf';
import qrcode from 'qrcode-generator';
import {normalise, priceFor, pounds, metres, specRows, upgradesOf, summary, claddingName, lower, OPENINGS, WALLS, RANGES, ROOFS, USES, wallLength} from './configurator-model.js';
import {USPS, CONTACT} from './configurator-data.js';
import {PDF_FONTS, PDF_LOGO, PDF_LOGO_NEGATIVE, PDF_RANGE_PHOTOS} from './configurator-pdf-assets.js';

const C = {forest: '#052921', pine: '#006936', signal: '#08de26', leaf: '#24a63d', mist: '#edf3ef', ink: '#183c30', muted: '#486356', line: '#cbd9d0', paper: '#ffffff', frost: '#cbded2'};
const W = 210, H = 297, M = 16, CW = W - 2 * M, PAGES = 6;

function reference(state) {
  let n = 2166136261;
  for (const ch of JSON.stringify({...state, step: 0, openings: state.openings.map(o => [o.wall, o.type, o.p])})) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  return 'SMART-' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * @param input  a design state (or anything normalise() accepts)
 * @param views  {hero, front, rear, aerial, interior, interior2, plan, dusk}: JPEG data URLs
 * @param options {contactName, preparedAt, save=true, siteURL}
 */
export async function downloadPDF(input, views = {}, options = {}) {
  const state = normalise(input), r = RANGES[state.range], price = priceFor(state);
  const shots = views && typeof views === 'object' ? views : {};
  const base = options.siteURL || (typeof location !== 'undefined' ? location.origin + '/configurator/' : 'https://smart-modular-buildings-homepage.netlify.app/configurator/');
  const s = summary(state, base), link = s.designLink, ref = reference(state);
  const prepared = new Date(options.preparedAt || Date.now());
  const date = (Number.isFinite(prepared.getTime()) ? prepared : new Date()).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'});
  const first = String(options.contactName || '').trim().split(/\s+/)[0].slice(0, 30);
  const pdf = new jsPDF({unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true});
  for (const [key, family, style] of [['regular', 'Figtree', 'normal'], ['semibold', 'Figtree', 'bold'], ['heading', 'Saira', 'bold']]) { pdf.addFileToVFS(key + '.ttf', PDF_FONTS[key]); pdf.addFont(key + '.ttf', family, style); }
  pdf.setProperties({title: `Your SMART ${r.name}`, subject: `${r.name} ${s.size}: your design, specification and building price`, author: 'SMART Modular Buildings', creator: 'SMART garden room designer', keywords: 'SMART, garden room, design, price'});
  pdf.setLanguage('en-GB');

  const set = (size = 10, bold = false, colour = C.ink, heading = false) => { pdf.setFont(heading ? 'Saira' : 'Figtree', bold || heading ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(colour); };
  const para = (text, x, y, width, size = 10, colour = C.muted, line = 4.6, bold = false) => { set(size, bold, colour); const lines = pdf.splitTextToSize(String(text), width); pdf.text(lines, x, y, {lineHeightFactor: line / (size * .352778)}); return y + lines.length * line; };
  const heading = (text, x, y, size = 26, colour = C.forest, maxWidth = CW) => { set(size, true, colour, true); let t = String(text).toUpperCase(); let fs = size; while (pdf.getTextWidth(t) > maxWidth && fs > 12) { fs -= 1; pdf.setFontSize(fs); } pdf.text(t, x, y); };
  const label = (text, x, y, colour = C.muted) => { set(8, true, colour); pdf.text(String(text), x, y); };
  const link_ = (text, x, y, url, size = 9, colour = C.pine) => { set(size, true, colour); pdf.textWithLink(String(text), x, y, {url}); };
  const image = (data, x, y, w, h, cover = true) => {
    if (typeof data !== 'string' || !/^data:image\/(png|jpeg);base64,/.test(data)) return false;
    try {
      const info = pdf.getImageProperties(data), fmt = data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      if (cover) {
        // Crop to fill the frame, like object-fit: cover.
        const k = Math.max(w / info.width, h / info.height), iw = info.width * k, ih = info.height * k;
        pdf.saveGraphicsState(); pdf.rect(x, y, w, h, null); pdf.clip(); pdf.discardPath();
        pdf.addImage(data, fmt, x - (iw - w) / 2, y - (ih - h) / 2, iw, ih, undefined, 'FAST');
        pdf.restoreGraphicsState();
      } else {
        const k = Math.min(w / info.width, h / info.height);
        pdf.addImage(data, fmt, x + (w - info.width * k) / 2, y + (h - info.height * k) / 2, info.width * k, info.height * k, undefined, 'FAST');
      }
      return true;
    } catch { return false; }
  };
  const qr = (url, x, y, size) => {
    const code = qrcode(0, 'M'); code.addData(url, 'Byte'); code.make();
    const n = code.getModuleCount(), unit = size / (n + 4);
    pdf.setFillColor('#ffffff'); pdf.rect(x, y, size, size, 'F'); pdf.setFillColor(C.forest);
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (code.isDark(row, col)) pdf.rect(x + (col + 2) * unit, y + (row + 2) * unit, unit + .02, unit + .02, 'F');
  };
  const button = (text, x, y, w, h, url, fill = C.signal, colour = C.forest) => { pdf.setFillColor(fill); pdf.roundedRect(x, y, w, h, 1.8, 1.8, 'F'); set(11, true, colour, true); pdf.text(text.toUpperCase(), x + w / 2, y + h / 2 + 1.4, {align: 'center'}); pdf.link(x, y, w, h, {url}); };
  const dot = (x, y, colour = C.pine) => { pdf.setFillColor(colour); pdf.circle(x, y, .8, 'F'); };
  const bullets = (items, x, y, width, size = 9.2) => { for (const item of items) { dot(x + 1, y - 1.1); y = para(item, x + 5, y, width - 5, size, C.ink, 4.2) + 1.8; } return y; };
  function frame(page, title, sub) {
    pdf.setFillColor(C.paper); pdf.rect(0, 0, W, H, 'F');
    image(PDF_LOGO, M, 10, 38, 14, false);
    set(8.5, true, C.forest); pdf.text(`${r.name}, ${s.size}`, W - M, 15, {align: 'right'});
    set(7.2, false, C.muted); pdf.text(`${ref}  |  ${date}`, W - M, 20.5, {align: 'right'});
    pdf.setDrawColor(C.leaf); pdf.setLineWidth(.6); pdf.line(M, 28, W - M, 28);
    heading(title, M, 42, 26);
    if (sub) para(sub, M, 50, CW, 10, C.muted, 4.6);
    pdf.setFillColor(C.forest); pdf.rect(0, 283, W, 14, 'F');
    link_('Book your free discovery call', M, 289.5, CONTACT.booking, 8.6, C.signal);
    set(7.2, false, '#dceae2'); pdf.text('Call 0333 880 6157', M, 293.6);
    pdf.text(`Your SMART room  |  ${page} of ${PAGES}`, W - M, 291.5, {align: 'right'});
  }
  function framedImage(data, x, y, w, h, caption, fallback) {
    pdf.setFillColor(C.mist); pdf.rect(x, y, w, h, 'F');
    const ok = image(data, x, y, w, h) || (fallback ? fallback(x, y, w, h) : false);
    if (caption) label(caption, x, y + h + 4.6);
    return ok;
  }

  // A drawn plan: the fallback when there is no WebGL capture (and always used on page 4).
  function drawPlan(x, y, w, h) {
    const k = Math.min((w - 24) / state.width, (h - 24) / state.depth), rw = state.width * k, rh = state.depth * k;
    const left = x + (w - rw) / 2, top = y + (h - rh) / 2 - 2, t = .18 * k;
    pdf.setFillColor('#ffffff'); pdf.rect(left, top, rw, rh, 'F');
    pdf.setFillColor(C.forest);
    pdf.rect(left, top, rw, t, 'F'); pdf.rect(left, top + rh - t, rw, t, 'F'); pdf.rect(left, top, t, rh, 'F'); pdf.rect(left + rw - t, top, t, rh, 'F');
    for (const o of state.openings) {
      const L = wallLength(state, o.wall), sp = OPENINGS[o.type], a = (o.p * L - sp.w / 2) * k, len = sp.w * k;
      let px, py, pw, ph;
      if (o.wall === 'front') { px = left + a; py = top + rh - t; pw = len; ph = t; }
      else if (o.wall === 'back') { px = left + rw - a - len; py = top; pw = len; ph = t; }
      else if (o.wall === 'left') { px = left; py = top + a; pw = t; ph = len; }
      else { px = left + rw - t; py = top + rh - a - len; pw = t; ph = len; }
      pdf.setFillColor(sp.group === 'door' ? C.signal : '#bfe3ea'); pdf.rect(px, py, pw, ph, 'F');
    }
    set(8, true, C.muted);
    pdf.text(`${metres(state.width)} wide`, left + rw / 2, top + rh + 7, {align: 'center'});
    pdf.text(`${metres(state.depth)}`, left + rw + 4, top + rh / 2, {});
    pdf.text('FRONT', left + rw / 2, top + rh + 11.5, {align: 'center'});
    set(12, true, C.forest); pdf.text(`${(state.width * state.depth).toFixed(1)}m²`, left + rw / 2, top + rh / 2, {align: 'center'});
    return true;
  }
  const photo = () => PDF_RANGE_PHOTOS[state.range];
  const fallbackPhoto = (x, y, w, h) => image(photo(), x, y, w, h);

  // ---- 1. Cover --------------------------------------------------------------------------
  pdf.setFillColor(C.forest); pdf.rect(0, 0, W, H, 'F');
  image(PDF_LOGO_NEGATIVE, M, 12, 48, 18, false);
  set(8, false, C.frost); pdf.text(`Prepared ${date}`, W - M, 18, {align: 'right'}); pdf.text(ref, W - M, 23.5, {align: 'right'});
  heading(`Your SMART ${r.name}`, M, 47, 34, '#ffffff');
  para(`${first ? first + ', here is your' : 'Your'} ${s.size} ${lower(USES[state.use].name)}, designed in 3D.`, M, 56, CW, 11, '#dceae2', 5);
  pdf.setFillColor('#0b3a2f'); pdf.rect(M, 64, CW, 111, 'F');
  if (!image(shots.hero, M, 64, CW, 111)) fallbackPhoto(M, 64, CW, 111);
  para(shots.hero ? 'Your configured design. Furniture, planting and the garden are illustrative.' : `A real SMART ${r.name} for inspiration; your design may differ.`, M, 180, CW, 7.6, C.frost, 3.5);
  const facts = [[s.size, 'External size'], [`${(state.width * state.depth).toFixed(1)}m²`, 'Footprint'], [`${(ROOFS[state.roof].heightMm / 1000).toFixed(3)}m`, 'External height']];
  facts.forEach(([v, c], i) => { heading(v, M + i * (CW / 3), 196, 18, '#ffffff', CW / 3 - 4); set(8, false, C.frost); pdf.text(c, M + i * (CW / 3), 202); });
  pdf.setDrawColor('#3c6556'); pdf.setLineWidth(.3); pdf.line(M, 209, W - M, 209);
  label('Building price, including VAT', M, 217, C.frost);
  heading(pounds(price), M, 231, price ? 30 : 20, C.signal, 100);
  para(price ? 'SMART’s published price for this range and size.' : 'SMART prices this size after your consultation.', M, 238, 95, 8.6, '#dceae2', 4);
  para('Your base, mains connection and any upgrades listed on page 5 are quoted after a free site consultation.', 118, 217, 76, 8.6, '#dceae2', 4.1);
  button('Book your discovery call', M, 252, 110, 15, CONTACT.booking);
  set(8, false, '#dceae2'); pdf.text('Free 15-minute call. No obligation.', M, 273);
  qr(CONTACT.booking, 154, 246, 36); set(7.4, false, '#dceae2'); pdf.text('Scan to book', 172, 286, {align: 'center'});

  // ---- 2. Outside --------------------------------------------------------------------------
  pdf.addPage(); frame(2, 'Your room from every side', `${claddingName(state)} cladding, ${lower(ROOFS[state.roof].name)}, ${lower(s.frame)} frames.`);
  const gw = (CW - 6) / 2, gh = gw * 10 / 16;
  framedImage(shots.front, M, 58, CW, CW * 10 / 16 * .78, 'From the front', fallbackPhoto);
  const y2 = 58 + CW * 10 / 16 * .78 + 10;
  framedImage(shots.rear, M, y2, gw, gh, 'From the back', null);
  framedImage(shots.aerial, M + gw + 6, y2, gw, gh, 'From above', (x, y, w, h) => drawPlan(x, y, w, h));
  const y3 = y2 + gh + 10;
  framedImage(shots.dusk, M, y3, gw, gh * .92, 'At dusk', null);
  pdf.setFillColor(C.mist); pdf.rect(M + gw + 6, y3, gw, gh * .92, 'F');
  let ey = y3 + 8;
  set(11, true, C.forest, true); pdf.text('OUTSIDE', M + gw + 11, ey); ey += 6;
  for (const row of specRows(state).filter(x => x.section === 'Exterior').slice(0, 6)) { ey = para(`${row.label}: ${row.value}`, M + gw + 11, ey, gw - 10, 8.6, C.ink, 4) + 1; }

  // ---- 3. Inside ---------------------------------------------------------------------------
  pdf.addPage(); frame(3, 'Step inside', `${s.rows.find(x => x.label === 'Walls').value} walls, ${lower(s.rows.find(x => x.label === 'Floor').value)} floor, ${lower(s.rows.find(x => x.label === 'Lighting').value)}.`);
  framedImage(shots.interior, M, 58, CW, CW * 10 / 16 * .78, 'Looking in from the entrance', fallbackPhoto);
  framedImage(shots.interior2, M, y2, gw, gh, 'Looking back towards the doors', null);
  framedImage(shots.plan, M + gw + 6, y2, gw, gh, 'From above, roof off', (x, y, w, h) => drawPlan(x, y, w, h));
  pdf.setFillColor(C.mist); pdf.rect(M, y3, CW, gh * .92, 'F');
  let iy = y3 + 8;
  set(11, true, C.forest, true); pdf.text('INSIDE', M + 6, iy); iy += 6;
  const inside = specRows(state).filter(x => x.section === 'Interior');
  inside.forEach((row, i) => { const col = i % 2, x = M + 6 + col * (CW / 2); if (col === 0 && i) iy += 9; para(`${row.label}: ${row.value}`, x, iy, CW / 2 - 10, 8.6, C.ink, 4); });

  // ---- 4. Specification --------------------------------------------------------------------
  pdf.addPage(); frame(4, 'Your specification', 'Everything you chose, and how each item is priced.');
  let sy = 60;
  const chip = (status, x, y) => {
    const text = status === 'upgrade' ? 'UPGRADE' : status === 'quoted' ? 'QUOTED' : 'INCLUDED';
    pdf.setFillColor(status === 'upgrade' ? C.forest : status === 'quoted' ? '#eef1ef' : '#e3f3e6');
    set(6.6, true, status === 'upgrade' ? '#ffffff' : status === 'quoted' ? C.muted : '#0b5a2c');
    const tw = pdf.getTextWidth(text) + 4; pdf.roundedRect(x - tw, y - 3.6, tw, 5, 1, 1, 'F'); pdf.text(text, x - tw + 2, y);
  };
  let lastSection = '';
  for (const row of specRows(state)) {
    if (row.section !== lastSection) { sy += 3; set(10.5, true, C.forest, true); pdf.text(row.section.toUpperCase(), M, sy); sy += 3; lastSection = row.section; }
    set(9, false, C.ink);
    const lines = pdf.splitTextToSize(row.value, 112);
    pdf.setDrawColor(C.line); pdf.setLineWidth(.2); pdf.line(M, sy, W - M, sy);
    set(8.6, true, C.muted); pdf.text(row.label, M, sy + 4.8);
    set(9, false, C.ink); pdf.text(lines, M + 42, sy + 4.8, {lineHeightFactor: 1.35});
    chip(row.status, W - M, sy + 4.8);
    sy += 4.6 * lines.length + 3.4;
    if (sy > 270) break;
  }
  // Doors and windows with their sizes.
  if (sy < 236) {
    sy += 6; set(10.5, true, C.forest, true); pdf.text('DOOR AND WINDOW SIZES', M, sy); sy += 2;
    for (const o of state.openings) {
      const sp = OPENINGS[o.type];
      pdf.setDrawColor(C.line); pdf.line(M, sy, W - M, sy);
      set(8.6, false, C.ink); pdf.text(`${WALLS[o.wall]}: ${sp.name}${o.glass === 'obscure' ? ', obscure glass' : ''}`, M, sy + 4.6);
      set(8.6, false, C.muted); pdf.text(`${(sp.w * 1000).toFixed(0)} × ${(sp.h * 1000).toFixed(0)}mm`, W - M, sy + 4.6, {align: 'right'});
      sy += 6.4;
      if (sy > 274) break;
    }
  }

  // ---- 5. Price --------------------------------------------------------------------------
  pdf.addPage(); frame(5, 'Your building price', 'A clear price for the building, and what SMART quotes for your garden.');
  pdf.setFillColor(C.forest); pdf.roundedRect(M, 60, CW, 34, 2, 2, 'F');
  label('Building price, including VAT', M + 7, 69, C.frost);
  heading(pounds(price), M + 7, 84, price ? 30 : 20, C.signal, 110);
  para(`${r.name}, ${s.size}. SMART’s published price for this range and size, checked October 2026.`, 118, 69, 70, 8.6, '#dceae2', 4.1);
  heading('Included in the price', M, 108, 15); heading('Quoted for your garden', 110, 108, 15);
  bullets(['Insulated floor, walls and roof', 'Finished interior and your choice of flooring', 'Standard uPVC doors and double glazing, unlimited', 'Lighting, sockets and switches, unlimited', '1.5kW thermostatic radiator', 'Outside lighting and guttering', 'Mainland UK delivery and installation*', 'VAT and a 10-year structural warranty'], M, 117, 88);
  const quoted = ['A suitable base and site preparation', 'Connection to your mains electricity', ...upgradesOf(state).map(u => u + ' (upgrade)')];
  bullets(quoted.slice(0, 12), 110, 117, 84);
  para('*Location surcharges may apply. This is not a written quotation. SMART confirms the specification, current prices and site costs in your quotation after a free site consultation, usually 60 to 90 minutes at your home.', M, 214, CW, 8.4, C.muted, 3.9);
  pdf.setFillColor(C.mist); pdf.roundedRect(M, 230, CW, 40, 2, 2, 'F');
  heading('How you pay', M + 7, 241, 13);
  para('SMART’s published terms: a 25% deposit with your order, 45% four weeks before installation, 25% within 24 hours of installation starting and 5% on completion.', M + 7, 249, CW - 14, 9, C.ink, 4.3);

  // ---- 6. Why SMART and next steps ---------------------------------------------------------
  pdf.addPage(); frame(6, 'Your next steps', 'Garden rooms designed and built the SMART way since 2006.');
  const keys = ['warranty', 'build', 'planning', 'insulated', 'reviews', 'priceMatch'];
  keys.forEach((k, i) => { const x = M + (i % 2) * (CW / 2 + 2), y = 62 + Math.floor(i / 2) * 19; pdf.setFillColor(C.signal); pdf.circle(x + 2, y - 1.4, 1.6, 'F'); set(10.5, true, C.forest); pdf.text(USPS[k].title, x + 6, y); para(USPS[k].copy, x + 6, y + 5, CW / 2 - 10, 8.6, C.muted, 4); });
  pdf.setDrawColor(C.line); pdf.line(M, 122, W - M, 122);
  const step = (n, title, copy, y) => { pdf.setFillColor(C.forest); pdf.circle(M + 4, y - 1.5, 4, 'F'); set(10, true, '#ffffff', true); pdf.text(String(n), M + 4, y - .1, {align: 'center'}); set(11, true, C.forest); pdf.text(title, M + 12, y); para(copy, M + 12, y + 5, 108, 9, C.muted, 4.2); };
  step(1, 'Book your free discovery call', '15 minutes with a SMART garden room specialist to talk through your design, your garden and your budget.', 134);
  step(2, 'Free site consultation', 'A specialist visits to check access, boundaries, the base and your power supply. No obligation.', 156);
  step(3, 'Your written quotation', 'Your final specification, base and electrical connection, all priced.', 178);
  step(4, 'Installed in as little as 2 to 5 days', 'Ground screws go in first, then your room is built on site with no wet trades.', 196);
  qr(CONTACT.booking, 150, 128, 42); set(7.6, false, C.muted); pdf.text('Scan to book your call', 171, 175, {align: 'center'});
  button('Book your discovery call', M, 214, CW, 15, CONTACT.booking);
  const tiles = [['Request a callback', 'Call 0333 880 6157 or use the designer', 'tel:' + CONTACT.tel], ['Visit a SMART room', 'Take the 360-degree showroom tour', CONTACT.virtualTour], ['Reopen your design', 'Change anything and see it again', link]];
  tiles.forEach(([t, c, url], i) => { const x = M + i * (CW / 3 + .5), w = CW / 3 - 3; pdf.setDrawColor(C.line); pdf.setLineWidth(.3); pdf.roundedRect(x, 235, w, 22, 2, 2, 'S'); set(9.5, true, C.pine); pdf.text(t, x + 4, 243); para(c, x + 4, 249, w - 8, 8, C.muted, 3.7); pdf.link(x, 235, w, 22, {url}); });
  para('Images are rendered from your design and are illustrative: furniture, planting and the garden setting are examples, and colours vary by screen and printer.', M, 268, CW, 7.6, C.muted, 3.5);

  const slug = v => String(v).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  const filename = `SMART-${slug(r.name)}-${state.width}x${state.depth}-design.pdf`;
  if (options.save !== false) pdf.save(filename);
  return {filename, pages: PAGES, reference: ref, bytes: options.save === false ? pdf.output('arraybuffer') : null};
}
