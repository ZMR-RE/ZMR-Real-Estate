# Document intake — local candidate, October 16, 2026

## Authorization and scope
Owner approved the visual and local implementation: only the file is required at
capture. This is not hosted migration, Practice-test or production-release approval.

Implemented: Document entry point in Quick capture, history-first Add navigation,
file-only capture, optional metadata, account-scoped private originals, upload recovery,
review/save-for-later, property/unit/category filing, shared vendor references and inline
vendor creation, notes/responsibility/dates, canonical document links, search and 25/50
pagination. Action Queue reads the same pending intake rows, not copied task records.
Existing receipt save/accounting functions and existing capture schema are unchanged.
Document metadata stays separate from receipt/accounting fields. No automatic expense,
payment, tenant charge, mortgage effect, reminder or recurrent task is created.

The storage reservation and immutable original stay in the documents bucket. Filing
creates exactly one canonical documents row pointing to that same object. Before filing,
no property document is created and no destination is guessed. Details and canonical
labels are read from the appropriate authoritative records. Property/unit/vendor IDs are
foreign-key references with server account checks, not copied contact profiles.

## Evidence
- Local database: 44/44, full repository migration chain with a local Supabase platform
  stand-in. Includes auth/RLS, cross-account and cross-property denial, private helper,
  no arbitrary metadata fields, original protection, account-scoped audit, same-request
  retry, concurrent filing, concurrent draft edits, legacy rename/delete, and zero
  accounting/action writes. Server stopped after testing.
- Frontend service/gateway tests: 18 pass. Actual Supabase client using simulated fetch:
  non-overwriting upload, actual downloaded-byte hash verification, failure/retry,
  scope mismatch, >100-row pagination, canonical naming and no financial calls.
- Whole working-directory suite: 519 passed, 4 skipped (includes separate uncommitted
  mortgage/recurrent-task work). Exact isolated candidate count to be recorded separately.
- TypeScript build-mode check passes. New-module lint clean. Configured production build
  contains reserve_document_intake and app code (dummy non-secret configuration; not
  evidence of byte equality with production).
- Browser, actual Document intake components with fictional simulated service: file-only
  capture; interrupted finish then retry yields one record; save-for-later retains notes
  and responsibility; filing removes row from Needs review and keeps it in History;
  same original referenced. Desktop and 390 CSS-pixel phone checks; no page overflow.
  Screenshot capture has scaling/partial-paint artifacts after viewport resizing; DOM
  dimensions and interactive controls were checked separately. Hosted rendering remains
  a Practice gate. No simulated result is represented as a hosted result.

Migration SHA-256: `3225cf0c7dced4f75cf22b3c31057466debad43c32683d6443cc6b71e29c3746`

## Remaining gates and limits
- Apply/test this exact migration only in a separately approved Practice window.
- Verify real Storage API metadata/content types, private download/hash, fresh reload,
  cross-surface Documents/Quick capture/Action Queue, and existing receipt behavior.
- Test current production base and release integration separately before any release.
- Preserve originals and audit rows. No trash, purge scheduler, OCR, bank feed,
  bookkeeping posting or mortgage reconciliation is included in this candidate.
- A refresh clears the simulated browser, but the production adapter uses the database
  and private storage. Do not use the local mock to retain real documents.
- Frontend rollback hides intake management on older builds; filed property documents
  remain readable there. Preserve schema and originals; never drop tables for rollback.
