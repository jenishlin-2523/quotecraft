/* QuoteCraft — shared utilities */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : d; };
const clone = (o) => JSON.parse(JSON.stringify(o));

const _inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const fmtINR = (n, sym = true) => (n < 0 ? '-' : '') + (sym ? '₹' : '') + _inr.format(Math.abs(n || 0));
const fmtINR0 = (n) => '₹' + _inr0.format(Math.round(n || 0));
const fmtQty = (n) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : String(r2(v)); };
function fmtCompact(n) {
  n = n || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return '₹' + Math.round(n);
}

/* ---------- Dates (local, ISO yyyy-mm-dd) ---------- */
function toISO(d) { const z = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function todayISO() { return toISO(new Date()); }
function parseISO(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) { if (!iso) return '—'; const d = parseISO(iso); return String(d.getDate()).padStart(2, '0') + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
function fyOf(iso) { const d = parseISO(iso); const y = d.getFullYear(); const s = d.getMonth() >= 3 ? y : y - 1; return s + '-' + String((s + 1) % 100).padStart(2, '0'); }

/* ---------- Amount in words (Indian numbering) ---------- */
const _ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const _TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function _two(n) { return n < 20 ? _ONES[n] : _TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + _ONES[n % 10] : ''); }
function _three(n) { const h = Math.floor(n / 100), r = n % 100; return (h ? _ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? _two(r) : ''); }
function intToWordsIN(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'Zero';
  const out = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  if (crore) out.push(intToWordsIN(crore) + ' Crore');
  if (lakh) out.push(_two(lakh) + ' Lakh');
  if (th) out.push(_two(th) + ' Thousand');
  if (n) out.push(_three(n));
  return out.join(' ');
}
function amountInWords(x) {
  x = r2(Math.abs(x || 0));
  const rupees = Math.floor(x);
  const paise = Math.round((x - rupees) * 100);
  let s = 'Rupees ' + intToWordsIN(rupees);
  if (paise) s += ' and ' + _two(paise) + ' Paise';
  return s + ' Only';
}

/* ---------- Indian states (GST state codes) ---------- */
const STATES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};
const stateName = (code) => STATES[code] || '';
function stateOptions(sel) {
  return Object.entries(STATES).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([c, n]) => `<option value="${c}"${c === sel ? ' selected' : ''}>${esc(n)} (${c})</option>`).join('');
}

/* ---------- Validation ---------- */
const RX = {
  gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  upi: /^[\w.\-]{2,}@[a-zA-Z]{2,}$/
};
function validPhone(p) { const d = String(p || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; }
function waPhone(p) { let d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '0') d = d.slice(1); if (d.length === 10) d = '91' + d; return d; }

/* ---------- Colour helpers (no color-mix: html2canvas must parse computed colours) ---------- */
function hexToRgb(hex) { let h = String(hex || '#0F766E').replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(hex, amt) { const [r, g, b] = hexToRgb(hex); const t = amt < 0 ? 0 : 255, p = Math.abs(amt); return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p); }
function brandVars(hex) {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return `--b:${hex};--b-dark:${shade(hex, -0.28)};--b-deep:${shade(hex, -0.5)};--b-soft:${shade(hex, 0.92)};--b-soft2:${shade(hex, 0.96)};--b-mid:${shade(hex, 0.8)};--b-line:${shade(hex, 0.7)};--b-ink:${lum > 0.62 ? '#111827' : '#ffffff'};`;
}
function initials(name) {
  const w = String(name || '').replace(/[^A-Za-z0-9 &]/g, ' ').split(/\s+/).filter((x) => x && x !== '&' && !/^(and|of|the|pvt|ltd|llp)$/i.test(x));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}

/* ---------- Files ---------- */
function readImageFile(file, maxDim = 480, type = 'image/png') {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file'));
    if (file.size > 6 * 1024 * 1024) return reject(new Error('Image is larger than 6 MB'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read file'));
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        const ctx = c.getContext('2d');
        if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(type, 0.86));
      };
      img.onerror = () => reject(new Error('Unsupported image'));
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function copyText(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}
function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- Generated company seal (canvas) ---------- */
function makeSeal(name, city, color) {
  try {
    const S = 360, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'); const cx = S / 2;
    x.strokeStyle = color; x.fillStyle = color; x.globalAlpha = 0.88;
    x.lineWidth = 9; x.beginPath(); x.arc(cx, cx, 168, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(cx, cx, 150, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx, cx, 96, 0, Math.PI * 2); x.stroke();
    const text = (' ' + name.toUpperCase() + ' •').split('');
    x.font = '700 25px Inter, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const step = (Math.PI * 2) / text.length;
    text.forEach((ch, i) => { x.save(); x.translate(cx, cx); x.rotate(i * step - Math.PI / 2 + Math.PI / 2); x.translate(0, -124); x.fillText(ch, 0, 0); x.restore(); });
    x.font = '800 30px Inter, Arial, sans-serif'; x.fillText(String(city).toUpperCase(), cx, cx - 14);
    x.font = '600 18px Inter, Arial, sans-serif'; x.fillText('AUTHORISED', cx, cx + 22); x.fillText('SIGNATORY', cx, cx + 44);
    return c.toDataURL('image/png');
  } catch (e) { return ''; }
}

/* ---------- Icons (inline SVG, stroke) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>', chevU: '<path d="m18 15-6-6-6 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  more: '<circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/>',
  sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>', arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>', arrowDown: '<path d="M12 5v14M18 13l-6 6-6-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  drop: '<path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3z"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  whatsapp: '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.4.7.9 1.3 1.5 1.8.6.5 1.2.9 1.9 1.1.2.1.4 0 .5-.1l.6-.8c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.2.3.4 0 .5-.1 1.1-.5 1.5-.5.5-1.3.8-2 .7-1.4-.2-2.700-.9-3.800-1.900-1.100-1-2-2.300-2.400-3.700-.2-.8-.1-1.700.4-2.300z" fill="currentColor" stroke="none"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  rupee: '<path d="M6 3h12M6 8h12M14.5 21 6 13h3c6.7 0 6.7-10 0-10"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
function icon(name, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`; }
