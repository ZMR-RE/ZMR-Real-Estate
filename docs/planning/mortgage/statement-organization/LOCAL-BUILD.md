# Statement organization — approved local build, October 7, 2026

Owner approved the compact visual at localhost:5307, then explicitly approved the local build. Base is the released Documents candidate 565bd63. Work reuses its clean checkout on codex/statement-organization; primary checkout and earlier unfinished mortgage draft are preserved.

## Included
- Canonical property Documents files linked to a specific loan. Existing-file linking, PDF batch upload with SHA-256 identity, non-overwriting upload and byte-verified retry.
- Editable canonical label, loan, statement date, optional period pair and document kind. Exact version plus original-label compare; stale saves keep form values. Reference-statement date/type/loan corrections require changing the reference first.
- Per-loan statement list, search, status/year filters, five per page; previous loans selectable. No-loan/empty-property states.
- Loan summary is collapsible. Inside Edit loan, Statement settings saves a chosen dated statement and full/forward history mode separately from Loan details. Switching panels locks after editing begins, so unsaved work cannot be discarded by switching.
- Coverage gaps only between recorded periods, never inferred from filenames or a monthly assumption. Unknown period dates remain unknown. No green reconciliation assertion.
- New account-scoped, append-only event tables record metadata changes and preference changes. Original file identity is protected once linked, including from old clients. Existing Documents label editing remains valid and is read canonically in Mortgage.

## Database status and constraints
`20261007100000_mortgage_statement_organization.sql` is the LOCAL candidate migration. The test SQL must be byte-identical. It creates five statement metadata/event/preference tables and scoped functions. Nothing applied on Practice or production. Existing 121 migrations remain unchanged; this adds one unapplied candidate (122 files locally).

Uploads cannot silently generate payments, effects, reviews, Financials entries or balance changes. This build does not extract text/OCR, reconcile periods, import historical payments, connect banks or modify bookkeeping.

Existing PDFs have only their stored path basename available; the UI labels that as Stored filename rather than inventing the original upload filename. Canonical bytes/path/id stay intact. Existing duplicate files are retained; the build refuses a second link of the same fingerprint within one property and explains how to open the existing item. Fingerprints for old Documents files are checked before a new upload; concurrent legacy uploads outside this feature still need the general Documents upload idempotency work.

## Before hosted testing
Review the additive candidate migration and Practice preservation/recovery scope before applying it on any hosted environment. Test actual Storage API policies and response formats; local PostgreSQL uses the repository bootstrap for Storage, not a hosted Storage service. Browser evidence uses real React components with a fictional in-memory store, not hosted results. No release approval is implied.

Frontend-only rollback keeps new tables/files/metadata/events and returns Documents to the existing canonical label view. Existing linked originals remain protected; no down migration or metadata deletion is proposed.
