/* QuoteCraft — Raise / edit quotation */
'use strict';

let ED = null; // { q, isNew, dirty }
// Header row of the line-items grid. Module level: drawLines() runs before the rest of viewEditor's body,
// so a const declared inside viewEditor would still be uninitialised when editing a quotation that has lines.
const LI_HEAD = `<div class="li-head" aria-hidden="true"><span>#</span><span>Item</span><span class="r">Qty</span><span>Unit</span><span class="r">Rate (₹)</span><span class="r">Disc %</span><span>GST</span><span class="r">Amount (₹)</span><span></span></div>`;

function blankQuote(params) {
  const c = Store.company, date = todayISO();
  const q = {
    id: uid('qt'), type: 'quotation', number: '', date, validUntil: addDays(date, c.validityDays || 15),
    customerId: '', customer: null, subject: '', reference: '', items: [], addlDisc: 0, chargesLabel: 'Freight & handling', charges: 0,
    notes: '', terms: c.terms, status: 'draft', template: c.template || 'modern', createdAt: Date.now(), updatedAt: Date.now()
  };
  const cid = params && params.get('customer');
  if (cid && Store.customer(cid)) { q.customerId = cid; q.customer = clone(Store.customer(cid)); }
  return q;
}

function viewEditor(el, id, params) {
  if (id) {
    const src = Store.quote(id);
    if (!src) { el.innerHTML = `<div class="card">${emptyState('file', 'Quotation not found', 'It may have been deleted.', '<a class="btn btn-primary" href="#/quotes">Back</a>')}</div>`; return; }
    ED = { q: clone(src), isNew: false, dirty: false };
  } else ED = { q: blankQuote(params), isNew: true, dirty: false };
  const q = ED.q;
  const t = docTitle(q);
  el.innerHTML = `
  <div class="page-head">
    <div><h1>${ED.isNew ? 'Raise Quotation' : 'Edit ' + esc(t)}</h1><p><span id="qnum" class="qnum">${esc(q.number || Store.peekNumber(q.type, q.date))}</span> · ${ED.isNew ? 'number is assigned when you save' : 'last updated ' + fmtDate(toISO(new Date(q.updatedAt)))}</p></div>
    <div class="actions"><a class="btn btn-ghost" href="${ED.isNew ? '#/quotes' : '#/quote/view/' + q.id}">Cancel</a><button class="btn" data-save="draft">Save draft</button><button class="btn btn-primary" data-save="preview">Save & preview</button></div>
  </div>
  <div class="editor">
    <div class="editor-main">
      <section class="card ed-sec" id="stepCus">
        <div class="card-h"><h3>Customer</h3><button class="btn btn-sm btn-ghost" id="newCus">${icon('plus')} New customer</button></div>
        <div class="card-b" id="cusBox"></div>
      </section>
      <section class="card ed-sec">
        <div class="card-h"><div class="ch-l"><h3>Line items</h3><span class="sub" id="lineCount"></span></div><button class="btn btn-sm btn-ghost" id="newPrd">${icon('box')} New product</button></div>
        <div class="li-wrap"><div class="li-table" id="lines"></div></div>
        <div class="add-row" id="addRow">
          <button class="btn btn-sm" id="pickBtn">${icon('plus')} Add products</button>
          <button class="btn btn-sm btn-ghost" id="customLine">${icon('edit')} Add custom line</button>
        </div>
      </section>
      <section class="card ed-sec">
        <div class="card-h"><h3>Quotation details</h3></div>
        <div class="card-b"><div class="form-grid cols-3">
          ${field('Quotation date', `<input class="inp" type="date" id="fDate" value="${q.date}">`, { req: true })}
          <div class="field"><span>${q.type === 'proforma' ? 'Due by' : 'Valid until'} <em>*</em></span><input class="inp" type="date" id="fValid" value="${q.validUntil}"><small class="err">Must be on or after the quotation date</small>
            <div class="date-chips" id="validChips">${[7, 15, 30, 45].map((d) => `<button type="button" data-days="${d}">${d}d</button>`).join('')}</div></div>
          ${field('Status', `<select class="sel" id="fStatus">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${q.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>`)}
          ${field('Subject', `<input class="inp" id="fSubject" value="${esc(q.subject)}" placeholder="e.g. Office lighting upgrade – 2nd floor">`, { cls: 'span-2' })}
          ${field('Reference', `<input class="inp" id="fRef" value="${esc(q.reference)}" placeholder="Enquiry no. / PO / site visit">`)}
          ${field('Template', `<select class="sel" id="fTpl">${TEMPLATES.map((x) => `<option value="${x.id}" ${q.template === x.id ? 'selected' : ''}>${x.name} — ${x.hint}</option>`).join('')}</select>`)}
          ${field('Additional discount %', `<input class="inp num" id="fAddl" inputmode="decimal" value="${q.addlDisc || ''}" placeholder="0">`, { hint: 'Applied on the whole quotation before GST', err: '0 – 100' })}
          <div class="field"><span>Other charges</span><div class="inp-pair"><input class="inp" id="fChL" value="${esc(q.chargesLabel)}" aria-label="Other charges label"><input class="inp num" id="fCh" inputmode="decimal" value="${q.charges || ''}" placeholder="0.00" aria-label="Other charges amount (₹)"></div><small class="hint">Freight, packing, installation…</small></div>
        </div></div>
      </section>
      <section class="card ed-sec">
        <div class="card-h"><h3>Notes & terms</h3><button class="btn btn-sm btn-ghost" id="resetTerms">${icon('refresh')} Use default terms</button></div>
        <div class="card-b"><div class="form-grid">
          ${field('Notes to customer', `<textarea class="ta" id="fNotes" rows="2" placeholder="Anything the customer should know">${esc(q.notes)}</textarea>`, { cls: 'span-2' })}
          ${field('Terms & conditions (one per line)', `<textarea class="ta" id="fTerms" rows="6">${esc(q.terms)}</textarea>`, { cls: 'span-2' })}
        </div></div>
      </section>
      <div class="editor-pad"></div>
    </div>
    <aside class="editor-side">
      <div class="side-sticky">
        <div class="card sum-panel">
          <div class="card-h"><div class="seg side-tabs"><button class="on" data-tab="sum">Summary</button><button data-tab="prev">Preview</button></div></div>
          <div class="sum-card" id="sumCard"></div>
          <div class="mini-stage" id="prevCard" hidden><div class="doc-stage"><div class="doc-scaler" id="miniDoc"></div></div></div>
          <div class="sum-actions"><button class="btn btn-primary" data-save="preview">Save & preview</button><button class="btn" data-save="draft">Save draft</button></div>
        </div>
      </div>
    </aside>
  </div>
  <div class="mobile-bar"><button class="tot" data-sumsheet aria-label="View totals"><small>Total · <span id="mbItems">0 items</span></small><b id="mbTotal">₹0.00</b></button><button class="btn" data-save="draft">Draft</button><button class="btn btn-primary" data-save="preview">Save & preview</button></div>`;

  drawCustomer(); drawLines(); updateTotals(); syncValidChips();

  // events
  $('#newCus', el).onclick = () => openCustomerModal(null, (c) => setCustomer(c.id));
  $('#pickBtn', el).onclick = openPicker;
  $('#newPrd', el).onclick = () => openProductModal(null, (p) => { addProducts([{ p, qty: 1 }]); });
  $('#customLine', el).onclick = () => { q.items.push({ pid: '', name: '', description: '', hsn: '', unit: 'Nos', qty: 1, rate: 0, disc: 0, gst: 18, image: '' }); drawLines(); updateTotals(); const ins = $$('.ln-name', el); ins[ins.length - 1].focus(); };
  $('#resetTerms', el).onclick = () => { $('#fTerms', el).value = Store.company.terms; q.terms = Store.company.terms; toast('Default terms restored'); updateTotals(); };
  const bindVal = (sel, key, fn = (v) => v) => $(sel, el).addEventListener('input', (e) => { q[key] = fn(e.target.value); ED.dirty = true; updateTotals(); });
  bindVal('#fSubject', 'subject'); bindVal('#fRef', 'reference'); bindVal('#fNotes', 'notes'); bindVal('#fTerms', 'terms'); bindVal('#fChL', 'chargesLabel');
  bindVal('#fCh', 'charges', (v) => Math.max(0, num(v)));
  bindVal('#fAddl', 'addlDisc', (v) => { const n = num(v); setInvalid($('#fAddl', el), n < 0 || n > 100); return Math.min(100, Math.max(0, n)); });
  $('#fStatus', el).onchange = (e) => { q.status = e.target.value; };
  $('#fTpl', el).onchange = (e) => { q.template = e.target.value; updateTotals(); };
  $('#fDate', el).addEventListener('change', (e) => {
    const old = q.date; q.date = e.target.value || todayISO();
    const span = daysBetween(old, q.validUntil); q.validUntil = addDays(q.date, span > 0 ? span : (Store.company.validityDays || 15)); $('#fValid', el).value = q.validUntil;
    if (ED.isNew) $('#qnum', el).textContent = Store.peekNumber(q.type, q.date);
    syncValidChips(); updateTotals();
  });
  $('#fValid', el).addEventListener('change', (e) => { q.validUntil = e.target.value; setInvalid(e.target, q.validUntil < q.date); syncValidChips(); updateTotals(); });
  $('#validChips', el).onclick = (e) => { const b = e.target.closest('[data-days]'); if (!b) return; q.validUntil = addDays(q.date, +b.dataset.days); $('#fValid', el).value = q.validUntil; setInvalid($('#fValid', el), false); syncValidChips(); updateTotals(); };
  $$('[data-save]', el).forEach((b) => b.addEventListener('click', () => saveQuote(b.dataset.save)));
  $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => {
    $$('[data-tab]', el).forEach((x) => x.classList.toggle('on', x === b));
    $('#sumCard', el).hidden = b.dataset.tab !== 'sum'; $('#prevCard', el).hidden = b.dataset.tab !== 'prev';
    updateTotals();
  }));
  $('[data-sumsheet]', el).onclick = () => openModal({ title: 'Quotation summary', size: 'sm', body: `<div id="sheetSum" class="sum-card flush">${summaryHTML(calcQuote(q, Store.company))}</div>`, footer: `<span class="grow"></span><button class="btn" data-close>Close</button><button class="btn btn-primary" data-close data-sheetsave>Save & preview</button>`, onMount(m) { $('[data-sheetsave]', m.parentNode).addEventListener('click', () => saveQuote('preview')); } });

  /* ---------- customer ---------- */
  function setCustomer(cid) { const c = Store.customer(cid); q.customerId = cid; q.customer = c ? clone(c) : null; ED.dirty = true; drawCustomer(); updateTotals(); }
  function drawCustomer() {
    const box = $('#cusBox', el); const co = Store.company;
    if (q.customer) {
      const c = q.customer, inter = (c.state || co.state) !== co.state;
      box.innerHTML = `<div class="cus-card">${thumbBox(c.company)}<div class="info"><b>${esc(c.company)}</b>
        <div>${esc(c.contact || '')}${c.phone ? ' · ' + esc(c.phone) : ''}${c.email ? ' · ' + esc(c.email) : ''}</div>
        <div class="muted">${esc((c.billing || '').replace(/,?\s*\n/g, ', '))}</div>
        <div class="gst-mode"><span class="tag ${inter ? 'amber' : 'gray'}">${inter ? 'Inter-state · IGST' : 'Intra-state · CGST + SGST'}</span><span class="tag gray t-mono">${esc(c.gstin || 'Unregistered')}</span><span class="tag gray">${esc(stateName(c.state))}</span></div></div>
        <div class="cus-ops">${Store.customer(c.id) ? `<button class="btn btn-sm btn-ghost btn-icon" id="editCus" aria-label="Edit customer" title="Edit customer">${icon('edit')}</button>` : ''}<button class="btn btn-sm" id="chgCus">Change</button></div></div>`;
      $('#chgCus', el).onclick = () => { q.customer = null; q.customerId = ''; drawCustomer(); updateTotals(); setTimeout(() => $('#cusSearch', el).focus(), 0); };
      const ec = $('#editCus', el); if (ec) ec.onclick = () => openCustomerModal(Store.customer(c.id), (nc) => setCustomer(nc.id));
      return;
    }
    box.innerHTML = `<div class="combo" id="combo"><div class="inp-group">${icon('search')}<input class="inp" id="cusSearch" placeholder="Search customer by name, contact, phone or GSTIN…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="comboList"></div><div class="combo-list" id="comboList" role="listbox"></div></div>
      <div class="field" id="cusErr"><small class="err">Select a customer for this quotation</small></div>`;
    const inp = $('#cusSearch', el), list = $('#comboList', el), combo = $('#combo', el);
    let hl = 0, items = [];
    const render = () => {
      const s = inp.value.toLowerCase().trim();
      items = Store.data.customers.filter((c) => !s || [c.company, c.contact, c.phone, c.gstin, c.billing].join(' ').toLowerCase().includes(s)).slice(0, 30);
      hl = Math.min(hl, Math.max(0, items.length - 1));
      list.innerHTML = items.map((c, i) => `<div class="combo-opt ${i === hl ? 'hl' : ''}" role="option" data-cid="${c.id}">${thumbBox(c.company)}<div style="min-width:0"><b>${esc(c.company)}</b><small>${esc(c.contact || '')} · ${esc(stateName(c.state))}${c.gstin ? ' · ' + esc(c.gstin) : ''}</small></div></div>`).join('') +
        `<div class="combo-opt combo-new" data-newc>${icon('plus')} Add “${esc(inp.value.trim() || 'new customer')}”</div>`;
    };
    const open = () => { combo.classList.add('open'); inp.setAttribute('aria-expanded', 'true'); render(); };
    inp.addEventListener('focus', open);
    inp.addEventListener('input', () => { hl = 0; open(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(items.length - 1, hl + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[hl]) setCustomer(items[hl].id); }
      else if (e.key === 'Escape') { combo.classList.remove('open'); }
    });
    list.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const o = e.target.closest('[data-cid]'); if (o) return setCustomer(o.dataset.cid);
      if (e.target.closest('[data-newc]')) { const name = inp.value.trim(); combo.classList.remove('open'); openCustomerModal(name ? { company: name } : null, (c) => setCustomer(c.id)); }
    });
    inp.addEventListener('blur', () => setTimeout(() => combo.classList.remove('open'), 120));
  }

  /* ---------- lines (compact editable grid) ---------- */
  function lineHTML(it, i, cl) {
    return `<div class="line" data-i="${i}">
      <div class="li-c li-idx">${i + 1}</div>
      <div class="li-c li-item">${it.image ? `<span class="thumb sm"><img src="${it.image}" alt=""></span>` : ''}<input class="inp ln-name" value="${esc(it.name)}" placeholder="Item name" aria-label="Item ${i + 1} name"></div>
      <label class="li-c li-qty"><span class="m-lbl">Qty</span><input class="inp num ln-qty" inputmode="decimal" value="${fmtQty(it.qty)}" aria-label="Quantity"></label>
      <label class="li-c li-unit"><span class="m-lbl">Unit</span><select class="sel ln-unit" aria-label="Unit">${[...new Set([...UNITS, it.unit])].map((u) => `<option ${u === it.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
      <label class="li-c li-rate"><span class="m-lbl">Rate (₹)</span><input class="inp num ln-rate" inputmode="decimal" value="${it.rate}" aria-label="Rate"></label>
      <label class="li-c li-disc"><span class="m-lbl">Disc %</span><input class="inp num ln-disc" inputmode="decimal" value="${it.disc || ''}" placeholder="0" aria-label="Discount %"></label>
      <label class="li-c li-gst"><span class="m-lbl">GST</span><select class="sel ln-gst" aria-label="GST rate">${GST_RATES.map((g) => `<option value="${g}" ${+it.gst === g ? 'selected' : ''}>${g}%</option>`).join('')}</select></label>
      <div class="li-c li-amt"><b data-amt>${fmtINR(cl.net, false)}</b><small data-amtsub>${amtSub(cl)}</small></div>
      <div class="li-c li-ops"><button type="button" class="btn btn-ghost btn-xs btn-icon" data-lmore aria-label="Line options" title="Move line">${icon('more')}</button><button type="button" class="btn btn-ghost btn-xs btn-icon btn-danger" data-rm aria-label="Remove line" title="Remove line">${icon('trash')}</button></div>
      <div class="li-c li-desc"><textarea class="ta ln-desc" rows="1" placeholder="Description (optional)" aria-label="Description">${esc(it.description)}</textarea><label class="li-hsn"><span>HSN/SAC</span><input class="inp ln-hsn" value="${esc(it.hsn || '')}" aria-label="HSN/SAC"></label></div>
    </div>`;
  }
  function amtSub(cl) { return cl.lineDisc ? `Disc −${fmtINR(cl.lineDisc, false)}` : `GST ${fmtINR(cl.tax, false)}`; }
  function drawLines() {
    const box = $('#lines', el);
    const calc = calcQuote(q, Store.company);
    $('#lineCount', el).textContent = q.items.length ? q.items.length + ' item' + (q.items.length === 1 ? '' : 's') + ' · ' + fmtQty(calc.qtyTotal) + ' qty' : '';
    box.innerHTML = q.items.length ? LI_HEAD + q.items.map((it, i) => lineHTML(it, i, calc.lines[i])).join('')
      : `<div class="drop-empty"><div class="em-art">${icon('box')}</div><h3>No items yet</h3><p>Pick products from your master — rates fill in automatically and stay editable.</p><div class="actions" style="justify-content:center"><button class="btn btn-primary btn-sm" data-pick>${icon('plus')} Add products</button><button class="btn btn-sm" data-custom>Add custom line</button></div></div>`;
    $('#addRow', el).style.display = q.items.length ? '' : 'none';
    $$('.ln-desc', box).forEach(autoGrow);
  }
  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(120, Math.max(30, ta.scrollHeight + 2)) + 'px'; }
  function refreshLine(i) {
    const row = $(`.line[data-i="${i}"]`, el); if (!row) return;
    const cl = calcQuote(q, Store.company).lines[i];
    $('[data-amt]', row).textContent = fmtINR(cl.net, false);
    $('[data-amtsub]', row).textContent = amtSub(cl);
  }
  function moveLine(i, dir) { const j = i + dir; if (j < 0 || j >= q.items.length) return; [q.items[i], q.items[j]] = [q.items[j], q.items[i]]; ED.dirty = true; drawLines(); updateTotals(); }
  function removeLine(i) {
    const removed = q.items.splice(i, 1)[0]; ED.dirty = true; drawLines(); updateTotals();
    toastUndo(`Removed ${removed.name || 'line'}`, () => { q.items.splice(i, 0, removed); drawLines(); updateTotals(); });
  }
  const linesEl = $('#lines', el);
  linesEl.addEventListener('input', (e) => {
    const row = e.target.closest('.line'); if (!row) return; const i = +row.dataset.i, it = q.items[i]; const t = e.target;
    if (t.classList.contains('ln-name')) it.name = t.value;
    else if (t.classList.contains('ln-desc')) { it.description = t.value; autoGrow(t); }
    else if (t.classList.contains('ln-qty')) it.qty = Math.max(0, num(t.value));
    else if (t.classList.contains('ln-rate')) it.rate = Math.max(0, num(t.value));
    else if (t.classList.contains('ln-disc')) it.disc = Math.min(100, Math.max(0, num(t.value)));
    else if (t.classList.contains('ln-hsn')) it.hsn = t.value;
    ED.dirty = true; refreshLine(i); updateTotals();
  });
  linesEl.addEventListener('change', (e) => {
    const row = e.target.closest('.line'); if (!row) return; const i = +row.dataset.i, it = q.items[i];
    if (e.target.classList.contains('ln-unit')) it.unit = e.target.value;
    if (e.target.classList.contains('ln-gst')) it.gst = +e.target.value;
    if (e.target.classList.contains('ln-qty') && it.qty <= 0) { it.qty = 1; e.target.value = 1; toast('Quantity must be more than zero'); }
    refreshLine(i); updateTotals();
  });
  linesEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-pick]')) return openPicker();
    if (e.target.closest('[data-custom]')) return $('#customLine', el).click();
    const row = e.target.closest('.line'); if (!row) return; const i = +row.dataset.i;
    const lm = e.target.closest('[data-lmore]');
    if (lm) {
      openMenu(lm, [
        { icon: 'chevU', label: 'Move up', onClick: () => moveLine(i, -1) },
        { icon: 'chevD', label: 'Move down', onClick: () => moveLine(i, 1) },
        { icon: 'copy', label: 'Duplicate line', onClick: () => { q.items.splice(i + 1, 0, clone(q.items[i])); ED.dirty = true; drawLines(); updateTotals(); } },
        '-',
        { icon: 'trash', label: 'Remove line', danger: true, onClick: () => removeLine(i) }
      ]);
      return;
    }
    if (e.target.closest('[data-rm]')) removeLine(i);
  });

  function addProducts(sel) {
    sel.forEach(({ p, qty }) => {
      const ex = q.items.find((x) => x.pid === p.id);
      if (ex) ex.qty = r2(num(ex.qty) + qty);
      else q.items.push({ pid: p.id, name: p.name, description: p.description || '', hsn: p.hsn || '', unit: p.unit, qty, rate: p.rate, disc: 0, gst: p.gst, image: p.image || '' });
    });
    ED.dirty = true; drawLines(); updateTotals();
    toast(`${sel.length} product${sel.length === 1 ? '' : 's'} added`, 'success');
  }

  function openPicker() {
    const pick = new Map(); const st = { s: '', cat: 'All' };
    const m = openModal({
      title: 'Add products', size: 'lg',
      body: `<div class="pick-tools"><div class="inp-group">${icon('search')}<input class="inp" id="pkS" type="search" placeholder="Search products, SKU, HSN…" autocomplete="off"></div><div class="scroll-x"><div class="chips" id="pkC"></div></div></div><div class="pick-list" id="pkL"></div>`,
      footer: `<span class="pick-count grow" id="pkN">No products selected</span><button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="pkAdd" disabled>Add to quotation</button>`,
      onMount(mel) {
        const draw = () => {
          const cats = ['All', ...productCategories()];
          $('#pkC', mel).innerHTML = cats.map((c) => `<button class="chip ${st.cat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
          const s = st.s.toLowerCase();
          const list = Store.data.products.filter((p) => (st.cat === 'All' || p.category === st.cat) && (!s || [p.name, p.sku, p.hsn, p.description, p.category].join(' ').toLowerCase().includes(s)));
          $('#pkL', mel).innerHTML = list.length ? list.map((p) => { const on = pick.has(p.id); const inQ = q.items.some((x) => x.pid === p.id); return `<div class="pick ${on ? 'on' : ''}" data-p="${p.id}" role="checkbox" aria-checked="${on}" tabindex="0">
            <span class="cb">${on ? icon('check') : ''}</span>${prodThumb(p)}
            <div style="min-width:0"><div class="nm">${esc(p.name)}</div><div class="mt">${esc(p.sku || '')} · ${esc(p.category || '')} · GST ${p.gst}%${inQ ? ' · <b class="in-q">in quotation</b>' : ''}</div></div>
            <div class="rt"><b>${fmtINR(p.rate)}<small> /${esc(p.unit)}</small></b>${on ? `<div class="stepper" data-stop><button type="button" data-d="-1" aria-label="Decrease">${icon('minus')}</button><input value="${fmtQty(pick.get(p.id))}" inputmode="decimal" data-q aria-label="Quantity"><button type="button" data-d="1" aria-label="Increase">${icon('plus')}</button></div>` : ''}</div>
          </div>`; }).join('') : emptyState('search', 'No products found', 'Try a different search, or create a new product.', `<button class="btn" data-newp>${icon('plus')} New product</button>`);
          footer();
        };
        // Selection summary only — quantity edits update this without re-rendering the list under the cursor
        const footer = () => {
          const n = pick.size, units = [...pick.values()].reduce((a, b) => a + b, 0);
          $('#pkN', mel.parentNode).textContent = n ? `${n} selected · ${fmtQty(units)} qty` : 'No products selected';
          const add = $('#pkAdd', mel.parentNode); add.disabled = !n; add.textContent = n ? `Add ${n} to quotation` : 'Add to quotation';
        };
        const toggle = (id) => { if (pick.has(id)) pick.delete(id); else pick.set(id, 1); draw(); };
        $('#pkS', mel).addEventListener('input', (e) => { st.s = e.target.value; draw(); });
        $('#pkC', mel).addEventListener('click', (e) => { const c = e.target.closest('[data-c]'); if (c) { st.cat = c.dataset.c; draw(); } });
        $('#pkL', mel).addEventListener('click', (e) => {
          if (e.target.closest('[data-newp]')) { m.close(); openProductModal({ name: st.s, unit: 'Nos', gst: 18, rate: '' }, (p) => addProducts([{ p, qty: 1 }])); return; }
          const row = e.target.closest('[data-p]'); if (!row) return;
          const d = e.target.closest('[data-d]');
          if (d) {
            const id = row.dataset.p, v = Math.max(1, r2(pick.get(id) + +d.dataset.d)); pick.set(id, v);
            const inp = $('[data-q]', row); if (inp) inp.value = fmtQty(v);
            footer(); return;
          }
          if (e.target.closest('[data-stop]')) return;
          toggle(row.dataset.p);
        });
        // Typing a quantity: keep the selection in sync as the user types; tidy the value when they leave the box
        const qtyOf = (inp) => Math.max(1, num(inp.value, 1));
        $('#pkL', mel).addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { pick.set(e.target.closest('[data-p]').dataset.p, qtyOf(e.target)); footer(); } });
        $('#pkL', mel).addEventListener('change', (e) => { if (e.target.matches('[data-q]')) { const v = qtyOf(e.target); pick.set(e.target.closest('[data-p]').dataset.p, v); e.target.value = fmtQty(v); footer(); } });
        $('#pkL', mel).addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target.matches('[data-p]')) { e.preventDefault(); toggle(e.target.dataset.p); setTimeout(() => { const r = $(`[data-p="${e.target.dataset.p}"]`, mel); r && r.focus(); }, 0); } });
        $('#pkAdd', mel.parentNode).addEventListener('click', () => { const sel = [...pick.entries()].map(([id, qty]) => ({ p: Store.product(id), qty })).filter((x) => x.p); m.close(); addProducts(sel); });
        draw();
      }
    });
  }

  /* ---------- totals ---------- */
  function syncValidChips() { const d = daysBetween(q.date, q.validUntil); $$('#validChips button', el).forEach((b) => b.classList.toggle('on', +b.dataset.days === d)); }
  function updateTotals() {
    const c = calcQuote(q, Store.company);
    $('#lineCount', el).textContent = q.items.length ? q.items.length + ' item' + (q.items.length === 1 ? '' : 's') + ' · ' + fmtQty(c.qtyTotal) + ' qty' : '';
    $('#sumCard', el).innerHTML = summaryHTML(c);
    $('#mbTotal', el).textContent = fmtINR(c.grand);
    $('#mbItems', el).textContent = q.items.length + ' item' + (q.items.length === 1 ? '' : 's');
    const sheet = $('#sheetSum'); if (sheet) sheet.innerHTML = summaryHTML(c);
    if (!$('#prevCard', el).hidden) { const tmp = clone(q); tmp.number = q.number || Store.peekNumber(q.type, q.date); $('#miniDoc', el).innerHTML = renderQuoteDoc(tmp, Store.company); requestAnimationFrame(() => fitDocs($('#prevCard', el))); }
  }
}

