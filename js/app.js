/* QuoteCraft — shell (sidebar, top bar, phone bottom navigation, global search, attention bell) + router */
'use strict';

// Product logo: the mark (assets/brand/logo-mark.png) plus a two-tone text wordmark that matches the full logo
const BRAND_LOGO = '<span class="brand-logo"><img src="assets/brand/logo-mark.png" alt="" width="32" height="32"></span><span class="brand-name">Quote<b>Craft</b></span>';
const NAV = [
  { href: '#/dashboard', key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { href: '#/quotes', key: 'quotes', label: 'Quotations', icon: 'file' },
  { href: '#/customers', key: 'customers', label: 'Customers', icon: 'users' },
  { href: '#/products', key: 'products', label: 'Products & services', icon: 'box' },
  { href: '#/settings', key: 'settings', label: 'Company & settings', icon: 'settings' }
];

function coAvatar(c, cls) {
  return `<span class="${cls}" style="background:${c.logo ? '#fff' : c.brand}">${c.logo ? `<img src="${c.logo}" alt="">` : esc(initials(c.name))}</span>`;
}

function renderShell() {
  const c = Store.company;
  const place = esc(c.city || '') + (c.state ? (c.city ? ', ' : '') + esc(stateName(c.state)) : '');
  $('#sidebar').innerHTML = `
    <div class="side-top">
      <a class="brand" href="#/dashboard" aria-label="QuoteCraft — go to dashboard">${BRAND_LOGO}</a>
    </div>
    <button class="side-collapse" id="collapseBtn" aria-label="Collapse sidebar" title="Collapse sidebar">${icon('chevsL')}</button>
    <div class="side-action"><a class="side-cta" href="#/quote/new" title="Raise Quotation">${icon('plus')}<span>Raise Quotation</span></a></div>
    <nav class="nav" aria-label="Main">
      <div class="nav-label">Workspace</div>
      ${NAV.slice(0, 2).map(navLink).join('')}
      <div class="nav-label">Masters</div>
      ${NAV.slice(2, 4).map(navLink).join('')}
      <div class="nav-label">Setup</div>
      ${NAV.slice(4).map(navLink).join('')}
    </nav>
    <a class="side-foot" href="#/settings" title="Company & settings">${coAvatar(c, 'av')}<span class="sf-tx"><b>${esc(c.name)}</b><small>${place}</small></span>${icon('settings')}</a>`;
  $('#topbar').innerHTML = `
    <a class="mobile-brand" href="#/dashboard" aria-label="QuoteCraft — go to dashboard">${BRAND_LOGO}</a>
    <div class="gsearch" id="gsearch" role="search">
      <div class="gs-box">${icon('search')}<input id="gsInp" type="search" placeholder="Search customers, products or quotations…" autocomplete="off" spellcheck="false" aria-label="Search customers, products or quotations" role="combobox" aria-expanded="false" aria-controls="gsList" aria-autocomplete="list"><kbd class="gs-kbd" title="Press / to search">/</kbd>
        <button class="gs-close" id="gsClose" type="button" aria-label="Close search">${icon('x')}</button></div>
      <div class="gs-list" id="gsList" role="listbox"></div>
    </div>
    <span class="spacer"></span>
    <button class="btn btn-ghost btn-icon mob-only" id="gsOpen" aria-label="Search">${icon('search')}</button>
    <button class="tb-bell" id="bellBtn" aria-label="Needs attention" title="Needs attention">${icon('bell')}<span class="badge" id="bellN" hidden></span></button>
    <span class="tb-div desk-only"></span>
    <a class="tb-co desk-only" href="#/settings" title="Company & settings">${coAvatar(c, 'av')}<span class="tb-co-tx"><b>${esc(c.name)}</b><small>${place}</small></span></a>`;
  // Phone navigation: four destinations plus a centred "New" action; the rest lives under More
  $('#bnav').innerHTML = `
    <a href="#/dashboard" data-k="dashboard">${icon('home')}<span>Home</span></a>
    <a href="#/quotes" data-k="quotes">${icon('file')}<span>Quotations</span></a>
    <a href="#/quote/new" class="bn-new" aria-label="Raise Quotation"><span class="bn-fab">${icon('plus')}</span><span>New</span></a>
    <a href="#/customers" data-k="customers">${icon('users')}<span>Customers</span></a>
    <button type="button" data-k="more" id="bnMore" aria-haspopup="menu">${icon('grid')}<span>More</span><i class="bn-dot" id="bnDot" hidden></i></button>`;
  $('#bnMore').addEventListener('click', openMore);
  $('#bellBtn').addEventListener('click', (e) => showAttention(e.currentTarget));
  bindSearch();
  updateCounts();
  updateBell();
  markActive();
  setCollapsed(document.body.classList.contains('side-collapsed'), false);
}
function navLink(n) { return `<a href="${n.href}" data-k="${n.key}" title="${n.label}">${icon(n.icon)}<span>${n.label}</span>${n.key === 'quotes' ? '<span class="count"></span>' : ''}</a>`; }
function updateCounts() { const s = $('#sidebar .nav a[data-k="quotes"] .count'); if (s) s.textContent = Store.data.quotes.length; }

/* ---------- Phone "More" sheet: everything that doesn't fit in the bottom bar ---------- */
function openMore(e) {
  const n = attentionItems().length;
  const row = (ic, title, sub, badge = '') => `<span class="bm-ic tone-gray">${icon(ic)}</span><span class="bm-tx"><b>${title}</b><small>${sub}</small></span>${badge}`;
  openMenu(e.currentTarget, [
    { header: 'More' },
    { html: row('box', 'Products & services', 'Rates, HSN/SAC and GST'), onClick: () => { location.hash = '#/products'; } },
    { html: row('settings', 'Company & settings', 'Profile, bank, templates, backup'), onClick: () => { location.hash = '#/settings'; } },
    '-',
    { html: row('bell', 'Needs attention', n ? `${plural(n, 'quotation')} to follow up` : 'You’re all caught up', n ? `<span class="bm-badge">${n}</span>` : ''), onClick: () => showAttention($('#bnMore')) },
    { html: row('search', 'Search', 'Quotations, customers and products'), onClick: () => { document.body.classList.add('search-open'); $('#gsInp').focus(); } }
  ], 'menu-wide menu-more');
}

/* ---------- Sidebar collapse (desktop) ---------- */
function setCollapsed(on, remember = true) {
  document.body.classList.toggle('side-collapsed', !!on);
  const b = $('#collapseBtn');
  if (b) { const t = on ? 'Expand sidebar' : 'Collapse sidebar'; b.setAttribute('aria-label', t); b.title = t; b.setAttribute('aria-expanded', on ? 'false' : 'true'); }
  if (!remember) return;
  uiSet('collapsed', on ? 1 : 0);
  // re-fit width-dependent content once the sidebar animation has finished
  setTimeout(() => { fitDocs(); const ch = $('#dashChart'); if (ch && ch._months) drawAreaChart(ch, ch._months); }, 220);
}
if (uiGet('collapsed') === '1') document.body.classList.add('side-collapsed');
$('#sidebar').addEventListener('click', (e) => {
  if (e.target.closest('#collapseBtn')) setCollapsed(!document.body.classList.contains('side-collapsed'));
});

/* ---------- Attention bell ---------- */
function updateBell() {
  const n = attentionItems().length, b = $('#bellN'), btn = $('#bellBtn'), dot = $('#bnDot');
  if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; }
  if (btn) btn.setAttribute('aria-label', n ? `Needs attention: ${n}` : 'Needs attention');
  if (dot) dot.hidden = !n;
}
function showAttention(anchor) {
  const att = attentionItems();
  const items = [{ header: att.length ? `Needs attention · ${att.length}` : 'Needs attention' }];
  if (!att.length) items.push({ html: `<span class="bm-ic tone-green">${icon('check')}</span><span class="bm-tx"><b>You’re all caught up</b><small>No quotations need a follow-up</small></span>`, onClick: () => {} });
  att.slice(0, 6).forEach((a) => {
    const m = ATT_META[a.kind];
    items.push({ html: `<span class="bm-ic tone-${m.tone}">${icon(m.icon)}</span><span class="bm-tx"><b>${esc(a.q.customer ? a.q.customer.company : '—')}</b><small>${esc(a.label)} · ${esc(a.q.number)}</small></span>`, onClick: () => { location.hash = '#/quote/view/' + a.q.id; } });
  });
  items.push('-', { icon: 'home', label: att.length > 6 ? `See all ${att.length} on the dashboard` : 'Open dashboard', onClick: () => { location.hash = '#/dashboard'; } });
  openMenu(anchor, items, 'menu-wide');
}

