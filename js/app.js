/* QuoteCraft — shell + router */
'use strict';

const BRAND_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>';
const NAV = [
  { href: '#/dashboard', key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { href: '#/quotes', key: 'quotes', label: 'Quotations', icon: 'file' },
  { href: '#/customers', key: 'customers', label: 'Customers', icon: 'users' },
  { href: '#/products', key: 'products', label: 'Products & services', icon: 'box' },
  { href: '#/settings', key: 'settings', label: 'Company & settings', icon: 'settings' }
];

function renderShell() {
  const c = Store.company, d = Store.data;
  const counts = { quotes: d.quotes.length, customers: d.customers.length, products: d.products.length };
  $('#sidebar').innerHTML = `
    <div class="side-top">
      <a class="brand" href="#/dashboard"><span class="brand-mark">${BRAND_SVG}</span><span class="brand-name">QuoteCraft</span></a>
      <button class="btn btn-ghost btn-icon btn-sm side-close" data-drawer-close aria-label="Close menu">${icon('x')}</button>
    </div>
    <div class="side-cta"><a class="btn btn-primary" href="#/quote/new">${icon('plus')} Raise Quotation</a></div>
    <nav class="nav" aria-label="Main">
      <div class="nav-label">Workspace</div>
      ${NAV.slice(0, 2).map(navLink(counts)).join('')}
      <div class="nav-label">Masters</div>
      ${NAV.slice(2, 4).map(navLink(counts)).join('')}
      <div class="nav-label">Setup</div>
      ${NAV.slice(4).map(navLink(counts)).join('')}
    </nav>
    <a class="side-foot" href="#/settings"><div class="av" style="background:${c.brand}">${c.logo ? `<img src="${c.logo}" alt="">` : esc(initials(c.name))}</div><div style="min-width:0"><b>${esc(c.name)}</b><small>${esc(c.city || '')}${c.state ? ', ' + esc(stateName(c.state)) : ''}</small></div></a>`;
  $('#topbar').innerHTML = `
    <button class="btn btn-ghost btn-icon hamburger" id="menuBtn" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <a class="mobile-brand" href="#/dashboard"><span class="brand-mark">${BRAND_SVG}</span>QuoteCraft</a>
    <div class="crumb" id="crumb"></div>
    <span class="spacer"></span>
    <a class="btn btn-ghost btn-icon desk-only" href="#/settings" aria-label="Company & settings" title="Company & settings">${icon('settings')}</a>
    <a class="btn btn-primary btn-sm desk-only" href="#/quote/new">${icon('plus')} Raise Quotation</a>
    <a class="btn btn-primary btn-icon btn-sm mob-only" href="#/quote/new" aria-label="Raise Quotation">${icon('plus')}</a>`;
  $('#menuBtn').addEventListener('click', () => setDrawer(true));
  markActive();
}
function navLink(counts) { return (n) => `<a href="${n.href}" data-k="${n.key}">${icon(n.icon)}<span>${n.label}</span>${counts[n.key] != null ? `<span class="count">${counts[n.key]}</span>` : ''}</a>`; }

function setDrawer(open) {
  document.body.classList.toggle('drawer-open', !!open);
  const s = $('#scrim'); if (s) s.hidden = !open;
  const b = $('#menuBtn'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
}
$('#scrim').addEventListener('click', () => setDrawer(false));
$('#sidebar').addEventListener('click', (e) => { if (e.target.closest('[data-drawer-close], a')) setDrawer(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) setDrawer(false); });

let CURRENT = 'dashboard';
function markActive() {
  $$('#sidebar .nav a').forEach((a) => a.classList.toggle('active', a.dataset.k === CURRENT));
}

function route() {
  closeMenu();
  setDrawer(false);
  while (_modalStack.length) _modalStack[_modalStack.length - 1].close();
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/');
  const el = $('#view');
  el.onclick = null; el.oninput = null; el.onchange = null;
  const fresh = el.cloneNode(false); el.replaceWith(fresh); // drop old listeners
  const v = $('#view');
  let crumb = '';
  try {
    if (parts[0] === 'quotes') { CURRENT = 'quotes'; crumb = 'Quotations'; viewQuotes(v, params); }
    else if (parts[0] === 'quote' && parts[1] === 'new') { CURRENT = 'quotes'; crumb = 'Quotations / Raise Quotation'; viewEditor(v, null, params); }
    else if (parts[0] === 'quote' && parts[1] === 'edit') { CURRENT = 'quotes'; crumb = 'Quotations / Edit'; viewEditor(v, parts[2], params); }
    else if (parts[0] === 'quote' && parts[1] === 'view') { CURRENT = 'quotes'; crumb = 'Quotations / View'; viewQuote(v, parts[2]); }
    else if (parts[0] === 'customers') { CURRENT = 'customers'; crumb = 'Masters / Customers'; viewCustomers(v); }
    else if (parts[0] === 'products') { CURRENT = 'products'; crumb = 'Masters / Products & services'; viewProducts(v); }
    else if (parts[0] === 'settings') { CURRENT = 'settings'; crumb = 'Setup / Company & settings'; viewSettings(v); }
    else { CURRENT = 'dashboard'; crumb = 'Dashboard'; viewDashboard(v); }
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="card">${emptyState('alert', 'Something went wrong', String(e.message || e), '<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>')}</div>`;
  }
  const cr = $('#crumb'); if (cr) cr.innerHTML = crumb.split(' / ').map((s, i, a) => i === a.length - 1 ? `<b>${esc(s)}</b>` : `<span>${esc(s)}</span>${icon('chevR')}`).join('');
  // refresh sidebar counts
  $$('#sidebar .nav a').forEach((a) => { const k = a.dataset.k; const n = { quotes: Store.data.quotes.length, customers: Store.data.customers.length, products: Store.data.products.length }[k]; const s = a.querySelector('.count'); if (s && n != null) s.textContent = n; });
  markActive();
  document.body.classList.toggle('focus-mode', parts[0] === 'quote');
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', (e) => { if (ED && ED.dirty && location.hash.indexOf('#/quote/') === 0 && /new|edit/.test(location.hash)) { e.preventDefault(); e.returnValue = ''; } });

Store.load();
renderShell();
route();