function summaryHTML(c) {
  const row = (k, v, cls = '') => `<div class="sum-row ${cls}"><span>${k}</span><b>${v}</b></div>`;
  return `${row(`Sub total <small>(${c.lines.length} item${c.lines.length === 1 ? '' : 's'})</small>`, fmtINR(c.subtotal))}
    ${c.lineDisc ? row('Item discounts', '− ' + fmtINR(c.lineDisc), 'neg') : ''}
    ${c.addlDisc ? row(`Additional discount (${fmtQty(c.addlPct)}%)`, '− ' + fmtINR(c.addlDisc), 'neg') : ''}
    <div class="sum-sep"></div>
    ${row('Taxable value', fmtINR(c.taxable))}
    ${c.rates.map((r) => c.inter ? row(`IGST @ ${fmtQty(r.rate)}%`, fmtINR(r.igst), 'sub') : row(`CGST ${fmtQty(r.rate / 2)}% + SGST ${fmtQty(r.rate / 2)}%`, fmtINR(r.cgst + r.sgst), 'sub')).join('')}
    ${row(c.inter ? 'Total IGST' : 'Total CGST + SGST', fmtINR(c.tax))}
    ${c.charges ? row('Other charges', fmtINR(c.charges)) : ''}
    ${c.roundOff ? row('Round off', (c.roundOff > 0 ? '+ ' : '− ') + fmtINR(Math.abs(c.roundOff))) : ''}
    <div class="sum-grand"><div class="lbl">Grand total</div><div class="val" id="grandVal">${fmtINR(c.grand)}</div></div>
    <div class="sum-words" id="grandWords">${esc(c.words)}</div>
    <div class="sum-supply"><span class="tag ${c.inter ? 'amber' : 'gray'}">${c.inter ? 'Inter-state supply · IGST' : 'Intra-state supply · CGST + SGST'}</span></div>`;
}

