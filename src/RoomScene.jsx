import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Dimensions are in metres. The front of the building is positive Z.
const DEFAULTS = { style: 'portal', width: 4, depth: 3, height: 2.5, cladding: 'cedar', glazing: 'sliding', window: 'none', decking: false, rooflight: false, lighting: false, purpose: 'office', roof: 'flat', floor: 'oak' };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, ...options });
function random(seed = 67) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function box(group, width, height, depth, x, y, z, material, shadows = true) {
  if (Math.min(width, height, depth) < .0001) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z); mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function cylinder(group, radiusTop, radiusBottom, height, x, y, z, material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function sphere(group, radius, x, y, z, material, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
  mesh.position.set(x, y, z); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function tube(group, start, end, radius, material, radiusEnd = radius) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a);
  const mesh = cylinder(group, radiusEnd, radius, direction.length(), 0, 0, 0, material, 12);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return mesh;
}
function dispose(object) {
  const geometry = new Set(), materials = new Set(), textures = new Set();
  object.traverse(child => {
    if (child.geometry) geometry.add(child.geometry);
    [...(Array.isArray(child.material) ? child.material : [child.material]), ...(child.userData.resources || [])].filter(Boolean).forEach(material => {
      materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    });
  });
  textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose()); geometry.forEach(item => item.dispose());
}

