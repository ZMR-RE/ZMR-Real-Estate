# T4 — Entity branding & documents: proposal awaiting numbered approval

Prepared September 30, 2026 by terminal T4. This is a non-saving preview only.
**Nothing here is approved, stored or deployed.**

- The owner asked for entity branding and invoice layout to be settled before
  PDF visual approval.
- **The existing Stage 1 PDF samples (`docs/planning/agents/samples/`) are
  not approved** and remain review material only.

## Where to look

- **Interactive preview** (fictional entity, no backend, nothing saved):
  http://127.0.0.1:5197/entity-branding-preview.html
  - It's the real app frame, laid out as the entity profile.
  - The existing Identity and Invoicing boxes are shown read-only and
    unchanged.
  - The proposed **Branding & documents** box can be edited; Save only
    updates the preview.
  - Live sample invoice and receipt, with an optional **"Number each field"**
    view and a **"Where each field comes from"** table.
- **Static samples:** `docs/planning/agents/branding-samples/`
  - `PROPOSAL_invoice_A-INV-000001_2026-10_Unit-1.pdf`
  - `PROPOSAL_receipt_A-RCT-000001_2026-10-03_Unit-1.pdf`
  - `PROPOSAL_invoice_field-sources.pdf` and `PROPOSAL_receipt_field-sources.pdf`:
    the same documents with numbered field markers.

## Proposed decisions (please approve, amend or reject by number)

**B1 — One issuer record.**
- Branding lives in a new **Branding & documents** box on the **existing**
  entity profile.
- There is no separate issuer or brand record, so each entity (LLC) brands
  the documents it issues.
- Name and address stay in **Identity**; reply-to email, payment instructions
  and invoice code stay in **Invoicing**, unchanged.

**B2 — Logo.**
- Optional; PNG or JPG, up to 1 MB.
- Placed top-left and scaled to fit 150 × 48 pt (aspect ratio kept).
- A new upload creates a new stored version. Earlier versions are kept,
  because issued documents reference them.

**B3 — Four optional colour roles.** Blank means today's standard colours.

| Role | Used for |
|---|---|
| Heading | Entity name and document title |
| Accent | Table header band (a light tint of it) and dividers |
| Highlight | Amount due / amount received |
| Secondary text | Labels and small print |

- Body text stays dark for legibility.
- **Saving is refused** when a text colour is below WCAG AA contrast (4.5:1
  on white), or when labels on the accent band fall below 4.5:1. The preview
  shows the warning.

**B4 — Contact details on documents.** Two new optional fields on the entity:

- **phone**;
- **website**.

Nothing else is duplicated.

**B5 — Document defaults** (all optional):

- paper size (US Letter or A4);
- show the legal name under the display name (on by default; shown only when
  it differs);
- default invoice note, used when the tenancy has no tenant-specific note;
- default receipt note;
- document footer, on both invoices and receipts.

**B6 — Separate from the workspace theme.** Entity stationery changes only
that entity's documents. The dashboard's own theme, colours and light/dark
setting never change.

**B7 — Snapshots preserved.**

- At issue, every issuer and branding value used is copied into the
  document's snapshot. That covers name, address, contact, payment
  instructions, colours, defaults, and the logo version with its fingerprint.
- The stored PDF bytes stay protected (the Stage 1 Storage policies plus the
  recorded SHA-256).
- Later settings changes affect only documents issued afterwards.

**B8 — Candidate layout** for invoices and receipts, as in the samples:

- logo and identity top-left, document facts top-right;
- a rule, then Bill to / Received from and Rental;
- an itemized table with a tinted header band;
- the total;
- How to pay (invoices only);
- note and footer.

If approved, this replaces the current Stage 1 invoice layout *before* the
first real issue.

**B9 — Receipt wording.**

- A receipt confirms a payment the owner recorded.
- It shows what it was applied to, with each invoice's remaining balance.
- It carries the line "It is not a bank statement."
- Receipts stay outside the current Stage 1 build (their numbering design
  already exists: `{CODE}-RCT-000001`).

## Where each field comes from

The full, numbered lists are in the preview and in
`src/modules/entityBranding/preview/stationeryFields.ts`. Summary:

| Source | Fields |
|---|---|
| Entity profile › Identity (existing) | Entity name, legal name line, address |
| Entity profile › Invoicing (existing) | Invoice code (numbers), reply-to email, payment instructions |
| Entity profile › Branding & documents (**proposed**) | Logo, colours, phone and website, default notes, footer, paper size, legal-name toggle |
| Tenancy & billing (existing, Stage 1) | Due date, billing recipients, rent and prorating |
| The invoice or payment record | Numbers, dates, lines, totals, payer, method, allocations |

## What changes if approved (for planning; not built)

- **New entity fields:** logo (a versioned document reference), four colour
  values, phone, website, and the five defaults. They'd be stored with the
  existing `llcs` record or a one-to-one settings row; the storage shape is
  decided at implementation.
- **The Stage 1 issuer snapshot** gains the branding values and the logo
  version.
- **The Stage 1 renderer** is replaced by the approved layout.

## Status and checks

- **Preview code:** `src/modules/entityBranding/preview/` (a separate
  candidate renderer; the Stage 1 renderer is unchanged).
  - `vite.entity-branding-preview.config.ts` serves it on port 5197 with the
    harness mocks.
  - `?frame=off` hides the embedded PDF viewer, for automated checks only.
- **Tests:**
  - colour parsing, contrast, fallbacks and warnings;
  - logo fitting;
  - invoice and receipt rendering, with and without branding, on A4;
  - text never saying "sent" or "paid";
  - the field legend numbering.
- **Browser (T4):**
  - editing colours shows the contrast warning;
  - Save updates the view and the samples;
  - remove logo;
  - invoice/receipt switch and the 14/16-row source tables;
  - 390px and 900px with no sideways scroll; phone targets at least 44px.
- **Two defects found and fixed while preparing the samples:**
  - text drawn right after a field marker disappeared, because the marker
    changed the colour; markers are now drawn last;
  - "Amount received" collided with its amount; the label is now placed from
    measured widths.