function toastUndo(msg, undo) {
  const box = $('#toasts'); const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="ti">${icon('trash')}</span><span class="tm">${esc(msg)}</span><button class="btn btn-sm btn-ghost">Undo</button>`;
  box.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 160); };
  el.querySelector('button').onclick = () => { undo(); kill(); };
  setTimeout(kill, 4500);
}

function saveQuote(mode) {
  const q = ED.q; const el = $('#view');
  if (!q.customer) { const f = $('#cusErr', el); if (f) f.classList.add('invalid'); $('#stepCus', el).scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Select a customer first', 'error'); const s = $('#cusSearch', el); s && s.focus({ preventScroll: true }); return; }
  if (!q.items.length) { toast('Add at least one product', 'error'); $('#lines', el).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const badName = q.items.findIndex((it) => !String(it.name).trim());
  if (badName >= 0) { toast(`Line ${badName + 1} needs an item name`, 'error'); const inp = $$('.ln-name', el)[badName]; inp && inp.focus(); return; }
  if (q.items.some((it) => !(num(it.qty) > 0))) { toast('Every line needs a quantity above zero', 'error'); return; }
  if (!q.validUntil || q.validUntil < q.date) { setInvalid($('#fValid', el), true); toast('Valid-until date must be on or after the quotation date', 'error'); return; }
  q.items.forEach((it) => { it.qty = num(it.qty); it.rate = r2(num(it.rate)); it.disc = num(it.disc); it.gst = num(it.gst); it.name = String(it.name).trim(); });
  // refresh customer snapshot from master
  const live = Store.customer(q.customerId); if (live) q.customer = clone(live);
  if (ED.isNew || !q.number) q.number = Store.takeNumber(q.type, q.date);
  q.updatedAt = Date.now();
  Store.upsert('quotes', q);
  toast(`${docTitle(q)} ${q.number} saved`, 'success');
  ED.dirty = false;
  if (mode === 'preview') location.hash = '#/quote/view/' + q.id;
  else location.hash = '#/quotes';
}