function canvasTexture(kind, color = '#bd875b') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d'), rand = random(407);
  context.fillStyle = color; context.fillRect(0, 0, 512, 512);
  if (kind === 'wood') {
    // Long fibres and softly wandering growth rings avoid a repeated flat colour.
    for (let i = 0; i < 1600; i++) {
      context.strokeStyle = `rgba(${rand() > .4 ? '39,23,12' : '255,236,203'},${.015 + rand() * .12})`;
      context.lineWidth = .35 + rand() * 1.25;
      const x = rand() * 512, y = rand() * 512;
      context.beginPath(); context.moveTo(x, y); context.bezierCurveTo(x + rand() * 10, y + 80, x - rand() * 12, y + 200, x + rand() * 7, y + 420); context.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = rand() * 512, y = rand() * 512;
      context.fillStyle = 'rgba(46,29,17,.12)'; context.beginPath(); context.ellipse(x, y, 1 + rand() * 2, 6 + rand() * 12, .06, 0, Math.PI * 2); context.fill();
    }
  } else if (kind === 'grass') {
    for (let i = 0; i < 40000; i++) {
      context.fillStyle = `rgba(${rand() > .48 ? '207,220,125' : '33,67,30'},${rand() * .27})`;
      context.fillRect(rand() * 512, rand() * 512, .4 + rand() * 1.4, 1 + rand() * 4);
    }
  } else {
    for (let i = 0; i < 16000; i++) {
      context.fillStyle = `rgba(${rand() > .5 ? '255,255,255' : '35,35,28'},${rand() * .065})`;
      const size = .3 + rand() * 2; context.fillRect(rand() * 512, rand() * 512, size, size);
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8; return texture;
}

function materialsFor(design) {
  const colours = { cedar: '#b98054', larch: '#c3a170', composite: '#929184', anthracite: '#3d4545', white: '#e8e9e4' };
  const wood = canvasTexture('wood', colours[design.cladding] || colours.cedar);
  const floor = canvasTexture('wood', ({ oak: '#c7ab86', light: '#e0d2b6', dark: '#776654' })[design.floor] || '#c7ab86');
  floor.repeat.set(3, 1);
  return {
    cladding: standard('#ffffff', { map: wood, roughness: .82 }),
    charcoal: standard('#263031', { roughness: .42, metalness: .3 }),
    seam: standard('#413b31'),
    plaster: standard('#eeede6'),
    floor: standard('#ffffff', { map: floor, roughness: .65 }),
    concrete: standard('#b8b9ac', { map: canvasTexture('stone', '#b8b9ac') }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#c7ddda', metalness: .06, roughness: .045, transparent: true, opacity: .23, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.45, side: THREE.DoubleSide, depthWrite: false }),
    reflection: new THREE.MeshBasicMaterial({ color: '#f0f7ee', opacity: .09, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    curtain: standard('#d8d2c3', { roughness: 1, side: THREE.DoubleSide }),
    linen: standard('#dcd8cc'),
    furnitureWood: standard('#b59875', { map: canvasTexture('wood', '#c4ab89'), roughness: .6 }),
    green: standard('#64715c'),
    metal: standard('#333b37', { roughness: .65, metalness: .15 }),
    warmLight: standard('#fff0c7', { emissive: '#ffe0a2', emissiveIntensity: 2 }),
  };
}

function slattedPanel(group, width, height, x, bottom, z, materials, { upperLeft = height, upperRight = height, vertical = true } = {}) {
  if (width < .015 || height < .01) return;
  const average = (upperLeft + upperRight) / 2;
  const backing = box(group, width, average, .12, x, bottom + average / 2, z, materials.plaster);
  if (upperLeft !== upperRight) {
    const points = backing.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) if (points.getY(i) > 0) points.setY(i, points.getY(i) + (points.getX(i) < 0 ? upperLeft : upperRight) - average);
    points.needsUpdate = true; backing.geometry.computeVertexNormals();
  }
  if (!vertical) {
    const count = Math.ceil(average / .115), geometry = new THREE.BoxGeometry(width, .105, .032), mesh = new THREE.InstancedMesh(geometry, materials.cladding, count);
    const dummy = new THREE.Object3D(), rand = random(32);
    for (let i = 0; i < count; i++) {
      dummy.position.set(x, bottom + i * .115 + .0525, z + .08); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color().setScalar(.88 + rand() * .2));
    }
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return;
  }
  const count = Math.max(1, Math.ceil(width / .11)), step = width / count;
  const geometry = new THREE.BoxGeometry(Math.max(.02, step - .007), 1, .032), mesh = new THREE.InstancedMesh(geometry, materials.cladding, count);
  const dummy = new THREE.Object3D(), rand = random(Math.round(width * 317));
  for (let i = 0; i < count; i++) {
    const local = -width / 2 + step * (i + .5), h = upperLeft + (upperRight - upperLeft) * (i + .5) / count;
    dummy.position.set(x + local, bottom + h / 2, z + .077); dummy.scale.set(1, h, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color().setScalar(.88 + rand() * .21));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
}

function glazedOpening(group, width, height, x, bottom, z, materials, panels = 2, door = false, type = 'sliding') {
  const frame = .05, cy = bottom + height / 2;
  const glass = box(group, width - .055, height - .05, .016, x, cy, z, materials.glass, false);
  if (glass) glass.renderOrder = 5;
  for (const side of [-1, 1]) box(group, frame, height + frame, .105, x + side * width / 2, cy, z + .015, materials.charcoal);
  for (const side of [-1, 1]) box(group, width + frame, frame, .105, x, cy + side * height / 2, z + .015, materials.charcoal);
  for (let i = 1; i < panels; i++) box(group, .036, height, .085, x - width / 2 + i * width / panels, cy, z + .024, materials.charcoal);
  if (door) {
    box(group, width, .045, .15, x, bottom + .018, z + .04, materials.charcoal);
    if (type === 'french') {
      for (const side of [-1, 1]) {
        box(group, .018, .16, .055, x + side * .072, bottom + .96, z + .097, materials.charcoal);
        box(group, .105, .015, .025, x + side * .105, bottom + 1.025, z + .128, materials.charcoal);
      }
    } else {
      const handleX = type === 'bifold' ? x + width / panels - width / 2 - .07 : x + .07;
      box(group, .024, .21, .032, handleX, bottom + 1.0, z + .113, materials.charcoal);
      for (const y of [.915, 1.085]) box(group, .025, .019, .055, handleX, bottom + y, z + .09, materials.charcoal);
    }
  }
  // A restrained diagonal sky reflection, confined to each glazed panel.
  for (let i = 0; i < panels; i++) {
    const panelWidth = width / panels, shape = new THREE.Shape();
    shape.moveTo(-panelWidth * .31, -height * .43); shape.lineTo(-panelWidth * .13, -height * .43);
    shape.lineTo(panelWidth * .34, height * .43); shape.lineTo(panelWidth * .2, height * .43); shape.closePath();
    const glint = new THREE.Mesh(new THREE.ShapeGeometry(shape), materials.reflection);
    glint.position.set(x - width / 2 + panelWidth * (i + .5), cy, z + .025); glint.renderOrder = 6; group.add(glint);
  }
}

function curtain(group, x, z, height, width, materials) {
  const count = 11, step = width / count;
  for (let i = 0; i < count; i++) {
    const strip = box(group, step + .006, height, .017, x - width / 2 + step * (i + .5), .18 + height / 2, z + Math.sin(i * Math.PI / 2) * .035, materials.curtain, false);
    strip.rotation.y = Math.cos(i * Math.PI / 2) * .48;
  }
}

function leafGeometry(height, bend, width) {
  const points = [], indices = [], segments = 8;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, y = height * Math.sin(t * Math.PI / 2), x = bend * t * t, halfWidth = width * Math.sin(t * Math.PI) / 2 + .001;
    points.push(x - halfWidth, y, 0, x + halfWidth, y, 0);
    if (i < segments) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
function grassPlant(group, x, z, size = 1, potted = true) {
  const foliage = standard('#60754f', { side: THREE.DoubleSide }), rand = random(Math.round((x + 20) * 791));
  let bottom = .025;
  if (potted) {
    const pot = standard('#65665c', { map: canvasTexture('stone', '#77796b'), roughness: .94 });
    cylinder(group, .25 * size, .19 * size, .42 * size, x, .21 * size, z, pot);
    cylinder(group, .256 * size, .256 * size, .024 * size, x, .42 * size, z, pot);
    cylinder(group, .23 * size, .23 * size, .014, x, .429 * size, z, standard('#484638')); bottom = .44 * size;
  }
  const blades = new THREE.InstancedMesh(leafGeometry(1, .36, .04), foliage, 37), dummy = new THREE.Object3D();
  for (let i = 0; i < 37; i++) {
    const height = (.43 + rand() * .56) * size, bend = (.12 + rand() * .27) * size;
    const angle = rand() * Math.PI * 2, radius = rand() * .1 * size;
    dummy.position.set(x + Math.cos(angle) * radius, bottom, z + Math.sin(angle) * radius); dummy.rotation.y = angle;
    dummy.scale.set(bend / .36, height, 1); dummy.updateMatrix(); blades.setMatrixAt(i, dummy.matrix);
    blades.setColorAt(i, new THREE.Color().setScalar(.86 + rand() * .25));
  }
  blades.castShadow = true; blades.receiveShadow = true; group.add(blades);
}

function indoorPlant(group, x, z, size, materials) {
  const pot = standard('#b7b29f'), stem = standard('#655941'), leaf = standard('#52674d');
  cylinder(group, .18 * size, .13 * size, .32 * size, x, .16 + .16 * size, z, pot);
  const top = .22 + .9 * size; tube(group, [x, .34, z], [x + .025, top, z], .013 * size, stem);
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4, y = .43 + (i / 12) * .64 * size, reach = (.23 + Math.sin(i) * .04) * size;
    const lx = x + Math.cos(angle) * reach, lz = z + Math.sin(angle) * reach;
    tube(group, [x, y, z], [lx, y + .12, lz], .007, stem);
    const foliage = sphere(group, .14 * size, lx, y + .13, lz, leaf, [1, .24, .52]); foliage.rotation.y = -angle; foliage.rotation.z = .22;
  }
}

function furniture(group, design, materials) {
  const { width: w, depth: d, purpose } = design, base = .185;
  const dark = materials.charcoal, wood = materials.furnitureWood, linen = materials.linen;
  // A slightly inset plank floor stays visible behind the glazing.
  box(group, w - .2, .032, d - .2, 0, base, 0, materials.floor);
  const seams = standard('#8f7d62', { transparent: true, opacity: .27 });
  for (let x = -w / 2 + .32; x < w / 2 - .12; x += .22) box(group, .002, .002, d - .22, x, base + .018, 0, seams, false);
  for (let x = -w / 2 + .2, i = 0; x < w / 2 - .1; x += .22, i++) {
    for (let z = -d / 2 + .5 + (i % 3) * .5; z < d / 2 - .1; z += 1.5) box(group, .21, .002, .002, x, base + .018, z, seams, false);
  }
  const rug = standard(purpose === 'gym' ? '#7c8976' : '#cfc7b7', { roughness: 1 });
  box(group, Math.min(w * .67, 2.3), .014, Math.min(d * .65, 1.65), 0, base + .022, -.05, rug, false);
  if (purpose === 'office' || purpose === 'studio') {
    const deskWidth = Math.min(1.55, w * .5), deskX = -w * .17, deskZ = design.kitchen === 'kitchenette' ? d * .05 : -d * .25;
    box(group, deskWidth, .06, .62, deskX, .92, deskZ, wood);
    for (const dx of [-deskWidth / 2 + .07, deskWidth / 2 - .07]) for (const dz of [-.23, .23]) box(group, .035, .71, .035, deskX + dx, .545, deskZ + dz, dark);
    if (purpose === 'office') {
      box(group, .55, .33, .038, deskX, 1.17, deskZ - .17, dark);
      box(group, .49, .274, .009, deskX, 1.176, deskZ - .145, standard('#61777a', { emissive: '#354b50', emissiveIntensity: .2, roughness: .5 }));
      box(group, .032, .15, .032, deskX, .98, deskZ - .17, dark); box(group, .19, .015, .13, deskX, .96, deskZ - .14, dark);
      box(group, .38, .012, .13, deskX, .958, deskZ + .12, standard('#d7d8d0'));
      cylinder(group, .046, .043, .08, deskX + .48, 1.0, deskZ + .08, standard('#ede7d9'));
      const lamp = standard('#c2b597', { metalness: .35 }); tube(group, [deskX - .58, .96, deskZ - .08], [deskX - .58, 1.32, deskZ - .08], .013, lamp);
      cylinder(group, .075, .055, .03, deskX - .58, 1.34, deskZ - .08, lamp);
    } else {
      const canvas = box(group, .66, .78, .025, w * .26, 1.04, -d * .19, standard('#e2dbce'));
      canvas.rotation.x = -.12;
      const paint = standard('#b08268'); box(group, .39, .26, .007, w * .26 - .05, 1.04, -d * .19 + .02, paint, false);
      for (const side of [-1, 1]) tube(group, [w * .26 + side * .31, base, -d * .18 + .06], [w * .26 + side * .15, 1.55, -d * .18 - .13], .025, wood);
      box(group, .72, .035, .13, w * .26, .76, -d * .18 + .02, wood);
    }
    const seatX = deskX + .1, seatZ = deskZ + .72;
    box(group, .47, .09, .45, seatX, .63, seatZ, materials.green);
    const back = box(group, .46, .4, .067, seatX, .85, seatZ + .2, materials.green); back.rotation.x = -.08;
    cylinder(group, .027, .027, .4, seatX, .39, seatZ, dark);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; tube(group, [seatX, .22, seatZ], [seatX + Math.cos(a) * .27, .22, seatZ + Math.sin(a) * .27], .018, dark); }
    box(group, .75, .68, .3, w * .29, .53, -d / 2 + .25, wood);
    for (const y of [.36, .55, .75]) box(group, .73, .025, .31, w * .29, y, -d / 2 + .25, materials.plaster);
    for (let i = 0; i < 6; i++) box(group, .035, .16 + i % 3 * .025, .16, w * .29 - .2 + i * .04, .67, -d / 2 + .31, standard(['#6f8175', '#c3a882', '#b6b7a8'][i % 3]));
  } else if (purpose === 'gym') {
    const gx = w * .18, gz = -d * .13;
    box(group, .73, .13, 1.48, gx, .29, gz, dark);
    for (const dx of [-.31, .31]) tube(group, [gx + dx, .28, gz - .64], [gx + dx, 1.26, gz - .63], .026, dark);
    box(group, .7, .1, .21, gx, 1.3, gz - .63, dark);
    const screen = box(group, .3, .21, .035, gx, 1.43, gz - .62, dark); screen.rotation.x = -.25;
    box(group, .57, .012, 1.05, gx, .367, gz + .08, standard('#484d48'));
    box(group, .78, .065, .28, -w * .26, .62, -.1, dark);
    for (const dx of [-.26, .26]) box(group, .045, .4, .045, -w * .26 + dx, .4, -.1, dark);
    for (const z of [-.17, .04]) { const dumbbell = cylinder(group, .025, .025, .32, -w * .26, .72, z, dark); dumbbell.rotation.z = Math.PI / 2; for (const dx of [-.145, .145]) { const weight = cylinder(group, .083, .083, .055, -w * .26 + dx, .72, z, dark); weight.rotation.z = Math.PI / 2; } }
    box(group, 1.0, .017, 1.6, -w * .23, base + .04, -.14, materials.green);
    const mirror = box(group, Math.min(1.6, w * .43), 1.68, .027, -w * .17, 1.18, -d / 2 + .103, standard('#c3ceca', { metalness: .82, roughness: .065, envMapIntensity: 1.5 })); mirror.receiveShadow = false;
  } else {
    const sofaWidth = Math.min(1.95, w * .64), z = -d * .22;
    box(group, sofaWidth, .37, .77, 0, .45, z, linen);
    box(group, sofaWidth, .46, .18, 0, .74, z - .3, linen);
    for (const side of [-1, 1]) { box(group, .17, .32, .77, side * (sofaWidth / 2 - .045), .65, z, linen); box(group, .048, .14, .05, side * (sofaWidth / 2 - .17), .25, z + .25, wood); }
    for (const side of [-1, 1]) {
      const pillow = box(group, .36, .3, .13, side * sofaWidth * .28, .76, z - .15, standard(side === 1 ? '#798471' : '#b99e82')); pillow.rotation.z = side * .12;
    }
    const table = cylinder(group, .42, .42, .04, 0, .56, d * .16, wood);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; tube(group, [Math.cos(a) * .3, base, d * .16 + Math.sin(a) * .3], [Math.cos(a) * .2, .55, d * .16 + Math.sin(a) * .2], .027, wood); }
    box(group, .24, .025, .17, .09, .6, d * .16, standard('#ece7d8'));
    cylinder(group, .045, .04, .08, -.17, .62, d * .16 - .04, standard('#ece7d8'));
  }
  indoorPlant(group, w * .37, design.bathroom && design.bathroom !== 'none' ? d * .15 : -d * .3, .8, materials);
  // Framed artwork and a quiet interior ceiling light make the room feel lived in.
  box(group, .64, .54, .026, -w * .23, 1.72, -d / 2 + .10, materials.furnitureWood);
  box(group, .56, .46, .012, -w * .23, 1.72, -d / 2 + .12, standard('#ded9c9'));
  sphere(group, .105, -w * .23 + .07, 1.78, -d / 2 + .132, standard('#af9779'), [1, 1, .08]);
}

function sideWall(group, span, height, x, z, rotation, window, materials) {
  const side = new THREE.Group(); side.position.set(x, .14, z); side.rotation.y = rotation; group.add(side);
  if (!window) { slattedPanel(side, span, height, 0, 0, 0, materials); return; }
  const windowWidth = Math.min(1.35, span * .52), sill = .78, windowHeight = Math.min(1.2, height - 1.08), center = .05;
  const left = center - windowWidth / 2, right = center + windowWidth / 2;
  slattedPanel(side, span / 2 + left, height, (-span / 2 + left) / 2, 0, 0, materials);
  slattedPanel(side, span / 2 - right, height, (span / 2 + right) / 2, 0, 0, materials);
  slattedPanel(side, windowWidth, sill, center, 0, 0, materials);
  slattedPanel(side, windowWidth, height - sill - windowHeight, center, sill + windowHeight, 0, materials);
  glazedOpening(side, windowWidth, windowHeight, center, sill, .085, materials, 1);
}

function gable(group, width, rise, y, z, materials, rotation = 0) {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .14, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, materials.cladding); mesh.position.set(0, y, z); mesh.rotation.y = rotation; mesh.castShadow = true; group.add(mesh);
  for (let x = -width / 2 + .055; x < width / 2; x += .11) {
    const h = rise * (1 - Math.abs(x) / (width / 2)); if (h > .015) box(group, .008, h, .004, x, y + h / 2, z + (rotation ? -.006 : .146), materials.seam, false);
  }
}

