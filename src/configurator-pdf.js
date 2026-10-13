// "Your Pecasa garden room" PDF: the shopper's design rendered from the front, all four sides,
// inside and in plan; its full specification; Pecasa's published price; and the next steps with
// a booking link. The same generator runs in the browser (with views captured from the 3D) and
// in Node for the checks (with a drawn plan and Pecasa's style render where no view exists).
// Built on the SMART configurator's PDF module.
import {jsPDF} from 'jspdf';
import qrcode from 'qrcode-generator';
import {normalise, priceFor, nearestPriced, pounds, metres, mm, upgradesOf, summary, plan, footprintArea, internalArea, STYLES, OPENINGS, USES} from './configurator-model.js';
import {USPS, CONTACT} from './configurator-data.js';
import {PDF_FONTS, PDF_LOGO, PDF_LOGO_NEGATIVE, PDF_LOGO_RATIO, PDF_STYLE_PHOTOS} from './configurator-pdf-assets.js';

const C = {forest: '#022828', pine: '#18746c', signal: '#1dafa4', mint: '#d3f8f2', mist: '#eef4f2', ink: '#10211f', muted: '#4e5c56', line: '#d5dcd3', paper: '#ffffff', frost: '#b7cfca'};
const W = 210, H = 297, M = 16, CW = W - 2 * M, PAGES = 6;

