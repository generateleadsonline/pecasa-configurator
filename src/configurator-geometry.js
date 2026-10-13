// Pure plan geometry for a Pecasa design: the wall outline, the roof outline and heights, fins,
// posts, decks and glazed corners. No DOM and no Three.js, so the model (fitting doors and
// windows), the 3D building and the PDF's drawn plan all work from the same numbers.
//
// Everything follows Pecasa's planner templates (configuration.json v23, `buildingSizes`): the
// floor polygon, wall-top heights at each corner, porches (roof overhangs), ponys (fins),
// trims, posts and decks. Plan units are metres. World axes as in the 3D scene: x to the right
// as you face the front, z towards you, so the front wall's outer face is at z = depth / 2.
//
// Walls run left to right as seen from outside (front: -x to +x, right: front to back, back:
// +x to -x, left: back to front), so a wall's outward normal is (-tz, tx) for direction (tx, tz).
import {STYLES} from './configurator-data.js';

export const FLOOR = .15;        // planner baseHeight: finished floor above ground
export const WALL = .15;         // planner wallThickness (SIP wall with its cladding)
export const SKIN = .022;        // the cladding boards' share of the wall
export const CORNER = .15;       // nearest a door or window comes to an outside corner (one wall thickness)
export const INSIDE = 0;         // ... to an inside (re-entrant) corner: the frame meets the wall face
export const POST = .15;         // corner post at a glazed corner (planner CornerPost 150 x 150)

const r3 = v => Math.round(v * 1000) / 1000;
/** The roof actually built: the style's own, or the planner's Flat/Pitched switch. */
export function roofKind(state) {
  const own = STYLES[state.style].roof.kind;
  if (own === 'blades') return 'blades';
  if (state.roofType === 'pitched') return 'gable';
  if (state.roofType === 'flat' && own === 'gable') return 'flat';
  return own;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** The wall polygon in plan coordinates (px right, py towards the front, origin back-left). */
function planPolygon(style, W, D) {
  const s = STYLES[style];
  if (s.plan === 'notch') {
    // Portal and L-Shape: the left block runs full depth; the rest of the front is set back.
    const bw = clamp(Math.round(W * s.notch.blockRatio * 20) / 20, 1.1, W - 1.5);
    const nd = clamp(s.notch.depth, .6, D - 1.4);
    return {pts: [[0, D], [bw, D], [bw, D - nd], [W, D - nd], [W, 0], [0, 0]],
      ids: ['front-left', 'porch-side', 'front', 'right', 'back', 'left'], notch: {bw, nd}};
  }
  if (s.plan === 'apexo') {
    // Apexo: a solid left block, a front recessed 400mm and a glazed return at the right corner.
    const bw = clamp(Math.round(W * .32 * 20) / 20, 1.1, W - 2.4);
    const rec = clamp(.4, .2, D - 1.6), ret = .2;
    const stepY = clamp(D - rec - .96, D * .35, D - rec - .6);
    return {pts: [[0, D], [bw, D], [bw, D - rec], [W - ret, D - rec], [W - ret, stepY], [W, stepY], [W, 0], [0, 0]],
      ids: ['front-left', 'porch-side', 'front', 'return', 'step', 'right', 'back', 'left'], notch: {bw, rec, ret, stepY}};
  }
  return {pts: [[0, D], [W, D], [W, 0], [0, 0]], ids: ['front', 'right', 'back', 'left']};
}

const LABELS = {front: 'Front', right: 'Right side', back: 'Back', left: 'Left side', 'front-left': 'Front of the side block',
  'porch-side': 'Porch side wall', return: 'Corner return', step: 'Corner step'};
export const wallLabel = id => LABELS[id] || id;

/** Offsets an orthogonal polygon outwards, each edge by its own distance (wall order). */
function offsetPolygon(pts, dist) {
  const n = pts.length, lines = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, nx = -tz, nz = tx;
    lines.push({px: ax + nx * dist[i], pz: az + nz * dist[i], tx, tz});
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i - 1 + n) % n], b = lines[i];
    // Intersection of two perpendicular lines (orthogonal outlines only).
    if (Math.abs(a.tx) > .5) out.push([b.px, a.pz]); else out.push([a.px, b.pz]);
  }
  return out;
}

function edgesOf(pts, ids) {
  const n = pts.length;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    return {id: ids[i], a, b, len, t, n: [-t[1], t[0]]};
  });
}

// Turning direction at the vertex between edge i-1 and edge i. The walls run clockwise in
// (x, z), so outside (convex) corners turn clockwise and inside (re-entrant) ones do not.
function cornerKind(prev, next) {
  const cross = prev.t[0] * next.t[1] - prev.t[1] * next.t[0];
  return cross < 0 ? 'convex' : 'concave';
}

/**
 * Everything the 3D, the plan drawing and the opening fitter need for a design:
 * walls (world coordinates), the roof outline and its height function, fins, posts and decks.
 */
