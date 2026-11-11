/* QuoteCraft — UI primitives: toasts, modals/sheets, confirm, menus, avatars */
'use strict';

function toast(msg, type = 'info', ms = 2800) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span class="ti">${icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'alert')}</span><span class="tm">${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 160); }, ms);
}

const _modalStack = [];
function openModal({ title, body = '', footer = '', size = '', onMount, onClose, dismissible = true }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title || 'Dialog')}">
    <div class="grabber"></div>
    ${title ? `<div class="modal-h"><h3>${esc(title)}</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">${icon('x')}</button></div>` : ''}
    <div class="modal-b">${body}</div>
    ${footer ? `<div class="modal-f">${footer}</div>` : ''}
  </div>`;
  const prevFocus = document.activeElement;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const api = {
    el: ov.querySelector('.modal'), overlay: ov,
    close(result) {
      if (!ov.isConnected) return;
      ov.remove();
      const i = _modalStack.indexOf(api); if (i >= 0) _modalStack.splice(i, 1);
      if (!_modalStack.length) document.body.style.overflow = '';
      if (onClose) onClose(result);
      if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  };
  _modalStack.push(api);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov && dismissible) api.close(); });
  ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
  if (onMount) onMount(api.el, api);
  setTimeout(() => { const f = api.el.querySelector('[autofocus], .modal-b input:not([type=hidden]):not([type=checkbox]):not([type=file]), .modal-b select, .modal-b textarea, .modal-f .btn-primary'); if (f && window.matchMedia('(min-width: 641px)').matches) f.focus(); }, 30);
  return api;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('.menu')) { closeMenu(); return; }
    const top = _modalStack[_modalStack.length - 1]; if (top) { e.preventDefault(); top.close(); }
  }
});

function confirmDialog({ title = 'Are you sure?', message = '', okText = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    let done = false;
    openModal({
      size: 'sm',
      body: `<div class="confirm"><div class="confirm-ic ${danger ? '' : 'info'}">${icon(danger ? 'trash' : 'alert')}</div><div><h3>${esc(title)}</h3><p>${esc(message)}</p></div></div>`,
      footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-ok autofocus>${esc(okText)}</button>`,
      onMount(el, api) { el.querySelector('[data-ok]').addEventListener('click', () => { done = true; api.close(); resolve(true); }); },
      onClose() { if (!done) resolve(false); }
    });
  });
}

/* Action menu: popover on desktop, bottom sheet on phones */
let _menuEl = null;
function closeMenu() { if (_menuEl) { _menuEl.remove(); _menuEl = null; document.removeEventListener('mousedown', _menuOutside, true); } }
function _menuOutside(e) { if (_menuEl && !_menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.header ? `<div class="mh">${esc(it.header)}</div>` :
    `<button role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.html || (icon(it.icon || 'chevR') + '<span>' + esc(it.label) + '</span>')}</button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = Math.min(window.innerWidth - mw - 8, Math.max(8, r.right - mw));
  let top = r.bottom + 6; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + 'px'; m.style.top = top + 'px';
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.onClick && it.onClick(); });
  _menuEl = m;
  setTimeout(() => document.addEventListener('mousedown', _menuOutside, true), 0);
  const first = m.querySelector('button'); if (first) first.focus({ preventScroll: true });
  m.addEventListener('keydown', (e) => {
    const bs = $$('button', m); const i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
  });
}
window.addEventListener('resize', closeMenu);
window.addEventListener('scroll', closeMenu, { passive: true });

/* Deterministic soft colours for avatars */
const AV_COLORS = [['#eef0ff', '#4338ca'], ['#e7f8f1', '#047857'], ['#fff3e6', '#c2410c'], ['#e6f4fd', '#0369a1'], ['#fdeef7', '#be185d'], ['#f3efff', '#6d28d9'], ['#ecfdf5', '#0f766e'], ['#fef9e7', '#a16207']];
function avColor(s) { let h = 0; String(s || '').split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return AV_COLORS[h % AV_COLORS.length]; }
function avatar(name, cls = 'ent-av', img = '', extra = '') {
  const [bg, fg] = avColor(name);
  return `<div class="${cls}" style="background:${bg};color:${fg};${extra}">${img ? `<img src="${img}" alt="">` : esc(initials(name))}</div>`;
}
function statusPill(st, asButton = false, attrs = '') {
  const s = STATUS[st] || STATUS.draft;
  return asButton ? `<button class="pill ${s.cls}" ${attrs} title="Change status">${s.label}</button>` : `<span class="pill ${s.cls}">${s.label}</span>`;
}
function emptyState(ic, title, text, actionHtml = '') {
  return `<div class="empty"><div class="em-art">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}</div>`;
}
function field(label, inner, { req = false, err = '', hint = '', cls = '' } = {}) {
  return `<label class="field ${cls}"><span>${esc(label)}${req ? ' <em>*</em>' : ''}</span>${inner}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}${err ? `<small class="err">${esc(err)}</small>` : ''}</label>`;
}
function setInvalid(input, bad) { const f = input.closest('.field'); if (f) f.classList.toggle('invalid', !!bad); return !bad; }

/* Scale A4 documents to fit their stage */
function fitDocs(root = document) {
  $$('.doc-stage', root).forEach((st) => {
    const sc = st.querySelector('.doc-scaler'); const d = sc && sc.firstElementChild; if (!d) return;
    const docW = d.offsetWidth || 794;
    const zoom = st.classList.contains('zoomed');
    const s = zoom ? 1 : Math.min(1, st.clientWidth / docW);
    sc.style.transform = `scale(${s})`;
    st.style.height = Math.ceil(d.offsetHeight * s) + 'px';
  });
}
window.addEventListener('resize', debounce(() => fitDocs(), 80));
