// Starts the 3D preview and keeps it running. It picks the best rung the device can afford,
// moves down a rung when one fails, rebuilds in a fresh context when one is lost, remembers a rung
// that took the tab down, and logs every step for ?debug3d. The rungs, best first:
//   high, medium  the full scene (desktops; phones and tablets)
//   low           no outline pass, cheaper shadows, pixel ratio up to 1.25
//   safe          Lambert shading, no shadows or reflections: GPUs whose full shaders fail
//   svg           the same scene drawn flat as SVG, no WebGL at all
// Below svg the page shows its photo. Only a scene that cannot download or build ends there.

export const RUNGS = ['high', 'medium', 'low', 'safe', 'svg'];
const BOOT = 'pecasa-3d-boot', CEILING = 'pecasa-3d-ceiling', DAY = 864e5;
const below = rung => RUNGS[Math.min(RUNGS.indexOf(rung) + 1, RUNGS.length - 1)];
const lower = (a, b) => (RUNGS.indexOf(a) >= RUNGS.indexOf(b) ? a : b);

/** 2 for WebGL2, 1 for WebGL1 only, 0 for none. The probe's contexts are dropped at once. */
export function webglLevel() {
  for (const [type, level] of [['webgl2', 2], ['webgl', 1], ['experimental-webgl', 1]]) {
    try {
      const gl = document.createElement('canvas').getContext(type);
      if (gl) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return level; }
    } catch {}
  }
  return 0;
}

/**
 * `load(level)` imports the scene module for WebGL `level` (1 or 2). `design()` returns the design
 * to draw. `preferred` is the device's rung ('high' or 'medium'); `override` forces one (QA).
 * `onChange(phase, detail)` drives the page: 'loading', 'ready' (detail: the scene), 'verified',
 * 'down' (rebuilding), 'failed' (detail: {reason, error}).
 */
