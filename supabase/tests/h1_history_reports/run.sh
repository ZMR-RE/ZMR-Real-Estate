#!/bin/bash
# usage: run.sh <repo-at-live-baseline> <evidence-dir> <h2-commit>
# P2 for H1: H1's exact history SQL on the live schema (table absent), then on T1's ACTUAL H2 migrations
# (20261004100000 + 20261005100000 taken from <h2-commit>), with history rows created by members through
# T1's real insert trigger. Exports member A's H1 query results for the report-calculation check. Disposable local Postgres (127.0.0.1:55438) only.
# SELF_TEST=1 adds one intentional failure to prove detection.
set -u
D=$(cd "$(dirname "$0")" && pwd); REPO=$1; EV=$2; H2=$3
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55438 -U postgres -d zmr -X -t"
rm -rf $D/migrations && mkdir -p $D/migrations && cp $REPO/supabase/migrations/*.sql $D/migrations/
$D/build.sh $D/migrations || { echo "RESULT: build failed"; exit 2; }
cd $D
$PSQL -v ON_ERROR_STOP=1 -q -f assert_helpers.sql -f setup.sql >/dev/null || { echo "RESULT: setup failed"; exit 2; }
run() { $PSQL -q -f "$1" 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//' | grep -vE '^\s*$'; }
OUT1=$(run tests_before.sql)
# The live-schema error text H1's classifier must recognise (Postgres wording; hosted PostgREST may
# answer PGRST205 instead — recorded in the hosted window).
MSG=$($PSQL -q -f session_a.sql -c "select property_id from mortgage_history_payments limit 1" 2>&1 | grep -o 'relation "[^"]*" does not exist')
echo "$MSG" > $EV/live-schema-missing-table-message.txt
[ "$MSG" = 'relation "mortgage_history_payments" does not exist' ] && OUT1="$OUT1"$'\n'"PASS B5 live error text matches the unit-tested 42P01 wording" || OUT1="$OUT1"$'\n'"FAIL B5 live error text: $MSG"
for m in 20261004100000_mortgage_balance_integrity 20261005100000_mortgage_history_entries; do
  git -C $REPO show "$H2:supabase/migrations/$m.sql" > $D/migrations/h2-$m.sql.tmp || { echo "RESULT: cannot read $m at $H2"; exit 2; }
  $PSQL -v ON_ERROR_STOP=1 -q -f $D/migrations/h2-$m.sql.tmp >/dev/null 2>$D/err.txt || { echo "FAILED: $m"; cat $D/err.txt; exit 2; }
done
echo "H2 migrations from $(git -C $REPO rev-parse $H2)" > $EV/h2-source.txt
$PSQL -v ON_ERROR_STOP=1 -q -f setup_after.sql >/dev/null 2>$D/err.txt || { echo "FAILED: setup_after.sql"; cat $D/err.txt; exit 2; }
OUT2=$(run tests_after.sql)
# Member A's results of H1's two exact history queries, for reportsHistory.p2.test.ts (real report functions).
AQ="select jsonb_build_object('allTime', (select coalesce(jsonb_agg(q), '[]'::jsonb) from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false) q), 'year2025', (select coalesce(jsonb_agg(q), '[]'::jsonb) from (select property_id, principal_amount from mortgage_history_payments where account_id = 'a2a00000-0000-0000-0000-00000000000a' and voided = false and payment_date >= '2025-01-01' and payment_date <= '2025-12-31') q))"
$PSQL -q -A -f session_a.sql -c "$AQ" 2>/dev/null | grep '^{' > $EV/member-a-h1-results.json
VT=$(cd $REPO && VITE_P2_RESULTS="$(cat $EV/member-a-h1-results.json)" npx vitest run src/modules/reports/reportsHistory.p2.test.ts 2>&1)
echo "$VT" > $EV/report-functions-on-real-rows.txt
echo "$VT" | grep -qE "Tests +3 passed" && OUT2="$OUT2"$'\n'"PASS A14 H1 report functions on the real query results (3 vitest checks)" || OUT2="$OUT2"$'\n'"FAIL A14 report functions on real rows (see report-functions-on-real-rows.txt)"
[ "${SELF_TEST:-0}" = "1" ] && OUT2="$OUT2"$'\n'"$($PSQL -q -c "select a('SELF-TEST intentional failure', 'false')" 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//;s/^NOTICE: +//' | grep -vE '^\s*$')"
OUT="$OUT1"$'\n'"$OUT2"; echo "$OUT"
EXPECTED=$(( $(grep -cE "^select (t|a)\(" tests_before.sql) + 1 + $(grep -cE "^select (t|a)\(" tests_after.sql) + 1 + ${SELF_TEST:-0} ))
PASS=$(echo "$OUT" | grep -cE '^PASS'); FAIL=$(echo "$OUT" | grep -cE '^FAIL')
echo "RESULT: $PASS passed, $FAIL failed, $EXPECTED expected"
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1
[ "$FAIL" -eq 0 ] && [ "$PASS" -eq "$EXPECTED" ] && exit 0
exit 1
