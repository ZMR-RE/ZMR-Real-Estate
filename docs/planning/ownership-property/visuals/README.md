# Visual evidence — Insurance width, S3 grouped Edit form, property-creation flow

Captured from the real, running mock-data harness (`npm run dev:harness`
→ `http://localhost:5180/harness.html`), inside the real `AppShell`
frame. Screenshots are cropped to the actual app viewport (sidebar +
content) — the harness's own dev-only toggle bar is excluded, except
where a wide screenshot deliberately keeps a little of it in frame to
show overall page context.

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

## S3 — grouped Property Edit form preview (screen-organization pass, Sept 25 2026)

Existing-property **Edit** context — a single page, no step
navigation, kept clearly distinct from the creation flow below.
Regrouped from the prior pass's three groups into five, per the
screen-organization review: **Identity & location**, **Acquisition**,
**Building & site**, **Jurisdiction & identifiers**, and **Ownership &
saved contacts** — balanced into two explicit 14-field columns (not
left to grid auto-flow) so neither side is a lopsided giant group next
to a near-empty one. Purchase method and the deed reference now live
under Acquisition (previously buried under a generic "Property
details"/"Purchase" heading); property type moved into Identity &
location; exterior materials merged into Building & site instead of
sitting alone in a short standalone column. Photo/Deed now show a
realistic existing-record state ("View current photo" / "View current
deed document") rather than the creation-only "not available until
saved" wording. No leftover "(pick list)" / "(left blank)" / "Not
wired" implementation prose remains in the rendered area — the one
preview banner at the top is the only meta-commentary shown.

- `s3-edit-form-grouped-desktop.jpg` — full form at 960px, zoomed out
  to show both columns and every group in one frame (not a cropped
  fragment) — confirms the two-column balance and full label/title
  hierarchy at a glance.
- `s3-edit-form-mobile-390.jpg` — 390px, scrolled to the Ownership /
  Acquisition / Building & site groups, confirming the two columns
  collapse to one and groups stack in the same logical left-then-right
  reading order as desktop.

## Property-creation four-step flow (screen-organization pass, Sept 25 2026)

A separate flow from the grouped Edit form above — used only when
creating a brand-new property. Editing an existing property never
enters this flow. This pass reworked all four steps per the
screen-organization review:

- `creation-step1-ownership-two-owners.jpg` — Step 1 default state,
  now seeded with **two** owners (one with a deliberately long name,
  "ZMR-TEST-FIXTURE Holdings LLC (Formerly Riverside Properties
  Group)"), each owner in its own bordered row/block, the owner picker
  given more width than the short percentage field, Remove kept inside
  the same block. Below the roster, a plain informational line ("1 of
  2 owners has a percentage entered so far — 55% assigned...") is
  shown distinct from the allocation-complete checkbox — the summary
  is never inferred into that checkbox.
- `creation-step1-add-new-owner.jpg` — same step with "+ Add a new
  owner…" selected on one row, showing its own persistent "New owner's
  name" `<label>` (not just a placeholder).
- `creation-step1-ownership-mobile-390.jpg` — 390px, confirming the
  step tabs, owner blocks, and the entered/complete summary all remain
  usable and legible stacked at phone width.
- `creation-step2-basics.jpg` — Step 2, unchanged sequence per the
  review (address full-width, then City/State/Zip with City wider than
  the short fields, Status below) — preserved, not reworked.
- `creation-step3-documents-single.jpg` — Step 3 with one staged file,
  showing the new per-file row: file name, size, a "Ready to upload"
  status, and its own Remove action.
- `creation-step3-documents-two-files.jpg` — Step 3 with a second file
  staged, confirming multiple rows list and remove independently.
- `creation-step4-review.jpg` — Step 4, rebuilt into two clearly
  titled sections side by side — **Property basics** and
  **Ownership** — each with its own top-right Edit action; address
  shown prominently; owner rows individually listed with aligned
  name/percentage columns (not a joined string), including the
  explicit "percentage not yet entered" state; Documents shown full
  width below both sections; footer keeps Cancel on the left and
  Back/Save on the right, exact "Save" label per the project's
  universal action-labeling rule.
- `creation-step4-review-mobile-390-top.jpg` /
  `creation-step4-review-mobile-390-bottom.jpg` — 390px, confirming
  Property basics and Ownership stack (rather than staying side by
  side) with Documents below, matching logical reading order at phone
  width.

All creation-flow and S3 screenshots in this pass were captured full-
frame (page zoomed out rather than cropped to one section) so the
overall grouping and column balance — not just one isolated step — can
be judged directly from the image.
