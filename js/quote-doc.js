/* QuoteCraft — quotation maths, document renderer, share text, PDF */
'use strict';

const STATUS = {
  draft: { label: 'Draft', cls: 'st-draft' },
  sent: { label: 'Sent', cls: 'st-sent' },
  accepted: { label: 'Accepted', cls: 'st-accepted' },
  rejected: { label: 'Rejected', cls: 'st-rejected' },
  expired: { label: 'Expired', cls: 'st-expired' }
};
const TEMPLATES = [
  { id: 'modern', name: 'Modern', hint: 'Brand accent rule, light grid' },
  { id: 'classic', name: 'Classic', hint: 'Formal serif, ruled table' },
  { id: 'minimal', name: 'Minimal', hint: 'Monochrome, generous space' }
];
const docTitle = (q) => (q.type === 'proforma' ? 'Proforma Invoice' : 'Quotation');

/**
 * Totals. Per line: gross = qty × rate, line discount %, then additional discount % applied
 * proportionally to every line's taxable value, so GST is always charged on the net taxable value.
 */
function calcQuote(q, company) {
  const custState = (q.customer && q.customer.state) || company.state;
  const inter = custState !== company.state;
  const ad = Math.min(100, Math.max(0, num(q.addlDisc)));
  let subtotal = 0, lineDisc = 0, addlDisc = 0, taxable = 0, tax = 0;
  const byRate = {};
  const lines = (q.items || []).map((it) => {
    const qty = num(it.qty), rate = num(it.rate), d = Math.min(100, Math.max(0, num(it.disc))), g = num(it.gst);
    const gross = r2(qty * rate);
    const ld = r2(gross * d / 100);
    const net = r2(gross - ld);
    const extra = r2(net * ad / 100);
    const tv = r2(net - extra);
    const t = r2(tv * g / 100);
    subtotal += gross; lineDisc += ld; addlDisc += extra; taxable += tv; tax += t;
    const k = String(g);
    byRate[k] = byRate[k] || { rate: g, taxable: 0, tax: 0 };
    byRate[k].taxable += tv; byRate[k].tax += t;
    return { ...it, qty, rate, disc: d, gst: g, gross, lineDisc: ld, net, taxable: tv, tax: t, total: r2(tv + t) };
  });
  const rates = Object.values(byRate).sort((a, b) => a.rate - b.rate).map((r) => {
    const t = r2(r.tax), half = r2(t / 2);
    return { rate: r.rate, taxable: r2(r.taxable), tax: t, cgst: inter ? 0 : half, sgst: inter ? 0 : r2(t - half), igst: inter ? t : 0 };
  });
  tax = r2(tax);
  const cgst = r2(rates.reduce((s, r) => s + r.cgst, 0));
  const sgst = r2(rates.reduce((s, r) => s + r.sgst, 0));
  const igst = r2(rates.reduce((s, r) => s + r.igst, 0));
  const charges = r2(num(q.charges));
  const preRound = r2(r2(taxable) + tax + charges);
  const grand = Math.round(preRound);
  const roundOff = r2(grand - preRound);
  return {
    lines, rates, inter, subtotal: r2(subtotal), lineDisc: r2(lineDisc), addlDisc: r2(addlDisc), addlPct: ad,
    discount: r2(lineDisc + addlDisc), taxable: r2(taxable), tax, cgst, sgst, igst, charges, preRound, roundOff, grand,
    words: amountInWords(grand), qtyTotal: lines.reduce((s, l) => s + l.qty, 0)
  };
}

/* ---------- UPI QR (qrcode-generator → crisp PNG) ---------- */
function upiLink(company, q, amount) {
  const b = company.bank || {};
  if (!b.upi) return '';
  const p = new URLSearchParams({ pa: b.upi, pn: company.name, am: amount.toFixed(2), cu: 'INR', tn: (q.number || 'Quotation') });
  return 'upi://pay?' + p.toString();
}
const _qrCache = {};
function qrDataURL(text, px = 6) {
  if (!text || typeof qrcode !== 'function') return '';
  if (_qrCache[text]) return _qrCache[text];
  try {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), m = 2, c = document.createElement('canvas');
    c.width = c.height = (n + m * 2) * px;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#0b1220';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) x.fillRect((k + m) * px, (r + m) * px, px, px);
    return (_qrCache[text] = c.toDataURL('image/png'));
  } catch (e) { return ''; }
}

/* ---------- Document renderer ---------- */
function logoBlock(company, cls = '') {
  return company.logo
    ? `<div class="qd-logo ${cls}"><img src="${company.logo}" alt=""></div>`
    : `<div class="qd-logo qd-mono ${cls}"><span>${esc(initials(company.name))}</span></div>`;
}
function addrLines(company) {
  return [company.address1, company.address2, [company.city, company.pincode].filter(Boolean).join(' – ') + (company.state ? ', ' + stateName(company.state) : '')].filter(Boolean);
}
function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

