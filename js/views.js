/* QuoteCraft — views: dashboard, quotations, quotation view, customers, products, settings */
'use strict';

const BRAND_SWATCHES = ['#0F766E', '#1D4ED8', '#4338CA', '#0F172A', '#334155', '#9F1239', '#B45309', '#166534'];
const UNITS = ['Nos', 'Pcs', 'Set', 'Box', 'Kg', 'Mtr', 'Rft', 'Sqft', 'Sqm', 'Ltr', 'Coil', 'Roll', 'Point', 'Hr', 'Day', 'Job', 'Lot'];
const GST_RATES = [0, 5, 12, 18, 28];
const quoteTotal = (q) => calcQuote(q, Store.company).grand;
const STATUS_ORDER = { draft: 0, sent: 1, accepted: 2, rejected: 3, expired: 4 };

/* ================= Quote actions (shared) ================= */
const QA = {
  setStatus(q, st) { q.status = st; q.updatedAt = Date.now(); Store.upsert('quotes', q); toast(`Marked as ${STATUS[st].label}`, 'success'); if (typeof updateBell === 'function') updateBell(); },
  statusMenu(anchor, q, after) {
    openMenu(anchor, [{ header: 'Change status' }, ...Object.entries(STATUS).map(([k, v]) => ({
      html: `<span class="pill ${v.cls}">${v.label}</span>${q.status === k ? '<span style="margin-left:auto;display:flex">' + icon('check') + '</span>' : ''}`,
      onClick: () => { QA.setStatus(q, k); after && after(); }
    }))]);
  },
  duplicate(q) {
    const d = clone(q); const date = todayISO();
    Object.assign(d, { id: uid('qt'), date, validUntil: addDays(date, Store.company.validityDays || 15), status: 'draft', createdAt: Date.now(), updatedAt: Date.now(), convertedFrom: '' });
    const c = Store.customer(d.customerId); if (c) d.customer = clone(c);
    d.number = Store.takeNumber(d.type, date);
    Store.upsert('quotes', d); toast(`Duplicated as ${d.number}`, 'success');
    location.hash = '#/quote/edit/' + d.id;
  },
  async convert(q) {
    const ok = await confirmDialog({ title: 'Convert to Proforma Invoice?', message: `A new Proforma Invoice (${Store.peekNumber('proforma', todayISO())}) will be created from ${q.number}. The quotation will be marked Accepted.`, okText: 'Convert', danger: false });
    if (!ok) return;
    const d = clone(q); const date = todayISO();
    Object.assign(d, { id: uid('qt'), type: 'proforma', date, validUntil: addDays(date, 7), status: 'sent', convertedFrom: q.number, createdAt: Date.now(), updatedAt: Date.now() });
    d.number = Store.takeNumber('proforma', date);
    q.status = 'accepted'; Store.upsert('quotes', q); Store.upsert('quotes', d);
    toast(`Proforma ${d.number} created`, 'success');
    location.hash = '#/quote/view/' + d.id;
  },
  async remove(q, after) {
    const t = docTitle(q);
    const ok = await confirmDialog({ title: 'Delete ' + q.number + '?', message: `This ${t.toLowerCase()} will be permanently removed. This cannot be undone.`, okText: 'Delete' });
    if (!ok) return;
    Store.remove('quotes', q.id); toast(t + ' deleted', 'success'); after && after();
  },
  /* Follow-up for a sent quotation: an email reminder, or a phone call */
  followUp(anchor, q) {
    if (!q) return;
    const cus = q.customer || {}, tel = telLink(cus.phone), c = Store.company;
    const subj = `Follow-up: ${docTitle(q)} ${q.number} from ${c.name}`;
    const mail = `mailto:${encodeURIComponent(cus.email || '')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(followUpText(q, c))}`;
    openMenu(anchor, [
      { header: 'Follow up · ' + (cus.company || q.number) },
      { icon: 'mail', label: cus.email ? 'Email reminder' : 'Email reminder (no email saved)', onClick: () => { location.href = mail; } },
      ...(tel ? [{ icon: 'phone', label: 'Call ' + cus.phone, onClick: () => { location.href = tel; } }] : []),
      '-',
      { icon: 'eye', label: 'Open quotation', onClick: () => { location.hash = '#/quote/view/' + q.id; } }
    ]);
  },
  emailHref(q) {
    const c = Store.company, t = docTitle(q);
    const subj = `${t} ${q.number} from ${c.name}${q.subject ? ' — ' + q.subject : ''}`;
    return `mailto:${encodeURIComponent((q.customer && q.customer.email) || '')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(shareText(q, c, true))}`;
  },
  email(q) { location.href = QA.emailHref(q); if (q.status === 'draft') QA.setStatus(q, 'sent'); },
  async pdf(q, btn) {
    const lbl = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Generating…'; }
      await (document.fonts ? document.fonts.ready : Promise.resolve());
      await pdfSave(q, Store.company, q.template);
      toast('PDF downloaded', 'success');
    } catch (e) { console.warn(e); toast(e.message || 'PDF failed', 'error', 4200); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = lbl; } }
  },
  async nativeShare(q, btn) {
    const text = shareText(q, Store.company, true), title = docTitle(q) + ' ' + q.number;
    const lbl = btn ? btn.innerHTML : '';
    try {
      if (navigator.share) {
        let files = null;
        if (navigator.canShare && typeof html2pdf === 'function') {
          if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Preparing…'; }
          const blob = await pdfBlob(q, Store.company, q.template);
          const f = new File([blob], pdfFileName(q), { type: 'application/pdf' });
          if (navigator.canShare({ files: [f] })) files = [f];
        }
        await navigator.share(files ? { title, text, files } : { title, text });
        if (q.status === 'draft') QA.setStatus(q, 'sent');
      } else toast('This browser can’t share files — use Email or Download PDF instead', 'error', 4200);
    } catch (e) { if (e && e.name !== 'AbortError') toast('Sharing failed — use Email or Download PDF instead', 'error', 4200); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = lbl; } }
  },
  print(q) {
    const pr = $('#print-root');
    pr.innerHTML = renderQuoteDoc(q, Store.company, { template: q.template, forPrint: true });
    const t = document.title; document.title = pdfFileName(q).replace(/\.pdf$/, '');
    const done = () => { document.title = t; pr.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  }
};

/* ================= Table helpers (sortable headers) ================= */
function sortTh(key, label, st, cls = '') {
  if (!st) return `<th class="${cls}">${label}</th>`;
  const on = st.sort === key;
  return `<th class="${cls}" aria-sort="${on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-sort${on ? ' on' : ''}" data-sort="${key}">${label}${icon(on ? (st.dir > 0 ? 'arrowUp' : 'arrowDown') : 'sort')}</button></th>`;
}
function applySort(list, st, getters) {
  const g = getters[st.sort]; if (!g) return list;
  return [...list].sort((a, b) => {
    const x = g(a), y = g(b);
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' });
    return r * st.dir;
  });
}
function toggleSort(st, key, numeric = false) { if (st.sort === key) st.dir = -st.dir; else { st.sort = key; st.dir = numeric ? -1 : 1; } }
function thumbBox(name, img, seed) { const [bg, fg] = avColor(seed || name); return `<span class="thumb" style="background:${bg};color:${fg}">${img ? `<img src="${img}" alt="">` : esc(initials(name))}</span>`; }

