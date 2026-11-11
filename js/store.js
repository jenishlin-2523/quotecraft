/* QuoteCraft — data store (localStorage) + demo seed */
'use strict';

const STORE_KEY = 'quotecraft.v1';

const DEFAULT_TERMS = [
  'Prices are in Indian Rupees and exclusive of GST unless stated; GST is charged as applicable at the time of billing.',
  'Payment: 50% advance along with the purchase order, balance against delivery / completion.',
  'Delivery within 10–15 working days from the date of confirmed order and advance.',
  'Installation, if quoted, is limited to the scope mentioned above. Civil work is excluded.',
  'Warranty as per manufacturer terms. Physical damage and voltage fluctuations are not covered.',
  'This quotation is valid until the date mentioned above. Subject to Nagercoil jurisdiction.'
].join('\n');

function seedCompany() {
  return {
    name: 'Lumina Interiors & Electricals',
    tagline: 'Lighting · Electricals · Turnkey Interiors',
    logo: '',
    address1: '42, Court Road, Vadasery',
    address2: 'Near Collectorate',
    city: 'Nagercoil', pincode: '629001', state: '33',
    gstin: '33AALFL4821K1ZQ', pan: 'AALFL4821K',
    phone: '+91 94430 21876', email: 'sales@luminainteriors.in', website: 'www.luminainteriors.in',
    bank: { accName: 'Lumina Interiors & Electricals', bankName: 'State Bank of India', branch: 'Nagercoil Main', accNo: '41285573092', ifsc: 'SBIN0000887', upi: 'luminainteriors@sbi' },
    signature: '', signatory: 'R. Karthikeyan, Proprietor',
    terms: DEFAULT_TERMS,
    prefix: 'QT', piPrefix: 'PI',
    brand: '#0F766E', template: 'modern', validityDays: 15, showThumbs: true,
    footer: 'Thank you for considering Lumina — we look forward to lighting up your space!'
  };
}

function seedCustomers() {
  const t = Date.now();
  const C = (company, contact, phone, email, billing, gstin, state, notes, shipping) => ({ id: uid('cus'), company, contact, phone, email, billing, shipping: shipping || '', gstin, state, notes: notes || '', createdAt: t });
  return [
    C('Sree Ganesh Textiles Pvt Ltd', 'Mr. S. Ganesan', '9842215560', 'purchase@sreeganeshtex.in', '17, Avinashi Road, Kumar Nagar,\nTiruppur – 641603, Tamil Nadu', '33AAKCS5521M1Z8', '33', 'Factory lighting upgrade – phase 2 expected in Q4.', 'Unit II, SIDCO Industrial Estate,\nMudalipalayam, Tiruppur – 641606'),
    C('Kanyakumari Medical Mission Hospital', 'Dr. Annie Jebaraj', '9443118902', 'admin@kmmhospital.org', 'Neyyoor Road, Marthandam,\nKanyakumari Dist – 629165, Tamil Nadu', '33AAATK7781R1ZX', '33', 'Prefers itemised quotes with warranty terms.'),
    C('Marina Bay Residency', 'Ms. Priya Raghavan', '9884034471', 'projects@marinabayresidency.com', '118, Santhome High Road, Mylapore,\nChennai – 600004, Tamil Nadu', '33AAFFM2190D1Z2', '33', 'Hotel renovation – 42 rooms.'),
    C('Kovai Tech Park LLP', 'Mr. Arun Prakash', '9500712288', 'facilities@kovaitechpark.in', 'Avinashi Road, Peelamedu,\nCoimbatore – 641004, Tamil Nadu', '33AADFK4410L1Z7', '33', ''),
    C('Travancore Spices Exports', 'Mr. Thomas Kurian', '9847055213', 'thomas@travancorespices.com', 'Willingdon Island, Mattancherry,\nKochi – 682003, Kerala', '32AAHFT6634E1Z9', '32', 'Warehouse + office interiors.'),
    C('Udupi Grand Hotels Pvt Ltd', 'Mr. Raghavendra Rao', '9845507761', 'purchase@udupigrand.co.in', '22, Residency Road,\nBengaluru – 560025, Karnataka', '29AACCU4410P1Z3', '29', ''),
    C('Deccan Software Labs', 'Ms. Sneha Reddy', '9989011234', 'admin@deccansoftlabs.com', 'Plot 14, HITEC City Phase 2, Madhapur,\nHyderabad – 500081, Telangana', '36AAGCD9921H1ZK', '36', 'New 60-seat office fit-out.'),
    C('Auroville Eco Builders', 'Mr. Julien Arnaud', '9443370125', 'contact@aurovilleeco.in', '5, Mission Street, White Town,\nPuducherry – 605001', '34AAJFA3381B1Z6', '34', 'Sustainable lighting only.')
  ];
}

