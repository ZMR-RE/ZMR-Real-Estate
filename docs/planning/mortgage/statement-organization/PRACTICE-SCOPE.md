# Proposed Practice check — not approved or run

Recommendation: one isolated Practice-only window after local candidate review. This must explicitly authorize applying 20261007100000_mortgage_statement_organization.sql to Practice and the fixture writes below. Production stays untouched and uploads there may continue.

Preconditions: verify project gxgvrktzpxhtqklupvif, no conflicting holder, pin the final local candidate, confirm Practice's actual migration list and exactly one pending migration. Any difference requires review before proceeding. Sign in privately using the reserved Practice identity; no account/membership/settings changes. Do not use an owner session. Inspect renewal-reminder triggers before opening fixture property pages.

Before applying: capture all existing public rows, existing Storage metadata and applicable policies/schema; take a verified Practice recovery backup. Apply only the named, reviewed migration. Confirm all existing rows/objects are identical, plus expected additive schema/policies; no new records inserted by the migration itself.

Fixture writes only: create one ZMR-TEST-STATEMENTS property and loan in the reserved account using the dashboard. Upload two fictional PDFs through Documents, link one, then upload a batch of six additional fictional PDFs through Mortgage. Include repeated bytes and a failure/retry; each original stored once. No real user PDFs. Use existing pick-list options; stop if required ones are unavailable. Do not change account settings without separate authorization.

Checks: canonical file/label shared across Documents and Mortgage; edit date/period/type/loan; retain file bytes; stale two-tab edits refuse and preserve inputs; five-item paging/search/status/year; identical existing-file warning; retry creates no duplicates; reference/full/forward settings save without changing balances; reference corrections guarded; original deletion/replacement refused; wrong account/property requests refused. Genuine hosted failures and explicitly simulated transport failures are labelled separately. Capture desktop and phone. No historical payments, bookkeeping or bank connections.

Preservation: after migration and after tests, compare every baseline row and existing object. All new rows/objects must trace to the fixture and all expected audit events must be identified. Stop on any unexplained change.

Cleanup: archive the fixture property/unit/loan through supported UI. Retain test statements and append-only metadata/audit rows as clearly labelled residue (linked originals cannot be deleted). Sign out; unlink scratch environment; stop own server; record exact handback. Never disable guards or delete existing data to make cleanup pass.

Recovery: keep additive schema/evidence on frontend rollback. If migration itself fails, inspect its transaction result; no blind retry. No down migration or restore without a separately reviewed recovery decision. This scope does not authorize production, a release, account changes or importing the owner's history.