function reference(state) {
  let n = 2166136261;
  for (const ch of JSON.stringify({...state, step: 0, openings: (state.openings || []).map(o => [o.wall, o.type, o.w, o.p])})) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  return 'PEC-' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * @param input  a design state (or anything normalise() accepts)
 * @param views  {hero, front, right, back, left, interior, interior2, plan, dusk}: JPEG data URLs
 * @param options {contactName, preparedAt, save = true, siteURL}
 */
export async function downloadPDF(input, views = {}, options = {}) {
  const state = normalise(input), st = STYLES[state.style], price = priceFor(state), P = plan(state);
  const shots = views && typeof views === 'object' ? views : {};
  const base = options.siteURL || (typeof location !== 'undefined' ? location.origin + '/configurator/' : 'https://pecasa-garden-room-configurator.netlify.app/configurator/');
  const s = summary(state, base), link = s.designLink, ref = reference(state);
  const booking = (() => { const u = new URL(link); u.searchParams.set('book', '1'); return u.toString(); })();
  const prepared = new Date(options.preparedAt || Date.now());
  const date = (Number.isFinite(prepared.getTime()) ? prepared : new Date()).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'});
  const first = String(options.contactName || '').trim().split(/\s+/)[0].slice(0, 30);
  const pdf = new jsPDF({unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true});
  for (const [key, family, style] of [['regular', 'Barlow', 'normal'], ['semibold', 'Barlow', 'bold'], ['heading', 'BarlowCondensed', 'bold']]) { pdf.addFileToVFS(key + '.ttf', PDF_FONTS[key]); pdf.addFont(key + '.ttf', family, style); }
  pdf.setProperties({title: `Your Pecasa ${st.name}`, subject: `${st.name} ${s.size}: your design, specification and price`, author: 'Pecasa Premium Garden Rooms', creator: 'Pecasa garden room designer', keywords: 'Pecasa, garden room, design, price'});
  pdf.setLanguage('en-GB');

  const set = (size = 10, bold = false, colour = C.ink, heading = false) => { pdf.setFont(heading ? 'BarlowCondensed' : 'Barlow', bold || heading ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(colour); };
  const para = (text, x, y, width, size = 10, colour = C.muted, line = 4.6, bold = false) => { set(size, bold, colour); const lines = pdf.splitTextToSize(String(text), width); pdf.text(lines, x, y, {lineHeightFactor: line / (size * .352778)}); return y + lines.length * line; };
  const heading = (text, x, y, size = 26, colour = C.forest, maxWidth = CW) => { set(size, true, colour, true); const t = String(text).toUpperCase(); let fs = size; while (pdf.getTextWidth(t) > maxWidth && fs > 12) { fs -= 1; pdf.setFontSize(fs); } pdf.text(t, x, y); };
  const label = (text, x, y, colour = C.muted) => { set(8, true, colour); pdf.text(String(text), x, y); };
  const image = (data, x, y, w, h, cover = true) => {
    if (typeof data !== 'string' || !/^data:image\/(png|jpeg);base64,/.test(data)) return false;
    try {
      const info = pdf.getImageProperties(data), fmt = data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      if (cover) {
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
  const button = (text, x, y, w, h, url, fill = C.signal, colour = C.forest) => { pdf.setFillColor(fill); pdf.roundedRect(x, y, w, h, 1.8, 1.8, 'F'); set(12, true, colour, true); pdf.text(text.toUpperCase(), x + w / 2, y + h / 2 + 1.5, {align: 'center'}); pdf.link(x, y, w, h, {url}); };
  const dot = (x, y, colour = C.pine) => { pdf.setFillColor(colour); pdf.circle(x, y, .8, 'F'); };
  const bullets = (items, x, y, width, size = 9.2, maxY = 270) => { for (const item of items) { if (y > maxY) break; dot(x + 1, y - 1.1); y = para(item, x + 5, y, width - 5, size, C.ink, 4.2) + 1.6; } return y; };
  const logo = (data, x, y, h) => image(data, x, y, h * PDF_LOGO_RATIO, h, false);
  function frame(page, title, sub) {
    pdf.setFillColor(C.paper); pdf.rect(0, 0, W, H, 'F');
    logo(PDF_LOGO, M, 10, 12);
    set(9, true, C.forest); pdf.text(`${st.name}, ${s.size}`, W - M, 15, {align: 'right'});
    set(7.4, false, C.muted); pdf.text(`${ref}  |  ${date}`, W - M, 20.5, {align: 'right'});
    pdf.setDrawColor(C.signal); pdf.setLineWidth(.6); pdf.line(M, 27, W - M, 27);
    heading(title, M, 40, 26);
    if (sub) para(sub, M, 47, CW, 10, C.muted, 4.6);
    pdf.setFillColor(C.forest); pdf.rect(0, 283, W, 14, 'F');
    set(8.8, true, C.signal); pdf.textWithLink('Book a call about your design', M, 289.5, {url: booking});
    set(7.4, false, '#d3e6e2'); pdf.text(`Call ${CONTACT.phone}  |  ${CONTACT.email}`, M, 293.6);
    pdf.text(`Your Pecasa garden room  |  ${page} of ${PAGES}`, W - M, 291.5, {align: 'right'});
  }
  function framed(data, x, y, w, h, caption, fallback) {
    pdf.setFillColor(C.mist); pdf.rect(x, y, w, h, 'F');
    const ok = image(data, x, y, w, h) || (fallback ? fallback(x, y, w, h) : false);
    if (caption) label(caption, x, y + h + 4.4);
    return ok;
  }
  const stylePhoto = (x, y, w, h) => image(PDF_STYLE_PHOTOS[state.style], x, y, w, h);

  // A drawn, dimensioned plan from the same geometry as the 3D: walls, doors and windows to scale.
  function drawPlan(x, y, w, h) {
    const b = P.bounds, pw = b.x1 - b.x0, pd = b.z1 - b.z0;
    const k = Math.min((w - 30) / pw, (h - 30) / pd);
    const ox = x + (w - pw * k) / 2 - b.x0 * k, oz = y + (h - pd * k) / 2 - b.z0 * k + 2;
    const X = v => ox + v * k, Z = v => oz + v * k;
    pdf.setFillColor('#ffffff'); pdf.rect(x, y, w, h, 'F');
    // Roof outline (dashed) and decks.
    pdf.setDrawColor(C.frost); pdf.setLineWidth(.25); pdf.setLineDashPattern([1.2, 1], 0);
    const rp = P.roof.pts; for (let i = 0; i < rp.length; i++) { const [a, c] = [rp[i], rp[(i + 1) % rp.length]]; pdf.line(X(a[0]), Z(a[1]), X(c[0]), Z(c[1])); }
    pdf.setLineDashPattern([], 0);
    pdf.setFillColor('#e9e4dc'); for (const d of P.decks) pdf.rect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * k, (d.z1 - d.z0) * k, 'F');
    // Walls: thick lines along each wall, broken by openings.
    pdf.setDrawColor(C.forest); pdf.setLineWidth(Math.max(.8, .15 * k));
    if (!st.open) for (const wall of P.walls) {
      const ops = state.openings.filter(o => o.wall === wall.id).map(o => [o.p * wall.len - o.w / 2, o.p * wall.len + o.w / 2, o]).sort((p, q) => p[0] - q[0]);
      let u = 0;
      const seg = (u0, u1) => { if (u1 - u0 < .01) return; const a = [wall.a[0] + wall.t[0] * u0 - wall.n[0] * .075, wall.a[1] + wall.t[1] * u0 - wall.n[1] * .075], c = [wall.a[0] + wall.t[0] * u1 - wall.n[0] * .075, wall.a[1] + wall.t[1] * u1 - wall.n[1] * .075]; pdf.line(X(a[0]), Z(a[1]), X(c[0]), Z(c[1])); };
      for (const [a, c] of ops) { seg(u, a); u = c; }
      seg(u, wall.len);
      for (const [a, c, o] of ops) {
        const door = OPENINGS[o.type].group === 'door';
        pdf.setDrawColor(door ? C.signal : '#7fb7c4'); pdf.setLineWidth(Math.max(.5, .06 * k));
        const p0 = [wall.a[0] + wall.t[0] * a - wall.n[0] * .075, wall.a[1] + wall.t[1] * a - wall.n[1] * .075], p1 = [wall.a[0] + wall.t[0] * c - wall.n[0] * .075, wall.a[1] + wall.t[1] * c - wall.n[1] * .075];
        pdf.line(X(p0[0]), Z(p0[1]), X(p1[0]), Z(p1[1]));
        set(6.4, false, C.muted);
        const mx = (p0[0] + p1[0]) / 2 + wall.n[0] * .35, mz = (p0[1] + p1[1]) / 2 + wall.n[1] * .35;
        pdf.text(mm(o.w), X(mx), Z(mz) + 1, {align: 'center'});
        pdf.setDrawColor(C.forest); pdf.setLineWidth(Math.max(.8, .15 * k));
      }
    } else {
      // Pergola: posts at the corners and the beam outline.
      pdf.rect(X(-state.width / 2), Z(-state.depth / 2), state.width * k, state.depth * k, 'S');
    }
    // Overall dimensions.
    pdf.setDrawColor(C.pine); pdf.setLineWidth(.3);
    const dy = Z(b.z1) + 6, dx = X(b.x1) + 6;
    pdf.line(X(-state.width / 2), dy, X(state.width / 2), dy); pdf.line(X(-state.width / 2), dy - 1.5, X(-state.width / 2), dy + 1.5); pdf.line(X(state.width / 2), dy - 1.5, X(state.width / 2), dy + 1.5);
    pdf.line(dx, Z(-state.depth / 2), dx, Z(state.depth / 2)); pdf.line(dx - 1.5, Z(-state.depth / 2), dx + 1.5, Z(-state.depth / 2)); pdf.line(dx - 1.5, Z(state.depth / 2), dx + 1.5, Z(state.depth / 2));
    set(8.4, true, C.forest); pdf.text(`${metres(state.width)} wide`, X(0), dy + 4.5, {align: 'center'});
    pdf.text(metres(state.depth), dx + 2, Z(0) + 1);
    set(7, true, C.muted); pdf.text('FRONT', X(0), Z(b.z1) + 13, {align: 'center'});
    set(11, true, C.forest); pdf.text(`${footprintArea(state).toFixed(1)}m²`, X(0), Z(-state.depth / 2 + state.depth * .35), {align: 'center'});
    return true;
  }

  // ---- 1. Cover ------------------------------------------------------------------------------
  pdf.setFillColor(C.forest); pdf.rect(0, 0, W, H, 'F');
  logo(PDF_LOGO_NEGATIVE, M, 12, 15);
  set(8, false, C.frost); pdf.text(`Prepared ${date}`, W - M, 17, {align: 'right'}); pdf.text(ref, W - M, 22.5, {align: 'right'});
  heading(`Your Pecasa ${st.name}`, M, 46, 36, '#ffffff');
  para(`${first ? first + ', here is your' : 'Your'} ${s.size} ${st.open ? 'pergola' : USES[state.use].name.toLowerCase()}, designed in 3D.`, M, 55, CW, 11, '#d3e6e2', 5);
  pdf.setFillColor('#0c3c39'); pdf.rect(M, 63, CW, 112, 'F');
  if (!image(shots.hero, M, 63, CW, 112)) stylePhoto(M, 63, CW, 112);
  para(shots.hero ? 'Your design, rendered from your choices. Furniture, planting and the garden are illustrative.' : `The standard Pecasa ${st.name}, drawn from Pecasa's planner. Your choices are listed on page 4.`, M, 180, CW, 7.6, C.frost, 3.5);
  const facts = [[s.size, 'External size'], [`${footprintArea(state).toFixed(1)}m²`, 'Footprint'], [metres(P.maxHeight), 'Overall height']];
  facts.forEach(([v, c], i) => { heading(v, M + i * (CW / 3), 196, 19, '#ffffff', CW / 3 - 4); set(8, false, C.frost); pdf.text(c, M + i * (CW / 3), 202); });
  pdf.setDrawColor('#2d5c57'); pdf.setLineWidth(.3); pdf.line(M, 209, W - M, 209);
  label(price.value === null ? 'Your price' : 'Your price, including VAT', M, 217, C.frost);
  heading(price.value === null ? 'Quoted' : pounds(price.value), M, 231, 30, C.signal, 100);
  para(price.value === null ? 'Pecasa prices this exact size in your written quote after a free survey.' : `${price.label}.`, M, 238, 96, 8.4, '#d3e6e2', 3.9);
  para('Upgrades and site work are priced in Pecasa’s written quotation, normally within 7 days of your free survey.', 118, 217, 76, 8.4, '#d3e6e2', 4);
  button('Book a call', M, 252, 100, 15, booking);
  set(8, false, '#d3e6e2'); pdf.text(`Or call ${CONTACT.phone}. Free and no obligation.`, M, 273);
  qr(booking, 154, 246, 36); set(7.4, false, '#d3e6e2'); pdf.text('Scan to book', 172, 286, {align: 'center'});

  // ---- 2. Four sides -------------------------------------------------------------------------
  pdf.addPage(); frame(2, 'Your room from every side', st.open ? `${st.name}, ${s.size}.` : `${s.rows.filter(r => r.label.startsWith('Cladding')).map(r => r.value).join(' and ')} cladding, ${s.rows.find(r => r.label === 'Window and door frames')?.value.replace('Cortizo aluminium, ', '').toLowerCase() || ''} frames.`);
  const gw = (CW - 6) / 2, gh = gw * 10 / 16;
  const sides = [['front', 'Front'], ['right', 'Right side'], ['back', 'Back'], ['left', 'Left side']];
  sides.forEach(([k, cap], i) => { const x = M + (i % 2) * (gw + 6), y = 56 + Math.floor(i / 2) * (gh + 12); framed(shots[k], x, y, gw, gh, cap, i === 0 ? stylePhoto : null); });
  const y3 = 56 + 2 * (gh + 12);
  framed(shots.dusk, M, y3, gw, gh * .92, 'At dusk', null);
  pdf.setFillColor(C.mist); pdf.rect(M + gw + 6, y3, gw, gh * .92, 'F');
  let ey = y3 + 8;
  set(11, true, C.forest, true); pdf.text('OUTSIDE', M + gw + 11, ey); ey += 6;
  for (const row of s.rows.filter(x => x.section === 'Exterior' || x.section === 'Sides').slice(0, 7)) { ey = para(`${row.label}: ${row.value}`, M + gw + 11, ey, gw - 10, 8.2, C.ink, 3.8) + .8; if (ey > y3 + gh * .92 - 3) break; }

  // ---- 3. Inside and plan --------------------------------------------------------------------
  pdf.addPage(); frame(3, st.open ? 'From above' : 'Inside and in plan', st.open ? 'The pergola from above, with its dimensions.' : `About ${internalArea(state).toFixed(1)}m² inside. ${s.rows.find(r => r.label === 'Walls')?.value || ''}; ${(s.rows.find(r => r.label === 'Floor')?.value || '').toLowerCase()} floor.`);
  if (st.open) {
    framed(shots.plan, M, 56, CW, CW * .55, 'From above', null);
    drawPlan(M, 56 + CW * .55 + 12, CW, 100);
  } else {
    framed(shots.interior, M, 56, gw, gh, 'Looking in from the entrance', stylePhoto);
    framed(shots.interior2, M + gw + 6, 56, gw, gh, 'Looking back to the glazing', null);
    framed(shots.plan, M, 56 + gh + 12, gw, gh * 1.15, 'From above, roof off', null);
    drawPlan(M + gw + 6, 56 + gh + 12, gw, gh * 1.15);
    label('Dimensioned plan (external sizes; door and window widths in mm)', M + gw + 6, 56 + gh + 12 + gh * 1.15 + 4.4);
    const iy0 = 56 + gh + 12 + gh * 1.15 + 12;
    pdf.setFillColor(C.mist); pdf.rect(M, iy0, CW, 270 - iy0, 'F');
    let iy = iy0 + 8;
    set(11, true, C.forest, true); pdf.text('INSIDE', M + 6, iy); iy += 6;
    const inside = s.rows.filter(x => x.section === 'Interior');
    inside.forEach((row, i) => { const col = i % 2, x = M + 6 + col * (CW / 2); if (col === 0 && i) iy += 8.5; if (iy < 268) para(`${row.label}: ${row.value}`, x, iy, CW / 2 - 10, 8.2, C.ink, 3.8); });
  }

  // ---- 4. Specification ----------------------------------------------------------------------
  pdf.addPage(); frame(4, 'Your specification', 'Everything you chose, and how each item is priced.');
  let sy = 57;
  const chip = (status, x, y) => {
    const text = status === 'upgrade' ? 'UPGRADE' : status === 'quoted' ? 'QUOTED' : 'INCLUDED';
    pdf.setFillColor(status === 'upgrade' ? C.forest : status === 'quoted' ? '#eef1ef' : '#dcf3f0');
    set(6.6, true, status === 'upgrade' ? '#ffffff' : status === 'quoted' ? C.muted : '#0e5a53');
    const tw = pdf.getTextWidth(text) + 4; pdf.roundedRect(x - tw, y - 3.6, tw, 5, 1, 1, 'F'); pdf.text(text, x - tw + 2, y);
  };
  let lastSection = '';
  for (const row of s.rows) {
    if (row.section !== lastSection) { sy += 3; set(11, true, C.forest, true); pdf.text(row.section.toUpperCase(), M, sy); sy += 3; lastSection = row.section; }
    set(8.8, false, C.ink);
    const lines = pdf.splitTextToSize(row.value, 108);
    pdf.setDrawColor(C.line); pdf.setLineWidth(.2); pdf.line(M, sy, W - M, sy);
    set(8.4, true, C.muted); pdf.text(pdf.splitTextToSize(row.label, 40), M, sy + 4.6);
    set(8.8, false, C.ink); pdf.text(lines, M + 44, sy + 4.6, {lineHeightFactor: 1.32});
    chip(row.status, W - M, sy + 4.6);
    sy += Math.max(4.4 * lines.length, 4.4 * pdf.splitTextToSize(row.label, 40).length) + 3.2;
    if (sy > 274) break;
  }

  // ---- 5. Price ------------------------------------------------------------------------------
  pdf.addPage(); frame(5, 'Your price', 'What Pecasa publishes for this design, and what your written quote adds.');
  pdf.setFillColor(C.forest); pdf.roundedRect(M, 57, CW, 36, 2, 2, 'F');
  label(price.value === null ? 'Your price' : 'Your price, including VAT', M + 7, 66, C.frost);
  heading(price.value === null ? 'Quoted' : pounds(price.value), M + 7, 82, 32, C.signal, 100);
  para(price.value === null ? 'This exact size is priced by Pecasa after a free survey. Sizes with a published price are listed below.' : `${price.label}. Checked on pecasa.co.uk in October 2026.`, 116, 66, 72, 8.4, '#d3e6e2', 4);
  heading('Included as standard', M, 106, 15); heading('In your written quote', 110, 106, 15);
  bullets(['SIP walls, floor and roof (EPS70 insulation)', 'Radix ground screw foundations, subject to ground conditions', 'EPDM roof', 'Cortizo aluminium doors and windows in the standard design', 'External cladding in your choice of finish', 'Plasterboard walls with a tape-and-joint finish', '12mm premium laminate flooring', 'Lighting and electrics designed to your requirements', 'VAT'], M, 115, 88);
  const quoted = [...upgradesOf(state).map(u => u + ' (upgrade)'), 'Electrical supply connection to the building', 'Site clearance, water and drainage, skips and parking permits, if needed'];
  const qy = bullets(quoted.slice(0, 13), 110, 115, 84, 8.6, 205);
  if (quoted.length > 13) para(`And ${quoted.length - 13} more, listed on page 4.`, 115, qy, 80, 8.4, C.muted, 4);
  if (price.value === null) {
    const near = nearestPriced(state, 3);
    para(`Published prices for the ${st.name}: ${near.map(x => `${metres(x.w)} × ${metres(x.d)} ${pounds(x.price)}`).join('; ')}.`, M, 212, CW, 8.8, C.ink, 4.2, true);
  }
  para('This is not a written quotation. Pecasa confirms your specification, current prices and any site costs in a written, VAT-inclusive quotation, normally within 7 days of your free survey; quotations remain valid for three months.', M, 222, CW, 8.4, C.muted, 3.9);
  pdf.setFillColor(C.mist); pdf.roundedRect(M, 238, CW, 32, 2, 2, 'F');
  heading('Planning', M + 7, 248, 13);
  para(P.maxHeight > 2.5 ? `Your design is ${metres(P.maxHeight)} high. In England a garden room within 2m of a boundary must be no more than 2.5m high to fall within permitted development; Pecasa advises at your survey.` : `Your design is ${metres(P.maxHeight)} high. Many garden rooms used for purposes incidental to the house fall within permitted development; Pecasa gives guidance at your free survey.`, M + 7, 255, CW - 14, 8.6, C.ink, 4.1);

  // ---- 6. Next steps -------------------------------------------------------------------------
  pdf.addPage(); frame(6, 'Your next steps', 'From your design to your garden room.');
  const keys = ['factory', 'warranty', 'install', 'survey', 'projects', 'britain'];
  keys.forEach((k, i) => { const x = M + (i % 2) * (CW / 2 + 2), y = 59 + Math.floor(i / 2) * 19; pdf.setFillColor(C.signal); pdf.circle(x + 2, y - 1.4, 1.6, 'F'); set(10.4, true, C.forest); pdf.text(USPS[k].title, x + 6, y); para(USPS[k].copy, x + 6, y + 5, CW / 2 - 10, 8.4, C.muted, 3.9); });
  pdf.setDrawColor(C.line); pdf.line(M, 120, W - M, 120);
  const step = (n, title, copy, y) => { pdf.setFillColor(C.forest); pdf.circle(M + 4, y - 1.5, 4, 'F'); set(10, true, '#ffffff', true); pdf.text(String(n), M + 4, y - .1, {align: 'center'}); set(11, true, C.forest); pdf.text(title, M + 12, y); para(copy, M + 12, y + 5, 112, 8.8, C.muted, 4.1); };
  step(1, 'Book a call', 'Talk through your design, your garden and your budget with Pecasa’s design team.', 132);
  step(2, 'Free survey', 'A Pecasa surveyor visits, measures your garden and checks access. It usually takes 10 to 30 minutes.', 152);
  step(3, 'Your free 3D design and written quote', 'A VAT-inclusive quotation, normally within 7 days of your survey, valid for three months.', 172);
  step(4, 'Made in Watford, installed by Pecasa', 'Rooms up to 16m² are installed within 10 working days of starting on site, subject to specification, access and weather.', 192);
  qr(booking, 152, 126, 42); set(7.6, false, C.muted); pdf.text('Scan to book your call', 173, 173, {align: 'center'});
  button('Book a call', M, 210, CW, 15, booking);
  const tiles = [['Call Pecasa', CONTACT.phone, 'tel:' + CONTACT.tel], ['Visit the showroom', 'Unit 3, 8 Colonial Way, Watford, by appointment', CONTACT.showroom.map], ['Reopen your design', 'Change anything and see it again', link]];
  tiles.forEach(([t, c, url], i) => { const x = M + i * (CW / 3 + .5), w = CW / 3 - 3; pdf.setDrawColor(C.line); pdf.setLineWidth(.3); pdf.roundedRect(x, 231, w, 24, 2, 2, 'S'); set(9.5, true, C.pine); pdf.text(t, x + 4, 239); para(c, x + 4, 245, w - 8, 8, C.muted, 3.6); pdf.link(x, 231, w, 24, {url}); });
  para('Views are rendered from your design and are illustrative: furniture, planting and the garden setting are examples, and colours vary by screen and printer. Pecasa Ltd, company 10714739, Unit 3, 8 Colonial Way, Watford WD24 4PT.', M, 263, CW, 7.4, C.muted, 3.4);

  const slug = v => String(v).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  const filename = `Pecasa-${slug(st.name)}-${state.width}x${state.depth}-design.pdf`;
  if (options.save !== false) pdf.save(filename);
  return {filename, pages: PAGES, reference: ref, bytes: options.save === false ? pdf.output('arraybuffer') : null};
}