function seedProducts() {
  const P = (name, sku, category, unit, rate, hsn, gst, description) => ({ id: uid('prd'), name, sku, category, unit, rate, hsn, gst, description, image: '' });
  return [
    P('LED Panel Light 2x2 ft 36W', 'LT-PNL-36', 'Lighting', 'Nos', 1450, '9405', 12, 'Edge-lit slim panel, 6500K cool daylight, 3000 lm, 2-year warranty'),
    P('LED Downlight 12W Round Slim', 'LT-DL-12', 'Lighting', 'Nos', 380, '9405', 12, 'Recessed concealed downlight, 4000K natural white'),
    P('COB Track Light 20W — Black', 'LT-TRK-20', 'Lighting', 'Nos', 1250, '9405', 12, 'Adjustable 24° beam, high CRI 90+ for display areas'),
    P('LED Strip Light 5 m (with Driver)', 'LT-STP-5M', 'Lighting', 'Roll', 890, '9405', 12, 'Warm white 3000K cove lighting, 120 LEDs/m'),
    P('Solar LED Street Light 30W', 'LT-SOL-30', 'Lighting', 'Nos', 7800, '9405', 5, 'All-in-one with LiFePO4 battery & motion sensor'),
    P('Modular Switch 6A 1-Way (Pack of 10)', 'EL-SW-6A', 'Electrical', 'Box', 650, '8536', 18, 'Polycarbonate, white gloss finish'),
    P('Modular Socket 6/16A Combined', 'EL-SKT-16', 'Electrical', 'Nos', 245, '8536', 18, 'With safety shutter, ISI marked'),
    P('MCB 32A Double Pole C-Curve', 'EL-MCB-32', 'Electrical', 'Nos', 720, '8536', 18, '10 kA breaking capacity'),
    P('Distribution Board 8-Way SPN', 'EL-DB-8W', 'Electrical', 'Nos', 2350, '8537', 18, 'Double-door IP43 powder-coated enclosure'),
    P('BLDC Ceiling Fan 1200 mm', 'EL-FAN-BL', 'Electrical', 'Nos', 3650, '8414', 18, '28W energy-efficient with remote, 5-star rated'),
    P('Inverter AC 1.5 Ton 5 Star', 'EL-AC-15', 'Electrical', 'Nos', 42500, '8415', 28, 'Copper condenser, R32 refrigerant, standard installation included'),
    P('FR PVC Copper Wire 1.5 sq mm (90 m)', 'WR-15-90', 'Wiring & Cables', 'Coil', 1980, '8544', 18, 'Flame-retardant, 1100V grade'),
    P('FR PVC Copper Wire 2.5 sq mm (90 m)', 'WR-25-90', 'Wiring & Cables', 'Coil', 3150, '8544', 18, 'Flame-retardant, 1100V grade'),
    P('Gypsum False Ceiling with GI Frame', 'IN-GYP-FC', 'Interiors', 'Sqft', 85, '6809', 18, '12.5 mm board, including putty & primer coat'),
    P('Modular Kitchen Base Unit (BWP Ply)', 'IN-KIT-BU', 'Interiors', 'Rft', 4200, '9403', 18, '18 mm BWP plywood, 1 mm laminate, soft-close hardware'),
    P('Wardrobe — Laminate Finish', 'IN-WRD-LM', 'Interiors', 'Sqft', 1450, '9403', 18, 'Hinged shutters, internal drawers & loft'),
    P('Vitrified Floor Tile 800×800 mm', 'IN-TIL-88', 'Interiors', 'Box', 1320, '6907', 18, 'Glossy finish, 2 tiles per box (1.28 sqm)'),
    P('Premium Interior Emulsion 20 L', 'IN-PNT-20', 'Interiors', 'Nos', 5850, '3209', 18, 'Low-VOC, washable, 2 coats coverage ~1800 sqft'),
    P('Ergonomic Mesh Office Chair', 'FR-CHR-MS', 'Furniture', 'Nos', 6850, '9401', 18, 'Synchro tilt, adjustable lumbar & armrests'),
    P('Linear Workstation — 4 Seater', 'FR-WS-4L', 'Furniture', 'Set', 38500, '9403', 18, '1200×600 mm tops, pedestals, wire management'),
    P('Electrical Wiring & Installation Labour', 'SV-ELC-PT', 'Services', 'Point', 350, '995461', 18, 'Concealed conduit wiring per point incl. termination'),
    P('Interior Design Consultation', 'SV-DSN-HR', 'Services', 'Hr', 1500, '998391', 18, 'Space planning, 3D visualisation & material selection'),
    P('Annual Maintenance Contract — Electrical', 'SV-AMC-EL', 'Services', 'Job', 24000, '998714', 18, '4 preventive visits + unlimited breakdown calls')
  ];
}

