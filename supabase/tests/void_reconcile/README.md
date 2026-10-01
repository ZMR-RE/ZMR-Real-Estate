# Void / statement-match safeguard — disposable-database tests

`bash supabase/tests/void_reconcile/run.sh "$PWD"` builds a throwaway
PostgreSQL 17 cluster from every repo migration on `127.0.0.1:$ZMR_TEST_PGPORT`
(default 55433; refuses a port another server holds), runs:

- `tests.sql` — the app's exact write shapes as the signed-in user:
  - ordinary Void of a matched entry (refused, with its reason);
  - clearing the match as its own save, which the audit trail records;
  - void and match changed in one save (refused);
  - the reconciliation save skipping voided entries, with the shortfall;
  - any other caller matching a voided entry (refused);
  - legacy conflicts, which are listed, never rewritten, and scoped to their workspace.
- `concurrency.sh` — real concurrent sessions: void-then-match and
  match-then-void, and the app's filtered save racing a void.
- the read-only diagnostic (`supabase/diagnostics/…_readonly.sql`), checked
  to list legacy rows and change nothing.

Then it stops and deletes the cluster. Fictional data only.