function roofStructure(group, design, materials, cutaway, front, height, pitched) {
  const { width: w, depth: d, style } = design;
  if (cutaway) return;
  const y = .14 + height, fascia = materials.charcoal;
  if (pitched) {
    const rise = Math.min(.67, w * .18), half = w / 2 + .17, slope = Math.atan(rise / half), panelWidth = Math.hypot(half, rise);
    for (const side of [-1, 1]) {
      const panel = box(group, panelWidth, .12, d + .28, side * half / 2, y + rise / 2 + .06, 0, fascia); panel.rotation.z = -side * slope;
      const soffit = box(group, panelWidth, .035, d + .3, side * half / 2, y + rise / 2 - .007, 0, materials.plaster); soffit.rotation.z = -side * slope;
    }
    gable(group, w, rise, y, d / 2 - .09, materials); gable(group, w, rise, y, -d / 2 + .08, materials, Math.PI);
    box(group, .07, .045, d + .34, 0, y + rise + .1, 0, fascia);
    for (const side of [-1, 1]) { const edge = box(group, panelWidth + .035, .15, .07, side * half / 2, y + rise / 2 + .02, d / 2 + .16, fascia); edge.rotation.z = -side * slope; }
  } else {
    const slope = style === 'levno' ? .23 : style === 'roko' || style === 'angle' ? .17 : style === 'edge' ? .13 : .065;
    const panel = box(group, w + .22, .15, d + .27, 0, y + .047, .025, fascia); panel.rotation.x = -Math.atan(slope / d);
    const soffit = box(group, w + .16, .035, d + .26, 0, y - .035, .025, materials.plaster); soffit.rotation.x = panel.rotation.x;
    box(group, w + .23, .17, .075, 0, y + .07 + slope / 2, d / 2 + .15, fascia);
    box(group, w + .23, .115, .07, 0, y + .02 - slope / 2, -d / 2 - .11, fascia);
    if (design.rooflight) {
      const skyWidth = Math.min(1.3, w * .37), skyDepth = Math.min(.85, d * .33);
      box(group, skyWidth + .14, .08, skyDepth + .14, .1, y + .15, -.1, fascia);
      const sky = box(group, skyWidth, .018, skyDepth, .1, y + .198, -.1, materials.glass, false); sky.renderOrder = 5;
      box(group, .025, .025, skyDepth, .1, y + .21, -.1, fascia);
    }
  }
  // Downpipe is functional detail, placed away from the primary glazing.
  cylinder(group, .024, .024, height - .05, -w / 2 - .065, .14 + height / 2 - .025, -d / 2 - .055, fascia, 10);
}