export function plan(state) {
  const s = STYLES[state.style], W = state.width, D = state.depth;
  const {pts: pp, ids, notch} = planPolygon(state.style, W, D);
  const pts = pp.map(([x, y]) => [r3(x - W / 2), r3(y - D / 2)]);
  const walls = edgesOf(pts, ids);
  walls.forEach((w, i) => {
    const prev = walls[(i - 1 + walls.length) % walls.length], next = walls[(i + 1) % walls.length];
    w.start = cornerKind(prev, w); w.end = cornerKind(w, next);
    w.prev = prev.id; w.next = next.id;
  });
  // Glazed corners: a corner post instead of a wall end (Ecke, Ofiko, Apexo).
  for (const [a, b] of s.glazedCorners || []) {
    const wa = walls.find(w => w.id === a), wb = walls.find(w => w.id === b);
    if (wa && wb && wa.next === b) { wa.glazedEnd = true; wb.glazedStart = true; }
  }
  for (const w of walls) {
    w.margin0 = w.glazedStart ? POST : w.start === 'convex' ? CORNER : INSIDE;
    w.margin1 = w.glazedEnd ? POST : w.end === 'convex' ? CORNER : INSIDE;
    w.finish = (s.finishes.walls || {})[w.id] || 'main';
  }

  // ---- Roof outline -------------------------------------------------------------------
  const ov = {front: 0, back: 0, left: 0, right: 0, ...s.overhang};
  const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
  let roofPts;
  if (s.roofOutline === 'follow') {
    // L-Shape: the roof follows the walls, overhanging every edge by the same amount.
    roofPts = offsetPolygon(pts, walls.map(w => (w.id === 'back' ? ov.back : ov.all ?? .1)));
  } else {
    roofPts = [[x0 - ov.left, z1 + ov.front], [x1 + ov.right, z1 + ov.front], [x1 + ov.right, z0 - ov.back], [x0 - ov.left, z0 - ov.back]];
  }
  roofPts = roofPts.map(([x, z]) => [r3(x), r3(z)]);
  const roofEdges = edgesOf(roofPts, roofPts.map((_, i) => 'r' + i));
  const side = e => (Math.abs(e.n[1]) > .5 ? (e.n[1] > 0 ? 'front' : 'back') : (e.n[0] > 0 ? 'right' : 'left'));
  const fascia = s.fascia;
  for (const e of roofEdges) {
    e.side = side(e);
    const f = fascia[e.side] || fascia.front;
    e.h = f[0]; e.d = f[1];
  }

  // ---- Heights ------------------------------------------------------------------------
  // `height` is the top of the roof at the front wall (mono), everywhere (flat) or at the ridge
  // (gable). Mono-pitch roofs rise towards the glazed front, by the template's fall.
  const H = state.height, roof = {...s.roof, kind: roofKind(state)};
  const rz0 = Math.min(...roofPts.map(p => p[1])), rz1 = Math.max(...roofPts.map(p => p[1]));
  let top, ridge = null, eaves = null;
  if (roof.kind === 'mono') {
    const k = roof.fall / s.defaults.depth;
    top = (x, z) => H - k * (z1 - z);
  } else if (roof.kind === 'gable') {
    // The template's pitch (a style switched to the planner's pitched roof gets 25 degrees),
    // flattened only as far as needed to keep the eaves clear of 2.1m door heads.
    const zc = (rz0 + rz1) / 2, half = (rz1 - rz0) / 2;
    const angle = (s.roof.kind === 'gable' ? s.roof.angle : 25) * Math.PI / 180;
    const k = Math.min(Math.tan(angle), Math.max(.05, (H - 2.3) / half));
    eaves = H - k * (D / 2);
    ridge = {z: zc, y: H};
    top = (x, z) => H - k * Math.abs(z - zc);
  } else {
    top = () => H;
  }
  // The soffit under any overhang or porch sits at the bottom of the deepest fascia (the back
  // edge carries only a drip trim).
  const soffitDrop = Math.max(.05, ...roofEdges.filter(e => e.side !== 'back').map(e => e.h));
  // Where a wall meets the roof: its top stops under the fascia of the roof edge it faces.
  for (const w of walls) {
    const facing = roofEdges.filter(e => e.n[0] === w.n[0] && e.n[1] === w.n[1]);
    let best = null, dist = Infinity;
    for (const e of facing) {
      const d = Math.abs(w.n[0]) > .5 ? (e.a[0] - w.a[0]) * w.n[0] : (e.a[1] - w.a[1]) * w.n[1];
      if (d >= -1e-6 && d < dist) { dist = d; best = e; }
    }
    w.overhang = r3(Math.max(0, dist === Infinity ? 0 : dist));
    w.drop = w.overhang > .06 ? soffitDrop : (best ? best.h : .05);
    w.roofEdge = best ? best.id : null;
  }
  const maxHeight = Math.max(...roofPts.map(([x, z]) => top(x, z)), ridge ? ridge.y : 0);

  // ---- Fins, jambs, posts, decks, bulkheads --------------------------------------------
  const corner = name => {
    const [fb, lr] = name.split('-');
    return [lr === 'left' ? x0 : x1, fb === 'front' ? z1 : z0];
  };
  const fins = (s.fins || []).map(f => {
    const [cx, cz] = corner(f.corner);
    const dir = {front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0]}[f.along];
    // The fin continues the wall that ends at this corner, `proj` beyond it.
    const inward = [cx < 0 ? 1 : -1, cz < 0 ? 1 : -1];
    let fx0, fx1, fz0, fz1;
    if (dir[0] === 0) { fx0 = cx; fx1 = cx + inward[0] * f.thick; fz0 = cz; fz1 = cz + dir[1] * f.proj; }
    else { fz0 = cz; fz1 = cz + inward[1] * f.thick; fx0 = cx; fx1 = cx + dir[0] * f.proj; }
    return {...f, x0: Math.min(fx0, fx1), x1: Math.max(fx0, fx1), z0: Math.min(fz0, fz1), z1: Math.max(fz0, fz1), dir};
  });
  const posts = (s.posts || []).map(p => {
    const [cx, cz] = corner(p.corner);
    const px = cx + (cx < 0 ? -ov.left : ov.right) - Math.sign(cx) * (p.inset ?? .15);
    const pz = cz + (cz < 0 ? -ov.back : ov.front) - Math.sign(cz) * (p.inset ?? .15);
    return {x: r3(px), z: r3(pz), size: p.size ?? .1, finish: p.finish || 'feature'};
  });
  const decks = [];
  const dk = state.deck === 'none' ? {} : state.deck === 'front1000' ? {...(s.deck || {}), front: 1, right: 0, left: 0} : (s.deck || {});
  if (notch && dk.notch) {
    // Fill the porch in front of the recessed wall(s).
    if (s.plan === 'notch') decks.push({x0: x0 + notch.bw, x1, z0: z1 - notch.nd, z1});
    else decks.push({x0: x0 + notch.bw, x1, z0: z1 - notch.rec, z1}, {x0: x1 - notch.ret, x1, z0: z0 + notch.stepY, z1: z1 - notch.rec});
  }
  if (dk.front) decks.push({x0: x0 - (dk.wrapLeft ? dk.left : 0), x1: x1 + (dk.right || 0), z0: z1, z1: z1 + dk.front});
  if (dk.right) decks.push({x0: x1, x1: x1 + dk.right, z0: z0, z1});
  if (dk.left) decks.push({x0: x0 - dk.left, x1: x0, z0, z1});
  const bulkheads = [];
  if (notch && s.bulkhead) {
    if (s.plan === 'notch') bulkheads.push({axis: 'x', a: x0 + notch.bw, b: x1, at: z1 + ov.front});
    else {
      bulkheads.push({axis: 'x', a: x0 + notch.bw, b: x1, at: z1});
      bulkheads.push({axis: 'z', a: z0 + notch.stepY, b: z1, at: x1});
    }
  }
  const glazedPosts = walls.filter(w => w.glazedEnd).map(w => ({x: w.b[0], z: w.b[1], wall: w.id, next: w.next, n: w.n, m: walls.find(v => v.id === w.next).n}));
  return {
    style: state.style, W, D, H, pts, walls, notch, roof: {kind: roof.kind, pts: roofPts, edges: roofEdges, top, ridge, eaves, soffitDrop, thickness: roof.thickness ?? .2, outline: s.roofOutline || 'rect'},
    overhang: ov, fins, posts, decks, bulkheads, glazedPosts, maxHeight: r3(maxHeight),
    bounds: {x0: Math.min(...roofPts.map(p => p[0]), ...decks.map(d => d.x0), ...posts.map(p => p.x)), x1: Math.max(...roofPts.map(p => p[0]), ...decks.map(d => d.x1), ...posts.map(p => p.x)),
      z0: Math.min(...roofPts.map(p => p[1]), ...decks.map(d => d.z0)), z1: Math.max(...roofPts.map(p => p[1]), ...decks.map(d => d.z1))}
  };
}

/** Floor area inside the walls (m²): the polygon inset by the wall thickness. */
export function internalArea(state) {
  const p = plan(state);
  const inner = offsetPolygon(p.pts, p.walls.map(() => -WALL));
  let a = 0;
  for (let i = 0; i < inner.length; i++) { const [x1, z1] = inner[i], [x2, z2] = inner[(i + 1) % inner.length]; a += x1 * z2 - x2 * z1; }
  return Math.abs(a) / 2;
}
export function footprintArea(state) {
  const {pts} = plan(state);
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; a += x1 * z2 - x2 * z1; }
  return Math.abs(a) / 2;
}
export const insetPolygon = (pts, d) => offsetPolygon(pts, pts.map(() => -d));
