#!/bin/bash
# Disposable-database tests for the void/statement-match safeguard. Never
# points at Practice or production: a throwaway PG17 cluster on
# 127.0.0.1:${ZMR_TEST_PGPORT:-55433}; the build refuses a port in use.
# usage: run.sh <repo>
set -u
REPO=${1:-$(cd "$(dirname "$0")/../../.." && pwd)}
D=$(dirname "$0"); PG=/opt/homebrew/opt/postgresql@17/bin
P="$PG/psql -h 127.0.0.1 -p ${ZMR_TEST_PGPORT:-55433} -U postgres -d zmr -q"
bash "$D/build.sh" "$REPO" || exit 1
$P -v ON_ERROR_STOP=1 -f "$D/setup.sql" >/dev/null || exit 1
# Any SQL error outside a t()/check_true() wrapper is reported as a FAIL,
# so a broken check can never silently drop out of the totals.
run() { $P -f "$1" 2>&1 | sed -n -e 's/^psql:[^:]*:[0-9]*: NOTICE:  //p' -e 's/^psql:\([^:]*:[0-9]*\): ERROR:  \(.*\)/FAIL SQL error at \1: \2/p'; }
DIAG=$($P -f "$REPO/supabase/diagnostics/void_reconcile_conflicts_readonly.sql" -At 2>&1)
OUT=$( { run "$D/tests.sql"; bash "$D/concurrency.sh";
  # The read-only diagnostic runs, reports the legacy rows, and changes nothing.
  if grep -q "c0000000-0000-0000-0000-000000000009" <<<"$DIAG" && grep -q "cb000000-0000-0000-0000-000000000009" <<<"$DIAG" \
     && [ "$($P -At -c "select count(*) from financial_transactions where voided and statement_reconciled")" = 2 ]; then
    echo "PASS read-only diagnostic lists both workspaces' legacy conflicts and changes nothing"
  else echo "FAIL read-only diagnostic"; fi; } )
echo "$OUT"
PASS=$(grep -c '^PASS' <<<"$OUT"); FAIL=$(grep -c '^FAIL' <<<"$OUT")
echo "== $PASS passed, $FAIL failed"
$PG/pg_ctl -D "$D/data" stop -m fast >/dev/null
rm -rf "$D/data"
[ "$FAIL" -eq 0 ]