function fittedOptions(group, design, materials, cutaway) {
  const { width: w, depth: d } = design, floor = .2;
  if (design.kitchen === 'kitchenette') {
    const length = Math.min(1.6, w * .5), centerX = -w / 2 + length / 2 + .13, cabinetZ = -d / 2 + .36;
    const cabinet = standard('#d0c7b5'), worktop = standard('#dfdcd1'), steel = standard('#bec3bd', { metalness: .7, roughness: .27 });
    box(group, length, .70, .49, centerX, floor + .35, cabinetZ, cabinet);
    box(group, length + .035, .04, .52, centerX, floor + .72, cabinetZ, worktop);
    for (let i = 1; i < 3; i++) box(group, .007, .60, .009, centerX - length / 2 + length * i / 3, floor + .39, cabinetZ + .253, materials.seam, false);
    for (let i = 0; i < 3; i++) box(group, .12, .011, .025, centerX - length / 2 + length * (i + .5) / 3, floor + .6, cabinetZ + .269, steel);
    box(group, .37, .012, .31, centerX - length * .2, floor + .746, cabinetZ, steel, false);
    box(group, .31, .015, .25, centerX - length * .2, floor + .754, cabinetZ, standard('#626b67'), false);
    tube(group, [centerX - length * .2, floor + .75, cabinetZ - .13], [centerX - length * .2, floor + .92, cabinetZ - .13], .015, steel);
    tube(group, [centerX - length * .2, floor + .92, cabinetZ - .13], [centerX - length * .2, floor + .92, cabinetZ -.02], .014, steel);
    box(group, .35, .016, .30, centerX + length * .24, floor + .75, cabinetZ, materials.charcoal);
    for (const dx of [-.075, .075]) cylinder(group, .052, .052, .006, centerX + length * .24 + dx, floor + .766, cabinetZ, materials.metal);
    box(group, length, .24, .017, centerX, floor + .88, -d / 2 + .105, worktop);
  }
  if (design.bathroom && design.bathroom !== 'none') {
    const bathroomWidth = Math.min(1.28, w * .36), bathroomDepth = design.bathroom === 'shower' ? Math.min(1.6, d * .58) : Math.min(1.18, d * .45);
    const left = w / 2 - bathroomWidth - .1, centerX = left + bathroomWidth / 2, rear = -d / 2 + .10, front = rear + bathroomDepth;
    const ceramic = standard('#f0f0e9', { roughness: .2 }), tile = standard('#c9c9bd'), steel = standard('#adb6b0', { metalness: .7, roughness: .25 });
    box(group, bathroomWidth, .018, bathroomDepth, centerX, floor + .022, rear + bathroomDepth / 2, tile);
    box(group, .075, 2.1, bathroomDepth, left, floor + 1.05, rear + bathroomDepth / 2, materials.plaster);
    if (!cutaway) {
      box(group, bathroomWidth, 2.1, .075, centerX, floor + 1.05, front, materials.plaster);
      box(group, Math.min(.72, bathroomWidth - .13), 1.91, .018, centerX, floor + .955, front + .05, materials.furnitureWood);
      box(group, .078, .015, .024, centerX + .24, floor + .94, front + .067, steel);
    }
    const toiletX = centerX - bathroomWidth * .19, toiletZ = rear + .40;
    box(group, .34, .39, .17, toiletX, floor + .32, toiletZ - .18, ceramic);
    const bowl = sphere(group, .21, toiletX, floor + .30, toiletZ + .02, ceramic, [.85, .65, 1.32]);
    cylinder(group, .12, .15, .21, toiletX, floor + .11, toiletZ, ceramic);
    const seat = cylinder(group, .16, .17, .028, toiletX, floor + .395, toiletZ + .03, ceramic); seat.scale.z = 1.27;
    box(group, .31, .06, .26, left + .27, floor + .78, front - .23, ceramic);
    cylinder(group, .011, .011, .13, left + .27, floor + .88, front - .32, steel);
    if (design.bathroom === 'shower') {
      const sx = w / 2 - .39, sz = rear + bathroomDepth - .42;
      box(group, .66, .044, .74, sx, floor + .034, sz, ceramic);
      const glass = box(group, .012, 1.85, .72, sx - .34, floor + .96, sz, materials.glass, false); glass.renderOrder = 4;
      tube(group, [w / 2 - .13, floor + .55, sz], [w / 2 - .13, floor + 1.87, sz], .015, steel);
      tube(group, [w / 2 - .13, floor + 1.87, sz], [w / 2 - .35, floor + 1.87, sz], .015, steel);
      cylinder(group, .075, .075, .012, w / 2 - .35, floor + 1.86, sz, steel);
    }
  }
  if (design.climate === 'aircon') {
    box(group, .82, .26, .17, .05, design.height - .39, -d / 2 + .19, standard('#eceee6'));
    box(group, .69, .032, .013, .05, design.height - .49, -d / 2 + .281, materials.seam, false);
    box(group, .035, .017, .014, .35, design.height - .38, -d / 2 + .283, standard('#9bab92'), false);
  } else if (design.climate === 'heater') {
    box(group, .68, .44, .085, .0, .66, -d / 2 + .15, standard('#e7e9e2'));
    for (let x = -.28; x < .30; x += .044) box(group, .009, .32, .004, x, .66, -d / 2 + .195, standard('#ccd1c8'), false);
  }
}

