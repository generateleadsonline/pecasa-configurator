// The last-resort 3D: the same scene drawn as flat-shaded SVG, for browsers with no usable WebGL
// (switched off, Lockdown Mode, or blocked by Safari after a GPU crash). The shopper still turns,
// zooms and walks into their room; it just has no textures or shadows.
//
// Three's SVGRenderer cannot be used as is: it writes `style` attributes, which this site's CSP
// (no 'unsafe-inline') refuses, and it draws triangles that cross behind the camera inside out.
// This one writes fill attributes, clips at the near plane and paints back to front, with ground
// surfaces always first so a large lawn triangle never covers the building.
import {Color, Matrix4, Vector3, Vector4} from 'three';

const NS = 'http://www.w3.org/2000/svg';
// Parts closer than this to the eye (a door frame at the doorway) would fill the view.
const NEAR = .12;

export class FlatSVGRenderer {
  constructor() {
    this.domElement = document.createElementNS(NS, 'svg');
    this.domElement.setAttribute('class', 'scene-svg');
    this.domElement.setAttribute('preserveAspectRatio', 'none');
    this.info = {faces: 0, paths: 0, ms: 0};
    // The WebGL renderer's knobs, so the scene can set them without asking which renderer it has.
    this.shadowMap = {enabled: false, type: 0};
    this.capabilities = {getMaxAnisotropy: () => 1, isWebGL2: false};
    this.extensions = {has: () => false};
    this.toneMappingExposure = 1;
    this._pool = [];
    this._w = 1; this._h = 1;
  }
  setPixelRatio() {}
  getPixelRatio() { return 1; }
  setSize(w, h) {
    this._w = Math.max(1, w); this._h = Math.max(1, h);
    this.domElement.setAttribute('viewBox', `${-this._w / 2} ${-this._h / 2} ${this._w} ${this._h}`);
  }
  getSize(v) { return v.set(this._w, this._h); }
  getContext() { return {isContextLost: () => false}; }
  dispose() { this._pool.length = 0; this.domElement.replaceChildren(); }
  forceContextLoss() {}