function seedQuotes(company, customers, products) {
  const T = todayISO();
  const byName = (n) => products.find((p) => p.name.startsWith(n));
  const line = (n, qty, disc = 0, rate) => { const p = byName(n); return { pid: p.id, name: p.name, description: p.description, hsn: p.hsn, unit: p.unit, qty, rate: rate != null ? rate : p.rate, disc, gst: p.gst, image: '' }; };
  const specs = [
    { c: 2, d: 0, st: 'draft', subj: 'Lighting & electrical upgrade – Rooms 101 to 142', items: [line('LED Panel', 42), line('LED Downlight', 84, 5), line('BLDC Ceiling', 42, 8), line('Electrical Wiring', 210)] },
    { c: 6, d: -1, st: 'sent', subj: 'Office fit-out – 60 seat workspace, Madhapur', items: [line('Linear Workstation', 15, 7), line('Ergonomic Mesh', 60, 10), line('LED Panel', 36), line('Gypsum False', 4200)], ch: 18500, chl: 'Freight & transit insurance' },
    { c: 0, d: -3, st: 'accepted', subj: 'Factory lighting upgrade – Unit II', items: [line('LED Panel', 120, 6), line('FR PVC Copper Wire 2.5', 14), line('Distribution Board', 6), line('MCB 32A', 24)] },
    { c: 4, d: -6, st: 'sent', subj: 'Warehouse & office interiors, Mattancherry', items: [line('Solar LED', 12), line('COB Track', 18), line('Vitrified Floor', 140, 4), line('Premium Interior', 8)], ch: 12000, chl: 'Transportation to Kochi' },
    { c: 1, d: -12, st: 'accepted', subj: 'OPD block electrical works', items: [line('Modular Switch', 30), line('Modular Socket', 120), line('FR PVC Copper Wire 1.5', 22), line('Electrical Wiring', 340), line('Annual Maintenance', 1)] },
    { c: 3, d: -20, st: 'rejected', subj: 'Cafeteria interiors – Tower B', items: [line('Gypsum False', 2600), line('LED Strip', 40), line('Interior Design', 24)] },
    { c: 5, d: -33, st: 'accepted', subj: 'Banquet hall lighting & HVAC', items: [line('Inverter AC', 8, 5), line('COB Track', 36), line('LED Strip', 28)], ch: 15000, chl: 'Freight to Bengaluru' },
    { c: 7, d: -47, st: 'expired', subj: 'Campus street lighting – solar', items: [line('Solar LED', 40, 8), line('Electrical Wiring', 40)] },
    { c: 2, d: -68, st: 'accepted', subj: 'Lobby & restaurant interiors', items: [line('Wardrobe', 320), line('Modular Kitchen', 26), line('Premium Interior', 12), line('Interior Design', 30)] },
    { c: 0, d: -96, st: 'sent', subj: 'Admin office AMC', items: [line('Annual Maintenance', 2), line('MCB 32A', 10)] },
    { c: 3, d: -125, st: 'accepted', subj: 'Server room electricals', items: [line('Inverter AC', 4), line('Distribution Board', 3), line('FR PVC Copper Wire 2.5', 10)] }
  ];
  specs.sort((a, b) => a.d - b.d);
  const counters = {};
  const quotes = specs.map((s, i) => {
    const date = addDays(T, s.d);
    const fy = fyOf(date); const key = company.prefix + '/' + fy;
    counters[key] = (counters[key] || 0) + 1;
    const cus = customers[s.c];
    return {
      id: uid('qt'), type: 'quotation', number: key + '/' + String(counters[key]).padStart(4, '0'),
      date, validUntil: addDays(date, company.validityDays), customerId: cus.id, customer: clone(cus),
      subject: s.subj, reference: i % 3 === 0 ? 'Enquiry dt. ' + fmtDate(addDays(date, -2)) : (i % 3 === 1 ? 'Site visit discussion' : ''),
      items: s.items, addlDisc: i === 2 ? 2 : 0, chargesLabel: s.chl || 'Freight & handling', charges: s.ch || 0,
      notes: 'Rates include delivery within Tamil Nadu. Installation support by our certified technicians.',
      terms: company.terms, status: s.st, template: ['modern', 'classic', 'minimal'][i % 3],
      createdAt: Date.now() - (-s.d) * 86400000, updatedAt: Date.now() - (-s.d) * 86400000
    };
  });
  quotes.reverse();
  return { quotes, counters };
}

