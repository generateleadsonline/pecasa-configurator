// Interior fittings and illustrative furniture. Fittings follow the design (layout, kitchen,
// lights, sockets, heating and cooling); furniture shows what the room could become for the
// chosen use and is labelled as illustrative wherever it is shown. Adapted from the SMART
// configurator's furniture module.
//
// Everything is placed in the main room rectangle (`room.rect`, the back part of a notched
// plan), in a group centred on it: x across (-iw/2..iw/2), z front (+) to back (-).
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {OPENINGS} from './configurator-data.js';

const SOFT = {sage: '#7f9483', oat: '#d9d1c1', slate: '#56606a', rust: '#b06a46', ink: '#2a2f33', oak: '#b88d5f', walnut: '#6e4b33', rubber: '#2b2d2f', canvas: '#efe9dc', leaf: '#4f7a46', teal: '#2f6f6a'};

export function furnish(parent, state, room, kit) {
  const {std, add, box, group} = kit;
  const {iw, id, floor: F} = room;
  const host = group(parent);
  host.position.set(room.cx, 0, room.cz);
  const m = {};
  for (const [k, v] of Object.entries(SOFT)) m[k] = std(v, {roughness: k === 'rubber' ? .95 : .75});
  const fabric = c => std(c, {roughness: .95});
  const rbox = (g, w, h, d, x, y, z, mat, r = .04) => add(g, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat, x, y, z);
  const cyl = (g, r0, r1, h, x, y, z, mat, seg = 20) => add(g, new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z);
  // Ceiling height inside the room at a local point (follows a mono-pitch).
  const ceilAt = (x, z) => room.ceilingAt(x + room.cx, z + room.cz) - .01;
  const ceilingH = Math.min(ceilAt(-iw / 2, -id / 2), ceilAt(iw / 2, -id / 2), ceilAt(0, id / 2)) - .02;

  // Where openings fall on each side of the room, in room-local coordinates along that side.
  const SIDE_N = {front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0]};
  const r = room.rect;
  const onSide = (wall, side) => {
    const [nx, nz] = SIDE_N[side];
    if (wall.n[0] !== nx || wall.n[1] !== nz) return false;
    const line = side === 'front' ? r.z1 + .15 : side === 'back' ? r.z0 - .15 : side === 'left' ? r.x0 - .15 : r.x1 + .15;
    return Math.abs((nx ? wall.a[0] : wall.a[1]) - line) < .02;
  };
  const spans = side => {
    const out = [];
    for (const wall of room.walls.filter(w => onSide(w, side))) {
      for (const o of state.openings.filter(x => x.wall === wall.id)) {
        const c = o.p * wall.len, half = o.w / 2;
        const p0 = [wall.a[0] + wall.t[0] * (c - half), wall.a[1] + wall.t[1] * (c - half)], p1 = [wall.a[0] + wall.t[0] * (c + half), wall.a[1] + wall.t[1] * (c + half)];
        const axis = side === 'front' || side === 'back' ? 0 : 1, centre = axis ? room.cz : room.cx;
        const a = p0[axis] - centre, b = p1[axis] - centre;
        out.push({a: Math.min(a, b), b: Math.max(a, b), type: o.type, sill: o.sill, top: o.sill + o.h});
      }
    }
    return out;
  };
  // A side with no wall on the room's line (the open front of a notched plan) counts as full.
  const sideOpen = side => !room.walls.some(w => onSide(w, side));
  // Wall taken by an enclosed shower room, sauna or store: fittings go on the open room's walls.
  const blocked = (side, pos, half) => (blockBack && ((side === 'back' && pos + half > blockBack.x0) || (side === 'right' && pos - half < blockBack.z1))) ||
    (blockRight && (side === 'right' || ((side === 'back' || side === 'front') && pos + half > iw / 2 - blockRight)));
  // Fittings already on a wall (sockets, switch, heater...), each with its height band above the floor.
  const fixtures = [];
  const fixed = (side, pos, half, y0, y1) => fixtures.push({side, a: pos - half, b: pos + half, y0, y1});
  const clearOfFixtures = (side, pos, half, [y0, y1]) => fixtures.every(f => f.side !== side || pos + half < f.a - .04 || pos - half > f.b + .04 || y1 < f.y0 || y0 > f.y1);
  const freeAt = (side, pos, half, below = 2.1, band = [0, below]) => !sideOpen(side) && !blocked(side, pos, half) && clearOfFixtures(side, pos, half, band) &&
    spans(side).every(s => pos + half < s.a - .05 || pos - half > s.b + .05 || s.sill > below);
  const findFree = (side, half, prefer = 0, below = 2.1, band = [0, below]) => {
    const lim = (side === 'front' || side === 'back' ? iw : id) / 2 - half - .05;
    for (let k = 0; k < 40; k++) {
      for (const sgn of [1, -1]) {
        const pos = prefer + sgn * k * .1;
        if (Math.abs(pos) <= lim && freeAt(side, pos, half, below, band)) return pos;
      }
    }
    return null;
  };
  const onWall = (g, side, pos, y, inset = 0) => {
    if (side === 'back') { g.position.set(pos, y, -id / 2 + inset); g.rotation.y = 0; }
    if (side === 'front') { g.position.set(pos, y, id / 2 - inset); g.rotation.y = Math.PI; }
    if (side === 'left') { g.position.set(-iw / 2 + inset, y, pos); g.rotation.y = Math.PI / 2; }
    if (side === 'right') { g.position.set(iw / 2 - inset, y, pos); g.rotation.y = -Math.PI / 2; }
    return g;
  };

  // ---- Layout & Bathroom: partition, cloakroom, shower room or sauna ------------------------
  const layoutGroup = group(host, 'layout');
  let blockRight = 0, blockBack = null;
  const partitionMat = std('#f3f2ed', {roughness: .85});
  const internalDoor = (g, x, z, along, w = .826) => {
    const dg = group(g, 'internalDoor');
    dg.position.set(x, F, z);
    if (along === 'z') dg.rotation.y = Math.PI / 2;
    box(dg, .05, 2.04, .12, -w / 2 - .025, 1.02, 0, partitionMat);
    box(dg, .05, 2.04, .12, w / 2 + .025, 1.02, 0, partitionMat);
    box(dg, w + .1, .05, .12, 0, 2.035, 0, partitionMat);
    const leaf = new THREE.Group(); leaf.position.set(-w / 2, 0, .04); dg.add(leaf); leaf.rotation.y = -.45;
    box(leaf, w - .01, 1.98, .04, w / 2, 1.0, 0, std('#fbfbf8', {roughness: .6}));
    add(leaf, new THREE.BoxGeometry(.12, .02, .02), kit.materials.steel, w - .1, 1.0, .04);
  };
  // A 120mm stud wall (the planner's partition thickness), split around an internal door. Ends
  // that meet the room's walls run 10mm into them, so no end face lies in a wall's plane.
  const intoWall = (x, z) => Math.abs(Math.abs(x) - iw / 2) < .001 || Math.abs(Math.abs(z) - id / 2) < .001 ? .01 : 0;
  const partitionWall = (x0, z0, x1, z1, doorAt = null) => {
    const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
    const e0 = intoWall(x0, z0), e1 = intoWall(x1, z1);
    const pieces = doorAt === null ? [[-e0, len + e1]] : [[-e0, doorAt - .45], [doorAt + .45, len + e1]];
    for (const [a, b] of pieces) {
      if (b - a < .02) continue;
      const mid = (a + b) / 2;
      const x = along === 'x' ? x0 + Math.sign(x1 - x0) * mid : x0, z = along === 'z' ? z0 + Math.sign(z1 - z0) * mid : z0;
      box(layoutGroup, along === 'x' ? b - a : .12, ceilingH - F, along === 'x' ? .12 : b - a, x, (ceilingH + F) / 2, z, partitionMat);
    }
    if (doorAt !== null) {
      const x = along === 'x' ? x0 + Math.sign(x1 - x0) * doorAt : x0, z = along === 'z' ? z0 + Math.sign(z1 - z0) * doorAt : z0;
      if (ceilingH - F - 2.06 > .02) box(layoutGroup, along === 'x' ? .9 : .12, ceilingH - F - 2.06, along === 'x' ? .12 : .9, x, (ceilingH + F + 2.06) / 2, z, partitionMat);
      internalDoor(layoutGroup, x, z, along);
    }
  };
  const ceramic = std('#fbfbfa', {roughness: .2});
  if (state.layout === 'partition') {
    const sw = Math.max(.9, Math.min(1.5, iw * .3));
    const x = iw / 2 - sw;
    partitionWall(x, -id / 2, x, id / 2, Math.min(id - .6, id - .8));
    blockRight = sw + .1;
    for (const y of [.5, 1.1, 1.7]) box(layoutGroup, sw - .1, .03, .35, x + sw / 2, F + y, -id / 2 + .2, std(SOFT.oak, {roughness: .7}));
  } else if (state.layout === 'cloakroom' || state.layout === 'bathroom' || state.layout === 'sauna') {
    const kind = state.layout;
    const ew = Math.min(kind === 'cloakroom' ? 1.5 : 2.1, iw - 1.2), ed = Math.min(kind === 'cloakroom' ? 1.3 : 1.6, id - 1);
    const xL = iw / 2 - ew, zF = -id / 2 + ed;
    if (kind === 'sauna') {
      // A glazed sauna door in a timber-lined cabin (the planner's SaunaStandard preset).
      const t = std('#c99a63', {roughness: .7});
      box(layoutGroup, ew + .01, ceilingH - F, .1, xL + (ew + .01) / 2, (ceilingH + F) / 2, zF, t);
      box(layoutGroup, .1, ceilingH - F, ed + .01, xL, (ceilingH + F) / 2, -id / 2 + (ed - .01) / 2, t);
      const dg = add(layoutGroup, new THREE.PlaneGeometry(.7, 1.9), kit.materials.glass, xL + ew / 2, F + .97, zF + .052); dg.renderOrder = 2;
      box(layoutGroup, ew - .1, .45, .5, xL + ew / 2, F + .45, -id / 2 + .3, t);
      box(layoutGroup, ew - .1, .05, .45, xL + ew / 2, F + .9, -id / 2 + .26, t);
      rbox(layoutGroup, .4, .55, .3, iw / 2 - .3, F + .3, zF - .3, std('#3b3b3a', {roughness: .5}), .04);
    } else {
      partitionWall(xL, zF, iw / 2, zF, Math.min(ew - .55, ew / 2 + .2));
      partitionWall(xL, -id / 2, xL, zF);
      const wc = group(layoutGroup, 'sanitaryware');
      const wcx = kind === 'bathroom' ? xL + .45 : xL + ew * .65;
      rbox(wc, .38, .4, .55, wcx, F + .2, -id / 2 + .32, ceramic, .12);
      rbox(wc, .4, .38, .17, wcx, F + .58, -id / 2 + .1, ceramic, .05);
      rbox(wc, .36, .05, .46, wcx, F + .425, -id / 2 + .35, ceramic, .02);
      rbox(wc, .5, .14, .38, xL + .3, F + .82, zF - (kind === 'bathroom' ? .3 : .55), ceramic, .05).rotation.y = Math.PI / 2;
      cyl(wc, .015, .015, .2, xL + .1, F + .95, zF - (kind === 'bathroom' ? .3 : .55), kit.materials.steel);
      if (kind === 'bathroom') {
        rbox(wc, .9, .05, .9, iw / 2 - .45, F + .025, -id / 2 + .45, ceramic, .02);
        const g2 = add(wc, new THREE.PlaneGeometry(.9, 1.9), kit.materials.glass, iw / 2 - .45, F + 1.0, -id / 2 + .9);
        g2.renderOrder = 2;
        box(wc, .02, 1.9, .02, iw / 2 - .9, F + 1, -id / 2 + .9, kit.materials.steel);
        cyl(wc, .1, .1, .02, iw / 2 - .45, F + 2.0, -id / 2 + .15, kit.materials.steel);
        const tile = std('#e6e7e3', {roughness: .3});
        box(wc, .9, 2, .01, iw / 2 - .45, F + 1, -id / 2 + .006, tile);
        box(wc, .01, 2, .9, iw / 2 - .006, F + 1, -id / 2 + .45, tile);
      }
    }
    blockBack = {x0: xL - .1, z1: zF + .1};
  }
  const xMax = iw / 2 - blockRight;

  // ---- Kitchen: a kitchenette run on the back wall (planner Kitchen tab) ---------------------
  let kitchenEnd = null;
  if (state.kitchen === 'kitchenette' && iw > 2.2) {
    const kg = group(host, 'kitchen');
    const run = Math.min(2.4, (blockBack ? blockBack.x0 + iw / 2 : xMax + iw / 2) - .3);
    if (run > 1.2) {
      const x0 = -iw / 2 + .02, cab = kit.materials.cabinet, top = kit.materials.worktop;
      kitchenEnd = x0 + run;
      const wt = group(kg, 'worktop');
      const units = Math.max(2, Math.round(run / .6)), uw = run / units;
      for (let i = 0; i < units; i++) {
        const x = x0 + uw * (i + .5);
        box(kg, uw - .006, .78, .57, x, F + .1 + .39, -id / 2 + .3, cab);
        box(kg, uw - .006, .7, .33, x, F + 1.3 + .35, -id / 2 + .17, cab);
        if (state.handles !== 'Concealed') {
          const hm = kit.materials.steel;
          if (state.handles === 'Bar') { box(kg, .14, .015, .02, x, F + .8, -id / 2 + .6, hm); box(kg, .14, .015, .02, x, F + 1.38, -id / 2 + .35, hm); }
          else { cyl(kg, .014, .014, .03, x, F + .8, -id / 2 + .6, hm).rotation.x = Math.PI / 2; cyl(kg, .014, .014, .03, x, F + 1.38, -id / 2 + .35, hm).rotation.x = Math.PI / 2; }
        }
      }
      box(kg, run, .1, .55, x0 + run / 2, F + .05, -id / 2 + .28, std('#2c2c2c', {roughness: .8}));
      box(wt, run + .02, .035, .62, x0 + run / 2, F + .9 + .0175, -id / 2 + .31, top);
      // Sink and hob.
      box(wt, .45, .02, .38, x0 + uw * .5 + .05, F + .93, -id / 2 + .32, std('#c7cbcd', {roughness: .2, metalness: .8}));
      box(wt, .5, .01, .45, x0 + run - uw * .5, F + .94, -id / 2 + .32, std('#151515', {roughness: .2}));
    }
  }

  // ---- Heating and cooling (planner Electrics: Wall Heater, Climate control) ------------------
  const heat = group(host, 'heating');
  if (state.electrics.airCon) {
    const pos = findFree('back', .45, iw * .1, 1.6, [1.7, 2.2]) ?? 0;
    const unit = onWall(group(heat), 'back', pos, Math.min(ceilingH - .3, F + 2.0), .12);
    fixed('back', pos, .45, 1.7, 2.2);
    rbox(unit, .85, .29, .2, 0, 0, 0, std('#f7f7f5', {roughness: .35}), .05);
    box(unit, .7, .015, .02, 0, -.11, .1, std('#c9cbcb', {roughness: .5}));
    // The condenser outside, behind the room.
    const cond = group(heat);
    cond.position.set(Math.max(-iw / 2 + .6, Math.min(iw / 2 - .6, pos)), 0, -id / 2 - .15 - .45);
    box(cond, .85, .6, .32, 0, .36, 0, std('#e9eaea', {roughness: .5}));
    const fan = add(cond, new THREE.CylinderGeometry(.2, .2, .01, 28), std('#2d3033', {roughness: .6}), -.1, .38, -.165);
    fan.rotation.x = Math.PI / 2;
    box(cond, .9, .05, .4, 0, .03, 0, std('#6f6f6a', {roughness: .9}));
  }
  if (state.electrics.wallHeater) {
    // On a side wall, clear of the furniture along the back.
    const side = ['right', 'left', 'back'].find(sd => findFree(sd, .4, 0, .8) !== null) || 'back';
    const pos = findFree(side, .4, side === 'back' ? iw * .2 : 0, .8) ?? 0;
    const rad = onWall(group(heat), side, pos, F + .35, .04);
    fixed(side, pos, .4, .1, .6);
    rbox(rad, .78, .45, .07, 0, 0, 0, std('#f4f4f1', {roughness: .35}), .02);
    box(rad, .7, .02, .02, 0, .2, .035, std('#d4d4d0', {roughness: .5}));
  }

  // ---- Lighting ----------------------------------------------------------------------------------
  const lightGroup = group(host, 'lighting');
  const lamp = kit.materials.lamp;
  const light = (x, z, y, power = 1) => kit.lights.push({kind: 'interior', position: new THREE.Vector3(x + room.cx, y, z + room.cz), power});
  if (state.lighting === 'panel') {
    const n = Math.max(1, Math.round(iw * id / 9));
    for (let i = 0; i < n; i++) {
      const x = -iw / 2 + iw * (i + .5) / n, y = ceilAt(x, 0);
      box(lightGroup, .6, .02, .6, x, y - .012, 0, std('#f2f2f0', {roughness: .5}));
      box(lightGroup, .56, .008, .56, x, y - .026, 0, lamp).userData.tags = ['lamp'];
      light(x, 0, y - .2, 1.6);
    }
  } else if (state.lighting === 'track') {
    const y = ceilAt(0, 0) - .015;
    box(lightGroup, Math.max(1, iw - 1), .03, .04, 0, y, 0, std('#1f2124', {roughness: .5}));
    const n = Math.max(3, Math.round(iw / .7));
    for (let k = 0; k < n; k++) {
      const x = -(iw - 1) / 2 + (iw - 1) * k / (n - 1);
      const sp = cyl(lightGroup, .035, .03, .12, x, y - .08, 0, std('#1f2124', {roughness: .5}));
      sp.rotation.x = k % 2 ? .4 : -.4;
      cyl(lightGroup, .025, .025, .01, x, y - .13, k % 2 ? .025 : -.025, lamp).userData.tags = ['lamp'];
    }
    light(0, 0, y - .2, 1.5);
  } else if (state.lighting === 'strip') {
    // LED strip in a cove round the ceiling, as in Pecasa's finished interiors.
    for (const [w0, d0, x, z] of [[iw - .1, .03, 0, -id / 2 + .05], [iw - .1, .03, 0, id / 2 - .05], [.03, id - .1, -iw / 2 + .05, 0], [.03, id - .1, iw / 2 - .05, 0]]) {
      box(lightGroup, w0, .012, d0, x, ceilAt(x, z) - .01, z, lamp).userData.tags = ['lamp'];
    }
    light(0, 0, ceilAt(0, 0) - .3, 1.4);
  } else if (state.lighting === 'linear') {
    for (const side of ['left', 'right']) {
      const g = onWall(group(lightGroup), side, 0, F + 2.0, .02);
      box(g, Math.min(1.2, id * .5), .04, .04, 0, 0, 0, std('#1f2124', {roughness: .5}));
      box(g, Math.min(1.16, id * .5 - .04), .012, .012, 0, -.02, .02, lamp).userData.tags = ['lamp'];
    }
    light(0, 0, F + 1.8, 1.4);
  } else {
    // Recessed ceiling downlights (Pecasa's standard lighting).
    const nx = Math.max(1, Math.round(iw / 1.3)), nz = Math.max(1, Math.round(id / 1.3));
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = -iw / 2 + iw * (i + .5) / nx, z = -id / 2 + id * (k + .5) / nz, y = ceilAt(x, z) - .004;
      cyl(lightGroup, .045, .045, .008, x, y - .001, z, kit.materials.steel);
      cyl(lightGroup, .035, .035, .004, x, y - .007, z, lamp).userData.tags = ['lamp'];
      if ((i + k) % 2 === 0) light(x, z, y - .1);
    }
  }

  // ---- Electrics: sockets, TV and data points, switch, fuse board, smoke alarm ---------------
  const elec = group(host, 'electrics');
  const plate = std('#fafafa', {roughness: .35});
  const dark = std('#2b2f33', {roughness: .5});
  const socket = (side, pos, kind = 'double') => {
    const g = onWall(group(elec, kind === 'double' ? 'sockets' : kind), side, pos, F + .4, .004);
    fixed(side, pos, kind === 'double' ? .073 : .043, .35, .45);
    box(g, kind === 'double' ? .146 : .086, .086, .012, 0, 0, 0, plate);
    if (kind === 'double') for (const x of [-.035, .035]) box(g, .02, .012, .004, x, .01, .007, dark);
    else if (kind === 'tv') { const c = cyl(g, .012, .012, .006, 0, 0, .007, dark); c.rotation.x = Math.PI / 2; }
    else box(g, .02, .018, .004, 0, 0, .007, std('#2d6fb3', {roughness: .5}));
  };
  const socketSpots = [['back', -iw * .3], ['back', iw * .3], ['left', 0], ['right', 0]];
  const extra = state.electrics.doubleSockets ? [['back', 0], ['front', -iw * .3]] : [];
  for (const [side, prefer] of [...socketSpots, ...extra]) {
    const pos = findFree(side, .1, prefer, .45);
    if (pos !== null && !(side === 'right' && blockRight)) socket(side, pos);
  }
  if (state.electrics.tvSocket) { const pos = findFree('left', .06, -.3, .45); if (pos !== null) socket('left', pos, 'tv'); }
  if (state.electrics.dataPoint) { const pos = findFree('back', .06, -iw * .2, .45); if (pos !== null) socket('back', pos, 'data'); }
  const entrance = ['front', 'right', 'left'].flatMap(sd => spans(sd).filter(sp => OPENINGS[sp.type]?.group === 'door').map(sp => ({...sp, side: sd})))[0];
  const swSide = entrance ? entrance.side : 'back';
  const swPos = entrance ? (entrance.b + .2 < (swSide === 'front' ? iw : id) / 2 - .05 ? entrance.b + .15 : entrance.a - .15) : 0;
  if (freeAt(swSide, swPos, .05, 1.1) || !entrance) {
    const sw = onWall(group(elec, 'switches'), swSide, swPos, F + 1.2, .004);
    fixed(swSide, swPos, .043, 1.15, 1.25);
    box(sw, .086, .086, .012, 0, 0, 0, plate);
    if (state.electrics.dimmer) cyl(sw, .016, .016, .014, 0, 0, .01, plate).rotation.x = Math.PI / 2;
    else box(sw, .03, .05, .006, 0, 0, .008, plate);
  }
  const fb = findFree('back', .12, iw * .4, 1.95, [1.6, 2.0]);
  if (fb !== null) { const cu = onWall(group(elec, 'fuseboard'), 'back', fb, Math.min(ceilingH - .35, F + 1.85), .004); box(cu, .2, .24, .1, 0, 0, .05, plate); }
  if (state.electrics.smokeAlarm) {
    const sa = group(elec, 'smokeAlarm');
    cyl(sa, .06, .06, .035, 0, ceilAt(0, 0) - .02, 0, plate);
  }

  // ---- Furniture (illustrative) ------------------------------------------------------------------
  const fg = group(host, 'furniture');
  const x0 = -iw / 2 + .1, x1 = xMax - .1;
  const span = x1 - x0;
  const zBack = -id / 2 + (state.kitchen === 'kitchenette' ? .65 : 0), zFront = id / 2;
  const backLimit = x => (blockBack && x > blockBack.x0 ? blockBack.z1 : zBack);
  // A place against the back wall for something w wide: beside the kitchenette when there is
  // room (never blocking it), otherwise at the left-hand end, in front of anything fitted there.
  const backSpot = w => {
    const right = (blockBack ? blockBack.x0 : xMax) - .1;
    if (kitchenEnd !== null && kitchenEnd + .15 + w <= right) return {x: kitchenEnd + .15 + w / 2, z: -id / 2};
    const x = x0 + w / 2 + .1;
    return {x, z: Math.max(backLimit(x - w / 2), backLimit(x + w / 2))};
  };
  const plant = (x, z, sc = 1) => {
    const p = group(fg); p.position.set(x, F, z); p.scale.setScalar(sc);
    cyl(p, .17, .13, .34, 0, .17, 0, std('#d8d3c7', {roughness: .9}));
    for (let i = 0; i < 9; i++) {
      const leaf = rbox(p, .22, .02, .07, Math.cos(i * 2.4) * .12, .5 + (i % 3) * .14, Math.sin(i * 2.4) * .12, m.leaf, .01);
      leaf.rotation.set(.6 * Math.sin(i), i * 2.4, .5);
    }
    cyl(p, .015, .02, .4, 0, .5, 0, m.walnut, 6);
  };
  // Rugs and mats stay on the open floor: inside the room and clear of an enclosed corner.
  const rug = (x, z, w0, d0, mat) => {
    let xa = Math.max(x - w0 / 2, -iw / 2 + .05), xb = Math.min(x + w0 / 2, xMax - .05);
    let za = Math.max(z - d0 / 2, -id / 2 + .05);
    const zb = Math.min(z + d0 / 2, id / 2 - .05);
    if (blockBack && xb > blockBack.x0 && za < blockBack.z1) { if (blockBack.x0 - xa > .8) xb = blockBack.x0; else za = blockBack.z1; }
    if (xb - xa < .4 || zb - za < .4) return null;
    const r0 = box(fg, xb - xa, .012, zb - za, (xa + xb) / 2, F + .006, (za + zb) / 2, mat); r0.castShadow = false;
    return r0;
  };
  const shelf = (side, pos, h = 1.8, w0 = .8) => {
    const sg = onWall(group(fg), side, pos, F, .17);
    for (const y of [0, h * .33, h * .66, h]) box(sg, w0, .025, .32, 0, y + .0125, 0, m.oak);
    for (const x of [-w0 / 2, w0 / 2]) box(sg, .025, h, .32, x, h / 2, 0, m.oak);
    for (let i = 0; i < 7; i++) box(sg, .03 + (i % 3) * .01, .2 + (i % 2) * .05, .2, -w0 / 2 + .1 + i * .08, h * .33 + .13, 0, [m.rust, m.sage, m.slate, m.oat][i % 4]);
    return sg;
  };
  const deskSet = (x, z, dw) => {
    const g = group(fg); g.position.set(x, F, z);
    box(g, dw, .03, .7, 0, .735, 0, m.oak);
    for (const sx of [-dw / 2 + .04, dw / 2 - .04]) box(g, .04, .72, .62, sx, .36, 0, m.ink);
    box(g, .55, .33, .02, 0, 1.06, -.22, m.ink);
    box(g, .06, .16, .06, 0, .83, -.22, m.ink);
    box(g, .2, .012, .15, 0, .757, -.22, m.ink);
    box(g, .42, .015, .14, 0, .76, .05, std('#3a3f44', {roughness: .5}));
    const c = group(g); c.position.set(0, 0, .55); c.rotation.y = Math.PI + .15;
    rbox(c, .5, .08, .48, 0, .48, 0, m.slate, .03);
    rbox(c, .48, .55, .07, 0, .82, .22, m.slate, .03).rotation.x = -.12;
    cyl(c, .025, .025, .4, 0, .25, 0, m.ink, 8);
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; const leg = box(c, .3, .025, .03, Math.sin(a) * .14, .05, Math.cos(a) * .14, m.ink); leg.rotation.y = a + Math.PI / 2; }
    return g;
  };
  const sofa = (x, z, sw, rot = 0) => {
    const g = group(fg); g.position.set(x, F, z); g.rotation.y = rot;
    rbox(g, sw, .22, .85, 0, .22, 0, fabric(SOFT.sage), .06);
    rbox(g, sw - .3, .14, .62, 0, .4, .06, fabric('#8fa492'), .06);
    rbox(g, sw, .45, .2, 0, .58, -.34, fabric(SOFT.sage), .08);
    for (const sx of [-sw / 2 + .09, sw / 2 - .09]) rbox(g, .18, .38, .85, sx, .44, 0, fabric(SOFT.sage), .07);
    rbox(g, .4, .38, .12, sw * .25, .66, -.18, fabric(SOFT.rust), .06).rotation.z = .2;
    for (const sx of [-sw / 2 + .1, sw / 2 - .1]) for (const sz of [-.33, .33]) cyl(g, .02, .025, .1, sx, .05, sz, m.walnut, 8);
    return g;
  };
  const armchair = (x, z, rot) => {
    const g = group(fg); g.position.set(x, F, z); g.rotation.y = rot;
    rbox(g, .75, .2, .75, 0, .25, 0, fabric(SOFT.oat), .06);
    rbox(g, .75, .45, .16, 0, .55, -.3, fabric(SOFT.oat), .07);
    for (const sx of [-.32, .32]) rbox(g, .12, .32, .75, sx, .42, 0, fabric(SOFT.oat), .05);
  };
  const bed = (x, z, bw) => {
    const g = group(fg); g.position.set(x, F, z);
    rbox(g, bw, .3, 2.0, 0, .15, 0, m.walnut, .03);
    rbox(g, bw - .06, .22, 1.94, 0, .41, 0, fabric('#f1eee8'), .06);
    rbox(g, bw, .9, .08, 0, .45, -1.0, m.walnut, .03);
    for (const sx of [-bw / 4, bw / 4]) rbox(g, bw / 2 - .1, .14, .4, sx, .6, -.75, fabric('#ffffff'), .06);
    rbox(g, bw - .02, .06, 1.2, 0, .54, .35, fabric(SOFT.teal), .03);
    return g;
  };

  if (span < 1.1 || id < 1.4) {
    plant(x0 + .25, zBack + .3, .8);
  } else if (state.use === 'office') {
    const dw = Math.min(1.5, span * .55);
    const {x: dx, z: dz} = backSpot(dw);
    deskSet(dx, dz + .38, dw);
    rug(dx, dz + .9, Math.min(1.8, span * .6), 1.2, fabric('#c8c1b2'));
    if (span > 2.4 && id > 2.2 && !blockRight && !blockBack) shelf('right', Math.min(-.2, id / 2 - 1.2), 1.8, .8);
    plant(x1 - .25, zFront - .35, .9);
    if (span > 3.2 && id > 2.6) armchair(x1 - .6, Math.max(zFront - 1.1, (blockBack ? blockBack.z1 : -9) + .75), -Math.PI * .8);
  } else if (state.use === 'gym') {
    rug(x0 + Math.min(2.2, span * .7) / 2 + .05, 0, Math.min(2.2, span * .7), Math.min(1.8, id * .7), m.rubber);
    const bs = backSpot(.9);
    const bike = group(fg); bike.position.set(bs.x, F, bs.z + .7); bike.rotation.y = .3;
    box(bike, .08, .5, .9, 0, .25, 0, m.ink);
    cyl(bike, .22, .22, .06, 0, .3, .35, m.slate).rotation.z = Math.PI / 2;
    rbox(bike, .22, .06, .28, 0, .95, -.25, m.ink, .02);
    box(bike, .45, .03, .04, 0, 1.1, .35, m.ink);
    box(bike, .04, .55, .04, 0, .8, .3, m.ink);
    if (span > 2) {
      const rx = x0 + Math.min(2.2, span * .7) - .4;
      const rack = group(fg); rack.position.set(rx, F, backLimit(rx) + .25);
      box(rack, .9, .04, .3, 0, .5, 0, m.ink); box(rack, .9, .04, .3, 0, .2, 0, m.ink);
      for (const sx of [-.42, .42]) box(rack, .04, .6, .3, sx, .3, 0, m.ink);
      for (let i = 0; i < 5; i++) for (const y of [.55, .25]) { const db = cyl(rack, .04, .04, .25, -.32 + i * .16, y, 0, m.slate, 12); db.rotation.x = Math.PI / 2; }
    }
    if (id > 2.2 && findFree('left', .7, -.2, 2.5) !== null) { const mir = onWall(group(fg), 'left', findFree('left', .7, -.2, 2.5), F + 1.1, .02); box(mir, Math.min(1.4, id - .8), 1.6, .02, 0, 0, 0, std('#cfe1e6', {roughness: .02, metalness: .9})); }
    plant(x1 - .25, zFront - .35, .85);
  } else if (state.use === 'studio') {
    const tw = Math.min(1.6, span * .55), tx = x0 + span * .45;
    const table = group(fg); table.position.set(tx, F, -id * .05);
    box(table, tw, .04, .8, 0, .9, 0, m.oak);
    for (const sx of [-tw / 2 + .05, tw / 2 - .05]) for (const sz of [-.33, .33]) box(table, .05, .88, .05, sx, .44, sz, m.walnut);
    box(table, .5, .01, .35, -.2, .925, 0, m.canvas);
    const easel = group(fg); easel.position.set(x0 + .45, F, zFront - .9); easel.rotation.y = .6;
    for (const sx of [-.25, .25]) { const leg = box(easel, .035, 1.7, .035, sx, .85, 0, m.oak); leg.rotation.z = -sx * .25; }
    box(easel, .7, .55, .03, 0, 1.25, .04, m.canvas);
    box(easel, .35, .25, .005, .05, 1.28, .057, m.rust);
    plant(x1 - .25, zFront - .35, .8);
  } else if (state.use === 'guest') {
    const bw = Math.min(1.4, span - .6);
    const bs = backSpot(bw + .2);
    if (id > 2.4 && bw > .8) bed(bs.x, bs.z + 1.05, bw);
    plant(x1 - .25, zFront - .35, .8);
    if (span > 2.6) armchair(x1 - .5, zFront - 1.2, -Math.PI * .75);
  } else {
    const sw = Math.min(2.1, span * .62), {x: sx, z: sz} = backSpot(sw + .1);
    sofa(sx, sz + .5, sw);
    rug(sx, .1, Math.min(2.2, span * .7), Math.min(1.6, id * .55), fabric('#cdbfa8'));
    const ct = group(fg); ct.position.set(sx, F, sz + 1.35);
    rbox(ct, Math.min(1, sw * .5), .05, .55, 0, .4, 0, m.walnut, .02);
    for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(ct, .018, .018, .38, a * .4 * Math.min(1, sw * .5), .19, b * .22, m.ink, 8);
    if (span > 3) armchair(x1 - .55, Math.max(.2, (blockBack ? blockBack.z1 : -9) + .75), -Math.PI / 2 - .3);
    plant(x1 - .25, zFront - .35, 1);
  }
  return {blockRight, blockBack};
}
