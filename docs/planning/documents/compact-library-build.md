# Compact Documents and Links — local candidate

Based on released 13f1a7e. Owner approved this layout and first-release scope; no release approval is implied.

Links first, Documents second. Compact independent collapsible headers. Search, category/type filters, 25/50 paging, label and URL edits. Writes update the existing document row; file bytes, storage paths, category, transaction and loan relationships are not rewritten. Edits compare original label/link/path values and scope to account and property.

Separate unfinished mortgage work is excluded. No database migration. Statement dates, loan assignment/reconciliation, remembered expansion and exact-file duplicate warnings are outside this first visual/workflow release. Upload uses the existing one-file flow; it does not gain a batch or retry-reconciliation subsystem here.

Tests and visual evidence are local/simulated only. Hosted edit/upload verification and exact-hash release approval remain outstanding. Owner tests on the released dashboard; the engineering preview does not require owner testing.

## Local verification

- Clean isolated copy: 448 passed, 4 skipped; type-check and configured production build pass. Configuration uses dummy `.invalid` values: app-content proof only, not deploy-byte equivalence.
- Twelve Documents-specific tests cover paging past API limits, partial-list failure, filename search, 25/50 pages, empty results, unsafe URLs, account/property scoped label updates, stale edits and immutable file fields.
- Browser: real Documents components with fictional in-memory data. Search, next page, 50 per page, independent link filtering, Add from collapsed Documents, failed edit retaining fields, successful retry and link creation checked. Desktop 1600, intermediate 900, phone 390 CSS px: page width equals viewport. No console errors.
- Test harness is not imported by the application. Existing upload storage/insert sequence remains unchanged; uncertain-response upload recovery and duplicate-file warnings remain follow-ups and are not claimed as solved.

## Proposed Practice check — approval required

One recorded Practice window; exact candidate only; no migration, production, account or membership changes. Use the reserved Practice identity. Read existing counts/fingerprints and verify the fixture boundary before writes. On a clearly named ZMR-TEST-DOCS fixture property, create one small fictional document and one external example.com link through the dashboard. Edit labels/URL, cancel edits, test a stale edit from two tabs, search, filters and 25/50 controls. Confirm original bytes/path/id and relationships remain unchanged by label editing. Verify every pre-existing record against its baseline, with any intentional fixture edits restored. Retain new test document/link as disclosed fixture residue under an Inactive test property; no hard deletion is authorized. Sign out and hand back. Stop on a schema/access mismatch or unexpected write.

Owner need not test an engineering preview. Agent performs this check; owner tests on the actual released dashboard after a separate release decision.