function buildSeed() {
  const company = seedCompany();
  company.signature = makeSeal('Lumina Interiors & Electricals', 'Nagercoil', company.brand);
  const customers = seedCustomers();
  const products = seedProducts();
  const { quotes, counters } = seedQuotes(company, customers, products);
  return { version: 1, company, customers, products, quotes, counters, seededAt: Date.now() };
}

const Store = {
  data: null,
  storageOk: true,
  load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) this.data = JSON.parse(raw); } catch (e) { this.storageOk = false; this.data = null; }
    if (!this.data || !this.data.company || !Array.isArray(this.data.quotes)) { this.data = buildSeed(); this.save(); }
    this.data.counters = this.data.counters || {};
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); return true; }
    catch (e) { if (typeof toast === 'function') toast('Could not save — browser storage is full or blocked', 'error'); return false; }
  },
  reset() { this.data = buildSeed(); this.save(); },
  get company() { return this.data.company; },
  customer(id) { return this.data.customers.find((c) => c.id === id); },
  product(id) { return this.data.products.find((p) => p.id === id); },
  quote(id) { return this.data.quotes.find((q) => q.id === id); },
  seriesPrefix(type) { return type === 'proforma' ? (this.company.piPrefix || 'PI') : (this.company.prefix || 'QT'); },
  peekNumber(type, date) { const key = this.seriesPrefix(type) + '/' + fyOf(date); return key + '/' + String((this.data.counters[key] || 0) + 1).padStart(4, '0'); },
  takeNumber(type, date) { const key = this.seriesPrefix(type) + '/' + fyOf(date); this.data.counters[key] = (this.data.counters[key] || 0) + 1; return key + '/' + String(this.data.counters[key]).padStart(4, '0'); },
  upsert(coll, obj) { const arr = this.data[coll]; const i = arr.findIndex((x) => x.id === obj.id); if (i >= 0) arr[i] = obj; else arr.unshift(obj); this.save(); return obj; },
  remove(coll, id) { this.data[coll] = this.data[coll].filter((x) => x.id !== id); this.save(); }
};
