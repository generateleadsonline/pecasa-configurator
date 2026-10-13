// Builds a Pecasa garden room for a design as a Three.js group. Dimensions are metres. Axes: x to
// the right as you face the front, y up, z towards you; the wall footprint is centred on the
// origin, so the front wall's outer face is at z = depth / 2.
//
// The shape comes from configurator-geometry.js, which reads Pecasa's planner templates: the
// wall polygon (rectangles, Portal's and the L-Shape's notch, Apexo's stepped corner), the roof
// outline and its slope, fascia heights per edge, fins, posts, decks and glazed corners. This
// file turns that into walls with real openings, roofs, frames, glazing, decking and the room
// inside. Built on the SMART configurator's building module (same tagging and helpers).
//
// Every mesh is tagged (userData.tags) so the scene can frame and outline any part: 'walls',
// 'wall:front', 'opening:<id>', 'roof', 'fascia', 'deck', 'fins', 'floor', 'cladding:main', ...
import * as THREE from 'three';
import {STYLES, CLADDINGS, RAL, OPENINGS, FLOORS, INTERIORS, DECK_FINISHES, BLINDS, ROOF_FINISHES, ROOFLIGHTS,
  PERGOLA_COLOURS, WINDSCREEN_COLOURS, PANEL_COLOURS, CABINETS, WORKTOPS} from './configurator-data.js';
import {plan, FLOOR, WALL, SKIN, POST, insetPolygon} from './configurator-geometry.js';
import {furnish} from './configurator-furniture.js';

export {FLOOR, WALL};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COLOURS = {steel: '#a2a7aa', galv: '#a6aaa9', concrete: '#b9b6ad', white: '#f4f4f0', drip: '#2a2c2e'};

/** A box whose UVs are in metres on every face, so tiled textures keep their true scale. */
function metricBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = dims[Math.floor(i / 4)];
    uv.setXY(i, uv.getX(i) * a, uv.getY(i) * b);
  }
  return g;
}

/** Splits an extruded solid's lids into separate groups: inside (z=0), outside (z=depth), edges. */
function splitLids(geometry) {
  const [lids, sides] = geometry.groups;
  const half = lids.count / 2;
  geometry.clearGroups();
  geometry.addGroup(lids.start, half, 0);
  geometry.addGroup(lids.start + half, half, 1);
  geometry.addGroup(sides.start, sides.count, 2);
  return geometry;
}

/** A flat polygon (x, z points) lifted onto a height function, facing up or down; UVs are plan metres. */
function liftedPolygon(points, yAt, up = true, holes = []) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  const g = new THREE.ShapeGeometry(shape);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getY(i);
    pos.setXYZ(i, x, yAt(x, z), z);
    uv.setXY(i, x, z);
  }
  // ShapeGeometry winds counter-clockwise in (x, y); mapped onto (x, z) that faces down.
  if (up) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  g.computeVertexNormals();
  return g;
}