function buildPergola(design, materials) {
  const group = new THREE.Group(), w = design.width, d = design.depth, h = design.height, aluminium = materials.charcoal;
  group.userData.resources = Object.values(materials);
  box(group, w + .2, .07, d + .2, 0, .035, 0, materials.concrete);
  if (design.decking) for (let z = -d / 2 + .05; z < d / 2; z += .115) box(group, w + .12, .025, .106, 0, .081, z, materials.furnitureWood);
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) box(group, .10, h, .10, x, .08 + h / 2, z, aluminium);
  for (const z of [-d / 2, d / 2]) box(group, w + .11, .13, .11, 0, h + .10, z, aluminium);
  for (const x of [-w / 2, w / 2]) box(group, .11, .13, d + .11, x, h + .10, 0, aluminium);
  for (let x = -w / 2 + .15; x < w / 2 - .05; x += .22) box(group, .06, .055, d, x, h + .135, 0, aluminium);
  const glass = box(group, w, .016, d, 0, h + .17, 0, materials.glass, false); glass.renderOrder = 5;
  furniture(group, { ...design, purpose: 'retreat' }, materials);
  if (design.lighting) for (const x of [-w / 2 + .1, w / 2 - .1]) box(group, .025, .012, d - .14, x, h + .02, 0, materials.warmLight, false);
  return group;
}

function buildRoom(design, cutaway, night) {
  const overall = new THREE.Group(), group = new THREE.Group(), materials = materialsFor(design);
  const { width: w, depth: overallDepth, style } = design, h = design.height - .15, b = .14;
  const isL = style === 'lshape', d = isL ? overallDepth * .65 : overallDepth;
  const wingWidth = isL ? w * .38 : 0, wingDepth = isL ? overallDepth * .35 : 0;
  const mainDesign = isL ? { ...design, depth: d } : design;
  group.position.z = isL ? -(overallDepth - d) / 2 : 0; overall.add(group);
  group.userData.resources = Object.values(materials);
  if (style === 'pergola') return buildPergola(design, materials);
  const pitched = design.roof === 'pitched' || ['cabano', 'inspiro', 'veranda'].includes(style);
  const front = d / 2, innerH = h - .15;
  box(group, w + .08, .13, d + .08, 0, .065, 0, materials.concrete);
  box(group, w + .005, .075, d + .005, 0, .115, 0, materials.charcoal);
  // Exterior walls face outward; their inner plaster faces remain visible through the doors.
  const darkOuter = ['portal', 'angle'].includes(style) && design.cladding === 'cedar';
  const wallMaterials = darkOuter ? { ...materials, cladding: materials.charcoal } : materials;
  sideWall(group, w, h, 0, -d / 2, Math.PI, false, wallMaterials);
  sideWall(group, d, h, -w / 2, 0, -Math.PI / 2, design.window === 'left' || design.window === 'both', wallMaterials);
  if (!cutaway && ['ecke', 'ofiko'].includes(style)) {
    const side = new THREE.Group(); side.position.set(w / 2, b, 0); side.rotation.y = Math.PI / 2; group.add(side);
    const glassSpan = Math.min(d - .24, d * .72), rearWidth = d - glassSpan;
    slattedPanel(side, rearWidth, h, d / 2 - rearWidth / 2, 0, 0, materials);
    slattedPanel(side, glassSpan, .15, -rearWidth / 2, h - .15, 0, materials);
    glazedOpening(side, glassSpan, h - .17, -rearWidth / 2, .0, .075, materials, 1, false);
  } else if (!cutaway) sideWall(group, d, h, w / 2, 0, Math.PI / 2, design.window === 'right' || design.window === 'both', wallMaterials);
  if (cutaway) box(group, .12, .055, d, w / 2, b + .0275, 0, materials.plaster);
  furniture(group, mainDesign, materials);
  fittedOptions(group, mainDesign, materials, cutaway);
  const faceWidth = w - wingWidth, faceCenter = wingWidth / 2;
  const doorWidth = Math.min(faceWidth - (isL ? .32 : .52), design.glazing === 'french' ? 2.35 : faceWidth * .78);
  const glazingHeight = Math.min(2.13, h - .18), sideWidth = (faceWidth - doorWidth) / 2;
  if (!cutaway) {
    for (const sign of [-1, 1]) slattedPanel(group, sideWidth, h, faceCenter + sign * (doorWidth / 2 + sideWidth / 2), b, front, materials);
    slattedPanel(group, doorWidth, h - glazingHeight, faceCenter, b + glazingHeight, front, materials);
    glazedOpening(group, doorWidth, glazingHeight, faceCenter, b, front + .083, materials, design.glazing === 'bifold' ? Math.max(3, Math.round(doorWidth / .76)) : 2, true, design.glazing);
    for (const side of [-1, 1]) curtain(group, faceCenter + side * (doorWidth / 2 - .18), front - .14, glazingHeight - .025, .28, materials);
    tube(group, [faceCenter - doorWidth / 2, b + glazingHeight - .02, front - .16], [faceCenter + doorWidth / 2, b + glazingHeight - .02, front - .16], .016, materials.metal);
  }
  roofStructure(group, mainDesign, materials, cutaway, front, h, pitched);
  if (!cutaway && ['portal', 'quba', 'ofiko', 'ecke', 'edge', 'angle'].includes(style)) {
    const portalDepth = style === 'portal' ? .44 : style === 'edge' ? .32 : .2;
    const portalThickness = style === 'portal' ? .19 : .12;
    const frameMaterial = ['portal', 'angle', 'ecke', 'quba', 'ofiko'].includes(style) ? materials.charcoal : materials.cladding;
    for (const side of [-1, 1]) box(group, portalThickness, h + .11, portalDepth, side * (w / 2 + .02), b + (h + .11) / 2, front + portalDepth / 2, frameMaterial);
    box(group, w + portalThickness + .04, .2, portalDepth, 0, b + h + .07, front + portalDepth / 2, frameMaterial);
    if (style === 'portal') box(group, .35, h + .11, portalDepth, -w / 2 + .07, b + (h + .11) / 2, front + portalDepth / 2, materials.charcoal);
    if (style === 'ofiko' || style === 'ecke') {
      const finCount = style === 'ofiko' ? 5 : 3;
      for (let i = 0; i < finCount; i++) box(group, .04, h, .24, w / 2 + .10 + i * .08, b + h / 2, front, materials.cladding);
    }
    if (design.lighting) {
      box(group, w - .12, .012, .03, 0, b + h - .045, front + .29, materials.warmLight, false);
      const light = new THREE.PointLight('#ffe3af', night ? 4 : .6, w + 2, 2); light.position.set(0, b + h - .1, front + .3); group.add(light);
    }
  }
  if (!cutaway && style === 'veranda') {
    const canopy = 1.25, canopyWidth = w + .14, canopyTop = b + h - .05;
    for (const side of [-1, 1]) box(group, .12, h - .1, .12, side * (w / 2 - .03), b + (h - .1) / 2, front + canopy, materials.cladding);
    box(group, canopyWidth, .15, .13, 0, canopyTop, front + canopy, materials.cladding);
    for (let x = -w / 2 + .06; x < w / 2; x += .26) box(group, .065, .095, canopy + .16, x, canopyTop + .02, front + canopy / 2, materials.cladding);
    if (style === 'veranda') box(group, canopyWidth, .06, canopy + .15, 0, canopyTop + .095, front + canopy / 2, materials.charcoal);
  }
  if (style === 'lshape') {
    // Both rectangles fit inside the selected overall width × depth envelope.
    // The notch is .62w × .35d; its floor, wall and roof stay genuinely open.
    const wingX = -w / 2 + wingWidth / 2;
    box(group, wingWidth + .08, .13, wingDepth + .04, wingX, .065, front + wingDepth / 2, materials.concrete);
    box(group, wingWidth + .005, .075, wingDepth, wingX, .115, front + wingDepth / 2, materials.charcoal);
    box(group, wingWidth - .1, .032, wingDepth + .10, wingX, .185, front + wingDepth / 2 - .05, materials.floor);
    if (!cutaway) {
      const wing = new THREE.Group(); wing.position.set(-w / 2, b, front + wingDepth / 2); wing.rotation.y = -Math.PI / 2;
      slattedPanel(wing, wingDepth, h, 0, 0, 0, materials); group.add(wing);
      slattedPanel(group, wingWidth, .18, wingX, b + h - .18, front + wingDepth, materials);
      for (const side of [-1, 1]) slattedPanel(group, .10, h - .18, wingX + side * (wingWidth / 2 - .05), b, front + wingDepth, materials);
      glazedOpening(group, wingWidth - .20, h - .2, wingX, b, front + wingDepth + .083, materials, 1, false);
      const notch = new THREE.Group(); notch.position.set(-w / 2 + wingWidth, b, front + wingDepth / 2); notch.rotation.y = Math.PI / 2; group.add(notch);
      slattedPanel(notch, wingDepth, .18, 0, h - .18, 0, materials);
      glazedOpening(notch, wingDepth - .12, h - .2, 0, 0, .083, materials, 1, false);
      box(group, wingWidth + .13, .15, wingDepth + .13, wingX, b + h + .06, front + wingDepth / 2, materials.charcoal);
    } else {
      const wing = new THREE.Group(); wing.position.set(-w / 2, b, front + wingDepth / 2); wing.rotation.y = -Math.PI / 2;
      slattedPanel(wing, wingDepth, h, 0, 0, 0, materials); group.add(wing);
    }
  }
  if (design.decking || ['veranda', 'pergola'].includes(style)) {
    const deckDepth = style === 'pergola' ? 1.95 : style === 'veranda' ? 1.45 : 1.0, deckWidth = w + .24;
    const deckStart = front + wingDepth;
    if (isL) {
      box(group, faceWidth + .03, .10, wingDepth, faceCenter, .06, front + wingDepth / 2, materials.charcoal);
      for (let z = front + .05; z < front + wingDepth; z += .115) box(group, faceWidth + .03, .028, .106, faceCenter, .125, z, materials.furnitureWood);
    }
    box(group, deckWidth, .10, deckDepth, 0, .06, deckStart + deckDepth / 2, materials.charcoal);
    for (let z = deckStart + .05; z < deckStart + deckDepth; z += .115) box(group, deckWidth, .028, .106, 0, .125, z, materials.furnitureWood);
    box(group, Math.min(w * .45, 2.2), .045, .30, .1, .026, deckStart + deckDepth + .145, materials.furnitureWood);
  }
  if (design.lighting) {
    for (const side of [-1, 1]) {
      const lightX = faceCenter + side * (faceWidth / 2 - .20);
      box(group, .075, .16, .065, lightX, b + h * .7, front + .13, materials.charcoal);
      box(group, .053, .015, .06, lightX, b + h * .7 - .08, front + .135, materials.warmLight, false);
      const light = new THREE.PointLight('#ffe2a1', night ? 3.5 : .3, 3, 2); light.position.set(lightX, b + h * .7 - .1, front + .3); group.add(light);
    }
  }
  const interiorLight = new THREE.PointLight('#ffeac4', night ? 4.0 : .45, Math.max(w, d) * 1.2, 2); interiorLight.position.set(0, b + innerH, 0); group.add(interiorLight);
  return overall;
}

