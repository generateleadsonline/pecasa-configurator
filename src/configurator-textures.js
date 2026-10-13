// Procedural material textures, drawn on canvases at runtime: no image downloads, no third-party
// assets. Each surface gets a colour map and a normal map derived from a height map, so board
// gaps, shadow lines and grain catch the light. Geometry UVs are in metres; `size` is the real
// width and height one tile covers, so boards are drawn at their true scale.
import * as THREE from 'three';

const PX = 1024;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function hashSeed(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v));
function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade([r, g, b], f, warm = 0) {
  return `rgb(${clamp(r * f + warm)},${clamp(g * f)},${clamp(b * f - warm)})`;
}

/** Sobel normal map from a greyscale height canvas (white is high). Tiles seamlessly. */
function normalFrom(height, strength) {
  const w = height.width, h = height.height;
  const src = height.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h), d = img.data;
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      d[i] = (nx / len * .5 + .5) * 255; d[i + 1] = (ny / len * .5 + .5) * 255; d[i + 2] = (nz / len * .5 + .5) * 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Fine speckle in place: breaks up flat colour the way real surfaces do. */
function speckle(c, amount, seed) {
  const ctx = c.getContext('2d'), img = ctx.getImageData(0, 0, c.width, c.height), d = img.data, rand = seeded(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - .5) * amount;
    d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

/** Grain along a vertical board between x0 and x1, wrapping top to bottom. */
function grain(ctx, x0, x1, H, rand, base, o) {
  const width = x1 - x0;
  for (let i = 0; i < o.lines; i++) {
    const xs = x0 + rand() * width;
    const dark = rand() < o.darkShare;
    const f = dark ? 1 - o.contrast * (.4 + rand() * .6) : 1 + o.contrast * .5 * rand();
    ctx.strokeStyle = shade(base, f, o.warm);
    ctx.globalAlpha = .12 + rand() * .3;
    ctx.lineWidth = .6 + rand() * (dark ? 2.6 : 1.6);
    const k1 = 1 + Math.floor(rand() * 2), k2 = 2 + Math.floor(rand() * 4), a1 = rand() * o.wave, a2 = rand() * o.wave * .35;
    const p1 = rand() * 6.283, p2 = rand() * 6.283;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 32) {
      const x = xs + a1 * Math.sin(6.283 * k1 * y / H + p1) + a2 * Math.sin(6.283 * k2 * y / H + p2);
      if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function knot(ctx, hctx, x, y, H, rand, base, size) {
  for (const yy of [y, y - H, y + H]) {
    const rx = size * (.6 + rand() * .4), ry = size * (1.4 + rand() * .8);
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, rx * 1.6);
    g.addColorStop(0, shade(base, .42)); g.addColorStop(.45, shade(base, .62)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, yy, rx * 1.6, ry * 1.6, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = shade(base, .7); ctx.globalAlpha = .4; ctx.lineWidth = 1;
    for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.ellipse(x, yy, rx * (1 + r * .5), ry * (1 + r * .6), 0, 0, 6.283); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (hctx) { hctx.fillStyle = 'rgba(0,0,0,.18)'; hctx.beginPath(); hctx.ellipse(x, yy, rx, ry, 0, 0, 6.283); hctx.fill(); }
  }
}

// Board systems, in metres, at the widths Pecasa's planner draws them (its texture tiles, read on
// 13 October 2026): cedar 130mm, shiplap and pine 125mm, Envirobuild composite 121mm, Millboard
// Shadow Line 130mm, Millboard Board & Batten on a 125mm repeat. `groove` is the visible joint,
// `bevel` the rounded shoulder.
const BOARDS = {
  cedar: {board: .13, count: 8, groove: .004, bevel: .002, lines: 34, contrast: .3, darkShare: .65, wave: 3, warm: 9, knots: .12, jitter: .2, roughness: .78, normal: 3},
  pine: {board: .125, count: 8, groove: .004, bevel: .002, lines: 26, contrast: .32, darkShare: .6, wave: 4, warm: 7, knots: .5, jitter: .08, roughness: .74, normal: 3},
  shiplap: {board: .125, count: 8, groove: .006, bevel: .003, lines: 14, contrast: .05, darkShare: .5, wave: 2, warm: 0, knots: 0, jitter: .025, roughness: .8, normal: 3.6, shiplap: true, painted: true},
  composite: {board: .121, count: 8, groove: .008, bevel: .004, lines: 30, contrast: .07, darkShare: .55, wave: 1.5, warm: 0, knots: 0, jitter: .025, roughness: .64, normal: 3.4, vgroove: true, emboss: true},
  shadowline: {board: .13, count: 8, gap: .012, groove: .004, bevel: .004, lines: 34, contrast: .14, darkShare: .6, wave: 4, warm: 2, knots: 0, jitter: .05, roughness: .7, normal: 3.6, emboss: true},
  boardbatten: {widths: [.095, .03], count: 8, groove: .003, bevel: .006, lines: 30, contrast: .14, darkShare: .6, wave: 4, warm: 2, knots: 0, jitter: .05, roughness: .7, normal: 4, batten: true, emboss: true}
};

/**
 * `scale` below 1 allocates every canvas at a fraction of its designed size (phones use .5, a
 * quarter of the memory) while the drawing code keeps working in designed pixels.
 */
export function createTextures(renderer, {scale = 1, flat: flatOnly = false} = {}) {
  const cache = new Map();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const k = scale;
  let gen = 0, failures = 0;
  // Shadows the unscaled helper: a canvas at the device's budget, drawn in designed pixels.
  const canvas = (w, h = w) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const ctx = c.getContext('2d');
    // iOS Safari returns null once a site's canvases pass its memory budget.
    if (!ctx) throw new Error('2D canvas unavailable');
    if (k !== 1) ctx.scale(k, k);
    return c;
  };
  // Zero-size canvases give their memory back at once; waiting for garbage collection is what
  // pushes iPhones over the budget.
  const free = c => { c.width = c.height = 0; };
  // Fewer pixels make each height step steeper, so the strength scales with them.
  const normal = (h, strength) => { const n = normalFrom(h, strength * k); free(h); return n; };
  const make = (c, colour = true, repeat = true) => {
    const t = new THREE.CanvasTexture(c);
    if (colour) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Once the GPU holds its copy the canvas is only memory. A lost context rebuilds every
    // texture from scratch, so nothing needs it again.
    t.onUpdate = () => { t.onUpdate = null; free(c); };
    return t;
  };
  // A surface that could not be drawn renders in its flat colour rather than stopping the 3D.
  const flat = hex => {
    if (!hex) return {map: null, normalMap: null, roughness: .8, size: [1, 1]};
    const t = new THREE.DataTexture(new Uint8Array([...rgb(hex), 255]), 1, 1);
    t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    // The SVG renderer reads this to colour the material, as it draws no textures.
    t.userData.hex = hex;
    return {map: t, normalMap: null, roughness: .8, size: [1, 1]};
  };
  const memo = (key, hex, build) => {
    let entry = cache.get(key);
    if (!entry) {
      let value;
      if (flatOnly) value = flat(hex);
      else try { value = build(); } catch (err) { failures++; console.warn('Texture drawn flat:', key, err); value = flat(hex); }
      entry = {value, used: gen};
      cache.set(key, entry);
    }
    entry.used = gen;
    return entry.value;
  };
  const release = pair => { for (const t of [pair.map, pair.normalMap]) t?.dispose(); };
  // UVs are metres, so a tile covering `size` metres repeats every `size`.
  const set = (pair, sx, sy) => {
    for (const t of [pair.map, pair.normalMap].filter(Boolean)) t.repeat.set(1 / sx, 1 / sy);
    return {...pair, size: [sx, sy]};
  };

  /** Cladding: Pecasa's board systems, render or stone, in the chosen colour. */
  function cladding(kind, hex, horizontal) {
    return memo(`clad:${kind}:${hex}:${horizontal}`, hex, () => {
      if (kind === 'render') return renderFinish(hex);
      if (kind === 'drystone' || kind === 'stoneslip') return stone(kind, hex);
      const o = BOARDS[kind] || BOARDS.cedar;
      const widths = o.widths ? Array.from({length: o.count}, (_, i) => o.widths[i % o.widths.length]) : Array(o.count).fill(o.board);
      const tile = widths.reduce((a, b) => a + b, 0);
      const S = PX, H = PX, px = S / tile;
      const c = canvas(S), h = canvas(S);
      const ctx = c.getContext('2d'), hctx = h.getContext('2d');
      if (horizontal) for (const k of [ctx, hctx]) { k.translate(S, 0); k.rotate(Math.PI / 2); }
      const base = rgb(hex), rand = seeded(hashSeed(kind + hex));
      hctx.fillStyle = '#000'; hctx.fillRect(0, 0, S, H);
      let edge = 0;
      for (let b = 0; b < widths.length; b++) {
        const isBatten = o.batten && b % 2 === 1;
        const x0 = edge * px, x1 = x0 + (widths[b] - (o.gap || 0)) * px;
        edge += widths[b];
        // Cedar varies board to board, from honey to red-brown; painted and composite boards hardly.
        const f = 1 + (rand() - .5) * 2 * o.jitter;
        const warm = kind === 'cedar' ? (rand() - .4) * 22 : o.warm * (rand() - .5);
        const boardBase = base.map((v, i) => v * f + (i === 0 ? warm : i === 2 ? -warm * .6 : 0));
        ctx.fillStyle = `rgb(${clamp(boardBase[0])},${clamp(boardBase[1])},${clamp(boardBase[2])})`;
        ctx.fillRect(x0, 0, x1 - x0, H);
        if (!o.painted) grain(ctx, x0, x1, H, rand, boardBase, o);
        else for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(${rand() < .5 ? '255,255,255' : '0,0,0'},.025)`; ctx.fillRect(x0, rand() * H, x1 - x0, 20 + rand() * 120); }
        if (o.knots && rand() < o.knots) knot(ctx, hctx, x0 + (x1 - x0) * (.25 + rand() * .5), rand() * H, H, rand, boardBase, 3 + rand() * 5);
        const bevel = Math.max(1, o.bevel * px);
        const g = hctx.createLinearGradient(x0, 0, x1, 0);
        const hi = isBatten ? '#ffffff' : o.batten ? '#c8c8c8' : '#f0f0f0';
        g.addColorStop(0, '#5a5a5a'); g.addColorStop(Math.min(.45, bevel / (x1 - x0)), hi);
        g.addColorStop(Math.max(.55, 1 - bevel / (x1 - x0)), hi); g.addColorStop(1, '#5a5a5a');
        hctx.fillStyle = g; hctx.fillRect(x0, 0, x1 - x0, H);
        if (isBatten) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x0, 0, x1 - x0, H); }
        if (o.shiplap) {
          // The lap: each board sits proud of the next, casting a shadow line along it.
          const lap = hctx.createLinearGradient(x0, 0, x1, 0);
          lap.addColorStop(0, 'rgba(0,0,0,.45)'); lap.addColorStop(.35, 'rgba(0,0,0,0)');
          hctx.fillStyle = lap; hctx.fillRect(x0, 0, x1 - x0, H);
          ctx.fillStyle = 'rgba(0,0,0,.09)'; ctx.fillRect(x0, 0, (x1 - x0) * .14, H);
          ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x1 - (x1 - x0) * .2, 0, (x1 - x0) * .2, H);
        }
        if (o.vgroove) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x0, 0, 2, H); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x1 - 3, 0, 2, H); }
        const groove = Math.max(1.5, (o.groove || 0) * px);
        if (o.gap) {
          // Shadow Line: a recessed dark gap between the boards.
          const gx = x1, gw = o.gap * px;
          ctx.fillStyle = shade(base, .3); ctx.fillRect(gx, 0, gw, H);
          hctx.fillStyle = '#080808'; hctx.fillRect(gx, 0, gw, H);
        } else {
          ctx.fillStyle = shade(base, .45); ctx.fillRect(x1 - groove, 0, groove, H);
          hctx.fillStyle = '#000'; hctx.fillRect(x1 - groove, 0, groove, H);
        }
      }
      if (o.emboss) {
        hctx.globalAlpha = .2;
        for (let i = 0; i < 520; i++) {
          const x = rand() * S, y = rand() * H, len = 40 + rand() * 160;
          hctx.strokeStyle = rand() < .5 ? '#000' : '#fff'; hctx.lineWidth = .8 + rand();
          hctx.beginPath(); hctx.moveTo(x, y); hctx.lineTo(x + (rand() - .5) * 3, y + len); hctx.stroke();
        }
        hctx.globalAlpha = 1;
      }
      speckle(c, o.painted ? 5 : 9, hashSeed(hex));
      return set({map: make(c), normalMap: make(normal(h, o.normal), false), roughness: o.roughness}, tile, tile);
    });
  }

  /** Smooth render with a fine sand texture (the planner's "Render"). */
  function renderFinish(hex) {
    const c = canvas(512), h = canvas(512), ctx = c.getContext('2d'), hctx = h.getContext('2d');
    ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, 512);
    hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, 512, 512);
    speckle(c, 7, hashSeed(hex)); speckle(h, 70, 31);
    return set({map: make(c), normalMap: make(normal(h, .9), false), roughness: .92}, 1, 1);
  }

  /** Stone 01 (dry-laid limestone) and Stone 02 (mixed stone slips), 1m tiles. */
  function stone(kind, hex) {
    const c = canvas(PX), h = canvas(PX), ctx = c.getContext('2d'), hctx = h.getContext('2d');
    const base = rgb(hex), rand = seeded(hashSeed(kind + hex)), sx = PX;
    ctx.fillStyle = shade(base, .45); ctx.fillRect(0, 0, PX, PX);
    hctx.fillStyle = '#000'; hctx.fillRect(0, 0, PX, PX);
    const course = kind === 'stoneslip' ? .05 : .09, joint = kind === 'stoneslip' ? .006 : .012;
    for (let y = 0; y < 1; ) {
      const ch = course * (kind === 'stoneslip' ? 1 : .6 + rand() * .9);
      let x = -rand() * .3;
      while (x < 1) {
        const len = kind === 'stoneslip' ? .18 + rand() * .3 : .12 + rand() * .35;
        const f = .78 + rand() * .4, warm = kind === 'stoneslip' ? (rand() - .5) * 60 : (rand() - .5) * 18;
        for (const ox of [0, -1, 1]) {
          const px0 = (x + ox) * sx + joint * sx / 2, py0 = y * sx + joint * sx / 2, w = (len - joint) * sx, hh = (ch - joint) * sx;
          ctx.fillStyle = `rgb(${clamp(base[0] * f + warm)},${clamp(base[1] * f + warm * .3)},${clamp(base[2] * f - warm * .4)})`;
          ctx.fillRect(px0, py0, w, hh);
          hctx.fillStyle = `rgb(${190 + rand() * 50},${190},${190})`; hctx.fillRect(px0, py0, w, hh);
        }
        x += len;
      }
      y += ch;
    }
    speckle(c, 24, hashSeed(hex)); speckle(h, 50, 12);
    return set({map: make(c), normalMap: make(normal(h, 2.4), false), roughness: .93}, 1, 1);
  }

  /** Floors: 130mm planks, herringbone, 375mm tiles or OSB. */
  function floor(kind, hex) {
    return memo(`floor:${kind}:${hex}`, hex, () => {
      const base = rgb(hex), rand = seeded(hashSeed(hex));
      const c = canvas(PX), h = canvas(PX), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      if (kind === 'tile') {
        const n = 4, t = PX / n;
        hctx.fillStyle = '#000'; hctx.fillRect(0, 0, PX, PX);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const f = .9 + rand() * .18;
          ctx.fillStyle = shade(base, f); ctx.fillRect(i * t, j * t, t, t);
          hctx.fillStyle = '#e0e0e0'; hctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
        }
        speckle(c, 14, 3);
        return set({map: make(c), normalMap: make(normal(h, 1.4), false), roughness: .35}, 1.5, 1.5);
      }
      if (kind === 'osb') {
        ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, PX, PX);
        for (let i = 0; i < 2600; i++) {
          ctx.save(); ctx.translate(rand() * PX, rand() * PX); ctx.rotate(rand() * 6.28);
          ctx.fillStyle = shade(base, .7 + rand() * .5); ctx.fillRect(-14, -4, 28 + rand() * 30, 6 + rand() * 6); ctx.restore();
        }
        hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, PX, PX); speckle(h, 40, 4);
        return set({map: make(c), normalMap: make(normal(h, 1), false), roughness: .85}, 1.2, 1.2);
      }
      hctx.fillStyle = '#000'; hctx.fillRect(0, 0, PX, PX);
      if (kind === 'herringbone') {
        // Blocks 90 x 450mm in a herringbone, as in Pecasa's finished interiors.
        const bw = .09, bl = .45, tile = bl * 2, s = PX / tile;
        for (let i = -2; i < 12; i++) for (let j = -2; j < 12; j++) {
          for (const flip of [0, 1]) {
            const f = 1 + (rand() - .5) * .18;
            ctx.save(); ctx.translate((i * bw * 2 + j * bw * 2) * s % PX, (j * bw * 2 - i * bw * 2 + flip * bw) * s % PX);
            ctx.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
            ctx.fillStyle = shade(base, f); ctx.fillRect(0, 0, bl * s, bw * s);
            ctx.fillStyle = shade(base, .55); ctx.fillRect(0, 0, bl * s, 1.2); ctx.fillRect(0, 0, 1.2, bw * s);
            hctx.save(); hctx.setTransform(ctx.getTransform()); hctx.fillStyle = '#e8e8e8'; hctx.fillRect(2, 2, bl * s - 4, bw * s - 4); hctx.restore();
            ctx.restore();
          }
        }
        speckle(c, 8, 5);
        return set({map: make(c), normalMap: make(normal(h, 1.4), false), roughness: .5}, tile, tile);
      }
      const rows = 8, plankW = .13, plankL = 1.22, tileX = plankL, tileY = plankW * rows, sx = PX / tileX, sy = PX / tileY;
      for (let r = 0; r < rows; r++) {
        const offset = (r * .37 % 1) * plankL;
        for (let k = -1; k < 2; k++) {
          const x0 = (offset + k * plankL) * sx, y0 = r * plankW * sy, w = plankL * sx, hgt = plankW * sy;
          const f = 1 + (rand() - .5) * .16;
          ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, hgt); ctx.clip();
          ctx.fillStyle = shade(base, f); ctx.fillRect(x0, y0, w, hgt);
          ctx.translate(x0, y0 + hgt); ctx.rotate(-Math.PI / 2);
          grain(ctx, 0, hgt, w, rand, base.map(v => v * f), {lines: 22, contrast: .28, darkShare: .7, wave: 4, warm: 3});
          ctx.restore();
          hctx.fillStyle = '#e8e8e8'; hctx.fillRect(x0 + 2, y0 + 2, w - 4, hgt - 4);
          ctx.fillStyle = shade(base, .55); ctx.fillRect(x0, y0, w, 1.2); ctx.fillRect(x0, y0, 1.2, hgt);
        }
      }
      speckle(c, 8, 5);
      return set({map: make(c), normalMap: make(normal(h, 1.6), false), roughness: .5}, tileX, tileY);
    });
  }

  /** Composite or hardwood decking: grooved boards with fine gaps and staggered joints. */
  function deck(hex, board = .15) {
    return memo(`deck:${hex}:${board}`, hex, () => {
      const base = rgb(hex), rand = seeded(hashSeed('deck' + hex));
      const gap = .006, count = 6, tile = (board + gap) * count, len = 1.8;
      const c = canvas(PX), h = canvas(PX), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      const sx = PX / tile;
      ctx.fillStyle = shade(base, .25); ctx.fillRect(0, 0, PX, PX);
      hctx.fillStyle = '#000'; hctx.fillRect(0, 0, PX, PX);
      for (let b = 0; b < count; b++) {
        const x0 = b * (board + gap) * sx, x1 = x0 + board * sx, f = 1 + (rand() - .5) * .22;
        ctx.fillStyle = shade(base, f); ctx.fillRect(x0, 0, x1 - x0, PX);
        grain(ctx, x0, x1, PX, rand, base.map(v => v * f), {lines: 24, contrast: .3, darkShare: .7, wave: 3, warm: 4});
        hctx.fillStyle = '#d0d0d0'; hctx.fillRect(x0, 0, x1 - x0, PX);
        for (let g = 1; g < 7; g++) { hctx.fillStyle = '#9a9a9a'; hctx.fillRect(x0 + (x1 - x0) * g / 7 - 1, 0, 2, PX); }
        const joint = ((b * .43) % 1) * PX;
        ctx.fillStyle = shade(base, .3); ctx.fillRect(x0, joint, x1 - x0, 3);
        hctx.fillStyle = '#000'; hctx.fillRect(x0, joint, x1 - x0, 3);
      }
      speckle(c, 10, 77);
      return set({map: make(c), normalMap: make(normal(h, 2.5), false), roughness: .74}, tile, len);
    });
  }

  /** Roof coverings: EPDM, corrugated sheet (111mm ribs), copper shingles, terracotta tiles. */
  function roof(kind) {
    return memo(`roof:${kind}`, {epdm: '#2f3031', corrugated: '#474c50', copper: '#505750', terracotta: '#8b351a'}[kind] || '#2f3031', () => {
      const rand = seeded(hashSeed(kind));
      const c = canvas(512), h = canvas(512), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      if (kind === 'corrugated') {
        const ribs = 6;
        for (let x = 0; x < 512; x++) {
          const v = .5 + .5 * Math.sin(x / 512 * ribs * 6.283);
          ctx.fillStyle = `rgb(${60 + v * 30},${66 + v * 30},${72 + v * 30})`; ctx.fillRect(x, 0, 1, 512);
          hctx.fillStyle = `rgb(${v * 255},${v * 255},${v * 255})`; hctx.fillRect(x, 0, 1, 512);
        }
        speckle(c, 8, 9);
        return set({map: make(c), normalMap: make(normal(h, 2.2), false), roughness: .45}, .111 * ribs, .666);
      }
      if (kind === 'copper' || kind === 'terracotta') {
        const copper = kind === 'copper';
        ctx.fillStyle = copper ? '#2f3833' : '#5a2210'; ctx.fillRect(0, 0, 512, 512);
        hctx.fillStyle = '#000'; hctx.fillRect(0, 0, 512, 512);
        const cols = 4, rows = copper ? 3 : 4, tw = 512 / cols, th = 512 / rows;
        for (let r = 0; r < rows; r++) for (let t = -1; t <= cols; t++) {
          const x = t * tw + (copper ? (r % 2) * tw / 2 : 0), y = r * th, f = .82 + rand() * .32;
          if (copper) {
            // Verdigris shingles: green-grey with darker weathering.
            ctx.fillStyle = `rgb(${62 * f},${84 * f},${74 * f})`; ctx.fillRect(x + 2, y, tw - 4, th - 3);
            for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(${rand() < .5 ? '30,34,30' : '110,140,120'},.25)`; ctx.fillRect(x + rand() * tw, y + rand() * th, 6 + rand() * 18, 4 + rand() * 30); }
          } else {
            const g = ctx.createLinearGradient(x, 0, x + tw, 0);
            g.addColorStop(0, `rgb(${110 * f},${42 * f},${20 * f})`); g.addColorStop(.5, `rgb(${160 * f},${64 * f},${32 * f})`); g.addColorStop(1, `rgb(${105 * f},${40 * f},${18 * f})`);
            ctx.fillStyle = g; ctx.fillRect(x + 1, y, tw - 2, th - 2);
          }
          const gh = hctx.createLinearGradient(0, y, 0, y + th);
          gh.addColorStop(0, '#606060'); gh.addColorStop(1, '#f0f0f0');
          hctx.fillStyle = gh; hctx.fillRect(x + 2, y, tw - 4, th - 3);
          if (!copper) { const gx = hctx.createLinearGradient(x, 0, x + tw, 0); gx.addColorStop(0, 'rgba(0,0,0,.6)'); gx.addColorStop(.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,.6)'); hctx.fillStyle = gx; hctx.fillRect(x, y, tw, th); }
        }
        speckle(c, 18, 41);
        return set({map: make(c), normalMap: make(normal(h, 3), false), roughness: copper ? .7 : .8}, .5, copper ? .5 : .5);
      }
      ctx.fillStyle = '#2d2f30'; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6000; i++) { ctx.fillStyle = `rgba(${rand() < .5 ? '0,0,0' : '90,92,94'},.18)`; ctx.fillRect(rand() * 512, rand() * 512, 2, 2); }
      hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, 512, 512); speckle(h, 30, 3);
      return set({map: make(c), normalMap: make(normal(h, 1), false), roughness: .88}, 1.2, 1.2);
    });
  }

  /** Sedum roof: low clumps of green, red-tipped and yellow succulents. */
  function sedum() {
    return memo('sedum', '#6b8c2f', () => {
      const rand = seeded(29), c = canvas(512), h = canvas(512), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      ctx.fillStyle = '#56722a'; ctx.fillRect(0, 0, 512, 512); hctx.fillStyle = '#404040'; hctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 7000; i++) {
        const x = rand() * 512, y = rand() * 512, r = 1.5 + rand() * 3.5, k = rand();
        ctx.fillStyle = k < .6 ? `rgb(${80 + rand() * 40},${120 + rand() * 40},${40 + rand() * 20})` : k < .85 ? `rgb(${140 + rand() * 40},${150},${50})` : `rgb(${150},${70 + rand() * 30},${50})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        hctx.fillStyle = `rgb(${150 + rand() * 100},150,150)`; hctx.beginPath(); hctx.arc(x, y, r, 0, 6.283); hctx.fill();
      }
      return set({map: make(c), normalMap: make(normal(h, 2.5), false), roughness: 1}, .8, .8);
    });
  }

  /** Interior walls: plasterboard with a tape-and-joint finish in the chosen colour, or plywood. */
  function interior(spec) {
    return memo(`int:${spec.hex}:${spec.ply ? 'ply' : 'plaster'}:${spec.ceiling ? 'c' : 'w'}`, spec.hex, () => {
      const c = canvas(512, 1024), h = canvas(512, 1024), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      const W = 1.2, Hm = 2.4, sx = 512 / W;
      ctx.fillStyle = spec.ceiling && !spec.ply ? '#f6f6f3' : spec.hex; ctx.fillRect(0, 0, 512, 1024);
      hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, 512, 1024);
      if (spec.ply) {
        const rand = seeded(13);
        grain(ctx, 0, 512, 1024, rand, rgb(spec.hex), {lines: 50, contrast: .18, darkShare: .6, wave: 8, warm: 6});
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, 2, 1024); ctx.fillRect(0, 0, 512, 2);
        hctx.fillStyle = '#000'; hctx.fillRect(0, 0, 2, 1024); hctx.fillRect(0, 0, 512, 2);
      }
      speckle(c, 3, 11);
      return set({map: make(c), normalMap: make(normal(h, 1.2), false), roughness: .85}, W, Hm);
    });
  }

  /** Lawn, with mown stripes and blade speckle. */
  function lawn() {
    return memo('lawn', '#6a8649', () => {
      const rand = seeded(17), c = canvas(PX), ctx = c.getContext('2d');
      ctx.fillStyle = '#6a8649'; ctx.fillRect(0, 0, PX, PX);
      for (let s = 0; s < 2; s++) { ctx.fillStyle = s % 2 ? 'rgba(255,255,230,.025)' : 'rgba(20,40,0,.025)'; ctx.fillRect(0, s * PX / 2, PX, PX / 2); }
      for (let i = 0; i < 90000; i++) {
        const g = rand();
        ctx.fillStyle = g < .45 ? 'rgba(46,72,30,.55)' : g < .85 ? 'rgba(125,152,86,.5)' : 'rgba(170,180,110,.45)';
        const x = rand() * PX, y = rand() * PX;
        ctx.fillRect(x, y, 1.3, 2.6 + rand() * 3);
      }
      const h = canvas(512); h.getContext('2d').fillStyle = '#808080'; h.getContext('2d').fillRect(0, 0, 512, 512); speckle(h, 90, 21);
      return set({map: make(c), normalMap: make(normal(h, 1.4), false), roughness: .95}, 3, 3);
    });
  }

  /** Riven paving slabs for the path and patio. */
  function paving() {
    return memo('paving', '#c8c4ba', () => {
      const rand = seeded(5), c = canvas(512), h = canvas(512), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      ctx.fillStyle = '#8f8b82'; ctx.fillRect(0, 0, 512, 512); hctx.fillStyle = '#000'; hctx.fillRect(0, 0, 512, 512);
      const n = 2, s = 512 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const f = .9 + rand() * .18;
        ctx.fillStyle = `rgb(${200 * f},${196 * f},${186 * f})`; ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        hctx.fillStyle = '#d8d8d8'; hctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      }
      speckle(c, 22, 8); speckle(h, 40, 9);
      return set({map: make(c), normalMap: make(normal(h, 2), false), roughness: .9}, 1.2, 1.2);
    });
  }

  function gravel() {
    return memo('gravel', '#a49d90', () => {
      const rand = seeded(23), c = canvas(512), h = canvas(512), ctx = c.getContext('2d'), hctx = h.getContext('2d');
      ctx.fillStyle = '#a49d90'; ctx.fillRect(0, 0, 512, 512); hctx.fillStyle = '#202020'; hctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        const x = rand() * 512, y = rand() * 512, r = 1.5 + rand() * 3.5, f = .7 + rand() * .5;
        ctx.fillStyle = `rgb(${190 * f},${182 * f},${168 * f})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * .8, rand() * 3, 0, 6.283); ctx.fill();
        hctx.fillStyle = `rgb(${200 * f},${200 * f},${200 * f})`; hctx.beginPath(); hctx.ellipse(x, y, r, r * .8, 0, 0, 6.283); hctx.fill();
      }
      return set({map: make(c), normalMap: make(normal(h, 2.2), false), roughness: 1}, .8, .8);
    });
  }

  /** Painted steel ground screw collar and soffit: a gentle orange-peel finish. */
  function powder() {
    return memo('powder', null, () => {
      const h = canvas(256); h.getContext('2d').fillStyle = '#808080'; h.getContext('2d').fillRect(0, 0, 256, 256); speckle(h, 26, 4);
      const t = make(normal(h, .8), false);
      t.repeat.set(4, 4);
      return {normalMap: t};
    });
  }

  return {
    cladding, floor, deck, roof, sedum, interior, lawn, paving, gravel, powder,
    /** Starts a rebuild: textures the new room does not ask for become free to prune. */
    begin() { gen++; },
    /**
     * Frees the least recently used textures beyond `limit`. Never one the current room uses,
     * and never the lawn, which the garden keeps for the life of the scene.
     */
    prune(limit) {
      const old = [...cache].filter(([key, e]) => e.used < gen && key !== 'lawn').sort((a, b) => a[1].used - b[1].used);
      for (const [key, e] of old) {
        if (cache.size <= limit) break;
        release(e.value); cache.delete(key);
      }
    },
    stats: () => ({textures: cache.size, failures, scale: k}),
    dispose() { for (const e of cache.values()) release(e.value); cache.clear(); }
  };
}
