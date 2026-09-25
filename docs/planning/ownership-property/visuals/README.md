# Batch S3 / Insurance-width visual evidence

Captured from the real, running mock-data harness (`npm run dev:harness`
→ `http://localhost:5180/harness.html`), inside the real `AppShell`
frame — not a bare component. Nothing here is implemented in the real
application; both remain gated on explicit visual approval.

## S3 — grouped Property form preview, desktop (960px, two columns)

Read top to bottom in this order:
1. `s3-desktop-1-identity-purchase.jpg` — Identity & location / Purchase & valuation, Property details and Exterior information group headers visible.
2. `s3-desktop-2-property-details-exterior.jpg` — Property details (living area through street parking) and Exterior information (wall material checkboxes), scrolled down.
3. `s3-desktop-3-tax-zoning-county.jpg` — Property tax ID, municipal zoning code, county assessor use code, county, township.
4. `s3-desktop-4-purchase-method-save.jpg` — Purchase method, Property type, the disabled Save button, and the flagged-conflicts callout.

## S3 — same form, mobile (390px, single column)

1. `s3-mobile-1-top.jpg` — harness toolbar and the preview banner.
2. `s3-mobile-2-identity.jpg` — Identity & location fields, one per row.
3. `s3-mobile-3-purchase-property-details.jpg` — Purchase & valuation, the legacy Ownership fields, into Property details — confirms groups stack in the same top-to-bottom order as desktop's reading order, not reshuffled.

## Insurance Edit form — real field width, before/after

Both captured from the actual, already-shipped Insurance Edit form (not a mockup) — the "after" image used a disposable, scoped CSS override applied only inside an isolated iframe for this screenshot; nothing in the tracked codebase was changed to produce it.

- `insurance-before-480px.jpg` — today's real width (480px, the app-wide `form` cap). Provider, Named insured, Representative phone/email, and Policy discounts are all visibly truncated (e.g. `ZMR-TEST-FI...`, `555-010-000...`, `dana@fixture....`, `Bundled disco...`).
- `insurance-after-960px-proposed.jpg` — same real data, same real component, at a proposed 960px. Every value reads in full (`ZMR-TEST-FIXTURE Statewide Insura...`, `555-010-0001`, `dana@fixture.example`, `Bundled discount`).