  render(scene, camera) {
    const t0 = performance.now();
    scene.updateMatrixWorld();
    if (!camera.parent) camera.updateMatrixWorld();
    const bg = scene.background;
    if (bg && bg.isColor) this.domElement.style.backgroundColor = bg.getStyle();
    const viewProj = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const eye = new Vector3().setFromMatrixPosition(camera.matrixWorld);
    const hw = this._w / 2, hh = this._h / 2;

    // Lights: ambient and hemisphere add evenly; directional lights by Lambert's cosine.
    const ambient = new Color(0, 0, 0), dirs = [];
    scene.traverseVisible(o => {
      if (!o.isLight) return;
      if (o.isAmbientLight) ambient.add(o.color.clone().multiplyScalar(o.intensity));
      else if (o.isHemisphereLight) ambient.add(o.color.clone().lerp(o.groundColor, .5).multiplyScalar(o.intensity * .5));
      else if (o.isDirectionalLight) {
        const dir = new Vector3().setFromMatrixPosition(o.matrixWorld).sub(new Vector3().setFromMatrixPosition(o.target.matrixWorld)).normalize();
        dirs.push({dir, colour: o.color.clone().multiplyScalar(o.intensity)});
      }
    });

    const faces = [];
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), ab = new Vector3(), ac = new Vector3();
    const ca = new Vector4(), cb = new Vector4(), cc = new Vector4(), lit = new Color(), add = new Color();
    scene.traverseVisible(o => {
      if (!o.isMesh || !o.geometry?.attributes.position) return;
      const materials = [].concat(o.material);
      const pos = o.geometry.attributes.position, index = o.geometry.index;
      const groups = o.geometry.groups.length ? o.geometry.groups : [{start: 0, count: index ? index.count : pos.count, materialIndex: 0}];
      const ground = Boolean(o.userData.ground);
      for (const g of groups) {
        const m = materials[g.materialIndex] || materials[0];
        // 'hidden' faces live inside the walls: a depth buffer buries them, painting would not.
        if (!m || !m.visible || m.colorWrite === false || m.opacity < .03 || m.name === 'hidden') continue;
        const both = m.side !== 0, back = m.side === 1;
        const end = Math.min(g.start + g.count, index ? index.count : pos.count);
        for (let i = g.start; i + 2 < end; i += 3) {
          const i1 = index ? index.getX(i) : i, i2 = index ? index.getX(i + 1) : i + 1, i3 = index ? index.getX(i + 2) : i + 2;
          a.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
          b.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
          c.fromBufferAttribute(pos, i3).applyMatrix4(o.matrixWorld);
          n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
          if (n.lengthSq() < 1e-12) continue;
          n.normalize();
          // Cull faces turned away from the eye, unless the material shows both sides.
          let facing = n.dot(ab.subVectors(eye, a));
          if (back) { n.negate(); facing = -facing; }
          if (facing <= 0) { if (!both) continue; n.negate(); }
          ca.set(a.x, a.y, a.z, 1).applyMatrix4(viewProj);
          cb.set(b.x, b.y, b.z, 1).applyMatrix4(viewProj);
          cc.set(c.x, c.y, c.z, 1).applyMatrix4(viewProj);
          const poly = clipNear([ca.clone(), cb.clone(), cc.clone()]);
          if (poly.length < 3) continue;
          let d = '', minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, depth = 0;
          for (let k = 0; k < poly.length; k++) {
            const p = poly[k], x = p.x / p.w * hw, y = -p.y / p.w * hh;
            d += (k ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            depth += p.w;
          }
          if (maxX < -hw || minX > hw || maxY < -hh || minY > hh) continue;
          // Specks under half a pixel cost a DOM node each and show nothing.
          if ((maxX - minX) * (maxY - minY) < .5) continue;
          lit.copy(ambient);
          // Light in 1/12 steps: faces of one plane, or a gentle curve, share a fill and so a path.
          for (const l of dirs) { const k = Math.round(n.dot(l.dir) * 12) / 12; if (k > 0) lit.add(add.copy(l.colour).multiplyScalar(k)); }
          lit.multiply(m.color);
          if (m.emissive) lit.add(m.emissive.clone().multiplyScalar(m.emissiveIntensity ?? 1));
          const opacity = m.transparent ? m.opacity : 1;
          // Centre depth: nearest-point sorting let the floor slab paint over the front wall.
          faces.push({depth: depth / poly.length, ground, d: d + 'z', fill: '#' + lit.getHexString(), opacity});
        }
      }
    });
    // Painter's order: ground first, then everything else from far to near.
    faces.sort((p, q) => (q.ground - p.ground) || (q.depth - p.depth));

    let used = 0, fill = '', opacity = 1, d = '';
    const flush = () => {
      if (!d) return;
      let el = this._pool[used];
      if (!el) { el = this._pool[used] = document.createElementNS(NS, 'path'); el.setAttribute('stroke-linejoin', 'round'); }
      el.setAttribute('d', d);
      el.setAttribute('fill', fill);
      // A hairline in the same colour closes the seams between neighbouring triangles; glass
      // would darken where strokes overlap, so it goes without.
      if (opacity < 1) { el.setAttribute('fill-opacity', opacity.toFixed(2)); el.setAttribute('stroke', 'none'); }
      else { el.removeAttribute('fill-opacity'); el.setAttribute('stroke', fill); el.setAttribute('stroke-width', '.7'); }
      if (el.parentNode !== this.domElement || this.domElement.childNodes[used] !== el) this.domElement.appendChild(el);
      used++; d = '';
    };
    for (const f of faces) {
      if (f.fill !== fill || f.opacity !== opacity) { flush(); fill = f.fill; opacity = f.opacity; }
      d += f.d;
    }
    flush();
    while (this.domElement.childNodes.length > used) this.domElement.lastChild.remove();
    this.info = {faces: faces.length, paths: used, ms: Math.round(performance.now() - t0)};
  }
}

// Sutherland-Hodgman against the near plane (w > NEAR) in clip space.
function clipNear(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    const pin = p.w > NEAR, qin = q.w > NEAR;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (NEAR - p.w) / (q.w - p.w);
      out.push(new Vector4().lerpVectors(p, q, t));
    }
  }
  return out;
}