/* ================= Pagination (rows per page) ================= */
const PAGE_SIZES = [25, 50, 75, 100];
// Rows-per-page is remembered per list ('quotes', 'customers', 'products') in this browser
function pageSize(key) { const n = +uiGet('rows.' + key, 25); return PAGE_SIZES.includes(n) ? n : 25; }
function paginate(list, st) {
  const pages = Math.max(1, Math.ceil(list.length / st.size));
  st.page = Math.min(Math.max(1, st.page || 1), pages);
  const start = (st.page - 1) * st.size;
  return { rows: list.slice(start, start + st.size), page: st.page, pages, total: list.length, from: list.length ? start + 1 : 0, to: Math.min(list.length, start + st.size) };
}
function pagerHTML(pg, st, bottom = false) {
  if (!pg.total) return '';
  return `<div class="pager${bottom ? ' pager-bottom' : ''}">
    <label class="pg-size"><span>Rows<span class="pg-long"> per page</span></span><select class="sel" data-pgsize aria-label="Rows per page">${PAGE_SIZES.map((n) => `<option value="${n}"${n === st.size ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <span class="pg-info">${pg.from}–${pg.to} of ${pg.total}</span>
    <span class="pg-nav"><button type="button" class="btn btn-sm btn-icon" data-pg="-1" aria-label="Previous page"${pg.page <= 1 ? ' disabled' : ''}>${icon('chevL')}</button><button type="button" class="btn btn-sm btn-icon" data-pg="1" aria-label="Next page"${pg.page >= pg.pages ? ' disabled' : ''}>${icon('chevR')}</button></span>
  </div>`;
}
function bindPager(root, st, key, draw) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pg]'); if (!b) return;
    e.stopPropagation(); st.page += +b.dataset.pg; draw();
    if (b.closest('.pager-bottom')) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  root.addEventListener('change', (e) => {
    if (!e.target.matches('[data-pgsize]')) return;
    st.size = +e.target.value; st.page = 1; uiSet('rows.' + key, st.size); draw();
  });
}

/* ================= Needs attention ================= */
const ATT_META = {
  expiring: { icon: 'clock', tone: 'amber' },
  noreply: { icon: 'send', tone: 'blue' },
  lapsed: { icon: 'alert', tone: 'red' },
  draft: { icon: 'edit', tone: 'gray' }
};
/* Quotations someone should act on: sent ones expiring within 3 days, sent ones with no reply for a week,
   sent ones whose validity already ended (the app never expires them on its own), and drafts never sent. */
function attentionItems() {
  const today = todayISO();
  const rank = { expiring: 0, noreply: 1, lapsed: 2, draft: 3 };
  const out = [];
  Store.data.quotes.forEach((q) => {
    if (q.type === 'proforma') return;
    if (q.status === 'sent') {
      const left = daysBetween(today, q.validUntil), age = daysBetween(q.date, today);
      if (left < 0) out.push({ q, kind: 'lapsed', label: `Validity ended ${plural(-left, 'day')} ago` });
      else if (left <= 3) out.push({ q, kind: 'expiring', label: left === 0 ? 'Expires today' : `Expires in ${plural(left, 'day')}` });
      else if (age >= 7) out.push({ q, kind: 'noreply', label: `No reply for ${plural(age, 'day')}` });
    } else if (q.status === 'draft') out.push({ q, kind: 'draft', label: 'Draft — not sent yet' });
  });
  // soonest deadline first; for lapsed and drafts, the most recent first
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.kind === 'lapsed' || a.kind === 'draft'
    ? String(b.q.validUntil).localeCompare(String(a.q.validUntil))
    : String(a.q.validUntil).localeCompare(String(b.q.validUntil))));
}
function attRow(a) {
  const m = ATT_META[a.kind], q = a.q, cus = q.customer ? q.customer.company : '—';
  const acts = a.kind === 'draft'
    ? `<a class="btn btn-sm" href="#/quote/view/${q.id}">${icon('send')} Review &amp; send</a>`
    : `<button class="btn btn-sm" data-follow="${q.id}" aria-haspopup="menu">${icon('send')} Follow up ${icon('chevD')}</button>${a.kind === 'lapsed' ? `<button class="btn btn-sm btn-ghost" data-expire="${q.id}" title="Mark this quotation as Expired">Mark expired</button>` : ''}`;
  return `<div class="att-row" data-view="${q.id}">
    <span class="att-ic tone-${m.tone}">${icon(m.icon)}</span>
    <div class="att-body">
      <div class="att-l1"><b class="t-ellip">${esc(cus)}</b><span class="att-amt">${fmtINR(quoteTotal(q))}</span></div>
      <div class="att-l2"><span class="att-why tx-${m.tone}">${esc(a.label)}</span><span class="t-ellip">${esc(q.number)}${q.subject ? ' · ' + esc(q.subject) : ''}</span></div>
    </div>
    <div class="att-act">${acts}</div>
  </div>`;
}

/* ================= Dashboard ================= */
const PIPE_COLORS = { draft: '#94A3B8', sent: '#3B82F6', accepted: '#22C55E', rejected: '#EF4444', expired: '#F59E0B' };
const DASH_RANGES = [3, 6, 12];
let DASH_RANGE = +uiGet('range', 6) || 6;

/* Smooth line through points without overshooting (monotone cubic, Fritsch–Carlson) */
function monoPath(pts) {
  const n = pts.length, f = (v) => v.toFixed(1);
  if (!n) return '';
  if (n === 1) return `M${f(pts[0][0])},${f(pts[0][1])}`;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(pts[i][0] + h)},${f(pts[i][1] + h * t[i])} ${f(pts[i + 1][0] - h)},${f(pts[i + 1][1] - h * t[i + 1])} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}

function drawAreaChart(box, months) {
  if (!box) return;
  box._months = months;
  const cs = getComputedStyle(box);
  const W = Math.max(280, Math.floor(box.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0)) || 600);
  const H = W < 520 ? 210 : 250, L = 46, R = 10, T = 14, B = 30;
  const n = months.length;
  const max = Math.max(1, ...months.map((m) => m.quoted));
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), fr = raw / mag;
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => fr <= s) || 10) * mag, top = step * 4;
  const x0 = L + 16, x1 = W - R - 16;
  const X = (i) => (n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1));
  const Y = (v) => T + (H - T - B) * (1 - v / top);
  const base = Y(0);
  const axis = (v) => (v ? fmtCompact(v).replace('₹', '') : '0');
  const ptsQ = months.map((m, i) => [X(i), Y(m.quoted)]), ptsW = months.map((m, i) => [X(i), Y(m.won)]);
  const area = (pts) => monoPath(pts) + ` L${pts[n - 1][0].toFixed(1)},${base.toFixed(1)} L${pts[0][0].toFixed(1)},${base.toFixed(1)} Z`;
  const grid = [0, 1, 2, 3, 4].map((k) => { const y = Y(step * k).toFixed(1); return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${k ? '#EDF1F7' : '#DCE3EE'}"${k ? ' stroke-dasharray="3 4"' : ''}/><text x="${L - 10}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11.5" fill="#94A3B8">${axis(step * k)}</text>`; }).join('');
  const dots = (pts, col) => pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fff" stroke="${col}" stroke-width="2.5"/>`).join('');
  const labels = months.map((m, i) => `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#64748B">${m.label}</text>`).join('');
  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Quoted and won value by month" font-family="Inter, system-ui, sans-serif">
    <defs><linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563EB" stop-opacity=".2"/><stop offset="1" stop-color="#2563EB" stop-opacity="0"/></linearGradient>
    <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10B981" stop-opacity=".22"/><stop offset="1" stop-color="#10B981" stop-opacity="0"/></linearGradient></defs>
    ${grid}<line class="ch-guide" x1="0" x2="0" y1="${T}" y2="${base.toFixed(1)}" stroke="#CBD5E1" stroke-dasharray="3 3" opacity="0"/>
    <path d="${area(ptsQ)}" fill="url(#gQ)"/><path d="${area(ptsW)}" fill="url(#gW)"/>
    <path d="${monoPath(ptsQ)}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
    <path d="${monoPath(ptsW)}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
    ${dots(ptsQ, '#2563EB')}${dots(ptsW, '#10B981')}${labels}</svg><div class="ch-tip" role="status"></div>`;
  const svg = box.querySelector('svg'), tip = box.querySelector('.ch-tip'), guide = box.querySelector('.ch-guide');
  box.onpointermove = (e) => {
    const r = svg.getBoundingClientRect(), bx = box.getBoundingClientRect(), sx = r.width / W;
    let i = n === 1 ? 0 : Math.round(((e.clientX - r.left) / sx - x0) / ((x1 - x0) / (n - 1)));
    i = Math.max(0, Math.min(n - 1, i));
    const m = months[i];
    guide.setAttribute('x1', X(i)); guide.setAttribute('x2', X(i)); guide.setAttribute('opacity', '1');
    tip.innerHTML = `<div class="tt-h">${m.label} ${m.year}</div><div><i style="background:#2563EB"></i>Quoted <b>${fmtINR0(m.quoted)}</b> <span>· ${plural(m.count, 'quote')}</span></div><div><i style="background:#10B981"></i>Won <b>${fmtINR0(m.won)}</b> <span>· ${m.wonN}</span></div>`;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const left = Math.min(bx.width - tw / 2 - 4, Math.max(tw / 2 + 4, r.left - bx.left + X(i) * sx));
    const top = Math.max(th + 4, r.top - bx.top + Y(m.quoted) * sx - 12);
    tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.classList.add('on');
  };
  box.onpointerleave = () => { tip.classList.remove('on'); guide.setAttribute('opacity', '0'); };
}
window.addEventListener('resize', debounce(() => { const b = $('#dashChart'); if (b && b._months) drawAreaChart(b, b._months); }, 120));

function sparkBars(vals) {
  const W = 88, H = 34, n = vals.length, gap = n > 8 ? 2 : 3, bw = (W - gap * (n - 1)) / n, max = Math.max(1, ...vals);
  return `<svg class="k-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${vals.map((v, i) => { const h = Math.max(3, v / max * H); return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="currentColor" opacity="${i === n - 1 ? 1 : (0.3 + 0.45 * i / n).toFixed(2)}"/>`; }).join('')}</svg>`;
}
function trendChip(cur, prev) {
  if (!prev) return cur ? `<span class="trend up" title="Nothing last month">${icon('arrowUp')}New</span>` : `<span class="trend flat">${icon('arrowR')}0%</span>`;
  const p = Math.round((cur - prev) / prev * 100);
  const cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
  return `<span class="trend ${cls}">${icon(p > 0 ? 'arrowUp' : p < 0 ? 'arrowDown' : 'arrowR')}${Math.abs(p)}%</span>`;
}
function kpi(o) {
  return `<a class="kpi kpi--${o.tone}" href="${o.href}">
    <div class="k-top"><span class="k-ic">${icon(o.icon)}</span><div class="k-head"><div class="k-lbl">${o.label}</div><div class="k-row"><span class="k-val">${o.value}</span>${o.chip}</div></div></div>
    <div class="k-foot"><span class="k-sub">${o.sub}</span>${sparkBars(o.spark)}</div></a>`;
}
function donutSVG(counts) {
  const S = 172, sw = 26, r = (S - sw) / 2, C = 2 * Math.PI * r, cx = S / 2;
  const total = counts.reduce((s, x) => s + x.n, 0);
  const live = counts.filter((x) => x.n), gap = live.length > 1 ? 2.5 : 0;
  let off = 0;
  const segs = live.map((x) => {
    const len = x.n / total * C;
    const s = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${PIPE_COLORS[x.k]}" stroke-width="${sw}" stroke-dasharray="${Math.max(0.01, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"><title>${STATUS[x.k].label}: ${x.n}</title></circle>`;
    off += len; return s;
  }).join('');
  return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Quotations by status"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#EEF2F7" stroke-width="${sw}"/>${segs}</svg>`;
}

function viewDashboard(el) {
  let showAllAtt = false;
  const draw = () => {
    const d = Store.data, c = Store.company;
    const N = DASH_RANGES.includes(DASH_RANGE) ? DASH_RANGE : 6;
    const all = d.quotes.filter((q) => q.type !== 'proforma');
    const totals = new Map(all.map((q) => [q.id, quoteTotal(q)]));
    const sum = (arr) => arr.reduce((s, q) => s + totals.get(q.id), 0);
    const now = new Date();
    const months = [];
    for (let i = N - 1; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0');
      const qs = all.filter((q) => q.date.startsWith(key)), won = qs.filter((q) => q.status === 'accepted');
      months.push({ label: MONTHS[m.getMonth()], year: m.getFullYear(), count: qs.length, quoted: sum(qs), won: sum(won), wonN: won.length, sent: qs.filter((q) => q.status === 'sent').length });
    }
    const startISO = toISO(new Date(now.getFullYear(), now.getMonth() - (N - 1), 1));
    const quotes = all.filter((q) => q.date >= startISO);
    const cur = months[N - 1], prev = months[N - 2];
    const accepted = quotes.filter((q) => q.status === 'accepted');
    const decided = quotes.filter((q) => q.status !== 'draft');
    const conv = decided.length ? Math.round(accepted.length / decided.length * 100) : 0;
    const pending = all.filter((q) => q.status === 'sent');
    const counts = Object.keys(STATUS).map((k) => { const a = quotes.filter((q) => q.status === k); return { k, n: a.length, v: sum(a) }; });
    const totalVal = sum(quotes);

    const byCus = {};
    quotes.forEach((q) => { const k = q.customerId || (q.customer && q.customer.company) || '—'; const r = byCus[k] = byCus[k] || { name: q.customer ? q.customer.company : '—', v: 0, n: 0 }; r.v += totals.get(q.id); r.n++; });
    const topCus = Object.values(byCus).sort((a, b) => b.v - a.v).slice(0, 5);
    const byProd = {};
    quotes.forEach((q) => calcQuote(q, c).lines.forEach((l) => {
      const p = Store.product(l.pid) || {};
      const r = byProd[l.name] = byProd[l.name] || { name: l.name, v: 0, q: 0, u: l.unit, img: l.image || p.image || '', cat: p.category || '' };
      r.v += l.taxable; r.q += l.qty;
    }));
    const topProd = Object.values(byProd).sort((a, b) => b.v - a.v).slice(0, 5);
    const recent = [...d.quotes].sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt)).slice(0, 6);
    const att = attentionItems();
    const attShown = showAllAtt ? att : att.slice(0, 5);

    const topList = (rows, kind) => rows.length ? `<ul class="toplist ${kind}">${rows.map((r) => `<li><a href="${kind === 'cus' ? '#/quotes?q=' : '#/products?q='}${encodeURIComponent(r.name)}">
        ${kind === 'cus' ? thumbBox(r.name) : prodThumb({ name: r.name, category: r.cat, image: r.img })}
        <div class="tl-body"><div class="tl-nm" title="${esc(r.name)}">${esc(r.name)}</div><div class="tl-sub">${kind === 'cus' ? fmtINR0(r.v) + ' · ' + plural(r.n, 'quotation') : fmtNum(r.q) + ' ' + esc(r.u) + ' quoted · ' + fmtCompact(r.v)}</div></div>
        <div class="tl-bar"><span style="width:${Math.max(4, r.v / (rows[0].v || 1) * 100)}%"></span></div></a></li>`).join('')}</ul>`
      : '<div class="mini-empty">No quotations in this period</div>';

    el.innerHTML = `
    <div class="page-head">
      <div><h1>Dashboard</h1><p>Here’s what’s happening with your quotations</p></div>
      <div class="actions"><label class="period">${icon('calendar')}<select class="sel" id="dashRange" aria-label="Dashboard period">${DASH_RANGES.map((r) => `<option value="${r}" ${r === N ? 'selected' : ''}>Last ${r} months</option>`).join('')}</select></label></div>
    </div>
    ${all.length ? '' : `<div class="hero-cta"><span class="hc-ic">${icon('sparkle')}</span><div><h3>Create your first quotation in under a minute</h3><p>Pick a customer, add products and share a GST-ready quotation by email or as a PDF.</p></div><a class="btn btn-primary" href="#/quote/new">Raise Quotation ${icon('arrowR')}</a></div>`}
    <section class="kpis">
      ${kpi({ tone: 'blue', icon: 'file', href: '#/quotes', label: 'Total quotations', value: quotes.length, chip: trendChip(cur.count, prev.count), sub: 'This month vs last month', spark: months.map((m) => m.count) })}
      ${kpi({ tone: 'violet', icon: 'rupee', href: '#/quotes', label: 'Total quoted value', value: fmtINR0(totalVal), chip: trendChip(cur.quoted, prev.quoted), sub: 'This month vs last month', spark: months.map((m) => m.quoted) })}
      ${kpi({ tone: 'green', icon: 'check', href: '#/quotes?status=accepted', label: 'Business won', value: fmtINR0(sum(accepted)), chip: `<span class="trend up">${conv}% win rate</span>`, sub: `${plural(accepted.length, 'deal')} won in this period`, spark: months.map((m) => m.won) })}
      ${kpi({ tone: 'orange', icon: 'clock', href: '#/quotes?status=sent', label: 'Pending response', value: pending.length, chip: `<span class="trend warn">${fmtCompact(sum(pending))}</span>`, sub: 'Sent, awaiting customer reply', spark: months.map((m) => m.sent) })}
    </section>
    <section class="dash-top">
      <div class="card dash-card">
        <div class="card-h"><div class="ch-t"><span class="ch-ic">${icon('chart')}</span><h3>Quotation overview</h3><span class="sub">Last ${N} months</span></div>
          <div class="legend"><span><i style="background:#2563EB"></i>Quoted</span><span><i style="background:#10B981"></i>Won</span></div></div>
        <div class="chart" id="dashChart"></div>
      </div>
      <div class="card dash-card">
        <div class="card-h"><div class="ch-t"><span class="ch-ic">${icon('funnel')}</span><h3>Quotation pipeline</h3></div><span class="sub">${fmtCompact(totalVal)}</span></div>
        <div class="pipe">
          <div class="pipe-rows">${counts.map((x) => `<button class="pipe-row" data-go="#/quotes?status=${x.k}" title="${STATUS[x.k].label}: ${fmtINR0(x.v)}"><span class="dot" style="background:${PIPE_COLORS[x.k]}"></span><span class="nm">${STATUS[x.k].label}</span><span class="n">${x.n}</span><span class="pc">${quotes.length ? (x.n / quotes.length * 100).toFixed(1) : '0.0'}%</span></button>`).join('')}</div>
          <div class="donut">${donutSVG(counts)}<div class="donut-c"><b>${quotes.length}</b><span>Total</span></div></div>
        </div>
      </div>
    </section>
    <section class="dash-cols">
      <div class="grid">
        <div class="card dash-card att-card">
          <div class="card-h"><div class="ch-t"><span class="ch-ic tx-red">${icon('flag')}</span><h3>Needs attention</h3>${att.length ? `<span class="ch-badge">${att.length}</span>` : ''}</div><span class="sub">Follow up to win more deals</span></div>
          ${att.length ? `<div class="att-list">${attShown.map(attRow).join('')}</div>${att.length > 5 ? `<button class="att-more" data-attall>${showAllAtt ? 'Show less' : `Show all ${att.length}`} ${icon(showAllAtt ? 'chevU' : 'chevD')}</button>` : ''}`
            : `<div class="att-empty"><span class="att-ic tone-green">${icon('check')}</span><div><b>You’re all caught up</b><div>No quotations need a follow-up right now.</div></div></div>`}
        </div>
        <div class="card dash-card">
          <div class="card-h"><div class="ch-t"><span class="ch-ic">${icon('file')}</span><h3>Recent quotations</h3></div><a class="link-btn" href="#/quotes">View all ${icon('arrowR')}</a></div>
          ${recent.length ? quoteTable(recent, { compact: true }) : '<div class="mini-empty">No quotations yet</div>'}
        </div>
      </div>
      <div class="grid">
        <div class="card dash-card"><div class="card-h"><div class="ch-t"><span class="ch-ic">${icon('users')}</span><h3>Top customers</h3></div><a class="link-btn" href="#/customers">View all ${icon('arrowR')}</a></div>${topList(topCus, 'cus')}</div>
        <div class="card dash-card"><div class="card-h"><div class="ch-t"><span class="ch-ic">${icon('box')}</span><h3>Top products</h3></div><a class="link-btn" href="#/products">View all ${icon('arrowR')}</a></div>${topList(topProd, 'prod')}</div>
      </div>
    </section>`;
    drawAreaChart($('#dashChart', el), months);
  };
  draw();
  const refresh = () => { draw(); if (typeof updateBell === 'function') updateBell(); };
  // Registered before bindQuoteTable so these buttons don't also open the row they sit in
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) { e.stopImmediatePropagation(); QA.followUp(f, Store.quote(f.dataset.follow)); return; }
    const x = e.target.closest('[data-expire]');
    if (x) { e.stopImmediatePropagation(); QA.setStatus(Store.quote(x.dataset.expire), 'expired'); refresh(); return; }
    if (e.target.closest('[data-attall]')) { e.stopImmediatePropagation(); showAllAtt = !showAllAtt; draw(); return; }
    const g = e.target.closest('[data-go]');
    if (g) { e.stopImmediatePropagation(); location.hash = g.dataset.go; }
  });
  bindQuoteTable(el, refresh);
  el.addEventListener('change', (e) => { if (e.target.id === 'dashRange') { DASH_RANGE = +e.target.value; uiSet('range', DASH_RANGE); draw(); } });
}

/* ================= Quotations list ================= */
function quoteTable(list, opt = {}) {
  const { compact = false, st = null } = opt;
  if (!list.length) return '';
  const rows = list.map((q) => { const tot = quoteTotal(q); const cus = q.customer ? q.customer.company : '—'; return `<tr class="row-link" data-view="${q.id}">
      <td class="t-nowrap"><a class="t-link" href="#/quote/view/${q.id}">${esc(q.number)}</a>${q.type === 'proforma' ? ' <span class="tag amber">Proforma</span>' : ''}</td>
      <td class="t-nowrap t-muted">${fmtDate(q.date)}</td>
      <td class="t-wide"><div class="t-main t-ellip">${esc(cus)}</div>${!compact && q.subject ? `<div class="t-sub t-ellip">${esc(q.subject)}</div>` : ''}</td>
      ${compact ? '' : `<td class="t-nowrap t-muted">${fmtDate(q.validUntil)}</td>`}
      <td class="num t-main">${fmtINR(tot)}</td>
      <td>${statusPill(q.status, true, `data-status="${q.id}"`)}</td>
      <td class="t-act"><div class="row-actions">${compact ? '' : `<button class="btn btn-ghost btn-xs btn-icon" data-edit="${q.id}" aria-label="Edit" title="Edit">${icon('edit')}</button>`}<button class="btn btn-ghost btn-xs btn-icon" data-more="${q.id}" aria-label="More actions" title="More actions">${icon('more')}</button></div></td>
    </tr>`; }).join('');
  const mrows = list.map((q) => `<a class="m-row" href="#/quote/view/${q.id}">
      <div class="m-body">
        <div class="m-l1"><span class="m-title">${esc(q.customer ? q.customer.company : '—')}</span><span class="m-amt">${fmtINR(quoteTotal(q))}</span></div>
        <div class="m-l2"><span class="m-meta">${esc(q.number)} · ${fmtDate(q.date)}${q.type === 'proforma' ? ' · Proforma' : ''}</span>${statusPill(q.status, true, `data-status="${q.id}"`)}</div>
      </div></a>`).join('');
  return `<div class="table-wrap"><table class="tbl"><thead><tr>${sortTh('number', 'Number', st)}${sortTh('date', 'Date', st)}${sortTh('customer', 'Customer', st)}${compact ? '' : sortTh('valid', 'Valid until', st)}${sortTh('amount', 'Amount', st, 'num')}${sortTh('status', 'Status', st)}<th class="t-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="m-list">${mrows}</div>`;
}
function bindQuoteTable(el, rerender) {
  el.addEventListener('click', (e) => {
    const st = e.target.closest('[data-status]');
    if (st) { e.preventDefault(); e.stopPropagation(); const q = Store.quote(st.dataset.status); QA.statusMenu(st, q, rerender); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { e.stopPropagation(); location.hash = '#/quote/edit/' + ed.dataset.edit; return; }
    const mo = e.target.closest('[data-more]');
    if (mo) {
      e.stopPropagation(); const q = Store.quote(mo.dataset.more);
      openMenu(mo, [
        { icon: 'eye', label: 'View & share', onClick: () => { location.hash = '#/quote/view/' + q.id; } },
        { icon: 'edit', label: 'Edit', onClick: () => { location.hash = '#/quote/edit/' + q.id; } },
        { icon: 'copy', label: 'Duplicate', onClick: () => QA.duplicate(q) },
        { icon: 'mail', label: 'Send by email', onClick: () => { QA.email(q); rerender(); } },
        ...(q.status === 'sent' ? [{ icon: 'send', label: 'Follow up…', onClick: () => QA.followUp(mo, q) }] : []),
        { icon: 'download', label: 'Download PDF', onClick: () => QA.pdf(q) },
        { icon: 'tag', label: 'Change status…', onClick: () => QA.statusMenu(mo, q, rerender) },
        ...(q.type !== 'proforma' ? [{ icon: 'receipt', label: 'Convert to Proforma', onClick: () => QA.convert(q) }] : []),
        '-',
        { icon: 'trash', label: 'Delete', danger: true, onClick: () => QA.remove(q, rerender) }
      ]);
      return;
    }
    if (e.target.closest('a.t-link')) return;
    const row = e.target.closest('[data-view]');
    if (row) location.hash = '#/quote/view/' + row.dataset.view;
  });
}

function viewQuotes(el, params) {
  const state = { q: params.get('q') || '', status: params.get('status') || 'all', sort: 'date', dir: -1, page: 1, size: pageSize('quotes') };
  el.innerHTML = `
    <div class="page-head"><div><h1>Quotations</h1><p>Track every quotation from draft to deal.</p></div>
      <div class="actions"><a class="btn btn-primary" href="#/quote/new">${icon('plus')} Raise Quotation</a></div></div>
    <div class="card list-card">
      <div class="scroll-x tabs-wrap"><div class="tabs" id="qchips" role="tablist"></div></div>
      <div class="list-tools"><div class="inp-group">${icon('search')}<input class="inp" id="qs" type="search" placeholder="Search number, customer, subject…" value="${esc(state.q)}" aria-label="Search quotations"></div><span class="grow"></span><div class="pager-slot" id="qpager"></div></div>
      <div id="qlist"></div>
      <div id="qpager2"></div>
    </div>`;
  const getters = { number: (q) => q.number, date: (q) => q.date + ' ' + q.number, customer: (q) => (q.customer ? q.customer.company : ''), valid: (q) => q.validUntil, amount: (q) => quoteTotal(q), status: (q) => STATUS_ORDER[q.status] || 0 };
  const draw = () => {
    const all = Store.data.quotes;
    const s = state.q.toLowerCase().trim();
    const matchS = all.filter((q) => !s || [q.number, q.customer && q.customer.company, q.customer && q.customer.contact, q.subject].join(' ').toLowerCase().includes(s));
    const chips = [['all', 'All'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label]), ['proforma', 'Proforma']];
    const cnt = (k) => k === 'all' ? matchS.length : k === 'proforma' ? matchS.filter((q) => q.type === 'proforma').length : matchS.filter((q) => q.status === k).length;
    $('#qchips', el).innerHTML = chips.map(([k, l]) => `<button class="tab ${state.status === k ? 'on' : ''}" role="tab" aria-selected="${state.status === k}" data-chip="${k}">${l}<span class="n">${cnt(k)}</span></button>`).join('');
    const list = applySort(matchS.filter((q) => state.status === 'all' || (state.status === 'proforma' ? q.type === 'proforma' : q.status === state.status)), state, getters);
    const pg = paginate(list, state);
    $('#qpager', el).innerHTML = pagerHTML(pg, state);
    $('#qlist', el).innerHTML = list.length ? quoteTable(pg.rows, { st: state }) :
      emptyState('file', all.length ? 'No matching quotations' : 'No quotations yet', all.length ? 'Try a different search or status filter.' : 'Raise your first quotation — it takes under a minute.', `<a class="btn btn-primary" href="#/quote/new">${icon('plus')} Raise Quotation</a>`);
    $('#qpager2', el).innerHTML = pg.pages > 1 ? pagerHTML(pg, state, true) : '';
  };
  $('#qs', el).addEventListener('input', debounce((e) => { state.q = e.target.value; state.page = 1; draw(); }, 120));
  $('#qchips', el).addEventListener('click', (e) => { const c = e.target.closest('[data-chip]'); if (c) { state.status = c.dataset.chip; state.page = 1; draw(); } });
  $('#qlist', el).addEventListener('click', (e) => { const s = e.target.closest('[data-sort]'); if (s) { e.stopPropagation(); toggleSort(state, s.dataset.sort, ['amount', 'date', 'valid'].includes(s.dataset.sort)); state.page = 1; draw(); } }, true);
  bindQuoteTable($('#qlist', el), draw);
  bindPager($('.list-card', el), state, 'quotes', draw);
  draw();
}

/* ================= Quotation view ================= */
function tplPicker(cur) {
  return `<div class="tpl-pick">${TEMPLATES.map((t) => `<button class="tpl-opt ${cur === t.id ? 'on' : ''}" data-tpl="${t.id}" aria-pressed="${cur === t.id}" title="${esc(t.hint)}">
    <span class="tpl-thumb ${t.id}"><i class="hd"></i><i class="l1"></i><i class="l2"></i><i class="tb"></i><i class="r"></i><i class="r"></i><i class="r s"></i></span><span class="tpl-nm">${t.name}</span></button>`).join('')}</div>`;
}
function swatchPicker(cur) {
  return `<div class="swatches">${BRAND_SWATCHES.map((s) => `<button class="sw ${cur.toLowerCase() === s.toLowerCase() ? 'on' : ''}" data-sw="${s}" style="background:${s}" aria-label="Brand colour ${s}" title="${s}"></button>`).join('')}<label class="sw-custom" title="Custom colour"><input type="color" data-swc value="${cur}" aria-label="Custom brand colour">${icon('plus')}</label></div>`;
}

function viewQuote(el, id) {
  const q = Store.quote(id);
  if (!q) { el.innerHTML = `<div class="card">${emptyState('file', 'Quotation not found', 'It may have been deleted.', '<a class="btn btn-primary" href="#/quotes">Back to quotations</a>')}</div>`; return; }
  const c = Store.company;
  q.template = q.template || c.template || 'modern';
  const draw = () => {
    const tot = calcQuote(q, c);
    const tplName = (TEMPLATES.find((t) => t.id === q.template) || TEMPLATES[0]).name;
    el.innerHTML = `
    <div class="view-head">
      <a class="btn btn-ghost btn-icon btn-sm" href="#/quotes" aria-label="Back to quotations">${icon('chevL')}</a>
      <div class="vh-main">
        <div class="vh-title"><h1>${esc(q.number)}</h1>${q.type === 'proforma' ? '<span class="tag amber">Proforma</span>' : ''}${statusPill(q.status, true, 'id="vstatus"')}</div>
        <div class="meta">${esc(q.customer ? q.customer.company : '')} · ${fmtDate(q.date)} · <b>${fmtINR(tot.grand)}</b>${q.convertedFrom ? ' · from ' + esc(q.convertedFrom) : ''}</div>
      </div>
      <div class="actions desk-actions">
        <a class="btn" href="#/quote/edit/${q.id}">${icon('edit')} Edit</a>
        <button class="btn" data-act="print">${icon('printer')} Print</button>
        <button class="btn" data-act="email">${icon('mail')} Email</button>
        <button class="btn btn-primary" data-act="pdf">${icon('download')} Download PDF</button>
      </div>
    </div>
    <div class="view-layout">
      <div class="view-main">
        <div class="mob-tpl" style="--qb:${c.brand}">${tplPicker(q.template)}</div>
        <div class="desk">
          <div class="desk-bar"><span>A4 · ${tplName} template</span><button class="btn btn-sm" id="zoomBtn">${icon('zoom')} <span>Actual size</span></button></div>
          <div class="doc-stage" id="stage"><div class="doc-scaler">${renderQuoteDoc(q, c)}</div></div>
        </div>
      </div>
      <aside class="view-side">
        <div class="card panel">
          <h3>Share with customer</h3>
          <div class="share-grid">
            <button class="btn" data-act="email">${icon('mail')} Email</button>
            <button class="btn" data-act="share">${icon('share')} Share…</button>
            <button class="btn btn-primary full" data-act="pdf">${icon('download')} Download PDF</button>
          </div>
        </div>
        <div class="card panel desk-tpl" style="--qb:${c.brand}"><h3 class="tpl-h">Template</h3>${tplPicker(q.template)}
          <h3 class="sw-h">Brand colour</h3>${swatchPicker(c.brand)}</div>
        <div class="card panel"><h3>Status</h3>
          <div class="status-pick">${Object.entries(STATUS).map(([k, v]) => `<button class="pill ${v.cls} ${q.status === k ? 'on' : ''}" data-st="${k}" aria-pressed="${q.status === k}">${v.label}</button>`).join('')}</div></div>
        <div class="card panel"><h3>Actions</h3>
          <div class="act-list">
            <a class="act" href="#/quote/edit/${q.id}">${icon('edit')} Edit quotation</a>
            <button class="act" data-act="dup">${icon('copy')} Duplicate</button>
            <button class="act" data-act="print">${icon('printer')} Print</button>
            ${q.type !== 'proforma' ? `<button class="act" data-act="convert">${icon('receipt')} Convert to Proforma Invoice</button>` : ''}
            <button class="act danger" data-act="del">${icon('trash')} Delete</button>
          </div></div>
      </aside>
    </div>
    <div class="view-pad"></div>
    <div class="view-actions-mobile">
      <a class="btn" href="#/quote/edit/${q.id}">${icon('edit')} Edit</a>
      <button class="btn" data-act="sharemenu">${icon('share')} Share</button>
      <button class="btn btn-primary" data-act="pdf">${icon('download')} PDF</button>
    </div>`;
    requestAnimationFrame(() => fitDocs(el));
    if (document.fonts) document.fonts.ready.then(() => fitDocs(el));
  };
  draw();
  el.onclick = async (e) => {
    const t = e.target;
    const tp = t.closest('[data-tpl]'); if (tp) { q.template = tp.dataset.tpl; Store.upsert('quotes', q); draw(); toast(TEMPLATES.find((x) => x.id === q.template).name + ' template applied'); return; }
    const sw = t.closest('[data-sw]'); if (sw) { c.brand = sw.dataset.sw; Store.save(); draw(); return; }
    const st = t.closest('[data-st]'); if (st) { QA.setStatus(q, st.dataset.st); draw(); return; }
    if (t.closest('#vstatus')) { QA.statusMenu(t.closest('#vstatus'), q, draw); return; }
    if (t.closest('#zoomBtn')) { const s = $('#stage', el); s.classList.toggle('zoomed'); t.closest('#zoomBtn').querySelector('span').textContent = s.classList.contains('zoomed') ? 'Fit to width' : 'Actual size'; fitDocs(el); return; }
    const a = t.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'pdf') QA.pdf(q, a);
    else if (act === 'print') QA.print(q);
    else if (act === 'email') { QA.email(q); draw(); }
    else if (act === 'share') QA.nativeShare(q, a);
    else if (act === 'dup') QA.duplicate(q);
    else if (act === 'convert') QA.convert(q);
    else if (act === 'del') QA.remove(q, () => { location.hash = '#/quotes'; });
    else if (act === 'sharemenu') openMenu(a, [
      { header: 'Share ' + q.number },
      { icon: 'mail', label: 'Email', onClick: () => { QA.email(q); draw(); } },
      { icon: 'share', label: 'Share PDF via apps…', onClick: () => QA.nativeShare(q) },
      { icon: 'printer', label: 'Print / Save as PDF', onClick: () => QA.print(q) },
      '-',
      { icon: 'copy', label: 'Duplicate', onClick: () => QA.duplicate(q) },
      ...(q.type !== 'proforma' ? [{ icon: 'receipt', label: 'Convert to Proforma', onClick: () => QA.convert(q) }] : []),
      { icon: 'trash', label: 'Delete', danger: true, onClick: () => QA.remove(q, () => { location.hash = '#/quotes'; }) }
    ]);
  };
  el.oninput = (e) => { if (e.target.matches('[data-swc]')) { c.brand = e.target.value; Store.save(); const d = $('.qd', el); if (d) d.setAttribute('style', brandVars(c.brand)); } };
  el.onchange = (e) => { if (e.target.matches('[data-swc]')) draw(); };
}

/* ================= Customers ================= */
function customerForm(cu = {}) {
  const same = !cu.shipping || cu.shipping === cu.billing;
  return `<form class="form-grid" id="cusForm" novalidate>
    ${field('Company / customer name', `<input class="inp" name="company" value="${esc(cu.company)}" required autocomplete="organization">`, { req: true, err: 'Company name is required', cls: 'span-2' })}
    ${field('Contact person', `<input class="inp" name="contact" value="${esc(cu.contact)}" autocomplete="name">`)}
    ${field('Phone', `<input class="inp" name="phone" value="${esc(cu.phone)}" inputmode="tel" autocomplete="tel" placeholder="98765 43210">`, { req: true, err: 'Enter a valid 10-digit phone number' })}
    ${field('Email', `<input class="inp" name="email" type="email" value="${esc(cu.email)}" autocomplete="email" placeholder="name@company.com">`, { err: 'Enter a valid email address', cls: 'span-2' })}
    ${field('GSTIN', `<input class="inp" name="gstin" value="${esc(cu.gstin)}" maxlength="15" style="text-transform:uppercase" placeholder="33ABCDE1234F1Z5">`, { err: 'GSTIN format looks wrong (15 characters, e.g. 33ABCDE1234F1Z5)', hint: 'State is auto-detected from GSTIN' })}
    ${field('State (place of supply)', `<select class="sel" name="state" required><option value="">Select state…</option>${stateOptions(cu.state || '')}</select>`, { req: true, err: 'Select the state' })}
    ${field('Billing address', `<textarea class="ta" name="billing" rows="3">${esc(cu.billing)}</textarea>`, { cls: 'span-2' })}
    <label class="check span-2"><input type="checkbox" name="same" ${same ? 'checked' : ''}> Shipping address same as billing</label>
    <div class="span-2" id="shipWrap" ${same ? 'hidden' : ''}>${field('Shipping address', `<textarea class="ta" name="shipping" rows="3">${esc(cu.shipping)}</textarea>`)}</div>
    ${field('Notes (internal)', `<textarea class="ta" name="notes" rows="2">${esc(cu.notes)}</textarea>`, { cls: 'span-2' })}
  </form>`;
}
function openCustomerModal(cu, onSaved) {
  const isNew = !cu || !cu.id;
  cu = cu ? clone(cu) : {};
  openModal({
    title: isNew ? 'New customer' : 'Edit customer', size: '',
    body: customerForm(cu),
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>${isNew ? 'Add customer' : 'Save changes'}</button>`,
    onMount(m, api) {
      const f = $('#cusForm', m);
      f.same.addEventListener('change', () => { $('#shipWrap', m).hidden = f.same.checked; });
      f.gstin.addEventListener('input', () => { f.gstin.value = f.gstin.value.toUpperCase().replace(/\s/g, ''); const code = f.gstin.value.slice(0, 2); if (STATES[code]) f.state.value = code; if (f.gstin.value.length === 15) setInvalid(f.gstin, !RX.gstin.test(f.gstin.value)); });
      const save = () => {
        let ok = true;
        ok = setInvalid(f.company, !f.company.value.trim()) && ok;
        ok = setInvalid(f.phone, !validPhone(f.phone.value)) && ok;
        ok = setInvalid(f.email, f.email.value.trim() && !RX.email.test(f.email.value.trim())) && ok;
        ok = setInvalid(f.gstin, f.gstin.value.trim() && !RX.gstin.test(f.gstin.value.trim())) && ok;
        ok = setInvalid(f.state, !f.state.value) && ok;
        if (!ok) { const bad = $('.field.invalid input, .field.invalid select', m); bad && bad.focus(); toast('Please fix the highlighted fields', 'error'); return; }
        Object.assign(cu, {
          id: cu.id || uid('cus'), company: f.company.value.trim(), contact: f.contact.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(),
          gstin: f.gstin.value.trim(), state: f.state.value, billing: f.billing.value.trim(), shipping: f.same.checked ? '' : f.shipping.value.trim(), notes: f.notes.value.trim(), createdAt: cu.createdAt || Date.now()
        });
        Store.upsert('customers', cu); api.close();
        toast(isNew ? 'Customer added' : 'Customer updated', 'success');
        onSaved && onSaved(cu);
      };
      $('[data-save]', api.el).addEventListener('click', save);
      f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
      $$('input,select,textarea', f).forEach((i) => i.addEventListener('input', () => { const fl = i.closest('.field'); if (fl && fl.classList.contains('invalid')) fl.classList.remove('invalid'); }));
    }
  });
}
function viewCustomers(el, params) {
  const st = { q: (params && params.get('q')) || '', sort: 'company', dir: 1, page: 1, size: pageSize('customers') };
  el.innerHTML = `<div class="page-head"><div><h1>Customers</h1><p>Customer master with billing, shipping and GST details.</p></div>
      <div class="actions"><button class="btn btn-primary" id="addCus">${icon('plus')} Add customer</button></div></div>
    <div class="card list-card">
      <div class="list-tools"><div class="inp-group">${icon('search')}<input class="inp" id="cs" type="search" placeholder="Search name, contact, city, GSTIN…" aria-label="Search customers" value="${esc(st.q)}"></div><span class="grow"></span><div class="pager-slot" id="cpager"></div></div>
      <div id="clist"></div>
      <div id="cpager2"></div>
    </div>`;
  const co = Store.company;
  const getters = { company: (r) => r.c.company, contact: (r) => r.c.phone || '', gstin: (r) => stateName(r.c.state) + r.c.gstin, quotes: (r) => r.n, value: (r) => r.v };
  const draw = () => {
    const s = st.q.toLowerCase();
    const base = Store.data.customers.filter((c) => !s || [c.company, c.contact, c.phone, c.email, c.billing, c.gstin, stateName(c.state)].join(' ').toLowerCase().includes(s))
      .map((c) => { const qs = Store.data.quotes.filter((q) => q.customerId === c.id); return { c, n: qs.length, v: qs.reduce((t, q) => t + quoteTotal(q), 0), inter: c.state !== co.state }; });
    const all = applySort(base, st, getters);
    const pg = paginate(all, st), list = pg.rows;
    $('#cpager', el).innerHTML = pagerHTML(pg, st);
    $('#cpager2', el).innerHTML = pg.pages > 1 ? pagerHTML(pg, st, true) : '';
    if (!list.length) {
      $('#clist', el).innerHTML = emptyState('users', Store.data.customers.length ? 'No customers match' : 'No customers yet', Store.data.customers.length ? 'Try another search term.' : 'Add your first customer to start raising quotations.', `<button class="btn btn-primary" data-addc>${icon('plus')} Add customer</button>`);
      return;
    }
    const rows = list.map(({ c, n, v, inter }) => `<tr class="row-link" data-crow="${c.id}">
        <td class="t-wide"><div class="t-ent">${thumbBox(c.company)}<div class="t-min"><div class="t-main t-ellip">${esc(c.company)}</div><div class="t-sub t-ellip">${esc(c.contact || '—')}</div></div></div></td>
        <td class="t-cap"><div class="t-ellip">${esc(c.phone || '—')}</div><div class="t-sub t-ellip">${esc(c.email || '')}</div></td>
        <td><div class="t-mono">${esc(c.gstin || 'Unregistered')}</div><div class="t-sub t-supply">${esc(stateName(c.state))} <span class="tag ${inter ? 'amber' : 'gray'}">${inter ? 'IGST' : 'CGST + SGST'}</span></div></td>
        <td class="num">${n}</td>
        <td class="num t-main">${fmtINR(v)}</td>
        <td class="t-act"><div class="row-actions"><a class="btn btn-ghost btn-xs btn-icon" href="#/quote/new?customer=${c.id}" aria-label="Raise quotation" title="Raise quotation">${icon('plus')}</a><button class="btn btn-ghost btn-xs btn-icon" data-cedit="${c.id}" aria-label="Edit" title="Edit">${icon('edit')}</button><button class="btn btn-ghost btn-xs btn-icon" data-cmore="${c.id}" aria-label="More" title="More">${icon('more')}</button></div></td>
      </tr>`).join('');
    const mrows = list.map(({ c, n, v }) => `<div class="m-row" data-crow="${c.id}">${thumbBox(c.company)}
        <div class="m-body"><div class="m-l1"><span class="m-title">${esc(c.company)}</span><span class="m-amt">${fmtCompact(v)}</span></div>
        <div class="m-l2"><span class="m-meta">${esc(c.contact || c.phone || '—')} · ${esc(stateName(c.state))}</span><span class="m-meta">${n} quote${n === 1 ? '' : 's'}</span></div></div>
        <button class="btn btn-ghost btn-xs btn-icon" data-cmore="${c.id}" aria-label="More">${icon('more')}</button></div>`).join('');
    $('#clist', el).innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr>${sortTh('company', 'Customer', st)}${sortTh('contact', 'Contact', st)}${sortTh('gstin', 'GSTIN / State · Tax', st)}${sortTh('quotes', 'Quotes', st, 'num')}${sortTh('value', 'Quoted value', st, 'num')}<th class="t-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div><div class="m-list">${mrows}</div>`;
  };
  el.onclick = (e) => {
    if (e.target.closest('#addCus, [data-addc]')) return openCustomerModal(null, draw);
    const so = e.target.closest('[data-sort]'); if (so) { toggleSort(st, so.dataset.sort, ['quotes', 'value'].includes(so.dataset.sort)); st.page = 1; draw(); return; }
    const mo = e.target.closest('[data-cmore]');
    if (mo) {
      const c = Store.customer(mo.dataset.cmore);
      openMenu(mo, [
        { icon: 'plus', label: 'Raise quotation', onClick: () => { location.hash = '#/quote/new?customer=' + c.id; } },
        { icon: 'edit', label: 'Edit', onClick: () => openCustomerModal(c, draw) },
        { icon: 'file', label: 'View quotations', onClick: () => { location.hash = '#/quotes?q=' + encodeURIComponent(c.company); } },
        '-',
        { icon: 'trash', label: 'Delete', danger: true, onClick: async () => {
          const n = Store.data.quotes.filter((q) => q.customerId === c.id).length;
          if (await confirmDialog({ title: 'Delete ' + c.company + '?', message: n ? `${n} existing quotation(s) keep their copy of this customer's details.` : 'This customer will be removed from your master.', okText: 'Delete' })) { Store.remove('customers', c.id); toast('Customer deleted', 'success'); draw(); }
        } }
      ]);
      return;
    }
    if (e.target.closest('a')) return;
    const ed = e.target.closest('[data-cedit], [data-crow]'); if (ed) return openCustomerModal(Store.customer(ed.dataset.cedit || ed.dataset.crow), draw);
  };
  $('#cs', el).addEventListener('input', debounce((e) => { st.q = e.target.value; st.page = 1; draw(); }, 100));
  bindPager($('.list-card', el), st, 'customers', draw);
  draw();
}

/* ================= Products ================= */
function productCategories() { return [...new Set(Store.data.products.map((p) => p.category).filter(Boolean))].sort(); }
function prodThumb(p, cls = 'thumb') { const [bg, fg] = avColor(p.category || p.name); return `<span class="${cls}" style="background:${bg};color:${fg}">${p.image ? `<img src="${p.image}" alt="">` : esc(initials(p.name))}</span>`; }
function openProductModal(p, onSaved) {
  const isNew = !p || !p.id; p = p ? clone(p) : { unit: 'Nos', gst: 18, rate: '' };
  const cats = productCategories();
  openModal({
    title: isNew ? 'New product / service' : 'Edit product', size: '',
    body: `<form class="form-grid" id="prdForm" novalidate>
      <div class="span-2 uploader"><div class="up-prev" id="pimg">${p.image ? `<img src="${p.image}" alt="">` : icon('image')}</div>
        <div><div class="lbl">Product image <span class="muted" style="font-weight:400">(optional)</span></div><div class="hint">JPG or PNG, shown as a thumbnail on quotations.</div><div class="up-btns"><label class="btn btn-sm">${icon('upload')} Upload<input type="file" accept="image/*" hidden id="pfile"></label><button type="button" class="btn btn-sm btn-ghost" id="pclr" ${p.image ? '' : 'hidden'}>Remove</button></div></div></div>
      ${field('Product / service name', `<input class="inp" name="name" value="${esc(p.name)}" required>`, { req: true, err: 'Name is required', cls: 'span-2' })}
      ${field('SKU / code', `<input class="inp" name="sku" value="${esc(p.sku)}">`)}
      ${field('Category', `<input class="inp" name="category" value="${esc(p.category)}" list="catList" placeholder="e.g. Lighting"><datalist id="catList">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
      ${field('Description', `<textarea class="ta" name="description" rows="2">${esc(p.description)}</textarea>`, { cls: 'span-2' })}
      <div class="span-2 form-grid cols-4 keep-2">
        ${field('Unit', `<select class="sel" name="unit">${[...new Set([...UNITS, p.unit])].map((u) => `<option ${u === p.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>`)}
        ${field('Default rate (₹)', `<input class="inp num" name="rate" inputmode="decimal" value="${esc(p.rate)}" required>`, { req: true, err: 'Enter a rate ≥ 0' })}
        ${field('HSN / SAC', `<input class="inp" name="hsn" value="${esc(p.hsn)}" inputmode="numeric">`, { err: '4–8 digits' })}
        ${field('GST %', `<select class="sel" name="gst">${GST_RATES.map((g) => `<option value="${g}" ${+p.gst === g ? 'selected' : ''}>${g}%</option>`).join('')}</select>`)}
      </div>
    </form>`,
    footer: `<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>${isNew ? 'Add product' : 'Save changes'}</button>`,
    onMount(m, api) {
      const f = $('#prdForm', m);
      $('#pfile', m).addEventListener('change', async (e) => { try { p.image = await readImageFile(e.target.files[0], 360, 'image/jpeg'); $('#pimg', m).innerHTML = `<img src="${p.image}" alt="">`; $('#pclr', m).hidden = false; } catch (err) { toast(err.message, 'error'); } });
      $('#pclr', m).addEventListener('click', () => { p.image = ''; $('#pimg', m).innerHTML = icon('image'); $('#pclr', m).hidden = true; });
      const save = () => {
        let ok = setInvalid(f.name, !f.name.value.trim());
        const rate = num(f.rate.value, -1); ok = setInvalid(f.rate, rate < 0) && ok;
        ok = setInvalid(f.hsn, f.hsn.value.trim() && !/^\d{4,8}$/.test(f.hsn.value.trim())) && ok;
        if (!ok) { toast('Please fix the highlighted fields', 'error'); return; }
        Object.assign(p, { id: p.id || uid('prd'), name: f.name.value.trim(), sku: f.sku.value.trim(), category: f.category.value.trim(), description: f.description.value.trim(), unit: f.unit.value, rate: r2(rate), hsn: f.hsn.value.trim(), gst: +f.gst.value });
        Store.upsert('products', p); api.close(); toast(isNew ? 'Product added' : 'Product updated', 'success'); onSaved && onSaved(p);
      };
      $('[data-save]', api.el).addEventListener('click', save);
      f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
      $$('input,select,textarea', f).forEach((i) => i.addEventListener('input', () => { const fl = i.closest('.field'); if (fl && fl.classList.contains('invalid')) fl.classList.remove('invalid'); }));
    }
  });
}
function viewProducts(el, params) {
  const st = { q: (params && params.get('q')) || '', cat: 'All', sort: 'name', dir: 1, page: 1, size: pageSize('products') };
  el.innerHTML = `<div class="page-head"><div><h1>Products & services</h1><p>Product master with default rates, HSN/SAC codes and GST.</p></div>
    <div class="actions"><button class="btn btn-primary" id="addPrd">${icon('plus')} Add product</button></div></div>
    <div class="card list-card">
      <div class="list-tools"><div class="inp-group">${icon('search')}<input class="inp" id="ps" type="search" placeholder="Search name, SKU, HSN…" aria-label="Search products" value="${esc(st.q)}"></div>
        <div class="scroll-x"><div class="chips" id="pchips" role="group" aria-label="Category"></div></div><span class="grow"></span><div class="pager-slot" id="ppager"></div></div>
      <div id="plist"></div>
      <div id="ppager2"></div>
    </div>`;
  const getters = { name: (p) => p.name, sku: (p) => p.sku || '', category: (p) => p.category || '', hsn: (p) => p.hsn || '', unit: (p) => p.unit || '', gst: (p) => +p.gst, rate: (p) => +p.rate };
  const draw = () => {
    const s = st.q.toLowerCase();
    const cats = ['All', ...productCategories()];
    if (!cats.includes(st.cat)) st.cat = 'All';
    $('#pchips', el).innerHTML = cats.map((c) => `<button class="chip ${st.cat === c ? 'on' : ''}" data-cat="${esc(c)}" aria-pressed="${st.cat === c}">${esc(c)}</button>`).join('');
    const all = applySort(Store.data.products.filter((p) => (st.cat === 'All' || p.category === st.cat) && (!s || [p.name, p.sku, p.hsn, p.category, p.description].join(' ').toLowerCase().includes(s))), st, getters);
    const pg = paginate(all, st), list = pg.rows;
    $('#ppager', el).innerHTML = pagerHTML(pg, st);
    $('#ppager2', el).innerHTML = pg.pages > 1 ? pagerHTML(pg, st, true) : '';
    if (!list.length) {
      $('#plist', el).innerHTML = emptyState('box', Store.data.products.length ? 'No products match' : 'No products yet', Store.data.products.length ? 'Try another search or category.' : 'Add products and services with their default rates.', `<button class="btn btn-primary" data-addp>${icon('plus')} Add product</button>`);
      return;
    }
    const rows = list.map((p) => `<tr class="row-link" data-prow="${p.id}">
        <td class="t-wide"><div class="t-ent">${prodThumb(p)}<div class="t-min"><div class="t-main t-ellip">${esc(p.name)}</div><div class="t-sub t-ellip">${esc(p.description || '')}</div></div></div></td>
        <td class="t-mono t-nowrap">${esc(p.sku || '—')}</td>
        <td class="t-nowrap">${esc(p.category || 'General')}</td>
        <td class="t-mono">${esc(p.hsn || '—')}</td>
        <td>${esc(p.unit)}</td>
        <td class="num">${p.gst}%</td>
        <td class="num t-main">${fmtINR(p.rate)}</td>
        <td class="t-act"><div class="row-actions"><button class="btn btn-ghost btn-xs btn-icon" data-pedit="${p.id}" aria-label="Edit" title="Edit">${icon('edit')}</button><button class="btn btn-ghost btn-xs btn-icon btn-danger" data-pdel="${p.id}" aria-label="Delete" title="Delete">${icon('trash')}</button></div></td>
      </tr>`).join('');
    const mrows = list.map((p) => `<div class="m-row" data-prow="${p.id}">${prodThumb(p)}
        <div class="m-body"><div class="m-l1"><span class="m-title">${esc(p.name)}</span><span class="m-amt">${fmtINR(p.rate)}</span></div>
        <div class="m-l2"><span class="m-meta">${esc(p.sku || '')}${p.category ? ' · ' + esc(p.category) : ''}</span><span class="m-meta">/${esc(p.unit)} · GST ${p.gst}%</span></div></div>
        <button class="btn btn-ghost btn-xs btn-icon" data-pmore="${p.id}" aria-label="More">${icon('more')}</button></div>`).join('');
    $('#plist', el).innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr>${sortTh('name', 'Product / service', st)}${sortTh('sku', 'SKU', st)}${sortTh('category', 'Category', st)}${sortTh('hsn', 'HSN/SAC', st)}${sortTh('unit', 'Unit', st)}${sortTh('gst', 'GST', st, 'num')}${sortTh('rate', 'Rate', st, 'num')}<th class="t-act"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div><div class="m-list">${mrows}</div>`;
  };
  const del = async (p) => { if (await confirmDialog({ title: 'Delete ' + p.name + '?', message: 'Existing quotations keep their line items.', okText: 'Delete' })) { Store.remove('products', p.id); toast('Product deleted', 'success'); draw(); } };
  el.onclick = async (e) => {
    if (e.target.closest('#addPrd, [data-addp]')) return openProductModal(null, draw);
    const c = e.target.closest('[data-cat]'); if (c) { st.cat = c.dataset.cat; st.page = 1; draw(); return; }
    const so = e.target.closest('[data-sort]'); if (so) { toggleSort(st, so.dataset.sort, ['gst', 'rate'].includes(so.dataset.sort)); st.page = 1; draw(); return; }
    const dl = e.target.closest('[data-pdel]'); if (dl) return del(Store.product(dl.dataset.pdel));
    const mo = e.target.closest('[data-pmore]');
    if (mo) { const p = Store.product(mo.dataset.pmore); openMenu(mo, [{ icon: 'edit', label: 'Edit', onClick: () => openProductModal(p, draw) }, '-', { icon: 'trash', label: 'Delete', danger: true, onClick: () => del(p) }]); return; }
    const ed = e.target.closest('[data-pedit], [data-prow]'); if (ed) return openProductModal(Store.product(ed.dataset.pedit || ed.dataset.prow), draw);
  };
  $('#ps', el).addEventListener('input', debounce((e) => { st.q = e.target.value; st.page = 1; draw(); }, 100));
  bindPager($('.list-card', el), st, 'products', draw);
  draw();
}

/* ================= Settings / company profile ================= */
function setSection(title, desc, body) {
  return `<section class="card set-sec"><div class="set-h"><h2>${title}</h2><p>${desc}</p></div><div class="set-body">${body}</div></section>`;
}
function viewSettings(el) {
  const c = clone(Store.company); c.bank = c.bank || {};
  const sampleQ = () => [...Store.data.quotes].sort((a, b) => b.date.localeCompare(a.date))[0];
  const mono = () => `<div class="mono" style="background:${c.brand}">${esc(initials(c.name))}</div>`;
  el.innerHTML = `<div class="page-head"><div><h1>Company & settings</h1><p>These details appear on every quotation. The preview updates as you type.</p></div>
    <div class="actions"><button class="btn btn-primary" id="saveCo">Save changes</button></div></div>
  <div class="settings-grid">
    <form id="coForm" novalidate>
      ${setSection('Business profile', 'Seller details shown in the document header and the “From” block.', `<div class="form-grid">
          <div class="span-2 uploader"><div class="up-prev" id="logoPrev">${c.logo ? `<img src="${c.logo}" alt="">` : mono()}</div>
            <div><div class="lbl">Logo</div><div class="hint">PNG, JPG or SVG. Without a logo, a monogram in your brand colour is used.</div>
              <div class="up-btns"><label class="btn btn-sm">${icon('upload')} Upload logo<input type="file" accept="image/*" hidden id="logoFile"></label><button type="button" class="btn btn-sm btn-ghost" id="logoClr" ${c.logo ? '' : 'hidden'}>Use monogram</button></div></div></div>
          ${field('Company name', `<input class="inp" name="name" value="${esc(c.name)}" required>`, { req: true, err: 'Required', cls: 'span-2' })}
          ${field('Tagline', `<input class="inp" name="tagline" value="${esc(c.tagline)}">`, { cls: 'span-2' })}
          ${field('Address line 1', `<input class="inp" name="address1" value="${esc(c.address1)}">`)}
          ${field('Address line 2', `<input class="inp" name="address2" value="${esc(c.address2)}">`)}
          ${field('City', `<input class="inp" name="city" value="${esc(c.city)}">`)}
          ${field('PIN code', `<input class="inp" name="pincode" value="${esc(c.pincode)}" inputmode="numeric" maxlength="6">`, { err: '6 digits' })}
          ${field('State', `<select class="sel" name="state">${stateOptions(c.state)}</select>`, { hint: 'Same-state customers get CGST + SGST, others IGST' })}
          ${field('GSTIN', `<input class="inp" name="gstin" value="${esc(c.gstin)}" maxlength="15" style="text-transform:uppercase">`, { err: 'Invalid GSTIN format' })}
          ${field('Phone', `<input class="inp" name="phone" value="${esc(c.phone)}" inputmode="tel">`, { err: 'Invalid phone' })}
          ${field('Email', `<input class="inp" name="email" type="email" value="${esc(c.email)}">`, { err: 'Invalid email' })}
          ${field('Website', `<input class="inp" name="website" value="${esc(c.website)}">`, { cls: 'span-2' })}
        </div>`)}
      ${setSection('Bank & UPI', 'Printed on the quotation with a scannable UPI QR code for the exact amount.', `<div class="form-grid">
          ${field('Account name', `<input class="inp" name="accName" value="${esc(c.bank.accName)}">`, { cls: 'span-2' })}
          ${field('Bank name', `<input class="inp" name="bankName" value="${esc(c.bank.bankName)}" placeholder="e.g. State Bank of India">`)}
          ${field('Branch', `<input class="inp" name="branch" value="${esc(c.bank.branch)}" placeholder="e.g. Nagercoil Main">`)}
          ${field('Account number', `<input class="inp" name="accNo" value="${esc(c.bank.accNo)}" inputmode="numeric">`, { err: '9–18 digits' })}
          ${field('IFSC', `<input class="inp" name="ifsc" value="${esc(c.bank.ifsc)}" maxlength="11" style="text-transform:uppercase">`, { err: 'e.g. SBIN0001234' })}
          ${field('UPI ID', `<input class="inp" name="upi" value="${esc(c.bank.upi)}" placeholder="business@bank">`, { err: 'e.g. name@okhdfc', cls: 'span-2' })}
        </div>`)}
      ${setSection('Quotation defaults', 'Numbering, validity, template, signature and standard terms.', `<div class="form-grid">
          ${field('Quotation prefix', `<input class="inp" name="prefix" value="${esc(c.prefix)}" maxlength="8">`, { hint: 'e.g. QT → QT/' + fyOf(todayISO()) + '/0001' })}
          ${field('Proforma prefix', `<input class="inp" name="piPrefix" value="${esc(c.piPrefix)}" maxlength="8">`)}
          ${field('Default validity (days)', `<input class="inp" name="validityDays" value="${esc(c.validityDays)}" inputmode="numeric">`)}
          ${field('Default template', `<select class="sel" name="template">${TEMPLATES.map((t) => `<option value="${t.id}" ${c.template === t.id ? 'selected' : ''}>${t.name} — ${t.hint}</option>`).join('')}</select>`)}
          ${field('Signatory name', `<input class="inp" name="signatory" value="${esc(c.signatory)}">`)}
          <label class="check" style="align-self:end"><input type="checkbox" name="showThumbs" ${c.showThumbs !== false ? 'checked' : ''}> Show product images on quotations</label>
          <div class="span-2 uploader"><div class="up-prev" id="sigPrev">${c.signature ? `<img src="${c.signature}" alt="">` : icon('edit')}</div>
            <div><div class="lbl">Signature / company stamp</div><div class="hint">A transparent PNG works best.</div>
              <div class="up-btns"><label class="btn btn-sm">${icon('upload')} Upload<input type="file" accept="image/*" hidden id="sigFile"></label><button type="button" class="btn btn-sm btn-ghost" id="sigClr" ${c.signature ? '' : 'hidden'}>Remove</button></div></div></div>
          ${field('Default terms & conditions (one per line)', `<textarea class="ta" name="terms" rows="7">${esc(c.terms)}</textarea>`, { cls: 'span-2' })}
          ${field('Footer note', `<input class="inp" name="footer" value="${esc(c.footer)}">`, { cls: 'span-2' })}
        </div>`)}
      ${setSection('Backup & data', 'Everything is stored in this browser. Export a backup to move it to another device.', `
        <div class="actions">
          <button type="button" class="btn" id="exp">${icon('download')} Export JSON backup</button>
          <label class="btn">${icon('upload')} Import backup<input type="file" accept="application/json,.json" hidden id="imp"></label>
          <button type="button" class="btn btn-danger" id="rst">${icon('refresh')} Reset demo data</button>
        </div>
        <p class="hint" style="margin:12px 0 0">Demo data: company, GSTINs and contacts are fictional.</p>`)}
    </form>
    <aside class="side-sticky">
      <div class="card panel" style="--qb:${c.brand}"><h3>Brand colour</h3><p class="hint" style="margin:-4px 0 10px">Used across all quotation templates.</p><div id="swWrap">${swatchPicker(c.brand)}</div></div>
      <div class="card panel"><h3>Live preview</h3><div class="doc-stage" id="setStage"><div class="doc-scaler"></div></div></div>
    </aside>
  </div>`;
  const f = $('#coForm', el);
  const collect = () => {
    const g = (n) => (f[n] ? f[n].value.trim() : '');
    Object.assign(c, { name: g('name'), tagline: g('tagline'), address1: g('address1'), address2: g('address2'), city: g('city'), pincode: g('pincode'), state: f.state.value, gstin: g('gstin').toUpperCase(), phone: g('phone'), email: g('email'), website: g('website'),
      prefix: g('prefix') || 'QT', piPrefix: g('piPrefix') || 'PI', validityDays: Math.max(1, Math.round(num(g('validityDays'), 15))), template: f.template.value, signatory: g('signatory'), showThumbs: f.showThumbs.checked, terms: f.terms.value, footer: g('footer') });
    Object.assign(c.bank, { accName: g('accName'), bankName: g('bankName'), branch: g('branch'), accNo: g('accNo'), ifsc: g('ifsc').toUpperCase(), upi: g('upi') });
  };
  const preview = () => { const q = sampleQ(); const sc = $('#setStage .doc-scaler', el); if (q) { sc.innerHTML = renderQuoteDoc(q, c, { template: c.template }); requestAnimationFrame(() => fitDocs(el)); } else sc.innerHTML = '<p class="muted">Raise a quotation to see a preview.</p>'; };
  const livePrev = debounce(() => { collect(); preview(); if (!c.logo) $('#logoPrev', el).innerHTML = mono(); }, 250);
  f.addEventListener('input', livePrev);
  f.addEventListener('change', livePrev);
  const validate = () => {
    let ok = setInvalid(f.name, !f.name.value.trim());
    ok = setInvalid(f.gstin, f.gstin.value.trim() && !RX.gstin.test(f.gstin.value.trim().toUpperCase())) && ok;
    ok = setInvalid(f.email, f.email.value.trim() && !RX.email.test(f.email.value.trim())) && ok;
    ok = setInvalid(f.phone, f.phone.value.trim() && !validPhone(f.phone.value)) && ok;
    ok = setInvalid(f.pincode, f.pincode.value.trim() && !/^\d{6}$/.test(f.pincode.value.trim())) && ok;
    ok = setInvalid(f.ifsc, f.ifsc.value.trim() && !RX.ifsc.test(f.ifsc.value.trim().toUpperCase())) && ok;
    ok = setInvalid(f.accNo, f.accNo.value.trim() && !/^\d{9,18}$/.test(f.accNo.value.trim())) && ok;
    ok = setInvalid(f.upi, f.upi.value.trim() && !RX.upi.test(f.upi.value.trim())) && ok;
    return ok;
  };
  $('#saveCo', el).addEventListener('click', () => {
    if (!validate()) { const b = $('.field.invalid input', el); b && b.focus(); toast('Please fix the highlighted fields', 'error'); return; }
    collect(); Store.data.company = c; Store.save(); toast('Company profile saved', 'success'); renderShell();
  });
  f.addEventListener('submit', (e) => e.preventDefault());
  const up = (inputId, key, prevId, clrId, maxDim, fallback) => {
    $(inputId, el).addEventListener('change', async (e) => { try { c[key] = await readImageFile(e.target.files[0], maxDim, 'image/png'); $(prevId, el).innerHTML = `<img src="${c[key]}" alt="">`; $(clrId, el).hidden = false; preview(); toast('Image added — remember to save', 'success'); } catch (err) { toast(err.message, 'error'); } e.target.value = ''; });
    $(clrId, el).addEventListener('click', () => { c[key] = ''; $(prevId, el).innerHTML = fallback(); $(clrId, el).hidden = true; preview(); });
  };
  up('#logoFile', 'logo', '#logoPrev', '#logoClr', 400, mono);
  up('#sigFile', 'signature', '#sigPrev', '#sigClr', 420, () => icon('edit'));
  $('#swWrap', el).addEventListener('click', (e) => { const s = e.target.closest('[data-sw]'); if (!s) return; c.brand = s.dataset.sw; $('#swWrap', el).innerHTML = swatchPicker(c.brand); preview(); if (!c.logo) $('#logoPrev', el).innerHTML = mono(); });
  $('#swWrap', el).addEventListener('input', (e) => { if (e.target.matches('[data-swc]')) { c.brand = e.target.value; preview(); } });
  $('#exp', el).addEventListener('click', () => { downloadBlob(new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' }), 'quotecraft-backup-' + todayISO() + '.json'); toast('Backup exported', 'success'); });
  $('#imp', el).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      let data;
      try { data = JSON.parse(await file.text()); } catch (pe) { throw new Error('Not a QuoteCraft backup file — choose the .json file you exported'); }
      if (!data || !data.company || !Array.isArray(data.customers) || !Array.isArray(data.products) || !Array.isArray(data.quotes)) throw new Error('Not a QuoteCraft backup file');
      if (!(await confirmDialog({ title: 'Replace all data?', message: `Import ${data.customers.length} customers, ${data.products.length} products and ${data.quotes.length} quotations. Current data will be replaced.`, okText: 'Import' }))) return;
      data.counters = data.counters || {}; Store.data = data; Store.save(); toast('Backup imported', 'success'); renderShell(); route();
    } catch (err) { toast(err.message || 'Invalid file', 'error'); }
    e.target.value = '';
  });
  $('#rst', el).addEventListener('click', async () => { if (await confirmDialog({ title: 'Reset demo data?', message: 'All customers, products, quotations and settings will be replaced with the original demo data.', okText: 'Reset' })) { Store.reset(); toast('Demo data restored', 'success'); renderShell(); route(); } });
  preview();
}