function shrub(group, x, z, size = 1, colour = '#64794f', seed = 34) {
  const rand = random(seed), geometry = new THREE.SphereGeometry(1, 12, 9), material = standard(colour, { roughness: .94 });
  const mesh = new THREE.InstancedMesh(geometry, material, 34), dummy = new THREE.Object3D();
  for (let i = 0; i < 34; i++) {
    const angle = rand() * Math.PI * 2, radius = Math.sqrt(rand()) * .48 * size, height = .15 + rand() * .55 * size;
    dummy.position.set(x + Math.cos(angle) * radius, height, z + Math.sin(angle) * radius);
    dummy.scale.set((.15 + rand() * .12) * size, (.17 + rand() * .13) * size, (.15 + rand() * .12) * size); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color().setScalar(.76 + rand() * .38));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
}
function tree(group, x, z, height = 4, seed = 45) {
  const rand = random(seed), bark = standard('#756c55', { roughness: 1 }), leaves = standard('#647758', { roughness: .92 });
  tube(group, [x, 0, z], [x + .07, height * .82, z - .07], .065, bark, .022);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399, y = height * (.3 + i * .066), reach = .56 + rand() * .38;
    tube(group, [x + .05, y, z], [x + Math.cos(a) * reach, y + .52, z + Math.sin(a) * reach], .025, bark, .006);
  }
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), leaves, 42), dummy = new THREE.Object3D();
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * .94, y = height * .62 + rand() * height * .34;
    dummy.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r); dummy.scale.set(.31 + rand() * .27, .27 + rand() * .3, .28 + rand() * .23); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color().setScalar(.77 + rand() * .39));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
}
function fence(group, length, x, z, rotation = 0) {
  const local = new THREE.Group(); local.position.set(x, 0, z); local.rotation.y = rotation; group.add(local);
  const timber = standard('#a59d85', { map: canvasTexture('wood', '#a59d85'), roughness: .9 }), posts = standard('#827d69');
  for (let y = .11; y < 1.8; y += .13) box(local, length, .119, .033, 0, y, 0, timber);
  for (let x = -length / 2; x <= length / 2 + .01; x += 1.6) box(local, .075, 1.86, .09, x, .93, -.04, posts);
  box(local, length + .08, .036, .072, 0, 1.84, 0, posts);
}