/* ---------- Global search: quotations, customers, products ---------- */
function bindSearch() {
  const box = $('#gsearch'), inp = $('#gsInp'), list = $('#gsList');
  let hl = 0, res = [];
  const close = () => { box.classList.remove('open'); inp.setAttribute('aria-expanded', 'false'); };
  const leave = () => { inp.value = ''; close(); inp.blur(); document.body.classList.remove('search-open'); };
  const go = (r) => { if (!r) return; leave(); if (location.hash === r.href) route(); else location.hash = r.href; };
  const render = () => {
    const raw = inp.value.trim(), s = raw.toLowerCase();
    if (!s) { res = []; list.innerHTML = '<div class="gs-hint">Type to search quotations, customers and products</div>'; return; }
    const has = (arr) => arr.join(' ').toLowerCase().includes(s);
    const qs = Store.data.quotes.filter((q) => has([q.number, q.customer && q.customer.company, q.customer && q.customer.contact, q.subject]))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
      .map((q) => ({ g: 'Quotations', href: '#/quote/view/' + q.id, html: `${thumbBox(q.customer ? q.customer.company : '?')}<span class="gs-tx"><b>${esc(q.number)} · ${esc(q.customer ? q.customer.company : '—')}</b><small>${fmtDate(q.date)} · ${fmtINR(quoteTotal(q))} · ${STATUS[q.status].label}${q.type === 'proforma' ? ' · Proforma' : ''}</small></span>` }));
    const cs = Store.data.customers.filter((c) => has([c.company, c.contact, c.phone, c.email, c.gstin, c.billing])).slice(0, 4)
      .map((c) => ({ g: 'Customers', href: '#/customers?q=' + encodeURIComponent(c.company), html: `${thumbBox(c.company)}<span class="gs-tx"><b>${esc(c.company)}</b><small>${esc(c.contact || c.phone || '')}${c.state ? ' · ' + esc(stateName(c.state)) : ''}</small></span>` }));
    const ps = Store.data.products.filter((p) => has([p.name, p.sku, p.hsn, p.category])).slice(0, 4)
      .map((p) => ({ g: 'Products & services', href: '#/products?q=' + encodeURIComponent(p.name), html: `${prodThumb(p)}<span class="gs-tx"><b>${esc(p.name)}</b><small>${esc(p.sku || '')}${p.sku ? ' · ' : ''}${fmtINR(p.rate)} / ${esc(p.unit)}</small></span>` }));
    res = [...qs, ...cs, ...ps];
    hl = Math.min(hl, Math.max(0, res.length - 1));
    if (!res.length) { list.innerHTML = `<div class="gs-hint">No results for “${esc(raw)}”</div>`; return; }
    let html = '', g = '';
    res.forEach((r, i) => { if (r.g !== g) { g = r.g; html += `<div class="gs-g">${g}</div>`; } html += `<div class="gs-opt${i === hl ? ' hl' : ''}" role="option" id="gs-o${i}" aria-selected="${i === hl}" data-i="${i}">${r.html}</div>`; });
    list.innerHTML = html;
    inp.setAttribute('aria-activedescendant', 'gs-o' + hl);
  };
  const open = () => { box.classList.add('open'); inp.setAttribute('aria-expanded', 'true'); render(); };
  inp.addEventListener('focus', open);
  inp.addEventListener('input', () => { hl = 0; open(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(res.length - 1, hl + 1); render(); $('#gs-o' + hl, list) && $('#gs-o' + hl, list).scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); render(); $('#gs-o' + hl, list) && $('#gs-o' + hl, list).scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); go(res[hl]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); leave(); }
  });
  list.addEventListener('mousedown', (e) => { e.preventDefault(); const o = e.target.closest('[data-i]'); if (o) go(res[+o.dataset.i]); });
  inp.addEventListener('blur', () => setTimeout(close, 120));
  $('#gsOpen').addEventListener('click', () => { document.body.classList.add('search-open'); inp.focus(); });
  $('#gsClose').addEventListener('click', leave);
}
document.addEventListener('keydown', (e) => {
  const a = document.activeElement, typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
  if ((e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
    const i = $('#gsInp'); if (!i || _modalStack.length) return;
    e.preventDefault();
    if (window.matchMedia('(max-width: 768px)').matches) document.body.classList.add('search-open');
    i.focus(); i.select();
  }
});

/* ---------- Router ---------- */
let CURRENT = 'dashboard';
function markActive() {
  $$('#sidebar .nav a[data-k]').forEach((a) => { const on = a.dataset.k === CURRENT; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  // bottom bar: Products and Settings live under "More"
  const bk = CURRENT === 'products' || CURRENT === 'settings' ? 'more' : CURRENT;
  $$('#bnav [data-k]').forEach((a) => { const on = a.dataset.k === bk; a.classList.toggle('active', on); if (on && a.tagName === 'A') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}

function route() {
  closeMenu();
  document.body.classList.remove('search-open');
  while (_modalStack.length) _modalStack[_modalStack.length - 1].close();
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/');
  const el = $('#view');
  el.onclick = null; el.oninput = null; el.onchange = null;
  const fresh = el.cloneNode(false); el.replaceWith(fresh); // drop old listeners
  const v = $('#view');
  let title = '';
  try {
    if (parts[0] === 'quotes') { CURRENT = 'quotes'; title = 'Quotations'; viewQuotes(v, params); }
    else if (parts[0] === 'quote' && parts[1] === 'new') { CURRENT = 'quotes'; title = 'Raise Quotation'; viewEditor(v, null, params); }
    else if (parts[0] === 'quote' && parts[1] === 'edit') { CURRENT = 'quotes'; title = 'Edit quotation'; viewEditor(v, parts[2], params); }
    else if (parts[0] === 'quote' && parts[1] === 'view') { CURRENT = 'quotes'; title = 'Quotation'; viewQuote(v, parts[2]); }
    else if (parts[0] === 'customers') { CURRENT = 'customers'; title = 'Customers'; viewCustomers(v, params); }
    else if (parts[0] === 'products') { CURRENT = 'products'; title = 'Products & services'; viewProducts(v, params); }
    else if (parts[0] === 'settings') { CURRENT = 'settings'; title = 'Company & settings'; viewSettings(v); }
    else { CURRENT = 'dashboard'; title = 'Dashboard'; viewDashboard(v); }
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="card">${emptyState('alert', 'Something went wrong', String(e.message || e), '<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>')}</div>`;
  }
  document.title = title + ' · QuoteCraft';
  updateCounts();
  updateBell();
  markActive();
  document.body.classList.toggle('focus-mode', parts[0] === 'quote');
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', (e) => { if (ED && ED.dirty && location.hash.indexOf('#/quote/') === 0 && /new|edit/.test(location.hash)) { e.preventDefault(); e.returnValue = ''; } });

Store.load();
renderShell();
route();
