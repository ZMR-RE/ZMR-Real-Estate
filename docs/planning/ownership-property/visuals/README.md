# Visual evidence — Insurance width, S3 grouped Edit form, property-creation flow

Captured from the real, running mock-data harness (`npm run dev:harness`
→ `http://localhost:5180/harness.html`), inside the real `AppShell`
frame. **Insurance's images are of the real, shipped application code**
(`.insurance-policy-form { max-width: 960px }`, `src/index.css`) — not
a mockup. The S3 and creation-flow images are still non-saving,
devHarness-only previews, pending their own visual approval.

## Insurance Edit form — real, shipped, responsive width

Owner-approved and implemented (Sept 25 2026). Captured live at three
widths to confirm the responsive behavior, not just the wide case:

- `insurance-shipped-wide-960.jpg` — 1400px viewport, form reaches its
  960px max-width. Provider/Named insured/Representative phone/email/
  Policy discounts read in full.
- `insurance-shipped-intermediate-700.jpg` — 700px viewport, form
  correctly shrinks to ~578px (not fixed at 960); `.field-group-row`
  reflows to two columns. No horizontal overflow (`scrollWidth ===
  clientWidth`, checked, not assumed).
- `insurance-shipped-narrow-390.jpg` — 390px viewport, form shrinks to
  ~268px; single column. No overflow. Individual long values (e.g. the
  Provider field) still don't fit visibly all at once inside the
  narrower input box at this width — that's normal native `<input>`
  behavior at any width this narrow, not a defect; the full value stays
  reachable via standard keyboard text-field navigation (Home/End/
  arrow keys), same as any other input in the app.

`insurance-before-480px.jpg` / `insurance-after-960px-proposed.jpg`
(from the prior pass) are kept as the historical proposal evidence —
what convinced the owner to approve this — superseded in accuracy by
the three `insurance-shipped-*` images above, which show the real
merged code.

## S3 — grouped Property Edit form preview (updated for approved labels)

Reflects the two approved changes: Name is no longer required, and the
flat Owner name/Contact phone/Contact email fields are replaced with
the **"Review saved contact details"** action. Still a non-saving
preview, pending its own visual approval — the two-column direction and
both action labels are approved, the assembled screen itself is not yet.

- `s3-updated-desktop-identity-contacts.jpg` — desktop, Identity &
  location / Purchase & valuation columns; Name field shows no asterisk
  and a "No longer required" hint; "Review saved contact details"
  button visible in place of the old flat fields.
- `s3-updated-mobile-identity.jpg` — 390px, Identity & location
  stacked single-column, same updated Name field.
- `s3-updated-mobile-review-contact-button.jpg` — 390px, scrolled to
  the "Review saved contact details" button, confirming it stacks
  correctly at phone width too.

(The prior pass's `s3-desktop-*`/`s3-mobile-*` images showed the
now-superseded required-Name/flat-fields state and have been removed —
keeping stale screenshots of a component that no longer matches them
would be actively misleading.)

## Property-creation four-step flow (new this pass)

A separate preview from the grouped Edit form above — Batch B's
originally-approved four-step creation shape (Ownership → Property
basics → Documents → Review), used only when creating a brand-new
property. Editing an existing property still opens the grouped Edit
form above, never this flow.

- `creation-flow-step1-ownership.jpg` — Step 1: pick/add owners,
  optional percentage per owner, an explicit allocation-completeness
  checkbox (never inferred from percentages).
- `creation-flow-step2-basics.jpg` — Step 2: address/city/state/zip
  required, Name optional; a note that Acquisition/Building Details are
  deliberately not part of this flow (they stay on the post-create Edit
  form, same as today).
- `creation-flow-step3-documents.jpg` — Step 3: staged file list,
  explicitly optional, nothing uploads until Step 4's Save.
- `creation-flow-step4-review.jpg` — Step 4: read-only summary, empty
  fields omitted, disabled Save.
- `creation-flow-mobile-step1.jpg` — 390px, Step 1. The step-number
  tabs wrap to two lines at this width and stay tappable, but read as a
  rough first pass, not a polished treatment — worth a specific look
  during visual review, not glossed over here.
