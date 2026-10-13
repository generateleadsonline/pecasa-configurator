// Small gaps in older mobile browsers that the designer would otherwise trip over. Imported
// first by configurator.js; each patch applies only where the feature is missing.

// Safari before 15.4: the PDF library calls Array/String .at() and Object.hasOwn().
for (const C of [Array, String]) {
  if (!C.prototype.at) {
    Object.defineProperty(C.prototype, 'at', {
      value(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return i < 0 || i >= this.length ? undefined : this[i]; },
      writable: true, configurable: true
    });
  }
}
if (!Object.hasOwn) Object.defineProperty(Object, 'hasOwn', {value: (o, k) => Object.prototype.hasOwnProperty.call(o, k), writable: true, configurable: true});

// Safari before 15.4 has no <dialog>: show the callback, showroom, brochure and share forms as
// fixed panels instead (styled by dialog.is-shim in configurator.css).
export function shimDialogs(root = document) {
  if (typeof window.HTMLDialogElement === 'function') return;
  for (const d of root.querySelectorAll('dialog')) {
    d.classList.add('is-shim');
    d.showModal = () => { d.setAttribute('open', ''); document.documentElement.classList.add('has-shim-dialog'); };
    d.close = () => {
      if (!d.hasAttribute('open')) return;
      d.removeAttribute('open');
      document.documentElement.classList.remove('has-shim-dialog');
      d.dispatchEvent(new Event('close'));
    };
    d.addEventListener('keydown', e => { if (e.key === 'Escape') d.close(); });
  }
}
