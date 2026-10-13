// Z-fighting detector for the 3D room: finds pairs of visible triangles from different meshes
// that face the same way in the same plane and overlap, which flicker or blotch on real GPUs.
// Evaluate in the dev harness (window.__scene) or the page with ?qa=1 (window.__cfg.scene).
(() => {
  const scene = (window.__cfg && window.__cfg.scene) || window.__scene;
  const {room} = scene._debug();
  room.group.updateMatrixWorld(true);
  const tris = [];
  const v = [0, 1, 2].map(() => ({x: 0, y: 0, z: 0}));
  room.group.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(m => m.transparent)) return;
    const g = o.geometry, pos = g.attributes.position, idx = g.index;
    const e = o.matrixWorld.elements;
    const world = i => { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; };
    const count = idx ? idx.count : pos.count;
    const groups = g.groups.length ? g.groups : [{start: 0, count, materialIndex: 0}];
    for (const grp of groups) {
      const mat = mats[grp.materialIndex] || mats[0];
      if (!mat || mat.transparent || !mat.visible || mat.name === 'hidden') continue;
      for (let k = grp.start; k < grp.start + grp.count; k += 3) {
        const a = world(idx ? idx.getX(k) : k), b = world(idx ? idx.getX(k + 1) : k + 1), c = world(idx ? idx.getX(k + 2) : k + 2);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-7) continue;
        nx /= len; ny /= len; nz /= len;
        tris.push({mesh: o, mat, a, b, c, n: [nx, ny, nz], d: nx * a[0] + ny * a[1] + nz * a[2], area: len / 2});
      }
    }
  });
  // Bucket by plane: normal to 0.01, offset to 2mm.
  const key = t => t.n.map(x => Math.round(x * 100)).join(',') + '|' + Math.round(t.d * 500);
  const buckets = new Map();
  for (const t of tris) { const k = key(t); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(t); }
  // 2D overlap test in the plane (separating axis on both triangles' edges).
  const project = (t, ax, ay) => [t.a, t.b, t.c].map(p => [p[0] * ax[0] + p[1] * ax[1] + p[2] * ax[2], p[0] * ay[0] + p[1] * ay[1] + p[2] * ay[2]]);
  const overlap = (P, Q) => {
    for (const S of [P, Q]) for (let i = 0; i < 3; i++) {
      const [x1, y1] = S[i], [x2, y2] = S[(i + 1) % 3];
      const nx = y1 - y2, ny = x2 - x1;
      const pr = T => T.map(([x, y]) => x * nx + y * ny);
      const p = pr(P), q = pr(Q);
      if (Math.max(...p) <= Math.min(...q) + 1e-6 || Math.max(...q) <= Math.min(...p) + 1e-6) return false;
    }
    return true;
  };
  // Visibility: a pair matters only if nothing covers it within 5cm along its normal (all
  // faces treated as double-sided for this), and it is not an underside at ground level.
  const THREE = scene._debug().THREE;
  const allMats = new Set();
  room.group.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => allMats.add(m)); });
  const sides = new Map([...allMats].map(m => [m, m.side]));
  allMats.forEach(m => { m.side = THREE.DoubleSide; });
  const ray = new THREE.Raycaster();
  // Solid boxes (walls, plinths, the floor slab): a point inside one cannot be seen.
  const solids = [];
  room.group.traverse(o => { if (o.isMesh && o.visible && (o.geometry.type === 'BoxGeometry' || o.geometry.type === 'ExtrudeGeometry' || o.userData.solid)) { o.geometry.computeBoundingBox(); solids.push({o, box: o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)}); } });
  // Inside a closed solid: an odd number of crossings along a ray (faces counted both ways).
  const probe = new THREE.Raycaster();
  const inside = (q, o) => {
    let odd = 0;
    for (const dir of [[1, .013, .007], [.011, 1, .017], [.019, .003, 1]]) {
      probe.set(q, new THREE.Vector3(...dir).normalize()); probe.far = 50;
      odd += probe.intersectObject(o, false).length % 2;
    }
    return odd >= 2;
  };
  const covered = (t, others) => {
    const p = new THREE.Vector3((t.a[0] + t.b[0] + t.c[0]) / 3, (t.a[1] + t.b[1] + t.c[1]) / 3, (t.a[2] + t.b[2] + t.c[2]) / 3);
    const n = new THREE.Vector3(...t.n);
    if (n.y < -.7 && p.y < .25) return true;
    const q = p.clone().addScaledVector(n, .0015);
    if (solids.some(s => !others.includes(s.o) && s.box.containsPoint(q) && (s.o.geometry.type === 'BoxGeometry' ? s.box.clone().expandByScalar(-.0005).containsPoint(q) : inside(q, s.o)))) return true;
    ray.set(q, n); ray.far = .05;
    return ray.intersectObject(room.group, true).some(h => h.object.visible && !others.includes(h.object) && !(Array.isArray(h.object.material) ? h.object.material : [h.object.material]).every(m => m.transparent));
  };
  const found = new Map();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const n = list[0].n;
    const ax = Math.abs(n[1]) < .9 ? [n[2], 0, -n[0]] : [1, 0, 0];
    const al = Math.hypot(...ax); ax[0] /= al; ax[1] /= al; ax[2] /= al;
    const ay = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
    const proj = list.map(t => project(t, ax, ay));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j];
      if (A.mesh === B.mesh) continue;
      if (!overlap(proj[i], proj[j])) continue;
      // Judge visibility at the smaller triangle, which lies inside the overlap more often.
      if (covered(A.area < B.area ? A : B, [A.mesh, B.mesh])) continue;
      const tagA = (A.mesh.userData.tags || []).join(','), tagB = (B.mesh.userData.tags || []).join(',');
      // Same untextured colour cannot be seen to flicker; a textured surface can (UVs differ).
      const same = !A.mat.map && !B.mat.map && A.mat.color && B.mat.color && A.mat.color.equals(B.mat.color);
      const k = [tagA, tagB].sort().join(' x ') + (same ? ' (same colour)' : '');
      const f = found.get(k) || {pair: k, count: 0, at: A.a.map(x => +x.toFixed(2)), normal: n.map(x => +x.toFixed(2)), visible: !same};
      f.count++; found.set(k, f);
    }
  }
  sides.forEach((side, m) => { m.side = side; });
  return [...found.values()].sort((a, b) => b.visible - a.visible || b.count - a.count);
})()