function buildGarden(design) {
  const group = new THREE.Group(), w = design.width, d = design.depth;
  const lawn = canvasTexture('grass', '#7d9369'); lawn.repeat.set(55, 55);
  const grassMaterial = standard('#ffffff', { map: lawn, roughness: 1 });
  const lawnPlane = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), grassMaterial); lawnPlane.rotation.x = -Math.PI / 2; lawnPlane.position.y = -.012; lawnPlane.receiveShadow = true; group.add(lawnPlane);
  const backZ = -d / 2 - 1.55, boundaryWidth = Math.max(13, w + 6);
  fence(group, boundaryWidth, 0, backZ); fence(group, d + 7.7, -boundaryWidth / 2, 2.2, -Math.PI / 2);
  const earth = standard('#797664', { map: canvasTexture('stone', '#797664') });
  box(group, boundaryWidth, .024, .76, 0, .002, backZ + .50, earth, false);
  const stone = standard('#c1c2b5', { map: canvasTexture('stone', '#c5c6ba'), roughness: .9 });
  for (let i = 0; i < 4; i++) {
    const stoneZ = d / 2 + (design.decking ? 1.55 : .96) + i * 1.06;
    box(group, .93, .032, .78, .45 + Math.sin(i * .6) * .09, .018, stoneZ, stone);
  }
  for (let i = 0; i < Math.round(boundaryWidth / .85); i++) {
    const x = -boundaryWidth / 2 + .4 + i * .85;
    shrub(group, x, backZ + .48, .76 + (i % 3) * .14, ['#596f4f', '#72805b', '#64774d'][i % 3], i * 97 + 27);
  }
  tree(group, -w / 2 - 1.9, backZ + .9, 4.2, 391); tree(group, w / 2 + 2.1, backZ + .45, 3.8, 68);
  for (const side of [-1, 1]) {
    box(group, .95, .017, d + .6, side * (w / 2 + .65), .002, -.05, earth, false);
    for (let i = 0; i < 3; i++) {
      const z = -d / 2 + .4 + i * d / 3;
      grassPlant(group, side * (w / 2 + .58), z, .59 + (i % 2) * .14, false);
      if (i < 2) shrub(group, side * (w / 2 + .55), z + .36, .58, '#73805c', i + (side + 1) * 101 + 65);
    }
  }
  grassPlant(group, -w / 2 - .45, d / 2 + .43, .83, true);
  grassPlant(group, w / 2 + .56, d / 2 + .24, .68, true);
  // Pale flowering stems give the planting a finer scale next to the timber.
  const flower = standard('#c6c8b2'), stalk = standard('#758564');
  for (let i = 0; i < 9; i++) {
    const x = -w / 2 - .58 + Math.sin(i * 5) * .17, z = -d * .16 + Math.cos(i * 3) * .16, h = .52 + (i % 3) * .12;
    tube(group, [x, .03, z], [x, h, z], .005, stalk); sphere(group, .04, x, h, z, flower, [1.2, .65, 1.2]);
  }
  return group;
}

function dimensionLabel(group, label, x, y, z) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(249,250,244,.95)'; context.beginPath(); context.roundRect(10, 10, 492, 108, 30); context.fill();
  context.fillStyle = '#34463b'; context.font = '600 57px Arial, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, 256, 67);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.position.set(x, y, z); sprite.scale.set(.86, .215, 1); sprite.renderOrder = 10; group.add(sprite);
}
function buildDimensions(design) {
  const group = new THREE.Group(), w = design.width, d = design.depth, extra = design.style === 'pergola' ? .45 : design.style === 'veranda' ? 1.8 : design.decking ? 1.38 : .66;
  const front = d / 2 + extra, side = w / 2 + .60, y = .10;
  const points = [
    -w / 2, y, front, w / 2, y, front,
    -w / 2, y, front - .10, -w / 2, y, front + .10,
    w / 2, y, front - .10, w / 2, y, front + .10,
    side, y, -d / 2, side, y, d / 2,
    side - .1, y, -d / 2, side + .1, y, -d / 2,
    side - .1, y, d / 2, side + .1, y, d / 2,
  ];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#3c5140', transparent: true, opacity: .8 })); group.add(lines);
  dimensionLabel(group, `${w.toFixed(1)} m`, 0, .16, front + .12);
  dimensionLabel(group, `${d.toFixed(1)} m`, side + .04, .16, 0);
  return group;
}

function frameScene(state, view = state.view) {
  if (!state?.design) return;
  const { width: w, depth: d, height: h, style, decking } = state.design;
  const direction = view === 'front' ? new THREE.Vector3(0, .105, 1).normalize() : new THREE.Vector3(view === 'interior' ? .95 : .9, view === 'interior' ? .76 : .57, 1.28).normalize();
  const target = new THREE.Vector3(0, h * .44, style === 'lshape' ? .25 : .05);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize(), up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const roofHeight = ['cabano', 'inspiro', 'veranda'].includes(style) || state.design.roof === 'pitched' ? .65 : .17;
  const extraFront = style === 'pergola' ? .6 : style === 'veranda' ? 1.75 : decking ? 1.4 : state.showDimensions ? .85 : .4;
  const tan = Math.tan(THREE.MathUtils.degToRad(state.camera.fov / 2));
  let distance = 3;
  const horizontalPad = state.showDimensions ? .7 : .28;
  for (const x of [-w / 2 - horizontalPad, w / 2 + horizontalPad]) for (const y of [0, h + roofHeight]) for (const z of [-d / 2 - .15, d / 2 + extraFront]) {
    const point = new THREE.Vector3(x, y, z).sub(target), depth = point.dot(direction);
    distance = Math.max(distance, depth + Math.abs(point.dot(right)) / (tan * state.camera.aspect * .85), depth + Math.abs(point.dot(up)) / (tan * .84));
  }
  state.controls.target.copy(target); state.camera.position.copy(target).addScaledVector(direction, distance);
  state.controls.minDistance = Math.max(2.2, Math.min(w, d) * .65); state.controls.maxDistance = Math.max(20, distance * 2.5);
  state.controls.maxPolarAngle = view === 'interior' ? Math.PI * .48 : Math.PI * .485;
  state.camera.updateProjectionMatrix(); state.controls.update();
}

function Fallback({ design }) {
  const colour = ({ cedar: '#b98054', larch: '#c3a170', composite: '#929184', anthracite: '#3d4545', white: '#e8e9e4' })[design.cladding] || '#b98054';
  return <div className="scene-fallback" style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 350, padding: 24, background: '#e9ede5', textAlign: 'center' }}>
    <div><svg viewBox="0 0 480 260" width="100%" role="img" aria-label={`Front elevation of a ${design.width} by ${design.depth} metre garden room`} style={{ maxWidth: 560 }}>
      <rect x="0" y="217" width="480" height="43" fill="#9bab86"/><path d="M61 75H419V218H61Z" fill={colour}/>
      {Array.from({ length: 34 }, (_, i) => <path key={i} d={`M${64 + i * 10.5} 77V216`} stroke="#303b33" strokeOpacity=".15"/>)}
      <rect x="55" y="67" width="370" height="17" fill="#293331"/><rect x="112" y="94" width="256" height="124" fill="#293331"/>
      <rect x="118" y="100" width="118" height="112" fill="#b6cac1"/><rect x="244" y="100" width="118" height="112" fill="#b6cac1"/>
      <path d="M133 206L198 107H215L150 206M262 206L327 107H344L279 206" fill="#edf1e5" opacity=".35"/>
      <path d="M240 145V162" stroke="#1d2725" strokeWidth="4"/><rect x="46" y="216" width="388" height="9" fill="#6d7464"/>
      <text x="240" y="250" textAnchor="middle" fill="#3d4b3e" fontSize="13" fontFamily="sans-serif">{design.width} m wide · {design.depth} m deep</text>
    </svg><p style={{ fontWeight: 600, marginBottom: 6 }}>Your garden room, taking shape</p><p style={{ fontSize: 13, maxWidth: 370, lineHeight: 1.5, color: '#637063' }}>This browser is showing a front elevation. Your dimensions, finishes and design summary are still available.</p></div>
  </div>;
}

