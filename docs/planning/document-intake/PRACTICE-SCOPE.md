# Proposed Practice-only check — not yet authorized

Recommendation: run this before considering release because local tests cannot prove
hosted Storage metadata, permissions or the complete UI-to-Documents round trip.

1. Read-only preflight: confirm gxgvrktzpxhtqklupvif (Practice), reserved Practice
   identity, no current holder, exact current migration set and no unrelated pending
   migration. Record the window and take a Practice backup plus fingerprints of all
   existing rows and a storage-object inventory. Stop on target/holder/schema mismatch.
2. Apply only 20261016100000_document_intake.sql from the approved candidate. No
   production access, account changes, existing-row edits or other migrations.
3. Use the reserved Practice account. Through the dashboard create one clearly named
   ZMR-TEST-DOC-INTAKE property and optional unit. Use an existing active category, or
   create exactly one ZMR-TEST-DOC-INTAKE category if necessary. Use fictional files only.
4. Test file-only intake with no destination; verify reload preserves it. Review and
   save an optional note/responsibility/date for later. File once for the whole property,
   and once for its unit; repeated Save clicks must not duplicate records/files.
5. Confirm property Documents, capture History and Action Queue refer to the same file;
   a property-document label edit is reflected in capture History after refresh. Confirm
   filed items leave Needs review, original hash matches, and no financial/loan rows
   change. Inspect desktop and phone layouts and existing Receipt form behavior without
   submitting real receipts. Inspect only the approved test account.
6. Verify every pre-existing row and file remains identical. Every new row/object must
   be traceable to these fixtures and their audit. Sign out and release the window.

Fixture retention decision included in requested scope: original files and intake audit
are deliberately immutable. Retain the small, clearly labelled fictional test captures
and evidence in the test account, set the new property Inactive and archive a newly
created temporary category after testing. Do not disable safeguards or erase audit to
clean up. Record exact retained IDs. This retention is an explicit exception requested
for these fixtures; it is not permission to retain unlabelled or real test data.

Stop on unexpected writes, changed pre-existing fingerprints, mismatched object hash,
unauthorized visibility or duplicate filing. Do not proceed to production automatically.