export function createBoot({container, load, design, sceneOptions = {}, preferred = 'medium', override = null, session, local, track = () => {}, onChange = () => {}}) {
  const gl = webglLevel();
  const store = (s, key, value) => { try { if (value === undefined) s?.removeItem(key); else s?.setItem(key, JSON.stringify(value)); } catch {} };
  const read = (s, key) => { try { return JSON.parse(s?.getItem(key) || 'null'); } catch { return null; } };
  const log = [];
  let scene = null, rung = null, verified = false, armed = false, disposed = false, contextRetries = 0, attempt = 0;
  const losses = [], lostAt = {};
  const note = (event, detail) => {
    log.push({t: Math.round(performance.now()), rung, event, ...(detail === undefined ? {} : {detail})});
    if (log.length > 40) log.shift();
  };

  // Crash guard. The record is written only while a rung is being built in a visible tab and is
  // cleared by the first good frame, or by leaving the page (a crash never fires pagehide). A
  // record found at start-up means the tab died mid-build, so that rung is off limits here for a
  // day. The old guard counted every unfinished load, so two quick reloads meant the flat view.
  const arm = () => { armed = true; store(session, BOOT, {rung, at: Date.now()}); };
  const disarm = () => { if (armed) { armed = false; store(session, BOOT); } };
  const leave = () => { if (!verified) disarm(); };
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); else if (scene && !verified && !armed) arm(); });

  let start = override || (gl === 0 ? 'svg' : gl === 1 ? lower(preferred, 'low') : preferred);
  const crashed = read(session, BOOT);
  store(session, BOOT);
  if (crashed?.rung && Date.now() - crashed.at < 10 * 60e3) {
    note('crash-guard', `the tab died building ${crashed.rung}`);
    track('configurator_3d_crash_guard', {rung: crashed.rung});
    store(local, CEILING, {rung: below(crashed.rung), until: Date.now() + DAY});
  }
  const ceiling = read(local, CEILING);
  if (!override && ceiling?.until > Date.now() && RUNGS.includes(ceiling.rung)) {
    if (RUNGS.indexOf(ceiling.rung) > RUNGS.indexOf(start)) note('ceiling', ceiling.rung);
    start = lower(start, ceiling.rung);
  }

  // Modules load once per WebGL level; one retry covers a dropped connection.
  const modules = {};
  const moduleFor = level => (modules[level] ||= load(level).catch(() => new Promise(r => setTimeout(r, 1500)).then(() => load(level))));

  function teardown() {
    const old = scene; scene = null; verified = false;
    disarm();
    try { old?.dispose(); } catch {}
  }

  function go(next, why) {
    if (disposed) return;
    if (why) note('step', `${rung} -> ${next}: ${why}`);
    rung = next; verified = false;
    // Only the latest request builds: a loss during a retry must not start two scenes.
    const mine = ++attempt;
    onChange('loading', {rung});
    whenVisible(async () => {
      if (disposed || mine !== attempt) return;
      let mod;
      try { mod = await moduleFor(next === 'svg' || gl !== 1 ? 2 : 1); } catch (err) {
        note('load-failed', String(err));
        return onChange('failed', {reason: 'load', error: err});
      }
      if (disposed || mine !== attempt) return;
      arm();
      let stage = 'context';
      try {
        scene = mod.createScene(container, {...sceneOptions, tier: next, onLost: lost, onBroken: broken, onVerified: good});
        stage = 'build';
        scene.update(design());
      } catch (err) {
        stage = err.stage || stage;
        teardown();
        note(`${stage}-failed`, String(err).slice(0, 200));
        return failed(stage, err);
      }
      note('ready');
      onChange('ready', scene);
    });
  }

  function failed(stage, err) {
    track('configurator_3d_attempt_failed', {rung, stage, error: String(err).slice(0, 120)});
    // A design that cannot be built fails at every rung: the photo, with a reload button.
    if (stage === 'build') return onChange('failed', {reason: 'build', error: err});
    // No context: once more (a GPU process restarting, a context cap), then without WebGL.
    if (stage === 'context' && rung !== 'svg') {
      if (contextRetries++ < 1) return setTimeout(() => go(rung, 'context failed, retrying'), 600);
      return go('svg', 'no WebGL context');
    }
    // Setup threw after the context existed (the scene cleaned it up): one rung down.
    if (rung !== 'svg') return go(below(rung), `${stage} failed`);
    onChange('failed', {reason: stage, error: err});
  }

  function good() {
    verified = true;
    disarm();
    const d = scene?.diagnostics?.() || {};
    note('verified', `${d.gpu || ''} ratio ${d.ratio ?? '-'}`.trim());
    track('configurator_3d_ready', {rung, webgl: gl, gpu: d.gpu, steps: log.filter(e => e.event === 'step').length});
    onChange('verified', scene);
  }

  // Drew nothing, or a shader would not link: shading that simple GPUs can run, then SVG.
  function broken(reason) {
    note('broken', reason);
    track('configurator_3d_broken', {rung, reason});
    teardown();
    onChange('down');
    go(RUNGS.indexOf(rung) < RUNGS.indexOf('safe') ? 'safe' : below(rung), reason);
  }

  // A lost context. In the background (a locked phone) it is the system's doing: rebuild the same
  // rung when the tab is back. In front of the shopper it is ours: one rung down, and a rung lost
  // twice on this device stays off limits for a day, before the browser starts blocking WebGL
  // for the site.
  function lost() {
    const hidden = document.hidden, now = performance.now();
    note('lost', hidden ? 'in the background' : 'in view');
    track('configurator_3d_context_lost', {rung, hidden});
    teardown();
    onChange('down');
    losses.push(now);
    while (losses.length && now - losses[0] > 60e3) losses.shift();
    if (losses.length > 4) return go('svg', 'lost five times in a minute');
    if (hidden) return go(rung);
    lostAt[rung] = (lostAt[rung] || 0) + 1;
    if (lostAt[rung] > 1) store(local, CEILING, {rung: below(rung), until: Date.now() + DAY});
    go(below(rung), 'context lost in view');
  }

  return {
    get scene() { return scene; },
    get rung() { return rung; },
    get gl() { return gl; },
    start() { go(start); },
    /** Everything ?debug3d shows: the WebGL level, the steps taken and the live scene's report. */
    diagnostics: () => ({gl, rung, verified, log: log.slice(), scene: scene?.diagnostics?.() || null}),
    dispose() { disposed = true; teardown(); window.removeEventListener('pagehide', leave); }
  };
}

// A hidden tab cannot get a GPU context back and draws no frames, so work waits for it to show.
function whenVisible(run) {
  if (!document.hidden) return run();
  const go = () => { if (document.hidden) return; document.removeEventListener('visibilitychange', go); run(); };
  document.addEventListener('visibilitychange', go);
}