function renderQuoteDoc(q, company, opts = {}) {
  const tpl = opts.template || q.template || company.template || 'modern';
  const c = calcQuote(q, company);
  const cus = q.customer || {};
  const title = docTitle(q);
  const showThumbs = company.showThumbs !== false;
  const b = company.bank || {};
  const upi = upiLink(company, q, c.grand);
  const qr = upi ? qrDataURL(upi) : '';
  const validDays = q.validUntil ? daysBetween(q.date, q.validUntil) : 0;
  const pos = stateName(cus.state || company.state);
  const addr = addrLines(company);
  const contact = [company.phone, company.email, company.website].filter(Boolean);

  const metaRows = [
    [title + ' No.', esc(q.number || '—')],
    ['Date', fmtDate(q.date)],
    [q.type === 'proforma' ? 'Due by' : 'Valid until', fmtDate(q.validUntil) + (validDays > 0 ? ` <small>(${validDays} days)</small>` : '')],
    ['Place of supply', esc(pos) + ((cus.state || company.state) ? ` <small>(${esc(cus.state || company.state)})</small>` : '')]
  ];

  const head = `<header class="qd-head">
      <div class="qd-brand">${logoBlock(company)}<div class="qd-brandtx"><div class="qd-co">${esc(company.name)}</div>${company.tagline ? `<div class="qd-tag">${esc(company.tagline)}</div>` : ''}</div></div>
      <div class="qd-titlebox"><div class="qd-title">${esc(title)}</div>
        <table class="qd-meta">${metaRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table></div>
    </header>`;

  const fromCard = `<div class="qd-party qd-from">
      <div class="qd-plabel">From</div>
      <div class="qd-pname">${esc(company.name)}</div>
      <div class="qd-ptext">${addr.map(esc).join('<br>')}</div>
      ${company.gstin ? `<div class="qd-pkv"><span>GSTIN</span>${esc(company.gstin)}</div>` : ''}
      ${company.phone ? `<div class="qd-ptext qd-pcontact">${esc(company.phone)}</div>` : ''}
    </div>`;
  const billCard = `<div class="qd-party qd-bill">
      <div class="qd-plabel">Bill to</div>
      <div class="qd-pname">${esc(cus.company || 'Customer')}</div>
      ${cus.contact || cus.phone ? `<div class="qd-patt">${cus.contact ? 'Attn: ' + esc(cus.contact) : ''}${cus.contact && cus.phone ? ' · ' : ''}${esc(cus.phone || '')}</div>` : ''}
      <div class="qd-ptext">${nl2br(cus.billing || '')}</div>
      ${cus.gstin ? `<div class="qd-pkv"><span>GSTIN</span>${esc(cus.gstin)}</div>` : ''}
      ${cus.email ? `<div class="qd-ptext qd-pcontact">${esc(cus.email)}</div>` : ''}
    </div>`;
  const shipCard = `<div class="qd-party qd-ship">
      <div class="qd-plabel">Ship to</div>
      <div class="qd-pname">${esc(cus.company || '')}</div>
      <div class="qd-ptext">${nl2br(cus.shipping || cus.billing || '')}</div>
      <div class="qd-pkv"><span>State</span>${esc(stateName(cus.state) || '—')}${cus.state ? ` (${esc(cus.state)})` : ''}</div>
    </div>`;

  const rows = c.lines.map((l, i) => `<tr>
      <td class="c-no">${i + 1}</td>
      <td class="c-item"><div class="qd-item">${showThumbs && l.image ? `<img class="qd-thumb" src="${l.image}" alt="">` : ''}
        <div><div class="qd-iname">${esc(l.name)}</div>${l.description ? `<div class="qd-idesc">${esc(l.description)}</div>` : ''}</div></div></td>
      <td class="c-hsn">${esc(l.hsn || '')}</td>
      <td class="c-qty">${fmtQty(l.qty)} <span class="qd-unit">${esc(l.unit || '')}</span></td>
      <td class="c-rate">${fmtINR(l.rate, false)}</td>
      <td class="c-disc">${l.disc ? fmtQty(l.disc) + '%' : '—'}</td>
      <td class="c-gst">${fmtQty(l.gst)}%</td>
      <td class="c-amt">${fmtINR(l.net, false)}</td>
    </tr>`).join('');

  const taxHead = c.inter ? '<th>IGST</th>' : '<th>CGST</th><th>SGST</th>';
  const taxRows = c.rates.map((r) => `<tr><td>${fmtQty(r.rate)}%</td><td>${fmtINR(r.taxable, false)}</td>${c.inter ? `<td>${fmtINR(r.igst, false)}</td>` : `<td>${fmtINR(r.cgst, false)}<small> @${fmtQty(r.rate / 2)}%</small></td><td>${fmtINR(r.sgst, false)}<small> @${fmtQty(r.rate / 2)}%</small></td>`}<td>${fmtINR(r.tax, false)}</td></tr>`).join('');

  const trow = (k, v, cls = '') => `<div class="qd-trow ${cls}"><span>${k}</span><b>${v}</b></div>`;
  const totals = [
    trow('Sub total', fmtINR(c.subtotal)),
    c.lineDisc ? trow('Item discounts', '− ' + fmtINR(c.lineDisc), 'neg') : '',
    c.addlDisc ? trow(`Additional discount (${fmtQty(c.addlPct)}%)`, '− ' + fmtINR(c.addlDisc), 'neg') : '',
    trow('Taxable value', fmtINR(c.taxable), 'strong'),
    c.inter ? trow('IGST', fmtINR(c.igst)) : trow('CGST', fmtINR(c.cgst)) + trow('SGST', fmtINR(c.sgst)),
    c.charges ? trow(esc(q.chargesLabel || 'Other charges'), fmtINR(c.charges)) : '',
    c.roundOff ? trow('Round off', (c.roundOff > 0 ? '+ ' : '− ') + fmtINR(Math.abs(c.roundOff))) : ''
  ].join('');

  const terms = String(q.terms || '').split('\n').map((t) => t.trim()).filter(Boolean);
  const sig = company.signature ? `<img class="qd-sigimg" src="${company.signature}" alt="">` : '<div class="qd-sigspace"></div>';

  const classes = ['qd', 'qd--' + tpl, opts.forPdf ? 'qd--pdf' : '', opts.forPrint ? 'qd--print' : ''].join(' ');
  return `<div class="${classes}" style="${brandVars(company.brand || '#0F766E')}">
    ${head}
    <section class="qd-parties">${fromCard}${billCard}${shipCard}</section>
    ${q.subject || q.reference ? `<div class="qd-subject">${q.subject ? `<div><span>Subject</span>${esc(q.subject)}</div>` : ''}${q.reference ? `<div><span>Reference</span>${esc(q.reference)}</div>` : ''}</div>` : ''}
    <table class="qd-items">
      <thead><tr><th class="c-no">#</th><th class="c-item">Item &amp; description</th><th class="c-hsn">HSN/SAC</th><th class="c-qty">Qty</th><th class="c-rate">Rate (₹)</th><th class="c-disc">Disc</th><th class="c-gst">GST</th><th class="c-amt">Amount (₹)</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="qd-empty">No items added yet</td></tr>'}</tbody>
    </table>
    <section class="qd-sum qd-avoid">
      <div class="qd-sumleft">
        <div class="qd-words"><div class="qd-k">Amount in words</div><div class="qd-wtext">${esc(c.words)}</div></div>
        ${c.rates.length ? `<table class="qd-tax"><thead><tr><th>GST rate</th><th>Taxable</th>${taxHead}<th>Total tax</th></tr></thead><tbody>${taxRows}</tbody>
          <tfoot><tr><td>Total</td><td>${fmtINR(c.taxable, false)}</td>${c.inter ? `<td>${fmtINR(c.igst, false)}</td>` : `<td>${fmtINR(c.cgst, false)}</td><td>${fmtINR(c.sgst, false)}</td>`}<td>${fmtINR(c.tax, false)}</td></tr></tfoot></table>
          <div class="qd-taxnote">${c.inter ? 'Inter-state supply — IGST applicable' : 'Intra-state supply — CGST + SGST applicable'}</div>` : ''}
        ${q.notes ? `<div class="qd-notes"><div class="qd-k">Notes</div><p>${nl2br(q.notes)}</p></div>` : ''}
      </div>
      <div class="qd-totals">${totals}
        <div class="qd-grand"><span>Grand total</span><b>${fmtINR(c.grand)}</b></div>
      </div>
    </section>
    <section class="qd-pay qd-avoid${qr ? '' : ' no-qr'}">
      <div class="qd-bank">
        <div class="qd-sh">Bank details</div>
        <div class="qd-kv"><span>Account name</span><b>${esc(b.accName || company.name)}</b></div>
        <div class="qd-kv"><span>Bank</span><b>${esc([b.bankName, b.branch].filter(Boolean).join(', ') || '—')}</b></div>
        <div class="qd-kv"><span>Account no.</span><b>${esc(b.accNo || '—')}</b></div>
        <div class="qd-kv"><span>IFSC</span><b>${esc(b.ifsc || '—')}</b></div>
        ${b.upi ? `<div class="qd-kv"><span>UPI ID</span><b>${esc(b.upi)}</b></div>` : ''}
      </div>
      ${qr ? `<div class="qd-upi"><img src="${qr}" alt="UPI QR"><div class="qd-upitext"><div class="qd-sh">Scan to pay</div>Any UPI app<br><b>${fmtINR(c.grand)}</b></div></div>` : ''}
      <div class="qd-sign">
        <div class="qd-for">For ${esc(company.name)}</div>
        ${sig}
        <div class="qd-sigline">${esc(company.signatory || 'Authorised Signatory')}</div>
        <div class="qd-sigsub">Authorised Signatory</div>
      </div>
    </section>
    ${terms.length ? `<section class="qd-terms qd-avoid">
      <div class="qd-sh">Terms &amp; conditions</div><ol>${terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    </section>` : ''}
    <footer class="qd-foot qd-avoid">
      <div class="qd-thanks">${esc(company.footer || 'Thank you for your business.')}</div>
      <div class="qd-fgen">${[company.email, company.website].filter(Boolean).map(esc).join(' · ')}${company.email || company.website ? '<br>' : ''}This is a computer-generated ${esc(title.toLowerCase())}.</div>
    </footer>
  </div>`;
}

/* ---------- Share text ---------- */
function shareText(q, company, plain = false) {
  const c = calcQuote(q, company);
  const B = (s) => (plain ? s : '*' + s + '*');
  const cus = q.customer || {};
  const greet = cus.contact ? 'Dear ' + cus.contact + ',' : 'Dear Sir/Madam,';
  const t = docTitle(q);
  const lines = c.lines.slice(0, 8).map((l, i) => `${i + 1}. ${l.name} — ${fmtQty(l.qty)} ${l.unit} × ${fmtINR(l.rate)}`);
  if (c.lines.length > 8) lines.push(`…and ${c.lines.length - 8} more item(s)`);
  const out = [
    greet, '',
    `Greetings from ${B(company.name)}!`,
    `Thank you for your enquiry. Please find our ${t.toLowerCase()} below:`, '',
    `${B(t + ' No:')} ${q.number}`,
    `${B('Date:')} ${fmtDate(q.date)}   ${B(q.type === 'proforma' ? 'Due by:' : 'Valid till:')} ${fmtDate(q.validUntil)}`,
    q.subject ? `${B('Subject:')} ${q.subject}` : null, '',
    B(`Items (${c.lines.length}):`), ...lines, '',
    `Taxable value: ${fmtINR(c.taxable)}`,
    c.inter ? `IGST: ${fmtINR(c.igst)}` : `CGST + SGST: ${fmtINR(c.cgst + c.sgst)}`,
    c.charges ? `${q.chargesLabel || 'Other charges'}: ${fmtINR(c.charges)}` : null,
    B(`Grand Total: ${fmtINR(c.grand)}`),
    `(${c.words})`, '',
    company.bank && company.bank.upi ? `Pay via UPI: ${company.bank.upi}` : null,
    company.bank && company.bank.accNo ? `Bank: ${company.bank.bankName || ''} · A/c ${company.bank.accNo} · IFSC ${company.bank.ifsc}` : null,
    '', 'The detailed PDF is attached / shared separately. Happy to clarify anything.', '',
    'Warm regards,', company.signatory ? company.signatory.split(',')[0] : company.name, company.name, company.phone
  ].filter((x) => x !== null);
  return out.join('\n');
}

/* ---------- PDF (html2pdf.js) ---------- */
function pdfFileName(q) { return (docTitle(q) + '-' + String(q.number || 'draft').replace(/[\/\\]+/g, '-') + '-' + String((q.customer && q.customer.company) || '').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 30)).replace(/-+$/, '') + '.pdf'; }
function pdfWorker(q, company, template) {
  if (typeof html2pdf !== 'function') throw new Error('PDF engine not loaded (offline?). Use Print → Save as PDF instead.');
  const holder = document.createElement('div');
  holder.innerHTML = renderQuoteDoc(q, company, { template, forPdf: true });
  const el = holder.firstElementChild;
  return html2pdf().set({
    margin: [6, 0, 8, 0],
    filename: pdfFileName(q),
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, letterRendering: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.qd-items tr', '.qd-avoid', '.qd-parties', '.qd-head'] }
  }).from(el);
}
async function pdfBlob(q, company, template) { return pdfWorker(q, company, template).outputPdf('blob'); }
async function pdfSave(q, company, template) { return pdfWorker(q, company, template).save(); }
