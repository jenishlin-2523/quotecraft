<p align="center"><img src="assets/brand/logo.png" alt="QuoteCraft" width="240"></p>

# QuoteCraft — Product Guide

QuoteCraft is a browser-based quotation app for Indian small businesses. You keep a list of customers and a list of products, raise GST-ready quotations in a few clicks, and send them to customers as a branded A4 document: as a PDF, printed, by email, or through the phone's share sheet. A quotation can also be turned into a proforma invoice.

The whole app runs in the browser. There is no server, no login and no database: all data is saved in the browser's local storage on the device you use.

**Live app:** https://quotecraft-lumina.vercel.app

---

## Contents

1. [What QuoteCraft does](#1-what-quotecraft-does)
2. [Getting started](#2-getting-started)
3. [Screens and navigation](#3-screens-and-navigation)
4. [Dashboard](#4-dashboard)
5. [Quotations list](#5-quotations-list)
6. [Raising and editing a quotation](#6-raising-and-editing-a-quotation)
7. [Viewing, sharing and printing](#7-viewing-sharing-and-printing)
8. [The quotation document](#8-the-quotation-document)
9. [Templates and brand colour](#9-templates-and-brand-colour)
10. [How totals and GST are calculated](#10-how-totals-and-gst-are-calculated)
11. [Quotation numbering](#11-quotation-numbering)
12. [Status lifecycle](#12-status-lifecycle)
13. [Proforma invoices](#13-proforma-invoices)
14. [Customer master](#14-customer-master)
15. [Product master](#15-product-master)
16. [Company & settings](#16-company--settings)
17. [Data storage, backup and privacy](#17-data-storage-backup-and-privacy)
18. [Technical architecture](#18-technical-architecture)
19. [Data model](#19-data-model)
20. [Responsive design and accessibility](#20-responsive-design-and-accessibility)
21. [Deployment](#21-deployment)
22. [Known limitations and behaviours to be aware of](#22-known-limitations-and-behaviours-to-be-aware-of)

---

## 1. What QuoteCraft does

**Who it is for:** traders, contractors and service businesses in India who send quotations to customers and need them to be GST-correct, professional-looking and quick to share.

**Main capabilities**

| Area | What you get |
|---|---|
| Masters | A customer master (billing/shipping address, GSTIN, state) and a product & services master (rate, unit, HSN/SAC, GST %, image). |
| Raise Quotation | Pick a customer, add products from the master or as custom lines, set discounts and other charges. Totals update live. |
| GST | Works out CGST + SGST (same state) or IGST (different state) automatically from the customer's state, with a rate-wise tax breakup. |
| A4 document | A print-ready quotation with your logo, bank details, a UPI QR code for the exact amount, signature/stamp and terms. |
| Templates | Three document styles (Modern, Classic, Minimal) and a brand colour of your choice. |
| Sharing | Download PDF, print, email, or the phone's share sheet (with the PDF attached where supported). |
| Tracking | Statuses (Draft, Sent, Accepted, Rejected, Expired), a dashboard with conversion rate, a 6-month chart, pipeline, top customers and top products. |
| Proforma | Convert an accepted quotation into a proforma invoice with its own number series. |
| Backup | Export all data to a JSON file and import it on another device. |

---

## 2. Getting started

### Running it locally

There is no build step and no `package.json`. Either:

- open `index.html` directly in a browser, or
- serve the folder with any static server, for example:

```bash
npx serve .
```

An internet connection is needed the first time for the Google Fonts, the QR code library and the PDF library, which are loaded from a CDN (see [External libraries](#external-libraries)).

### Demo data

On first load, when the browser has no saved QuoteCraft data, the app fills itself with demo data so every screen has something to show:

- **Company:** *Lumina Interiors & Electricals*, Nagercoil, Tamil Nadu, with a generated round company seal as the signature
- **8 customers** across Tamil Nadu, Kerala, Karnataka, Telangana and Puducherry, so you see both intra-state and inter-state GST
- **23 products and services** in Lighting, Electrical, Wiring & Cables, Interiors, Furniture and Services
- **11 quotations** spread over the last ~4 months in every status and all three templates

All demo names, GSTINs and contacts are fictional. You can restore the demo data at any time from **Company & settings → Backup & data → Reset demo data**.

### First-time setup for a real business

1. Go to **Company & settings** and enter your business profile, GSTIN, state, bank and UPI details. Upload your logo and signature/stamp.
2. Set your quotation number prefix, default validity, default template and standard terms.
3. Click **Save changes**.
4. Replace the demo customers and products with your own (or start clean by deleting them).
5. Click **Raise Quotation**.

---

## 3. Screens and navigation

The app is a single page. Each screen has its own URL hash, so the browser back button and bookmarks work.

| Screen | URL | Purpose |
|---|---|---|
| Dashboard | `#/dashboard` (default) | Overview of quoting activity |
| Quotations | `#/quotes` | List of all quotations and proformas. Accepts `?status=sent` and `?q=search` |
| Raise Quotation | `#/quote/new` | New quotation. Accepts `?customer=<id>` to pre-select a customer |
| Edit quotation | `#/quote/edit/<id>` | Edit an existing quotation |
| View quotation | `#/quote/view/<id>` | A4 preview, sharing, template, status and actions |
| Customers | `#/customers` | Customer master |
| Products & services | `#/products` | Product master |
| Company & settings | `#/settings` | Company profile, bank, defaults, backup |

**Sidebar** (white, minimal), from top to bottom:

- the QuoteCraft logo, linking to the dashboard
- a **Raise Quotation** button
- **Workspace:** Dashboard, Quotations (with a live count)
- **Masters:** Customers, Products & services
- **Setup:** Company & settings
- your company name and place at the bottom, linking to settings

The current page is highlighted with a light-blue tint. Hovering over the sidebar shows a small **«** toggle on its edge. It collapses the sidebar to icons only, and the browser remembers that choice.

**On phones** (768 px wide or less) the sidebar is replaced by a **bottom navigation bar**, like a standard phone app:

| Home | Quotations | **New** (raised + button) | Customers | More |
|---|---|---|---|---|
| Dashboard | Quotations list | Raise Quotation | Customer master | A sheet with Products & services, Company & settings, Needs attention (with count) and Search |

The current tab is shown in blue with a small bar on top. **More** stays highlighted while you are on Products or Settings, and shows a red dot when quotations need attention. On the quotation editor and quotation page the bottom bar is hidden, because those screens have their own action bar.

**Top bar:**

- **Global search:** searches quotations (number, customer, contact, subject), customers (name, contact, phone, email, GSTIN, address) and products (name, SKU, HSN, category) as you type, with results grouped by type.
  - Use ↑/↓ and Enter to open a result, or click it. A quotation opens its view page; a customer or product opens its list already filtered to that entry.
  - Press **/** or **Ctrl+K** from anywhere to jump to search.
  - On phones, search opens from the magnifier icon.
- **Bell:** shows how many quotations [need attention](#needs-attention). Click it for a short list; each item opens that quotation.
- **Company chip:** your company name and place, linking to settings. On phones it is replaced by a **+** button for Raise Quotation.

---

## 4. Dashboard

The dashboard summarises **quotations only**. Proforma invoices are left out of the figures so they are not counted twice.

**Period:** a selector at the top right (**Last 3 / 6 / 12 months**, default 6) sets the period for the summary cards, chart, pipeline and top lists. The browser remembers the choice. "Last 6 months" means the current month plus the 5 before it.

### Summary cards

Each card links to the matching filtered list and has a mini bar chart of the period, one bar per month.

| Card | Main figure | Badge | Mini chart |
|---|---|---|---|
| **Total quotations** (blue) | Quotations dated in the period | Change in count, this month vs last month (↑/↓ %, or *New* if last month had none) | Count per month |
| **Total quoted value** (violet) | Sum of grand totals in the period | Change in value, this month vs last month | Value per month |
| **Business won** (green) | Sum of grand totals of Accepted quotations in the period | **Win rate:** Accepted ÷ quotations that are not Draft, as a whole % | Won value per month |
| **Pending response** (orange) | Quotations currently **Sent** (any date, since this is their current state) | Their total value | Sent quotations per month |

### Charts

- **Quotation overview:** a smooth area chart per month of the period. The blue line is the total quoted value, the green line the Accepted value. Hover or tap for that month's figures and counts.
- **Quotation pipeline:** a donut of quotations by status, with the total in the middle. Next to it is one row per status with count and share. Click a row to open the Quotations list filtered to that status.

### Needs attention

A to-do list of quotations someone should act on, worked out from data the app already has. It is not affected by the period selector.

| Order | Situation | Rule | Action |
|---|---|---|---|
| 1 | **Expiring soon** | Status Sent and *Valid until* is today or within the next 3 days | **Follow up** |
| 2 | **No reply** | Status Sent, dated 7 or more days ago, still valid | **Follow up** |
| 3 | **Validity ended** | Status Sent and *Valid until* has passed (the app never marks these Expired by itself) | **Follow up** or **Mark expired** |
| 4 | **Not sent** | Status Draft | **Review & send** (opens the quotation) |

- **Follow up** opens a small menu:
  - **Email reminder:** opens your email app with a polite reminder that quotes the number, date, subject and grand total. It either states the validity date or, if the validity has ended, offers to reconfirm prices.
  - **Call** the customer's phone number, which opens the dialler on a phone.
  - **Open quotation**.
- **Follow up** does not change the status.
- The same menu is available from the **⋯** menu of any Sent quotation (*Follow up…*).
- The first 5 items are shown, with *Show all* for the rest. When nothing is pending, the card says *You're all caught up*.
- The **bell** in the top bar counts these same items.

### Lists

- **Recent quotations:** the 6 most recent quotations and proformas. You can change status or open the actions menu right there.
- **Top customers:** the top 5 customers in the period by quoted value, with the number of quotations. Click one to see their quotations.
- **Top products:** the top 5 items in the period by taxable value, with the quantity quoted. Click one to open it in the product list.

When there are no quotations at all, a banner at the top invites you to raise the first one. Values are shown in Indian form, for example ₹21,16,002 in full, or ₹4.2K, ₹3.5 L, ₹1.25 Cr in compact form.

---

## 5. Quotations list

**Status tabs:** All, Draft, Sent, Accepted, Rejected, Expired and Proforma, each with a count that respects the current search.

**Search:** matches quotation number, customer company, contact person and subject.

**Columns (all sortable):** Number, Date, Customer (with subject underneath), Valid until, Amount, Status. The default sort is newest date first. Amount and date columns sort high-to-low on the first click.

**Row actions**

- Click a row to open the quotation.
- Click the **status pill** to change status straight from the list.
- **Edit** (pencil) opens the editor.
- The **⋯ menu** offers: View & share, Edit, Duplicate, Send by email, Follow up… (Sent quotations only), Download PDF, Change status…, Convert to Proforma (quotations only), Delete.

**Rows per page:** the toolbar above the list has a **Rows per page** selector (25, 50, 75 or 100), the range shown (for example *26–50 of 120*) and ‹ › buttons to change page. A second set of controls appears below the list when there is more than one page. Searching, filtering or sorting goes back to page 1. The Customers and Products lists work the same way, and each list remembers its own rows-per-page choice in this browser.

On phones the table becomes a card list showing customer, amount, number, date and status.

---

## 6. Raising and editing a quotation

The editor has four sections on the left and a sticky summary panel on the right.

The quotation number shown at the top (for example `QT/2026-27/0012`) is a **preview**. The number is only assigned when you save, so abandoned drafts do not use up numbers.

### 6.1 Customer

- Type in the search box to find a customer by name, contact, phone, GSTIN or address. Use ↑/↓ and Enter to pick.
- The last option, **Add "…"**, creates a new customer with what you typed as the name and selects them.
- Once selected, a customer card shows contact details and three tags:
  - the **tax mode**: *Intra-state · CGST + SGST* or *Inter-state · IGST*
  - the GSTIN, or *Unregistered*
  - the state
- **Change** clears the selection. The pencil icon edits the customer in the master.
- **New customer** (top right) opens the full customer form.

### 6.2 Line items

There are three ways to add items:

1. **Add products** opens a picker over the product master:
   - Search by name, SKU, HSN, description or category, and filter with category chips.
   - Tick several products at once and set each quantity with a − / + stepper.
   - Products already on the quotation are marked *in quotation*. Adding the same product again **increases its quantity** instead of adding a duplicate line.
2. **Add custom line** adds an empty line (unit Nos, qty 1, rate 0, GST 18%) for one-off items not in the master.
3. **New product** creates a product in the master and adds it to the quotation in one go.

Each line has: item name, quantity, unit, rate (₹), discount %, GST rate (0 / 5 / 12 / 18 / 28%), description and HSN/SAC. The **Amount** column shows the line value after its own discount. The small text below it shows the discount amount, or the GST amount if there is no discount.

Rates are copied from the product master but stay editable on the quotation. Changing a rate here does not change the master.

The **⋯ menu** on each line can Move up, Move down, Duplicate line or Remove line. Removing a line shows an **Undo** toast for a few seconds.

### 6.3 Quotation details

| Field | Notes |
|---|---|
| Quotation date | Required. Changing it keeps the same validity span (for example, still 15 days). |
| Valid until | Required. Must be on or after the quotation date. Quick chips: 7d, 15d, 30d, 45d. Shown as **Due by** for proformas. |
| Status | Draft, Sent, Accepted, Rejected, Expired |
| Subject | Shown on the document, for example *Office lighting upgrade – 2nd floor* |
| Reference | Enquiry number, PO, site visit and so on |
| Template | Modern, Classic or Minimal for this quotation |
| Additional discount % | 0–100%, applied to the whole quotation before GST |
| Other charges | A label (default *Freight & handling*) and an amount, added after GST |

### 6.4 Notes & terms

- **Notes to customer:** free text printed under the tax table.
- **Terms & conditions:** one term per line, printed as a numbered list. They start from the company's default terms. **Use default terms** restores them.

### 6.5 Summary panel

- **Summary tab:** sub total, item discounts, additional discount, taxable value, tax per GST rate, total tax, other charges, round off, **grand total**, amount in words and the supply type.
- **Preview tab:** a live, scaled-down A4 preview of the actual document.
- On phones a bottom bar shows the running total and item count. Tap it for the full summary.

### 6.6 Saving

- **Save & preview** saves and opens the quotation view.
- **Save draft** saves and returns to the Quotations list. It keeps whatever is selected in the **Status** field and does not force the status to Draft.
- **Cancel** leaves without saving.

Before saving, the app checks that:

- a customer is selected
- there is at least one line
- every line has an item name
- every quantity is above zero
- *Valid until* is on or after the quotation date

The first problem is highlighted and focused.

On save:

- the customer's details on the quotation are refreshed from the customer master
- a new quotation gets its number

If you try to close or reload the tab with unsaved changes, the browser asks you to confirm.

---

## 7. Viewing, sharing and printing

The quotation view shows the real A4 document scaled to fit the screen. **Actual size** switches to 100% zoom, and **Fit to width** switches back.

The header shows the number, a *Proforma* tag where relevant, the status pill (click to change), customer, date, grand total and, for proformas, the quotation it came from.

### Share with customer

| Action | What happens |
|---|---|
| **Email** | Opens your email app with the customer's email, a subject such as *Quotation QT/2026-27/0012 from Lumina … — Office fit-out*, and the summary as the body. Also in the header. |
| **Share…** | Uses the phone's or browser's share sheet. Where the browser supports sharing files, the **PDF is generated and attached**; otherwise it shares the text. If the browser can't share at all, a message suggests Email or Download PDF instead. |
| **Download PDF** | Generates and downloads an A4 PDF (see [PDF and print](#pdf-and-print)). |

**Auto status:** sending a **Draft** by Email or Share… marks it **Sent** automatically.

**What the email / share message contains:**

- a greeting to the contact person
- the quotation number, date and validity, and the subject
- up to 8 items as *qty unit × rate* ("…and N more" after that)
- taxable value, GST, other charges
- the **grand total** and the amount in words
- UPI ID and bank account details
- a sign-off with the signatory, company and phone

### Side panels

- **Template:** switch between Modern, Classic and Minimal. The choice is saved on this quotation.
- **Brand colour:** 8 preset colours or a custom one. This changes the **company-wide** brand colour, so it affects every quotation, not just this one.
- **Status:** one-click status buttons.
- **Actions:** Edit quotation, Duplicate, Print, Convert to Proforma Invoice (quotations only), Delete (asks for confirmation).

On phones a bar at the bottom offers **Edit**, **Share** (a menu with Email, Share PDF via apps, Print, Duplicate, Convert to Proforma and Delete) and **PDF**.

### PDF and print

- **Download PDF** uses html2pdf.js to render the document at 2× resolution into an A4 portrait PDF.
  - The file is named after the document, number and customer, for example `Quotation-QT-2026-27-0012-Deccan-Software-Labs.pdf`.
  - Page breaks avoid splitting table rows, totals, bank details and terms.
  - If the PDF library could not load (for example when offline), the app says so and suggests **Print → Save as PDF** instead.
- **Print** renders a print-only copy of the document and opens the browser's print dialog. The page is set to A4 with 9 mm × 11 mm margins. The page title is set to the PDF file name, so *Save as PDF* from the print dialog also gets a sensible name.

---

## 8. The quotation document

Every quotation and proforma renders as an A4 document with these parts, from top to bottom:

1. **Header**
   - your logo, or a monogram of your initials in the brand colour
   - company name and tagline
   - the title (**Quotation** or **Proforma Invoice**)
   - a details box with the number, date, *Valid until* (with the number of days) or *Due by*, and **Place of supply** (customer's state and GST state code)
2. **Parties**, in three blocks:
   - **From:** your name, address, GSTIN, phone
   - **Bill to:** customer, *Attn:* contact · phone, billing address, GSTIN, email
   - **Ship to:** the shipping address (or the billing address if none) and the state
3. **Subject / Reference**, if filled in.
4. **Items table**, with these columns:
   - #
   - Item & description (with a product thumbnail if images are enabled)
   - HSN/SAC
   - Qty + unit
   - Rate
   - Disc
   - GST
   - Amount: the line value after its own discount, before the additional discount and GST
5. **Summary**
   - **Amount in words** in Indian numbering, for example *Rupees One Lakh Twenty Thousand Five Hundred Only*, with paise when there are any
   - **GST breakup table:** one row per GST rate with taxable value, CGST and SGST (each at half the rate) or IGST, and total tax, followed by *Intra-state supply — CGST + SGST applicable* or *Inter-state supply — IGST applicable*
   - **Notes**
   - **Totals:** sub total, item discounts, additional discount (x%), taxable value, CGST/SGST or IGST, other charges, round off, **Grand total**
6. **Payment & sign-off**
   - **Bank details:** account name, bank & branch, account number, IFSC, UPI ID
   - **UPI QR code**, *Scan to pay*, for the **exact grand total**. Any UPI app can scan it. It is only shown if a UPI ID is set.
   - **Signature block:** *For <company>*, your signature/stamp image, the signatory name and *Authorised Signatory*
7. **Terms & conditions** as a numbered list.
8. **Footer:** your thank-you note, email · website, and *This is a computer-generated quotation.*

The UPI QR encodes a standard UPI payment link:

```
upi://pay?pa=<UPI ID>&pn=<company>&am=<grand total>&cu=INR&tn=<quotation number>
```

---

## 9. Templates and brand colour

| Template | Look |
|---|---|
| **Modern** | Contemporary and branded: a solid brand-colour header panel (logo on a white tile, title and details in white), From / Bill to / Ship to as soft tinted cards, a brand-colour table header with striped rows, totals in a tinted card with a brand-colour grand-total bar, and a brand rule above the footer |
| **Classic** | Formal serif headings (Source Serif 4), a double rule under the header, ruled table |
| **Minimal** | Clean editorial layout: a large light "Quotation" title on the left and the company on the right, the quotation details as one row of label-over-value pairs, hairline rules, generous spacing, and brand colour used only for the grand total |

- The **default template** is set in Company & settings. Each quotation can override it in the editor or the view.
- The **brand colour** is one company-wide setting. The app derives darker, lighter and tint shades from it automatically. Text on brand-coloured areas switches between white and near-black to stay readable.
- The shades are computed as plain hex colours on purpose, because the PDF engine (html2canvas) cannot read newer CSS colour functions.

---

## 10. How totals and GST are calculated

All maths lives in `calcQuote()` in `js/quote-doc.js`. Every step is rounded to 2 decimals (paise).

### Per line

```
gross             = qty × rate
line discount     = gross × line disc %
net               = gross − line discount            ← shown as "Amount" on the line
additional share  = net × additional discount %
taxable value     = net − additional share
GST               = taxable value × GST rate %
```

The additional discount is spread across every line in proportion to its value. That means **GST is always charged on the final discounted value** of each line, which is how GST requires it.

### Whole quotation

- **Intra-state vs inter-state:** if the customer's state is the same as the company's state, tax is split into **CGST + SGST**. If it is different, the full amount is **IGST**. A customer without a state is treated as same-state.
- **Rate-wise breakup:** tax is grouped by GST rate. For intra-state, CGST is half of the tax (rounded) and SGST is the rest, so the two always add up exactly.
- **Other charges** (freight and so on) are added **after** GST and are **not taxed**.
- **Grand total** = taxable value + GST + other charges, **rounded to the nearest rupee**. The difference is shown as *Round off*.

### Worked example

Intra-state customer, additional discount 2%, freight ₹500:

| Item | Qty × Rate | Disc | Net | Addl 2% | Taxable | GST |
|---|---|---|---|---|---|---|
| LED Panel 36W (12%) | 10 × 1,450 = 14,500.00 | 5% = 725.00 | 13,775.00 | 275.50 | 13,499.50 | 1,619.94 |
| MCB 32A (18%) | 2 × 720 = 1,440.00 | — | 1,440.00 | 28.80 | 1,411.20 | 254.02 |

| Line on the document | Amount (₹) |
|---|---|
| Sub total | 15,940.00 |
| Item discounts | − 725.00 |
| Additional discount (2%) | − 304.30 |
| **Taxable value** | **14,910.70** |
| CGST (809.97 @ 6% + 127.01 @ 9%) | 936.98 |
| SGST (809.97 @ 6% + 127.01 @ 9%) | 936.98 |
| Freight & handling | 500.00 |
| Round off | + 0.34 |
| **Grand total** | **17,285.00** |

Amount in words: *Rupees Seventeen Thousand Two Hundred Eighty Five Only*.

---

## 11. Quotation numbering

Numbers follow the format **`PREFIX/FY/NNNN`**, for example `QT/2026-27/0001`.

- **PREFIX** is `QT` for quotations and `PI` for proforma invoices. Both can be changed in settings, up to 8 characters.
- **FY** is the Indian financial year (April–March) of the document date. A quotation dated 10 Mar 2027 is in `2026-27`; one dated 2 Apr 2027 is in `2027-28`.
- **NNNN** is a running counter, padded to 4 digits. Each prefix + financial year has **its own counter**, so numbering restarts at `0001` every April and quotations and proformas never share a series.

A number is taken when you **first save** a new quotation, **duplicate** one, or **convert** one to a proforma. Numbers are never reused, even after a delete. Once assigned, a number does not change if you later edit the date.

---

## 12. Status lifecycle

| Status | Meaning |
|---|---|
| **Draft** | Being prepared, not sent yet |
| **Sent** | Sent to the customer, awaiting a response (shown as *follow-ups* on the dashboard) |
| **Accepted** | Customer agreed. Counts as a won deal |
| **Rejected** | Customer declined |
| **Expired** | Validity passed without a decision |

You can change status from the list (status pill), the view page (status pill or status panel), or the editor.

The app changes status automatically in only two cases:

- **Draft → Sent** when you send a draft by Email or Share…
- **→ Accepted** when you convert a quotation to a proforma

Quotations are **not** marked Expired automatically when their *Valid until* date passes. They appear under **Validity ended** in [Needs attention](#needs-attention), where one click marks them Expired.

---

## 13. Proforma invoices

**Convert to Proforma Invoice** (from the list menu or the view page) asks for confirmation and then:

1. Creates a **new document** copied from the quotation, with type *Proforma Invoice*, the next `PI/FY/NNNN` number, today's date, **Due by** today + 7 days, status **Sent**, and a link back to the original quotation number.
2. Marks the original quotation **Accepted**.
3. Opens the new proforma.

A proforma uses the same document layout with the title *Proforma Invoice* and *Due by* instead of *Valid until*. It shows a *Proforma* tag in lists, has its own tab in the Quotations list, and is left out of the dashboard figures. A proforma cannot be converted again.

**Duplicate** works for both. It copies the document with a new number, today's date, the default validity, status Draft and the customer details refreshed from the master, then opens it in the editor.

---

## 14. Customer master

### Fields

| Field | Rules |
|---|---|
| Company / customer name | Required |
| Contact person | Optional. Used as "Attn:" and in the greeting of share messages |
| Phone | Required. 10–13 digits. Used by *Call* in the follow-up menu |
| Email | Optional, format checked. Used for email sharing |
| GSTIN | Optional, 15-character GSTIN format checked. Typed in upper case. **The state is detected automatically from the first two digits** |
| State (place of supply) | Required. Decides CGST + SGST vs IGST |
| Billing address | Multi-line |
| Shipping address | Only if *Shipping address same as billing* is unticked |
| Notes (internal) | Not printed on quotations |

### List

- **Search** by name, contact, phone, email, address, GSTIN or state.
- **Columns (sortable):** Customer, Contact, GSTIN / State · Tax (the state with an *IGST* or *CGST + SGST* tag), number of Quotes, Quoted value.
- **Rows per page:** 25, 50, 75 or 100, with page controls (see [Quotations list](#5-quotations-list)).
- **Actions:**
  - **Raise quotation** opens a new quotation with this customer already selected.
  - **Edit**
  - **View quotations** opens the list searched by this customer.
  - **Delete**

### Customer snapshots

Each quotation keeps **its own copy** of the customer's details at the time it was saved. As a result:

- deleting a customer does not break or change existing quotations
- editing a customer does not change already-saved quotations until that quotation is opened and saved again (the editor refreshes the copy on save) or duplicated

---

## 15. Product master

### Fields

| Field | Rules |
|---|---|
| Product image | Optional. Resized to at most 360 px and stored as JPEG. Shown as a thumbnail on quotations if enabled |
| Product / service name | Required |
| SKU / code | Optional |
| Category | Free text with suggestions from existing categories |
| Description | Printed under the item name on quotations |
| Unit | Nos, Pcs, Set, Box, Kg, Mtr, Rft, Sqft, Sqm, Ltr, Coil, Roll, Point, Hr, Day, Job, Lot |
| Default rate (₹) | Required, 0 or more |
| HSN / SAC | Optional, 4–8 digits |
| GST % | 0, 5, 12, 18 or 28 |

### List

- **Category chips** filter by category. **Search** covers name, SKU, HSN, category and description.
- **Columns (sortable):** Product / service, SKU, Category, HSN/SAC, Unit, GST, Rate.
- Edit or delete from each row.

Quotation lines are **copies** of the product at the time it was added. Changing or deleting a product does not change existing quotations.

---

## 16. Company & settings

Everything here appears on your quotations. A **live preview** (based on your most recent quotation) updates as you type. Changes are only stored when you click **Save changes**.

### Business profile

- Logo: PNG, JPG or SVG, resized to at most 400 px. Without a logo a brand-coloured monogram is used.
- Company name (required) and tagline
- Address line 1 and 2, city, PIN code (6 digits)
- **State:** your own state. Same-state customers get CGST + SGST, all others IGST.
- GSTIN (format checked), phone, email, website

### Bank & UPI

- Account name, bank name, branch, account number (9–18 digits), IFSC (format checked, for example `SBIN0001234`). The quotation prints the bank and branch together, for example *HDFC Bank, Anna Nagar*; leave Branch empty to print only the bank name.
- **UPI ID** (for example `business@bank`). When set, every quotation carries a UPI QR for the exact amount.

### Quotation defaults

| Setting | Effect |
|---|---|
| Quotation prefix | Start of quotation numbers, for example `QT` → `QT/2026-27/0001` |
| Proforma prefix | Start of proforma numbers, for example `PI` |
| Default validity (days) | Pre-fills *Valid until* on new quotations (default 15) |
| Default template | Template for new quotations |
| Signatory name | Printed under the signature, for example *R. Karthikeyan, Proprietor* |
| Show product images on quotations | Turns item thumbnails on or off |
| Signature / company stamp | Image printed in the signature block. A transparent PNG works best |
| Default terms & conditions | One per line. Copied into each new quotation |
| Footer note | Thank-you line at the bottom of the document |

### Brand colour

8 preset colours or a custom colour picker, used across all templates.

### Backup & data

- **Export JSON backup** downloads everything as `quotecraft-backup-YYYY-MM-DD.json`.
- **Import backup** loads a backup file. It checks the file is a QuoteCraft backup, shows how many customers, products and quotations it holds, and asks before **replacing all current data**.
- **Reset demo data** replaces everything with the original demo data, after confirmation.

---

## 17. Data storage, backup and privacy

- All data is stored as **one JSON object** in the browser's `localStorage` under the key **`quotecraft.v1`**.
- Data stays **on that device and in that browser only**:
  - there is no account, sync or cloud copy
  - a different browser, a different device or an incognito window starts fresh with demo data
- **Clearing the browser's site data deletes everything.** Use **Export JSON backup** regularly, and to move data between devices.
- Logos, signatures and product images are stored inside that same object as embedded images. Browsers typically allow about 5 MB per site, so very many product images can fill it. If a save fails, the app shows *Could not save — browser storage is full or blocked*.
- Customer data is never sent to a server by the app itself. It only leaves the device when you choose to share a quotation (email or the share sheet).

---

## 18. Technical architecture

### Stack

- **Plain HTML, CSS and JavaScript.** No framework, no bundler, no build step, no backend.
- Scripts are ordinary `<script>` tags that share globals, loaded in a fixed order in `index.html`:

```
utils.js → store.js → quote-doc.js → ui.js → views.js → editor.js → app.js
```

### Files

| File | Responsibility |
|---|---|
| `index.html` | Page shell: sidebar, top bar, main view, toast area, print root. Loads fonts, CDN libraries and app scripts |
| `js/utils.js` | Shared helpers: DOM shortcuts, HTML escaping, IDs, rounding, ₹ formatting (Indian digit grouping), dates and financial year, amount in words, Indian GST state codes, validation patterns (GSTIN, email, IFSC, UPI, phone), brand colour shades, image resizing, file download, clipboard, generated company seal, SVG icon set |
| `js/store.js` | The data store: load and save to `localStorage`, demo data, quotation number series, insert/update/delete helpers |
| `js/quote-doc.js` | Statuses and templates, **`calcQuote()`** (all totals and GST), UPI link and QR image, **`renderQuoteDoc()`** (the A4 document HTML), share message text, PDF generation |
| `js/ui.js` | UI building blocks: toasts, modals and confirm dialogs, action menus, avatars, status pills, empty states, form fields, scaling the A4 preview to fit |
| `js/views.js` | Screens: dashboard (including the SVG bar chart), quotations list, quotation view, customers, products, settings. Also the shared quotation actions (status, duplicate, convert, delete, email, follow-up, PDF, share, print) and the rows-per-page pager used by every list |
| `js/editor.js` | The Raise / Edit Quotation screen: customer search, line items grid, product picker, live summary and preview, validation and saving |
| `js/app.js` | Builds the sidebar and top bar, **global search**, the attention **bell**, sidebar collapse, the phone **bottom navigation** and its More sheet, the **hash router**, unsaved-changes warning, start-up |
| `css/app.css` | Styles for the app interface |
| `css/quote.css` | Styles for the A4 document, the three templates and print rules |
| `assets/brand/` | Product logo: `quotecraft-logo-source.png` (original, 1254×1254), `logo.png` (full logo, 720 px wide), `logo-mark.png` (mark only, 256 px, used in the sidebar and phone top bar), `favicon.png` (64 px) and `apple-touch-icon.png` (180 px) |

### How it works

- **Start-up** (`app.js`): `Store.load()` reads `localStorage` (or creates demo data), then `renderShell()` draws the sidebar and top bar, then `route()` shows the current screen.
- **Routing:** `route()` runs on every hash change. It:
  - reads the path and query string
  - closes any open menus, modals and the phone search
  - replaces the main view element with a fresh one, which drops the previous screen's event listeners
  - calls the matching `view…()` function
  - updates the breadcrumb, sidebar counts and active item

  Errors inside a view are caught and shown as a "Something went wrong" card.
- **Rendering:** each screen builds its HTML with template strings and sets `innerHTML`. All user-entered text goes through `esc()` before being inserted, which protects against HTML injection.
- **Saving:** any change goes through `Store.upsert()` / `Store.remove()`, which write the whole data object back to `localStorage` straight away.
- **One renderer for everything:** `renderQuoteDoc()` produces the same document HTML for the view page, the editor's live preview, the settings preview, printing and the PDF. All five always match.

### External libraries

| Library | Version | Source | Used for |
|---|---|---|---|
| qrcode-generator | 1.4.4 | cdnjs | UPI QR code on the document |
| html2pdf.js (html2canvas + jsPDF) | 0.10.1 | cdnjs | Download PDF and the PDF attached to Share… |
| Inter, Source Serif 4 | — | Google Fonts | Interface and document fonts (serif for the Classic template) |

---

## 19. Data model

The stored object:

```json
{
  "version": 1,
  "company":   { ... },
  "customers": [ ... ],
  "products":  [ ... ],
  "quotes":    [ ... ],
  "counters":  { "QT/2026-27": 12, "PI/2026-27": 3 },
  "seededAt":  1762828800000
}
```

### Company

| Field | Description |
|---|---|
| `name`, `tagline`, `logo` | Identity. `logo` is an embedded image (data URL) or empty |
| `address1`, `address2`, `city`, `pincode`, `state` | Address. `state` is the 2-digit GST state code, for example `"33"` for Tamil Nadu |
| `gstin`, `pan`, `phone`, `email`, `website` | Registration and contact |
| `bank` | `{ accName, bankName, branch, accNo, ifsc, upi }` |
| `signature`, `signatory` | Signature/stamp image and the name printed under it |
| `terms`, `footer` | Default terms (one per line) and footer note |
| `prefix`, `piPrefix` | Number prefixes for quotations and proformas |
| `brand`, `template`, `validityDays`, `showThumbs` | Brand colour (hex), default template, default validity, show product images |

### Customer

`id`, `company`, `contact`, `phone`, `email`, `billing`, `shipping` (empty = same as billing), `gstin`, `state` (GST state code), `notes`, `createdAt`

### Product

`id`, `name`, `sku`, `category`, `unit`, `rate`, `hsn`, `gst` (%), `description`, `image`

### Quote (quotation or proforma)

| Field | Description |
|---|---|
| `id`, `type` | `type` is `"quotation"` or `"proforma"` |
| `number`, `date`, `validUntil` | Dates are `YYYY-MM-DD` |
| `customerId`, `customer` | Link to the master, plus a **snapshot copy** of the customer |
| `subject`, `reference`, `notes`, `terms` | Text fields |
| `items` | Line items (below) |
| `addlDisc` | Additional discount % |
| `chargesLabel`, `charges` | Other charges label and amount |
| `status` | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `template` | `modern`, `classic`, `minimal` |
| `convertedFrom` | For proformas: number of the source quotation |
| `createdAt`, `updatedAt` | Timestamps (ms) |

### Line item

`pid` (product id, empty for custom lines), `name`, `description`, `hsn`, `unit`, `qty`, `rate`, `disc` (%), `gst` (%), `image`

---

## 20. Responsive design and accessibility

**Screen sizes:** layout breakpoints at 1600, 1280, 1100, 768 and 400 px. On phones:

- the sidebar is replaced by a bottom navigation bar (Home, Quotations, New, Customers, More)
- tables become card lists
- action menus open as bottom sheets
- the editor and view pages get a fixed bottom action bar
- the A4 document scales to the screen width, with an *Actual size* toggle

**Accessibility**

- Buttons and icons have labels for screen readers. Toasts are announced through a live region.
- **Keyboard:**
  - ↑/↓ and Enter in the customer search
  - ↑/↓ in action menus
  - Space/Enter to tick products in the picker
  - **Escape** closes menus, dialogs and search
- Focus returns to where it was after a dialog closes.
- Sortable column headers report their sort direction.
- Animations are turned off for users who choose *reduce motion* in their system settings.

---

## 21. Deployment

The app is a static site, so it can be hosted anywhere that serves files. It is currently deployed on **Vercel** at https://quotecraft-lumina.vercel.app. `.vercelignore` and `.gitignore` keep the local `.vercel` and `.netlify` folders out of the repo and the deployment. Because each browser keeps its own data, deploying a new version never touches users' saved quotations.

---

## 22. Known limitations and behaviours to be aware of

- **Single device:** data is not shared between devices or people. Use export/import to move it.
- **No automatic expiry:** quotations past *Valid until* stay in their current status until changed by hand. The dashboard's *Needs attention* list flags them.
- **"Save draft" does not set the status to Draft:** it saves with the status chosen in the editor and returns to the list.
- **Other charges are not taxed:** freight, installation and similar charges are added after GST. If a charge should carry GST, add it as a line item instead.
- **Brand colour is global:** changing it on any quotation's view page changes it for all quotations.
- **Email sends text, not the PDF:** an email link can't attach files, so download the PDF and attach it, or use **Share…** on a phone to send the PDF file directly.
- **Duplicating takes a number straight away,** even if the duplicate is never edited.
- **Unsaved-changes warning** appears only when closing or reloading the tab, not when moving to another screen inside the app.
- **PDF download needs internet** the first time, because the PDF library loads from a CDN. Print → Save as PDF works as a fallback.
- **GST rates are a fixed list** (0, 5, 12, 18, 28%) in `GST_RATES` in `js/views.js`. There is no 40% option, which has been a GST slab since the September 2025 GST rate changes. Check the list against the rates your items currently fall under.
- **Storage size:** many large product images can fill the browser's storage limit.
