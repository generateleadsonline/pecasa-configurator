// First-visit walkthrough: a welcome card, then a spotlight on each part of the designer.
// Shown once per browser (localStorage), replayed from the Help button. Keyboard: Enter/Right
// for next, Left for back, Escape to close; focus stays on the card while it is open.
const KEY = 'pecasa-cfg-tour-v1';

const STEPS = [
  {target: null, title: 'Design your SMART room in 3D', text: 'Pick a range, size, finishes, doors, windows and interior. Every choice updates the 3D model, and you can see your building price at the end. It takes about five minutes.', next: 'Show me how'},
  {target: '#stage', title: 'Look all around it', text: 'Drag to turn your room, scroll or pinch to zoom, or use the + and - buttons. Tap a door or window to edit it.'},
  {target: '.view-switch', title: 'Outside, inside and plan', text: 'Walk inside to see the finished room, or switch to the plan to check sizes and layout from above.'},
  {target: '#steps', title: 'Six simple steps', text: 'Range, size and roof, exterior, doors and windows, interior, then your price. Jump between them whenever you like.'},
  {target: '#panel-body', title: 'We show you every change', text: 'When you change an option the view turns to it and outlines it in green, so you always see what changed.'},
  {target: '#next', title: 'Get your price and PDF', text: 'When you are happy, enter your details to see the published price for your room and download an illustrated PDF of your design.'},
  {target: '.header-ctas, .menu-toggle', title: 'Prefer to talk?', text: 'Request a callback, arrange to see a SMART room, or download the brochure at any time.', next: 'Start designing'}
];

export function createTour({onEvent = () => {}} = {}) {
  const $ = s => document.querySelector(s);
  const root = $('#tour'), shade = $('#tour-shade'), card = $('#tour-card');
  let index = 0, opener = null;
  const visible = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';

  function place() {
    const step = STEPS[index];
    const target = step.target ? step.target.split(',').map(s => $(s.trim())).find(visible) : null;
    $('#tour-count').textContent = index === 0 ? 'Welcome' : `${index} of ${STEPS.length - 1}`;
    $('#tour-title').textContent = step.title;
    $('#tour-text').textContent = step.text;
    $('#tour-next').firstElementChild.textContent = step.next || (index === STEPS.length - 1 ? 'Done' : 'Next');
    $('#tour-skip').textContent = index === 0 ? 'Not now' : 'Skip tour';
    const vw = innerWidth, vh = innerHeight, cw = Math.min(360, vw - 32);
    if (!target) {
      shade.classList.add('is-full'); shade.removeAttribute('style');
      card.style.left = `${(vw - cw) / 2}px`; card.style.top = `${Math.max(16, vh / 2 - 130)}px`;
      return;
    }
    shade.classList.remove('is-full');
    const r = target.getBoundingClientRect(), pad = 6;
    Object.assign(shade.style, {left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px`});
    // Card beside the spotlight where there is room, otherwise below or above it.
    const ch = card.offsetHeight || 200;
    let left, top;
    if (r.right + cw + 24 < vw && r.width < vw * .55) { left = r.right + 16; top = Math.min(vh - ch - 16, Math.max(16, r.top)); }
    else if (r.left - cw - 24 > 0 && r.width < vw * .55) { left = r.left - cw - 16; top = Math.min(vh - ch - 16, Math.max(16, r.top)); }
    else if (r.bottom + ch + 24 < vh) { left = Math.min(vw - cw - 16, Math.max(16, r.left + r.width / 2 - cw / 2)); top = r.bottom + 16; }
    else if (r.top - ch - 24 > 0) { left = Math.min(vw - cw - 16, Math.max(16, r.left + r.width / 2 - cw / 2)); top = r.top - ch - 16; }
    else { left = (vw - cw) / 2; top = Math.max(16, vh - ch - 16); }
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  }
  function show(i) {
    index = i;
    place();
    requestAnimationFrame(place);
    $('#tour-title').focus({preventScroll: true});
  }
  function close(completed) {
    root.hidden = true;
    try { localStorage.setItem(KEY, completed ? 'done' : 'skipped'); } catch {}
    onEvent(completed ? 'configurator_tour_complete' : 'configurator_tour_skip', {step: index});
    (opener && opener.isConnected ? opener : $('#panel-title'))?.focus({preventScroll: true});
    removeEventListener('resize', place);
    document.removeEventListener('keydown', keys, true);
  }
  function keys(e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); show(index - 1); }
    else if (e.key === 'Tab') {
      const items = [...card.querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  }
  function next() { if (index >= STEPS.length - 1) close(true); else show(index + 1); }
  $('#tour-next').addEventListener('click', next);
  $('#tour-skip').addEventListener('click', () => close(false));
  return {
    start(from = document.activeElement) {
      opener = from; root.hidden = false;
      addEventListener('resize', place);
      document.addEventListener('keydown', keys, true);
      onEvent('configurator_tour_start', {});
      show(0);
    },
    seen() { try { return Boolean(localStorage.getItem(KEY)); } catch { return true; } }
  };
}