export default function RoomScene({ design: input = DEFAULTS, view = 'perspective', night = false, showDimensions = false, onReady }) {
  const holder = useRef(null), state = useRef(null), callback = useRef(onReady), [failed, setFailed] = useState(false);
  callback.current = onReady;
  const design = { ...DEFAULTS, ...input, width: clamp(Number(input.width) || 4, 2, 12), depth: clamp(Number(input.depth) || 3, 2, 10), height: clamp(Number(input.height) || 2.5, 2.1, 4) };
  const signature = JSON.stringify(design);
  useEffect(() => {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); }
    catch { setFailed(true); callback.current?.({ capture: () => null, reset: () => {}, zoom: () => {} }); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional garden room. Drag to turn the building, scroll or pinch to zoom. Use the arrow keys to turn the view.');
    holder.current.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8ede6'); scene.fog = new THREE.Fog('#e8ede6', 23, 70);
    const camera = new THREE.PerspectiveCamera(38, 1, .05, 150), controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .085; controls.enablePan = false; controls.rotateSpeed = .65; controls.zoomSpeed = .72;
    controls.minPolarAngle = .16; controls.maxPolarAngle = Math.PI * .485;
    const hemi = new THREE.HemisphereLight('#fafbef', '#6e7a62', 2.35); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff3d8', 3.25); sun.position.set(-5.5, 9, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: .5, far: 35 });
    sun.shadow.bias = -.0002; sun.shadow.normalBias = .018; sun.shadow.radius = 3; scene.add(sun);
    const fill = new THREE.DirectionalLight('#edf3ed', .8); fill.position.set(7, 4, -4); scene.add(fill);
    const generator = new THREE.PMREMGenerator(renderer), environmentScene = new RoomEnvironment();
    const environment = generator.fromScene(environmentScene, .04); scene.environment = environment.texture; scene.environmentIntensity = .48;
    environmentScene.dispose(); generator.dispose();
    const current = { scene, camera, controls, renderer, hemi, sun, fill, room: null, garden: null, dimensions: null, design, view, night, showDimensions, width: 0, height: 0 };
    state.current = current;
    const resize = () => {
      if (!holder.current) return;
      const bounds = holder.current.getBoundingClientRect(), width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
      const changedAspect = Math.abs(camera.aspect - width / height) > .01;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); current.width = width; current.height = height;
      if (changedAspect || !current.framed) { frameScene(current); current.framed = true; }
    };
    const observer = new ResizeObserver(resize); observer.observe(holder.current); resize();
    const keyboard = event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { frameScene(current); return; }
      const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta -= .12; if (event.key === 'ArrowRight') spherical.theta += .12;
      if (event.key === 'ArrowUp') spherical.phi = clamp(spherical.phi - .1, .16, Math.PI * .48);
      if (event.key === 'ArrowDown') spherical.phi = clamp(spherical.phi + .1, .16, Math.PI * .48);
      if (event.key === '+' || event.key === '=') spherical.radius = Math.max(controls.minDistance, spherical.radius * .9);
      if (event.key === '-') spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.1);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update();
    };
    renderer.domElement.addEventListener('keydown', keyboard);
    let frame = 0, readyFrame = 0, lost = false;
    const contextLost = event => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); setFailed(true); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const draw = () => {
      if (lost) return;
      frame = requestAnimationFrame(draw); controls.update();
      try { renderer.render(scene, camera); }
      catch { lost = true; cancelAnimationFrame(frame); setFailed(true); }
    }; draw();
    const api = {
      capture: () => {
        if (lost || !current.room) return null;
        const size = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio();
        const width = 1500, height = Math.round(width / camera.aspect);
        try { renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', .93); }
        catch { return null; }
        finally { renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); renderer.render(scene, camera); }
      },
      reset: () => frameScene(current),
      zoom: factor => { const offset = camera.position.clone().sub(controls.target), length = clamp(offset.length() * factor, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset.setLength(length)); controls.update(); },
    };
    readyFrame = requestAnimationFrame(() => callback.current?.(api));
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(readyFrame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('keydown', keyboard); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      dispose(scene); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); state.current = null;
    };
  }, []);
  useEffect(() => {
    const current = state.current; if (!current) return;
    const sizeChanged = !current.room || current.design.width !== design.width || current.design.depth !== design.depth || current.design.height !== design.height || current.design.style !== design.style;
    const viewChanged = current.view !== view;
    current.design = design; current.view = view; current.night = night;
    if (current.room) { current.scene.remove(current.room); dispose(current.room); }
    current.room = buildRoom(design, view === 'interior', night); current.scene.add(current.room);
    if (!current.garden || sizeChanged || current.decking !== design.decking) {
      if (current.garden) { current.scene.remove(current.garden); dispose(current.garden); }
      current.garden = buildGarden(design); current.scene.add(current.garden); current.decking = design.decking;
    }
    rendererDescription(current);
    if (sizeChanged || viewChanged) frameScene(current);
  }, [signature, view, night]);
  useEffect(() => {
    const current = state.current; if (!current) return;
    if (current.dimensions) { current.scene.remove(current.dimensions); dispose(current.dimensions); current.dimensions = null; }
    current.showDimensions = showDimensions;
    if (showDimensions) { current.dimensions = buildDimensions(design); current.scene.add(current.dimensions); }
    frameScene(current);
  }, [showDimensions, design.width, design.depth, design.decking, design.style]);
  useEffect(() => {
    const current = state.current; if (!current) return;
    current.hemi.intensity = night ? .65 : 2.35; current.sun.intensity = night ? .6 : 3.25; current.fill.intensity = night ? .3 : .8;
    current.sun.color.set(night ? '#aac6e4' : '#fff3d8'); current.hemi.color.set(night ? '#bbcbdc' : '#fafbef');
    current.scene.background.set(night ? '#334348' : '#e8ede6'); current.scene.fog.color.copy(current.scene.background);
    current.scene.environmentIntensity = night ? .28 : .48; current.renderer.toneMappingExposure = night ? .94 : 1.08;
  }, [night]);
  return <div ref={holder} className="room-scene three-scene" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>{failed && <div style={{ position: 'absolute', inset: 0 }}><Fallback design={design}/></div>}</div>;
}

function rendererDescription(state) {
  const { design } = state;
  state.renderer.domElement.setAttribute('aria-label', `${design.width} metre wide, ${design.depth} metre deep Pecasa ${design.style} garden room with ${design.cladding} cladding and ${design.glazing} doors. Drag to rotate, scroll to zoom, or use the arrow keys. Press Home to reset the view.`);
}
