# Visual evidence — Insurance width, S3 grouped Edit form, property-creation flow

Captured from the real, running mock-data harness (`npm run dev:harness`
→ `http://localhost:5180/harness.html`), inside the real `AppShell`
frame. Screenshots are cropped to the actual app viewport (sidebar +
content) — the harness's own dev-only toggle bar is excluded.

**Insurance's images show real, already-merged application code**
(`.insurance-policy-form { max-width: 960px }`, `src/index.css`) —
implemented locally and verified in Practice; **not deployed to
production**. The S3 and creation-flow images remain non-saving,
devHarness-only previews, pending their own visual approval.

## Insurance Edit form — implemented locally, verified in Practice

Owner-approved and implemented (Sept 25 2026), not yet deployed.
Captured live at three real widths, not just the wide case:

- `insurance-implemented-wide-960.jpg` — 1400px viewport, form reaches
  its 960px max-width.
- `insurance-implemented-intermediate-700.jpg` — 700px viewport, form
  shrinks to ~578px; `.field-group-row` reflows to two columns.
- `insurance-implemented-narrow-390.jpg` — 390px viewport, form shrinks
  to ~268px, single column.

No horizontal overflow at any of the three (`scrollWidth === clientWidth`,
checked directly). `insurance-before-480px.jpg` / `insurance-after-
960px-proposed.jpg` are kept as the original proposal evidence that led
to the approval — superseded in accuracy by the three
`insurance-implemented-*` images, which show the real merged code.

## Property-creation four-step flow (corrected this pass)

A separate flow from the grouped Edit form below — used only when
creating a brand-new property. Editing an existing property never
enters this flow. Corrected from the prior pass to show real Back/Next/
Cancel navigation (not just clickable step tabs), a structured owner
picker, no Name field anywhere, and no engineering prose in the visible
area — only the one preview banner and ordinary product copy.

- `creation-flow-step1-ownership.png` — Step 1, default state: a
  dropdown of existing owners (not a free-text field), percentage
  optional, the allocation-completeness checkbox, Cancel/Next.
- `creation-flow-step1-add-new-owner.png` — Step 1 with "+ Add a new
  owner…" selected, revealing its own separate name field — confirms
  typing a name is a distinct, explicit action, never the default way
  to enter an owner.
- `creation-flow-step2-invalid-address.png` — Step 2, an actual invalid
  state: Next was clicked with Address empty, showing the inline
  "Address is required" message and not advancing. No Name field is
  present on this step at all.
- `creation-flow-step2-valid.png` — Step 2 with a valid address entered,
  Back/Next both present.
- `creation-flow-step3-documents-skip.png` — Step 3 with nothing staged;
  the button reads "Skip" since there's nothing to carry forward.
- `creation-flow-step3-documents-staged.png` — Step 3 after choosing a
  file; the button switches to "Next".
- `creation-flow-step4-review.png` — Step 4: read-only summary with
  "Edit" links that jump back to the section that produced each value
  (Owners → Step 1, Address → Step 2, Documents → Step 3), the
  allocation-incomplete state shown plainly, Back/Save.
- `creation-flow-mobile-step1.png` — 390px, Step 1, confirming the
  progress indicator and navigation both remain usable at phone width.

## S3 — grouped Property Edit form preview (Name re-labeled, not removed)

This is the **existing-property Edit** context, kept clearly distinct
from the creation flow above (a single page, no step navigation).
Existing saved Name values must stay visible/editable here — removing
the field outright would erase that path, so it's re-labeled instead:

- `s3-edit-form-name-optional-label.png` — Name field labeled "Name
  (optional label)", no required marker, no engineering-framed hint
  text; "Review saved contact details" shown in place of the old flat
  Owner/Contact fields, with only ordinary product copy underneath it.
  No status/implementation prose is rendered anywhere in this preview
  area anymore.
