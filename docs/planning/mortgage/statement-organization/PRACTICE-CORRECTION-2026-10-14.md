# Practice statement correction — awaiting scoped approval

Practice is ACTIVE_HEALTHY with 122 migrations. No hosted writes or migration were performed for this correction.

## Findings and correction

Documents kept its original cached list after statements were uploaded or renamed in Mortgage. Entering Documents now refreshes the existing account/property-scoped read. Failed reads retain the saved list and show an error; leaving the tab cancels stale results.

The stale-edit refusal used SQLSTATE 40001, a serialization code which PostgREST retries. The new migration `20261014100000_mortgage_statement_conflict_response.sql` replaces only three intentional conflict codes in two existing functions with PT409 (HTTP409). Auth, locks, validation, messages and grants are unchanged. The original applied migration is untouched.

Supabase describes the retry behavior: https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b

Correction SHA-256: `23e90fc8698c7cfc4e780e4329c6f56b8d768e020e1cfe72ec023032f58be272`.
Original migration SHA-256 remains `e11c8c0caee90f008669d871c56f818686d773de6c7d4751c7c6e482a1c5db62`.

## Local verification

- Exact source comparison: only CREATE OR REPLACE and three conflict codes differ in the two functions.
- Local database: 43/43, including original preservation/no-payment checks and all three conflict codes.
- App suite: 476 passed, 4 skipped. Three new document-refresh tests.
- Type-check and configured application build pass. Dummy public settings prove app inclusion, not production asset equivalence.
- No fresh hosted conflict result or full visual audit is claimed.

## Recommended next scope

One corrective Practice migration, 122 → 123, on gxgvrktzpxhtqklupvif only, then continue the previously approved fictional-fixture tests. Obtain a fresh verified Practice backup, verify the exact ledger and source checksum, preserve every existing public row and Storage metadata, and apply once in a guarded transaction. Prepare and locally rehearse the correction-specific runner before applying; the old runner remains historical and must not be reused unchanged. On mismatch refuse; on network uncertainty reconcile read-only and never automatically retry.

Recheck two-tab conflict, Documents refresh, retry, reference settings, permissions/original protection, desktop/mobile visuals and final preservation. Reuse the retained fixture; temporary category authorization is limited to that fixture and category. Archive test residue and hand back afterward.

No production migration, production access, financial import or release is requested. Production remains a separate approval after Practice evidence.
