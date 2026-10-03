# Mortgage balance concurrency: reproduction on live code (T3, 2026-10-01)

**Code under test:** live `c15733c21c9f0a196c31c0f6e606b21ba64c5afd` (110 migrations), extracted read-only with
`git archive`. **Environment:** disposable local Postgres 17 on 127.0.0.1:55441, created and deleted by the
script. Fictional data only. No Practice or production access, no credentials, no repository change.

## Files
- `run.sh`: the reproduction. Run `./run.sh [repo] live` (the defect) or `./run.sh [repo] fixed` (the control).
- `candidate_fix_row_lock.sql`: a **test-only** control. It is the live trigger functions with `FOR UPDATE`
  on the mortgage row. It is **not** a migration proposal.
- `results-live.txt`, `results-fixed-control.txt`: the output of the runs on 2026-10-01 (UTC times inside).

## Method
1. Session A opens a transaction, makes one write, holds it for 2 s, then commits.
2. Session B makes its write 0.7 s later, in autocommit.

Both sessions run as `authenticated` with a fictional owner JWT, as PostgREST requests do.

## Result on live code: 5 of 7 cases wrong

| Case | Correct | Live result |
|---|---|---|
| C1 payment 100 ‖ payment 50 | 850 | **950**: one principal reduction lost |
| C2 escrow deposit 30 ‖ deposit 20 | 150 | **120**: one deposit lost |
| C3 disbursement 80 ‖ 80, escrow 100 | second refused; 1 row | **both accepted**: 2 rows, stored 20. The ledger and the stored balance disagree, and the no-overdraw guard was bypassed. |
| C4 principal 80 ‖ 80, balance 100 | second refused; 1 row | **both accepted**: the exceeds-balance guard was bypassed |
| C5 payment ‖ escrow deposit (different columns) | 900 / 130 | OK: no cross-column loss (ruled out) |
| C6 manual Edit to 2000 ‖ then payment 50 | 1950 | **950**: the owner's manual edit was silently overwritten |
| C7 payment 100 ‖ then manual Edit to 2000 | 2000 | OK. An absolute edit wins by design; this shows that an absolute edit can absorb a payment made at the same moment. |

**Cause.** Both triggers read the balance into a variable without a lock, then write `variable ± amount`. The
second writer waits for the row lock and then overwrites the balance using its stale value. Both guards (overdraw
and exceeds-balance) check that stale value too.

**Control.** The same cases with the row read `FOR UPDATE`: 0 wrong. C3 and C4 refuse the second write with the
existing messages.

**Limits.**
- This proves the race can occur, not how often. With one owner it needs two balance writes on the same loan
  within one request's duration (two tabs, a double-submit, or two devices).
- Whether it has happened in production can't be shown from current audit data. A lost update leaves a ledger
  row whose effect is missing from the stored balance. That is detectable read-only by comparing each audited
  trigger change with its entry, but it has not been run.