/** Fan triangulation of a convex polygon in world space; UVs: u along the first edge, v up the slope. */
function polyGeometry(points) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [];
  const ax = points[1].clone().sub(points[0]).normalize();
  const n = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
  const ay = n.clone().cross(ax).normalize();
  for (let i = 1; i < points.length - 1; i++) {
    for (const p of [points[0], points[i], points[i + 1]]) {
      pos.push(p.x, p.y, p.z);
      const rel = p.clone().sub(points[0]);
      uv.push(rel.dot(ax), rel.dot(ay));
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Builds the design. `tex` is the procedural texture factory; returns {group, lights, materials, plan}. */
export function buildRoom(state, tex) {
  const s = STYLES[state.style], P = plan(state), W = state.width, D = state.depth;
  const root = new THREE.Group();
  root.name = 'room';
  const lights = [], materials = [];
  const keep = m => (materials.push(m), m);
  const std = (colour, o = {}) => keep(new THREE.MeshStandardMaterial({color: colour, roughness: .7, ...o}));
  const tag = (o, ...tags) => { o.userData.tags = [...(o.userData.tags || []), ...tags]; return o; };
  const add = (parent, geometry, material, x = 0, y = 0, z = 0, ...tags) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return tag(m, ...tags);
  };
  const box = (parent, w0, h0, d0, x, y, z, material, ...tags) => add(parent, metricBox(w0, h0, d0), material, x, y, z, ...tags);
  const group = (parent, ...tags) => { const g = new THREE.Group(); parent.add(g); return tag(g, ...tags); };
  const remapUV = (geometry, fn) => {
    const p = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i), p.getZ(i)); uv.setXY(i, u, v); }
  };

  const ral = key => RAL[key]?.hex || PERGOLA_COLOURS[key]?.hex || '#383e42';
  const hidden = std('#3a3a38', {roughness: 1}); hidden.name = 'hidden';
  const steel = std(COLOURS.steel, {roughness: .3, metalness: .85});
  const lamp = keep(new THREE.MeshStandardMaterial({color: '#fff6e0', emissive: '#ffd79a', emissiveIntensity: .35, roughness: .3}));
  const glass = keep(new THREE.MeshPhysicalMaterial({color: '#a9c0c4', roughness: .04, metalness: 0, transparent: true, opacity: .2, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false, reflectivity: .6}));
  const obscure = keep(new THREE.MeshPhysicalMaterial({color: '#e9eff0', roughness: .55, transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false}));
  const white = std(COLOURS.white, {roughness: .5});


  // ---- Materials --------------------------------------------------------------------------
  const cladCache = {};
  const cladFor = role => {
    const key = state.cladding[role] || state.cladding.main;
    if (cladCache[key]) return cladCache[key];
    const c = CLADDINGS[key] || CLADDINGS.cedarPlanks;
    const t = tex.cladding(c.kind, c.hex, c.dir === 'h');
    const m = std('#ffffff', {map: t.map, normalMap: t.normalMap, roughness: t.roughness, normalScale: new THREE.Vector2(.9, .9)});
    m.userData.cladding = key;
    return (cladCache[key] = m);
  };
  const trimMat = std(ral(state.trim), {roughness: .42, metalness: .2});
  const frameMat = std(ral(state.frames), {roughness: .36, metalness: .35});
  const interiorSpec = INTERIORS[state.interior] || INTERIORS['plaster-ffffff'];
  const intTex = tex.interior(interiorSpec);
  const lining = std('#ffffff', {map: intTex.map, normalMap: intTex.normalMap, roughness: .85});
  const ceilTex = tex.interior({...interiorSpec, ceiling: true});
  const ceilingMat = std('#ffffff', {map: ceilTex.map, normalMap: ceilTex.normalMap, roughness: .88, side: THREE.DoubleSide});
  const reveal = std('#f2f2ee', {roughness: .8});
  const floorSpec = FLOORS[state.floor] || FLOORS['sicilia-oak'];
  const floorTex = tex.floor(floorSpec.kind, floorSpec.hex);
  const floorMat = std('#ffffff', {map: floorTex.map, normalMap: floorTex.normalMap, roughness: floorTex.roughness});
  const deckSpec = DECK_FINISHES[state.deckFinish] || DECK_FINISHES['deck/wood-grain/Anthracite'];
  const deckTex = tex.deck(deckSpec.hex, state.deckFinish === 'deck' ? .1429 : .15);
  const deckMat = std('#ffffff', {map: deckTex.map, normalMap: deckTex.normalMap, roughness: deckTex.roughness});
  const rf = ROOF_FINISHES[state.roofFinish] || ROOF_FINISHES.roof;
  const roofTex = tex.roof(rf.kind);
  const roofMat = std('#ffffff', {map: roofTex.map, normalMap: roofTex.normalMap, roughness: roofTex.roughness, metalness: rf.kind === 'corrugated' ? .45 : 0});
  // Soffits under canopies: the feature boards, as on Pecasa's builds (cedar with downlights).
  const soffitMat = cladFor('feature');
  // The pergola is a frame, not a room: it needs only the deck and its own colours.
  if (s.open) return buildPergola();

  // ---- Helpers ----------------------------------------------------------------------------
  const roofTop = P.roof.top;
  // Under a gable the walls run up to the underside of the roof planes; under a flat or
  // mono-pitch roof they stop under the fascia or soffit of the roof edge they face.
  const gable = P.roof.kind === 'gable', gableDrop = P.roof.thickness + .055;
  const dropOf = wall => (gable ? gableDrop : wall.drop);
  const placeOnWall = (g, wall) => {
    g.position.set(wall.a[0], 0, wall.a[1]);
    g.rotation.y = Math.atan2(-wall.t[1], wall.t[0]);
    return g;
  };
  const along = (wall, u) => [wall.a[0] + wall.t[0] * u, wall.a[1] + wall.t[1] * u];
  const zFacing = wall => Math.abs(wall.n[1]) > .5;

  // ---- Walls ------------------------------------------------------------------------------
  const walls = group(root, 'walls');
  const wallGroups = {};
  const skinBottom = .04;
  for (const wall of P.walls) {
    const L = wall.len, g = placeOnWall(group(walls, 'wall:' + wall.id), wall);
    wallGroups[wall.id] = {g, L, wall};
    const role = wall.finish, clad = cladFor(role);
    tag(g, 'cladding:' + role);
    const ops = state.openings.filter(o => o.wall === wall.id);
    const topAt = u => { const [x, z] = along(wall, u); return roofTop(x, z) - dropOf(wall) + .004; };
    const pitchedGable = P.roof.kind === 'gable' && !zFacing(wall);
    const outline = (u0, u1, bottom, capTop) => {
      const sh = new THREE.Shape();
      sh.moveTo(u0, bottom); sh.lineTo(u1, bottom);
      const n = pitchedGable ? 48 : 1;
      for (let i = n; i >= 0; i--) { const u = u0 + (u1 - u0) * i / n; sh.lineTo(u, capTop(u)); }
      sh.lineTo(u0, bottom);
      return sh;
    };
    const holes = () => ops.map(o => {
      const spec = OPENINGS[o.type], c = o.p * L, w = o.w, h = o.h, sill = o.sill;
      const path = new THREE.Path();
      const x0 = c - w / 2, x1 = c + w / 2, y0 = FLOOR + sill, y1 = FLOOR + sill + h;
      path.moveTo(x0, y0); path.lineTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y0); path.lineTo(x0, y0);
      return spec ? path : null;
    }).filter(Boolean);
    // Wall ends: see the corner rules in the header of configurator-geometry.js. Front- and
    // back-facing walls own outside corners; side walls stop a skin short. At inside corners
    // the cores reach into the corner so the room has no gap. Glazed corners stop at the post.
    const endRule = (kind, glazed) => {
      if (glazed) return {skin: -POST, core: -POST};
      if (kind === 'convex') return zFacing(wall) ? {skin: 0, core: -SKIN} : {skin: -SKIN, core: -SKIN};
      return zFacing(wall) ? {skin: SKIN, core: WALL} : {skin: 0, core: SKIN};
    };
    const e0 = endRule(wall.start, wall.glazedStart), e1 = endRule(wall.end, wall.glazedEnd);
    // Core: interior lining on its inner face, reveals on its edges. It runs up behind the
    // fascia so no daylight shows between the wall and the roof.
    const coreShape = outline(-e0.core, L + e1.core, 0, u => topAt(u) + Math.min(.06, dropOf(wall) * .5));
    coreShape.holes = holes();
    add(g, splitLids(new THREE.ExtrudeGeometry(coreShape, {depth: WALL - SKIN, bevelEnabled: false})), [lining, hidden, reveal], 0, 0, -WALL, 'interiorWalls', 'wall:' + wall.id);
    // Skin: the cladding boards, stopping just above the ground as on Pecasa's builds.
    const skinShape = outline(-e0.skin, L + e1.skin, skinBottom, topAt);
    skinShape.holes = holes();
    add(g, splitLids(new THREE.ExtrudeGeometry(skinShape, {depth: SKIN, bevelEnabled: false})), [hidden, clad, clad], 0, 0, -SKIN, 'cladding', 'cladding:' + role, 'wall:' + wall.id);
    for (const o of ops) buildOpening(g, o, L, wall);
  }

  // Glazed corners: a slim post in the frame colour where two glass walls meet.
  for (const gp of P.glazedPosts) {
    const x = gp.x - (gp.n[0] + gp.m[0]) * POST / 2, z = gp.z - (gp.n[1] + gp.m[1]) * POST / 2;
    const top = roofTop(gp.x, gp.z) - dropOf(P.walls.find(w => w.id === gp.wall)) + .004;
    box(root, POST - .002, top - skinBottom, POST - .002, x, (top + skinBottom) / 2, z, frameMat, 'frames', 'cornerPost');
  }
  // Corner trims: Quba's 30mm beads, or the planner's "Vertical Trims" option on any style.
  if (state.cornerTrims) {
    for (const wall of P.walls) {
      if (wall.start !== 'convex' || wall.glazedStart) continue;
      const [cx, cz] = wall.a, prev = P.walls.find(w => w.id === wall.prev);
      const x = cx + (wall.n[0] + prev.n[0]) * .015, z = cz + (wall.n[1] + prev.n[1]) * .015;
      const top = roofTop(cx, cz) - Math.max(dropOf(wall), dropOf(prev)) + .004;
      box(root, .03, top - skinBottom, .03, x, (top + skinBottom) / 2, z, trimMat, 'trims', 'cornerTrims');
    }
  }

  // ---- Doors and windows ------------------------------------------------------------------
  function buildOpening(g, o, L, wall) {
    const spec = OPENINGS[o.type], c = o.p * L, W0 = o.w, H0 = o.h, y0 = FLOOR + o.sill;
    const og = group(g, 'opening:' + o.id, 'openings', spec.group === 'door' ? 'doors' : 'windows');
    og.position.set(c, y0, 0);
    const fo = frameMat;
    const bar = (bw, bh, bd, x, y, z) => add(og, new THREE.BoxGeometry(bw, bh, bd), fo, x, y, z, 'frames');
    const pane = (pw, ph, x, y, z, glassType = o.glass) => {
      const m = add(og, new THREE.PlaneGeometry(pw, ph), glassType === 'obscure' || spec.obscure ? obscure : glass, x, y, z, 'glass');
      m.castShadow = false; m.renderOrder = 2; return m;
    };
    // Cortizo aluminium: a slim frame set into the wall, 68mm deep (150 for sliders).
    const fw = .055, depth = spec.kind === 'sliding' || spec.kind === 'stacker' ? .13 : .068, zf = -.07;
    bar(W0, fw, depth, 0, H0 - fw / 2, zf);
    bar(fw, H0, depth, -W0 / 2 + fw / 2, H0 / 2, zf);
    bar(fw, H0, depth, W0 / 2 - fw / 2, H0 / 2, zf);
    if (spec.group === 'door' || o.sill === 0) box(og, W0 + .03, .025, WALL + .02, 0, .0125, -WALL / 2 + .01, fo, 'frames');
    else {
      bar(W0, fw, depth, 0, fw / 2, zf);
      box(og, W0 + .06, .022, .06, 0, -.004, .014, fo, 'frames');
    }
    const innerW = W0 - 2 * fw, innerH = H0 - fw - (spec.group === 'door' || o.sill === 0 ? .025 : fw), innerY = spec.group === 'door' || o.sill === 0 ? .025 : fw;
    const handle = (x, y, z, flip = 1) => {
      add(og, new THREE.BoxGeometry(.022, .14, .018), steel, x, y, z + .018 * flip, 'frames');
      add(og, new THREE.BoxGeometry(.12, .018, .018), steel, x - .05 * flip, y + .04, z + .036 * flip, 'frames');
    };
    const sash = (sx, sw, sh, sy, z, glazed = true, rail = .06) => {
      bar(sw, rail, .06, sx, sy + sh - rail / 2, z); bar(sw, rail, .06, sx, sy + rail / 2, z);
      bar(rail, sh, .06, sx - sw / 2 + rail / 2, sy + sh / 2, z); bar(rail, sh, .06, sx + sw / 2 - rail / 2, sy + sh / 2, z);
      if (glazed) pane(sw - 2 * rail + .004, sh - 2 * rail + .004, sx, sy + sh / 2, z);
    };
    if (spec.kind === 'door' || spec.kind === 'georgian') {
      const n = spec.leaves, lw = innerW / n;
      for (let i = 0; i < n; i++) {
        const x = -innerW / 2 + lw / 2 + i * lw;
        sash(x, lw, innerH, innerY, zf, true, .075);
        if (spec.kind === 'georgian') {
          for (const fy of [1 / 3, 2 / 3]) bar(lw - .15, .025, .03, x, innerY + innerH * fy, zf + .02);
          bar(.025, innerH - .15, .03, x, innerY + innerH / 2, zf + .02);
        }
      }
      handle(n === 2 ? .06 : innerW / 2 - .08, 1.0, zf + .03);
    } else if (spec.kind === 'solid' || spec.kind === 'clad') {
      const n = spec.leaves, lw = innerW / n;
      const leafMat = spec.kind === 'clad' ? cladFor('main') : fo;
      for (let i = 0; i < n; i++) {
        const x = -innerW / 2 + lw / 2 + i * lw;
        add(og, metricBox(lw - .006, innerH, .05), [leafMat, leafMat, leafMat, leafMat, leafMat, reveal], x, innerY + innerH / 2, zf, spec.kind === 'clad' ? 'doors' : 'frames');
        if (spec.kind === 'solid') for (const yy of [.45, 1.05, 1.65]) box(og, lw - .2, .012, .006, x, innerY + yy, zf + .028, fo, 'frames');
      }
      handle(n === 2 ? .06 : innerW / 2 - .08, 1.0, zf + .03);
    } else if (spec.kind === 'sliding' || spec.kind === 'stacker') {
      const n = spec.leaves, lw = innerW / n + .03;
      for (let i = 0; i < n; i++) {
        const x = -innerW / 2 + lw / 2 + i * (innerW - lw) / (n - 1);
        sash(x, lw, innerH, innerY, zf + (i % 2 ? -.025 : .025) * (spec.kind === 'stacker' ? (i + 1) / n * 1.4 : 1), true, .05);
      }
      add(og, new THREE.BoxGeometry(.02, .32, .02), steel, -innerW / 2 + lw - .045, 1.0, zf + .06, 'frames');
    } else if (spec.kind === 'bifold') {
      const n = spec.leaves, lw = innerW / n;
      for (let i = 0; i < n; i++) sash(-innerW / 2 + lw / 2 + i * lw, lw, innerH, innerY, zf, true, .05);
      handle(-innerW / 2 + lw - .05, 1.0, zf + .03);
    } else if (spec.kind === 'fixed') {
      pane(innerW + .004, innerH + .004, 0, innerY + innerH / 2, zf);
    } else if (spec.kind === 'casement') {
      sash(0, innerW, innerH, innerY, zf + .008, true, .055);
      add(og, new THREE.BoxGeometry(.018, .12, .018), steel, innerW / 2 - .05, innerY + innerH / 2, zf + .05, 'frames');
    } else if (spec.kind === 'split') {
      const n = spec.panes || 2, pw = innerW / n;
      for (let i = 0; i < n; i++) {
        const x = -innerW / 2 + pw / 2 + i * pw;
        if (i > 0) bar(.05, innerH, depth, x - pw / 2, innerY + innerH / 2, zf);
        if (i === 0) { sash(x, pw, innerH, innerY, zf + .008, true, .05); add(og, new THREE.BoxGeometry(.018, .1, .018), steel, x + pw / 2 - .05, innerY + innerH / 2, zf + .05, 'frames'); }
        else pane(pw - .02, innerH, x, innerY + innerH / 2, zf);
      }
    } else if (spec.kind === 'awning') {
      const n = spec.panes || 1, pw = innerW / n;
      for (let i = 0; i < n; i++) {
        const x = -innerW / 2 + pw / 2 + i * pw;
        if (i > 0) bar(.05, innerH, depth, x - pw / 2, innerY + innerH / 2, zf);
        sash(x, pw, innerH, innerY, zf + .008, true, .05);
        add(og, new THREE.BoxGeometry(.1, .018, .018), steel, x, innerY + .045, zf + .05, 'frames');
      }
    } else if (spec.kind === 'slidingWindow') {
      const lw = innerW / 2 + .02;
      sash(-innerW / 2 + lw / 2, lw, innerH, innerY, zf + .015, true, .05);
      sash(innerW / 2 - lw / 2, lw, innerH, innerY, zf - .015, true, .05);
    }
    // Blinds: venetian slats a third of the way down, inside the glass.
    if (state.blinds !== 'none' && BLINDS[state.blinds]?.hex && !['solid', 'clad'].includes(spec.kind)) {
      const b = BLINDS[state.blinds], bm = std(b.hex, {roughness: .5});
      const drop = Math.min(innerH * .38, .7), slats = Math.max(2, Math.round(drop / .025));
      const bg = group(og, 'blinds');
      for (let i = 0; i < slats; i++) {
        const sl = add(bg, new THREE.BoxGeometry(innerW - .1, .002, .022), bm, 0, innerY + innerH - .05 - i * .025, zf - .06);
        sl.rotation.x = .5; sl.castShadow = false;
      }
      add(bg, new THREE.BoxGeometry(innerW - .08, .03, .03), bm, 0, innerY + innerH - .03, zf - .06);
    }
  }

  // ---- Roof ------------------------------------------------------------------------------
  const roof = group(root, 'roof');
  const rp = P.roof.pts;
  if (P.roof.kind === 'gable') buildGable();
  else buildFlat();

  function fasciaBoard(e, colourMat = trimMat) {
    // A board outside the roof edge, its top on the roof line; side edges of a mono-pitch roof
    // taper with the slope. Boards along x run the full length; boards along z stop at them.
    const runsX = Math.abs(e.t[0]) > .5, d = e.d, h = e.h;
    const ext = runsX ? d : 0;
    const a = [e.a[0] - e.t[0] * ext, e.a[1] - e.t[1] * ext], b = [e.b[0] + e.t[0] * ext, e.b[1] + e.t[1] * ext];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const sh = new THREE.Shape();
    const yA = roofTop(a[0], a[1]), yB = roofTop(b[0], b[1]);
    sh.moveTo(0, yA - h); sh.lineTo(len, yB - h); sh.lineTo(len, yB); sh.lineTo(0, yA);
    const geo = new THREE.ExtrudeGeometry(sh, {depth: d, bevelEnabled: false});
    const m = add(roof, geo, colourMat, 0, 0, 0, 'fascia', 'roof', 'flashing');
    m.rotation.y = Math.atan2(-e.t[1], e.t[0]);
    // The extrusion runs outwards (local z is the edge's normal), so the board sits just outside.
    m.position.set(a[0] + e.n[0] * .0005, 0, a[1] + e.n[1] * .0005);
    return m;
  }

  function buildFlat() {
    const ins = insetPolygon(rp, .002);
    const membraneY = (x, z) => roofTop(x, z) - .018;
    add(roof, liftedPolygon(ins, membraneY, true), roofMat, 0, 0, 0, 'roof', 'roofDeck');
    // Soffit across the whole outline at the fascia bottom: seen under every overhang and
    // porch, hidden above the ceiling inside.
    const soffitY = (x, z) => roofTop(x, z) - P.roof.soffitDrop - .001;
    add(roof, liftedPolygon(ins, soffitY, false), soffitMat, 0, 0, 0, 'roof', 'soffit');
    for (const e of P.roof.edges) fasciaBoard(e);
    // Green (sedum) roof: a planted layer inside the upstand.
    if (state.sedum) {
      const sTex = tex.sedum();
      const sm = std('#ffffff', {map: sTex.map, normalMap: sTex.normalMap, roughness: 1});
      add(roof, liftedPolygon(insetPolygon(rp, .12), (x, z) => membraneY(x, z) + .012, true), sm, 0, 0, 0, 'roof', 'sedum');
    }
    // Rooflights: flat glass on a kerb, centred along the room.
    const rl = ROOFLIGHTS[state.rooflight];
    if (rl?.w) for (const c of rooflightCentres(rl)) {
      const y = membraneY(c.x, c.z);
      const g = group(roof, 'rooflights');
      box(g, rl.w + .1, .09, rl.d + .1, c.x, y + .045, c.z, std('#2b2d2f', {roughness: .5}));
      const gl = add(g, new THREE.PlaneGeometry(rl.w - .02, rl.d - .02), glass, c.x, y + .095, c.z);
      gl.rotation.x = -Math.PI / 2; gl.renderOrder = 2;
    }
    // Gutter and downpipe at the low, back edge (planner downpipe at the back corner).
    const back = P.roof.edges.find(e => e.side === 'back');
    if (back) {
      const xs = [back.a[0], back.b[0]], gz = back.a[1] - .09, gy = roofTop(0, back.a[1]) - back.h - .02;
      gutter(Math.min(...xs) + .02, Math.max(...xs) - .02, gy, gz);
      downpipe(Math.max(...xs) - .25, gz, gy);
    }
    // Soffit downlights under canopies (Pecasa's builds have them on every overhang).
    if (state.exteriorLight === 'soffit') soffitLights();
  }

  function rooflightCentres(rl) {
    const inner = P.walls.length === 4 ? {x0: -W / 2 + WALL + .3, x1: W / 2 - WALL - .3, z0: -D / 2 + WALL + .3, z1: D / 2 - WALL - .3}
      : {x0: -W / 2 + WALL + .3, x1: W / 2 - WALL - .3, z0: -D / 2 + WALL + .3, z1: P.walls.find(w => w.id === 'front').a[1] - WALL - .3};
    const room = inner.x1 - inner.x0, depth = inner.z1 - inner.z0;
    if (room < rl.w || depth < rl.d) return [];
    const n = Math.max(1, Math.min(state.rooflightCount || 1, Math.floor((room + .4) / (rl.w + .4))));
    const cz = (inner.z0 + inner.z1) / 2;
    return Array.from({length: n}, (_, i) => ({x: inner.x0 + room * (i + .5) / n, z: cz, w: rl.w, d: rl.d}));
  }

  function soffitLights() {
    // Along every edge that overhangs its wall by more than 250mm.
    for (const e of P.roof.edges) {
      const wall = P.walls.filter(w => w.n[0] === e.n[0] && w.n[1] === e.n[1]).sort((a, b) => b.len - a.len)[0];
      if (!wall) continue;
      const off = Math.abs(e.n[0]) > .5 ? (e.a[0] - wall.a[0]) * e.n[0] : (e.a[1] - wall.a[1]) * e.n[1];
      if (off < .25) continue;
      const n = Math.max(2, Math.round(e.len / 1.1));
      for (let i = 0; i < n; i++) {
        const u = e.len * (i + .5) / n, x = e.a[0] + e.t[0] * u - e.n[0] * off / 2, z = e.a[1] + e.t[1] * u - e.n[1] * off / 2;
        const y = roofTop(x, z) - P.roof.soffitDrop - .004;
        downlight(roof, x, y, z, 'exteriorLights');
        lights.push({kind: 'down', position: V(x, y - .05, z)});
      }
    }
  }

  function buildGable() {
    // Two roof planes over the outline, the ridge along x (parallel to the front), as on
    // Pecasa's Cabano, Inspiro and Veranda. Verge and eaves boards in the flashing colour.
    const [x0, x1] = [Math.min(...rp.map(p => p[0])), Math.max(...rp.map(p => p[0]))];
    const [z0, z1] = [Math.min(...rp.map(p => p[1])), Math.max(...rp.map(p => p[1]))];
    const zr = P.roof.ridge.z, yr = P.roof.ridge.y, th = P.roof.thickness;
    const y = z => roofTop(0, z);
    const planes = [[V(x0, y(z1), z1), V(x1, y(z1), z1), V(x1, yr, zr), V(x0, yr, zr)], [V(x1, y(z0), z0), V(x0, y(z0), z0), V(x0, yr, zr), V(x1, yr, zr)]];
    for (const pts of planes) {
      add(roof, polyGeometry(pts), roofMat, 0, 0, 0, 'roof', 'roofDeck');
      const under = pts.map(p => p.clone().add(V(0, -th - .06, 0)));
      add(roof, polyGeometry(under.slice().reverse()), soffitMat, 0, 0, 0, 'roof', 'soffit');
    }
    // Ridge cap.
    const rc = box(roof, x1 - x0 + .02, .05, .12, (x0 + x1) / 2, yr + .01, zr, trimMat, 'roof', 'flashing');
    rc.rotation.x = 0;
    // Eaves boards (front and back) and verge boards (both gable ends).
    const eh = Math.min(.24, (STYLES[state.style].fascia.front || [.2])[0]);
    const board = (a, b, h, outward) => {
      const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(.5);
      const m = box(roof, len, h, .045, 0, 0, 0, trimMat, 'fascia', 'roof', 'flashing');
      const xAxis = b.clone().sub(a).normalize();
      let zAxis = outward.clone().normalize();
      const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
      if (yAxis.y < 0) { yAxis.negate(); zAxis.negate(); }
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
      m.position.copy(mid).addScaledVector(yAxis, -h / 2 + .025).addScaledVector(zAxis, .024);
    };
    board(V(x0 - .045, y(z1), z1), V(x1 + .045, y(z1), z1), eh, V(0, 0, 1));
    board(V(x1 + .045, y(z0), z0), V(x0 - .045, y(z0), z0), eh, V(0, 0, -1));
    for (const sx of [x0, x1]) {
      board(V(sx, y(z1), z1), V(sx, yr, zr), eh * .8, V(Math.sign(sx) || 1, 0, 0));
      board(V(sx, yr, zr), V(sx, y(z0), z0), eh * .8, V(Math.sign(sx) || 1, 0, 0));
    }
    // Gable infill: where the roof runs past the room (Veranda's bay, Inspiro's front), close
    // the triangle above the wall line on each end so the roof never shows daylight through.
    gutter(x0 + .02, x1 - .02, y(z1) - eh - .02, z1 + .07);
    gutter(x0 + .02, x1 - .02, y(z0) - eh - .02, z0 - .07);
    downpipe(x1 - .2, z0 - .07, y(z0) - eh - .02);
    // Exposed timber over the veranda bay: rafters under the roof planes.
    if (s.porchCeiling) {
      const timber = std('#b6875a', {roughness: .75});
      for (let x = W / 2 + .3; x < x1 - .1; x += .6) {
        for (const [za, zb] of [[z1, zr], [z0, zr]]) {
          const a = V(x, y(za) - th - .07, za), b = V(x, yr - th - .07, zb);
          const m = box(roof, .05, .12, a.distanceTo(b), x, 0, 0, timber, 'roof', 'timbers');
          m.position.copy(a.clone().add(b).multiplyScalar(.5));
          m.lookAt(b);
        }
      }
    }
    if (state.exteriorLight === 'soffit') {
      const n = Math.max(2, Math.round(W / 1.2));
      for (let i = 0; i < n; i++) { const x = -W / 2 + W * (i + .5) / n, z = D / 2 + Math.max(.08, P.overhang.front / 2); downlight(roof, x, y(z) - th - .065, z, 'exteriorLights'); lights.push({kind: 'down', position: V(x, y(z) - th - .1, z)}); }
    }
  }

  function gutter(a, b, y, z) {
    if (b - a < .1) return;
    const g = new THREE.CylinderGeometry(.05, .05, b - a, 14, 1, true, 0, Math.PI);
    const mat = keep(trimMat.clone()); mat.side = THREE.DoubleSide;
    const m = add(roof, g, mat, (a + b) / 2, y, z, 'roof', 'gutters');
    m.rotation.z = Math.PI / 2; m.rotation.x = Math.PI / 2;
  }
  function downpipe(x, z, top) {
    add(roof, new THREE.CylinderGeometry(.034, .034, top - .1, 12), trimMat, x, (top - .1) / 2 + .1, z, 'gutters');
    add(roof, new THREE.CylinderGeometry(.034, .034, .14, 12), trimMat, x, .07, z + Math.sign(z) * .035, 'gutters').rotation.x = Math.sign(z) * Math.PI / 3;
  }
  function downlight(parent, x, y, z, ...tags) {
    add(parent, new THREE.CylinderGeometry(.04, .04, .008, 20), steel, x, y - .002, z, ...tags);
    add(parent, new THREE.CylinderGeometry(.03, .03, .004, 20), lamp, x, y - .007, z, ...tags, 'lamp');
  }

  // ---- Fins, bulkheads, posts, balustrade ----------------------------------------------------
  const soffitAt = (x, z) => roofTop(x, z) - (gable ? gableDrop : P.roof.soffitDrop) - .001;
  for (const f of P.fins) {
    const role = s.finishes.fins || 'feature';
    const fg = group(root, 'fins', 'cladding:' + role);
    const mat = cladFor(role);
    const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
    const top = Math.min(soffitAt(f.x0, f.z0), soffitAt(f.x1, f.z1), soffitAt(f.x0, f.z1), soffitAt(f.x1, f.z0));
    const outward = f.dir[1] !== 0;   // a fin carrying a side wall forwards (or back)
    // Fin profile in (u out from the wall, height): straight, or raked like Angle's (deep at the
    // roof, narrow at the deck). Extruded across its thickness.
    const deep = f.proj, shallow = f.proj - (f.taper || 0);
    const sh = new THREE.Shape();
    sh.moveTo(0, skinBottom); sh.lineTo(shallow, skinBottom); sh.lineTo(deep, top); sh.lineTo(0, top);
    const m = add(fg, new THREE.ExtrudeGeometry(sh, {depth: f.thick, bevelEnabled: false}), mat);
    // Local x runs out along the fin's direction; local z (the extrusion) then runs across it.
    const sgn = outward ? f.dir[1] : f.dir[0];
    if (outward) { m.rotation.y = -Math.PI / 2 * sgn; m.position.set(sgn > 0 ? f.x1 : f.x0, 0, sgn > 0 ? f.z0 : f.z1); }
    else { m.rotation.y = sgn > 0 ? 0 : Math.PI; m.position.set(sgn > 0 ? f.x0 : f.x1, 0, sgn > 0 ? f.z0 : f.z1); }
    if (f.cap) {
      // A cap in the flashing colour along the fin's open edge (the planner's vertical trims),
      // a touch wider than the fin and set on its outer face.
      const [cw, cd] = f.cap;
      const cs = new THREE.Shape();
      cs.moveTo(shallow, skinBottom); cs.lineTo(shallow + cd, skinBottom); cs.lineTo(deep + cd, top); cs.lineTo(deep, top);
      const cm = add(fg, new THREE.ExtrudeGeometry(cs, {depth: cw, bevelEnabled: false}), trimMat, 0, 0, 0, 'trims', 'flashing');
      cm.rotation.copy(m.rotation);
      // Flush with the building's outer face, overhanging the fin's inner face by cw - thick.
      const outerIsMax = outward ? cx > 0 : cz > 0;
      if (outward) cm.position.set(outerIsMax ? (sgn > 0 ? f.x1 : f.x1 - cw) : (sgn > 0 ? f.x0 + cw : f.x0), 0, m.position.z);
      else cm.position.set(m.position.x, 0, outerIsMax ? (sgn > 0 ? f.z1 - cw : f.z1) : (sgn > 0 ? f.z0 : f.z0 + cw));
    }
  }
  // Bulkheads: a clad band dropping from the soffit over a recessed entrance (Apexo, Portal).
  for (const b of P.bulkheads) {
    const bg = group(root, 'bulkhead', 'cladding:' + (s.finishes.bulkhead || 'feature'));
    const mat = cladFor(s.finishes.bulkhead || 'feature');
    const bottom = FLOOR + 2.1 + .1;
    if (b.axis === 'x') {
      const zc = b.at - .06, top = soffitAt(0, zc) + .001;
      box(bg, b.b - b.a - .004, Math.max(.05, top - bottom), .1, (b.a + b.b) / 2, (top + bottom) / 2, zc, mat);
    } else {
      const xc = b.at - .06, top = Math.min(soffitAt(xc, b.a), soffitAt(xc, b.b)) + .001;
      box(bg, .1, Math.max(.05, top - bottom), b.b - b.a - .124, xc, (top + bottom) / 2, (b.a + b.b - .12) / 2, mat);
    }
  }
  for (const p of P.posts) {
    const pg = group(root, 'posts');
    const top = soffitAt(p.x, p.z) + .001;
    box(pg, p.size, top - FLOOR + .02, p.size, p.x, (top + FLOOR - .02) / 2, p.z, cladFor(p.finish === 'feature' ? 'feature' : 'main'));
  }
  if (s.balustrade) {
    const bx = Math.max(...rp.map(q => q[0])) - .2, za = -D / 2 + .25, zb = D / 2 + P.overhang.front - .25;
    const bm = std('#b98b5e', {roughness: .75}), bg = group(root, 'balustrade');
    box(bg, .06, .06, zb - za, bx, FLOOR + .95, (za + zb) / 2, bm);
    box(bg, .05, .05, zb - za, bx, FLOOR + .1, (za + zb) / 2, bm);
    for (let z = za + .1; z < zb - .05; z += .12) box(bg, .035, .82, .035, bx, FLOOR + .52, z, bm);
  }

  // ---- Decks, base, additions --------------------------------------------------------------
  function deckArea(parent, x0, x1, z0, z1, ...tags) {
    const dg = group(parent, 'deck', ...tags);
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    remapUV(g, (x, y) => [y, x]);
    const top = add(dg, g, deckMat, (x0 + x1) / 2, FLOOR - .012, (z0 + z1) / 2);
    top.rotation.x = -Math.PI / 2;
    // Fascia boards on the open edges, stopping short of each other at the corners.
    if (z1 > D / 2 + .01) box(dg, x1 - x0, FLOOR - .02, .025, (x0 + x1) / 2, (FLOOR - .02) / 2, z1 - .0125, deckMat);
    const side = z1 - z0 - .026;
    if (x0 < -W / 2 - .01) box(dg, .025, FLOOR - .02, side, x0 + .0125, (FLOOR - .02) / 2, z0 + side / 2, deckMat);
    if (x1 > W / 2 + .01) box(dg, .025, FLOOR - .02, side, x1 - .0125, (FLOOR - .02) / 2, z0 + side / 2, deckMat);
    return dg;
  }
  for (const d of P.decks) deckArea(root, d.x0, d.x1, d.z0, d.z1);

  // Base: Radix ground screws along the perimeter, under the floor.
  const baseGroup = group(root, 'base');
  const galv = std(COLOURS.galv, {roughness: .4, metalness: .7});
  for (const wall of P.walls) {
    const n = Math.max(2, Math.ceil(wall.len / 1.4) + 1);
    for (let i = 0; i < n; i++) {
      const [x, z] = along(wall, wall.len * i / (n - 1));
      const ix = x - wall.n[0] * .08, iz = z - wall.n[1] * .08;
      add(baseGroup, new THREE.CylinderGeometry(.045, .055, .05, 14), galv, ix, .025, iz);
    }
  }

  // Additions along the front (planner Roof & Porch tab): a trellis canopy or a veranda, and a
  // freestanding pergola beside the room.
  if (state.addition === 'trellis' || state.addition === 'veranda') {
    const ag = group(root, 'addition');
    const zf = P.bounds.z1, depth = 2, x0 = -W / 2, x1 = W / 2;
    const post = std('#a77b50', {roughness: .75}), h = Math.min(2.4, roofTop(0, D / 2) - P.roof.soffitDrop - .05);
    for (const x of [x0 + .06, x1 - .06]) box(ag, .1, h, .1, x, h / 2, zf + depth - .06, post);
    box(ag, x1 - x0, .15, .08, 0, h - .075, zf + depth - .06, post);
    box(ag, x1 - x0, .12, .06, 0, h - .06, zf + .04, post);
    if (state.addition === 'trellis') for (let x = x0 + .15; x < x1; x += .3) box(ag, .045, .1, depth, x, h + .04, zf + depth / 2, post);
    else {
      const rm = add(ag, new THREE.BoxGeometry(x1 - x0 + .1, .06, depth + .1), roofMat, 0, h + .04, zf + depth / 2);
      rm.rotation.x = .04;
      deckArea(ag, x0, x1, zf, zf + depth);
    }
  }
  if (state.addition === 'pergola') {
    const pg = group(root, 'addition');
    pergolaFrame(pg, P.bounds.x1 + .6 + 2, -D / 2 + 1.5 + .2, 4, 3, 2.5, std(ral('RAL7016'), {roughness: .4, metalness: .3}), std(ral('RAL7004'), {roughness: .4, metalness: .3}), 'blades');
  }

  // ---- Exterior lights on the front wall ----------------------------------------------------
  if (state.exteriorLight === 'updown' || state.exteriorLight === 'wall' || state.exteriorLight === 'security') {
    const front = P.walls.find(w => w.id === 'front'), ops = state.openings.filter(o => o.wall === 'front');
    const door = ops.find(o => OPENINGS[o.type].group === 'door') || ops[0];
    const spots = [];
    if (door) for (const u of [door.p * front.len - door.w / 2 - .22, door.p * front.len + door.w / 2 + .22]) {
      const clear = u > .2 && u < front.len - .2 && ops.every(o => Math.abs(u - o.p * front.len) > o.w / 2 + .1);
      if (clear) spots.push(u);
    }
    if (!spots.length) spots.push(.35, front.len - .35);
    for (const u of (state.exteriorLight === 'security' ? spots.slice(0, 1) : spots)) {
      const [x, z] = along(front, u);
      const lg = group(root, 'exteriorLights');
      const y = Math.min(FLOOR + 2.05, roofTop(x, z) - front.drop - .15);
      lg.position.set(x, y, z);
      const dark = std('#2a2c2e', {roughness: .4, metalness: .4});
      if (state.exteriorLight === 'updown') {
        add(lg, new THREE.CylinderGeometry(.035, .035, .2, 20), dark, 0, 0, .065);
        add(lg, new THREE.BoxGeometry(.05, .06, .03), dark, 0, 0, .02);
        lights.push({kind: 'updown', position: V(x, y, z + .08)});
      } else if (state.exteriorLight === 'wall') {
        add(lg, new THREE.BoxGeometry(.1, .1, .08), dark, 0, 0, .04);
        add(lg, new THREE.BoxGeometry(.08, .02, .07), lamp, 0, -.05, .045, 'lamp');
        lights.push({kind: 'down', position: V(x, y - .06, z + .1)});
      } else {
        add(lg, new THREE.BoxGeometry(.06, .06, .08), dark, 0, 0, .04);
        const head = add(lg, new THREE.BoxGeometry(.22, .14, .08), dark, 0, -.06, .14); head.rotation.x = .5;
        add(lg, new THREE.BoxGeometry(.19, .11, .01), lamp, 0, -.08, .18, 'lamp').rotation.x = .5;
        add(lg, new THREE.SphereGeometry(.03, 12, 8), white, 0, -.12, .06);
        lights.push({kind: 'point', position: V(x, y - .1, z + .3)});
      }
    }
  }
  if (state.electrics.extSocket) {
    const front = P.walls.find(w => w.id === 'front');
    const free = [.4, front.len - .4, front.len / 2].find(u => state.openings.filter(o => o.wall === 'front').every(o => Math.abs(u - o.p * front.len) > o.w / 2 + .15));
    if (free !== undefined) {
      const [x, z] = along(front, free);
      const eg = group(root, 'externalSocket');
      eg.position.set(x, FLOOR + .45, z);
      box(eg, .12, .14, .06, 0, 0, .03, std('#8d9295', {roughness: .5}));
    }
  }

  // ---- Interior ------------------------------------------------------------------------------
  const inner = group(root, 'interior');
  const innerPts = insetPolygon(P.pts, WALL);
  const floorMesh = add(inner, liftedPolygon(innerPts, () => FLOOR + .001, true), floorMat, 0, 0, 0, 'floor');
  floorMesh.castShadow = false;
  // The floor slab under the room, set inside the walls.
  add(inner, liftedPolygon(insetPolygon(P.pts, .01), () => FLOOR - .02, true), hidden, 0, 0, 0).castShadow = false;
  // Skirting, broken at floor-level openings.
  for (const {g, L, wall} of Object.values(wallGroups)) {
    const doors = state.openings.filter(o => o.wall === wall.id && o.sill === 0).map(o => [o.p * L - o.w / 2, o.p * L + o.w / 2]);
    const s0 = wall.start === 'convex' ? WALL : 0, s1 = wall.end === 'convex' ? L - WALL : L;
    let u = s0;
    const pieces = [];
    for (const [a, b] of doors.sort((p, q) => p[0] - q[0])) { if (a > u) pieces.push([u, Math.min(a, s1)]); u = Math.max(u, b); }
    if (u < s1) pieces.push([u, s1]);
    for (const [a, b] of pieces) if (b - a > .02) box(g, b - a, .07, .012, (a + b) / 2, FLOOR + .035, -WALL - .006, white, 'interiorWalls').castShadow = false;
  }
  // Ceiling: flat or following a mono-pitch, under the roof structure; vaulted under a gable.
  const ceilDrop = Math.max(P.roof.thickness + .06, P.roof.soffitDrop + .05);
  const ceilingY = (x, z) => roofTop(x, z) - ceilDrop;
  const holes = [];
  const rl = ROOFLIGHTS[state.rooflight];
  if (rl?.w && P.roof.kind !== 'gable') for (const c of rooflightCentres(rl)) holes.push([[c.x - rl.w / 2, c.z - rl.d / 2], [c.x + rl.w / 2, c.z - rl.d / 2], [c.x + rl.w / 2, c.z + rl.d / 2], [c.x - rl.w / 2, c.z + rl.d / 2]]);
  if (P.roof.kind === 'gable') {
    const zr = P.roof.ridge.z, ir = P.roof.ridge.y - P.roof.thickness - .12, IX = W / 2 - WALL, IZ0 = -D / 2 + WALL, IZ1 = D / 2 - WALL;
    const ie = z => roofTop(0, z) - P.roof.thickness - .12;
    for (const pts of [[V(-IX, ie(IZ1), IZ1), V(IX, ie(IZ1), IZ1), V(IX, ir, zr), V(-IX, ir, zr)], [V(IX, ie(IZ0), IZ0), V(-IX, ie(IZ0), IZ0), V(-IX, ir, zr), V(IX, ir, zr)]]) {
      add(inner, polyGeometry(pts), ceilingMat, 0, 0, 0, 'ceiling').castShadow = false;
    }
  } else {
    add(inner, liftedPolygon(insetPolygon(P.pts, WALL - .01), ceilingY, false, holes), ceilingMat, 0, 0, 0, 'ceiling').castShadow = false;
    for (const h of holes) {
      // Plastered light wells up to the rooflight.
      const [a, , b] = [h[0], h[1], h[2]];
      const y0 = ceilingY((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), y1 = roofTop((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) - .02;
      const wellH = y1 - y0;
      for (const [x, z, w0, d0] of [[(a[0] + b[0]) / 2, a[1], b[0] - a[0], .02], [(a[0] + b[0]) / 2, b[1], b[0] - a[0], .02], [a[0], (a[1] + b[1]) / 2, .02, b[1] - a[1]], [b[0], (a[1] + b[1]) / 2, .02, b[1] - a[1]]]) {
        box(inner, w0, wellH, d0, x, y0 + wellH / 2, z, ceilingMat, 'ceiling', 'rooflights').castShadow = false;
      }
    }
  }
  // The main room rectangle (the back part of notched plans) for fittings and furniture.
  const frontZ = P.walls.find(w => w.id === 'front').a[1];
  const roomRect = {x0: -W / 2 + WALL, x1: W / 2 - WALL, z0: -D / 2 + WALL, z1: frontZ - WALL};
  if (s.plan === 'apexo') roomRect.x1 = W / 2 - P.notch.ret - WALL;
  const ceiling = Math.min(...[[roomRect.x0, roomRect.z0], [roomRect.x1, roomRect.z1], [roomRect.x0, roomRect.z1], [roomRect.x1, roomRect.z0]].map(([x, z]) => ceilingY(x, z)));
  const room = {rect: roomRect, iw: roomRect.x1 - roomRect.x0, id: roomRect.z1 - roomRect.z0, cx: (roomRect.x0 + roomRect.x1) / 2, cz: (roomRect.z0 + roomRect.z1) / 2,
    floor: FLOOR, ceiling: P.roof.kind === 'gable' ? P.roof.eaves - P.roof.thickness - .12 : ceiling, ceilingAt: P.roof.kind === 'gable' ? (x, z) => Math.max(P.roof.eaves - .3, roofTop(x, z) - P.roof.thickness - .14) : ceilingY,
    walls: P.walls, frontZ};
  furnish(inner, state, room, {std, add, box, group, tag, keep, metricBox, lights,
    materials: {white, steel, lamp, frame: frameMat, glass, cabinet: std(CABINETS[state.kitchenFinish]?.hex || '#efefef', {roughness: .5}), worktop: std(WORKTOPS[state.worktop]?.hex || '#d8d2c6', {roughness: .35})}});

  // Tags flow down to every mesh, so the scene can find a part by any of its ancestors' tags.
  root.traverse(o => {
    if (o.parent && o.parent.userData.tags) o.userData.tags = [...new Set([...(o.parent.userData.tags || []), ...(o.userData.tags || [])])];
  });
  return {group: root, lights, materials, plan: P};

  // ---- Pergola (template 222): posts, a deep perimeter beam and louvred blades ---------------
  function pergolaFrame(parent, cx, cz, w, d, h, frame, blade, roofType) {
    const pg = group(parent, 'pergola');
    pg.position.set(cx, 0, cz);
    const ps = .15, beam = .2;
    const xs = [-w / 2 + ps / 2], zs = [-d / 2 + ps / 2];
    // Intermediate posts every 4m or less, as aluminium pergolas need.
    const nx = Math.max(1, Math.ceil(w / 4)), nz = Math.max(1, Math.ceil(d / 4));
    for (let i = 1; i <= nx; i++) xs.push(-w / 2 + ps / 2 + (w - ps) * i / nx);
    for (let i = 1; i <= nz; i++) zs.push(-d / 2 + ps / 2 + (d - ps) * i / nz);
    for (const x of xs) for (const z of zs) {
      const edge = Math.abs(Math.abs(x) - (w / 2 - ps / 2)) < .01 || Math.abs(Math.abs(z) - (d / 2 - ps / 2)) < .01;
      if (edge) box(pg, ps, h - beam, ps, x, (h - beam) / 2, z, frame, 'posts');
    }
    box(pg, w, beam, ps, 0, h - beam / 2, d / 2 - ps / 2, frame, 'frame');
    box(pg, w, beam, ps, 0, h - beam / 2, -d / 2 + ps / 2, frame, 'frame');
    box(pg, ps, beam, d - 2 * ps - .002, -w / 2 + ps / 2, h - beam / 2, 0, frame, 'frame');
    box(pg, ps, beam, d - 2 * ps - .002, w / 2 - ps / 2, h - beam / 2, 0, frame, 'frame');
    const bg = group(pg, 'roof', 'blades');
    if (roofType === 'glass') {
      const gl = add(bg, new THREE.PlaneGeometry(w - 2 * ps, d - 2 * ps), glass, 0, h - .03, 0); gl.rotation.x = -Math.PI / 2; gl.renderOrder = 2;
      for (let x = -w / 2 + ps + 1; x < w / 2 - ps - .1; x += 1) box(bg, .05, .06, d - 2 * ps - .004, x, h - .05, 0, frame);
    } else {
      // Blades across the depth, tilted open (the planner's BladesAngle90 state is fully open;
      // shown part-open so the roof still reads as a roof).
      for (let z = -d / 2 + ps + .1; z < d / 2 - ps - .05; z += .2) {
        const b = box(bg, w - 2 * ps - .006, .02, .18, 0, h - beam / 2, z, blade);
        b.rotation.x = .35;
      }
    }
    return pg;
  }

  function buildPergola() {
    const frame = std((PERGOLA_COLOURS[state.pergolaFrame] || PERGOLA_COLOURS.RAL7015).hex, {roughness: .42, metalness: .3});
    const blade = std((PERGOLA_COLOURS[state.pergolaBlades] || PERGOLA_COLOURS.RAL7004).hex, {roughness: .42, metalness: .3});
    const h = state.height;
    const pg = pergolaFrame(root, 0, 0, W, D, h, frame, blade, state.pergolaRoof);
    // Sides: loggia louvres, sliding glass, a windscreen or a solid panel on each side.
    const sides = state.pergolaSides || {};
    const panel = PANEL_COLOURS[state.panelColour] || PANEL_COLOURS.RAL7016, wsc = WINDSCREEN_COLOURS[state.windscreenColour] || WINDSCREEN_COLOURS.SCM33;
    for (const [side, kind] of Object.entries(sides)) {
      if (!kind || kind === 'none') continue;
      const sg = group(root, 'pergolaSide', 'pergola:' + side);
      const horiz = side === 'front' || side === 'back', len = (horiz ? W : D) - .3, sgn = side === 'front' || side === 'right' ? 1 : -1;
      const off = (horiz ? D : W) / 2 - .075;
      const at = (u, y, dd = 0) => horiz ? [u, y, sgn * (off - dd)] : [sgn * (off - dd), y, u];
      const ph = h - .2;
      const pb = (w0, h0, d0, u, y, mat, dd = 0) => { const [x, yy, z] = at(u, y, dd); return box(sg, horiz ? w0 : d0, h0, horiz ? d0 : w0, x, yy, z, mat); };
      if (kind === 'solid') pb(len, ph - .05, .04, 0, ph / 2, std(panel.hex, {roughness: .5}));
      else if (kind === 'windscreen') { pb(len, ph - .6, .01, 0, ph / 2 + .2, std(wsc.hex, {roughness: .9, side: THREE.DoubleSide})); pb(len, .04, .05, 0, .3, frame); }
      else if (kind === 'glass') {
        const n = Math.max(2, Math.round(len / 1.2));
        for (let i = 0; i < n; i++) { const u = -len / 2 + len * (i + .5) / n; pb(len / n - .01, ph - .1, .02, u, ph / 2, frame, (i % 2) * .03); const [x, y, z] = at(u, ph / 2, (i % 2) * .03); const g2 = add(sg, new THREE.PlaneGeometry(len / n - .08, ph - .2), glass, x, y, z); if (!horiz) g2.rotation.y = Math.PI / 2; g2.renderOrder = 2; }
      } else if (kind === 'loggia') {
        const lm = std(panel.hex, {roughness: .45, metalness: .3});
        for (let y = .2; y < ph - .1; y += .12) { const b = pb(len, .1, .015, 0, y, lm); b.rotation[horiz ? 'x' : 'z'] = .6; }
        pb(len, .05, .05, 0, ph - .025, lm); pb(len, .05, .05, 0, .025, lm);
      }
    }
    // The pergola stands on a deck in Pecasa's photos; the planner draws it on the plane.
    if (state.deck !== 'none') deckArea(root, -W / 2 - .2, W / 2 + .2, -D / 2 - .2, D / 2 + .2);
    root.traverse(o => { if (o.parent && o.parent.userData.tags) o.userData.tags = [...new Set([...(o.parent.userData.tags || []), ...(o.userData.tags || [])])]; });
    return {group: root, lights, materials, plan: P, pergola: pg};
  }
}
