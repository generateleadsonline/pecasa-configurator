// Dev harness: renders the 3D preview alone from a share link's query, for headless checks.
// Build: npx esbuild tools/qa/harness.js --bundle --format=esm --outfile=<dir>/harness.js
import {createScene} from '../../src/configurator-scene.js';
import {fromURL, normalise} from '../../src/configurator-model.js';
const q = new URLSearchParams(location.search);
const state = fromURL(location.href) || normalise({});
const el = document.getElementById('scene');
const scene = createScene(el, {onError: e => console.error('scene error', e)});
window.__scene = scene; window.__state = state;
scene.update(state);
if (q.get('night') === '1') scene.setNight(true);
if (q.get('view')) scene.setView(q.get('view'), {animate: false});
if (q.get('dims') === '1') scene.setDimensions(true);
window.__t0 = performance.now(); setTimeout(() => { window.__ready = true; window.__readyAt = performance.now(); }, 300);
