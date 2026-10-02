#!/bin/bash
# usage: run.sh <repo-at-live-baseline> <evidence-dir>
# P2 for H1: H1's history SQL on the live schema (table absent) and on a stand-in table shaped like
# contract v5 with mortgage_payments' RLS. Disposable local Postgres (127.0.0.1:55438) only.
# SELF_TEST=1 adds one intentional failure to prove detection.
set -u
D=$(cd "$(dirname "$0")" && pwd); REPO=$1; EV=$2
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
for f in standin_history_table.sql setup_after.sql; do
  $PSQL -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null 2>$D/err.txt || { echo "FAILED: $f"; cat $D/err.txt; exit 2; }
done
OUT2=$(run tests_after.sql)
[ "${SELF_TEST:-0}" = "1" ] && OUT2="$OUT2"$'\n'"$($PSQL -q -c "select a('SELF-TEST intentional failure', 'false')" 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//;s/^NOTICE: +//' | grep -vE '^\s*$')"
OUT="$OUT1"$'\n'"$OUT2"; echo "$OUT"
EXPECTED=$(( $(grep -cE "^select (t|a)\(" tests_before.sql) + 1 + $(grep -cE "^select (t|a)\(" tests_after.sql) + ${SELF_TEST:-0} ))
PASS=$(echo "$OUT" | grep -cE '^PASS'); FAIL=$(echo "$OUT" | grep -cE '^FAIL')
echo "RESULT: $PASS passed, $FAIL failed, $EXPECTED expected"
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1
[ "$FAIL" -eq 0 ] && [ "$PASS" -eq "$EXPECTED" ] && exit 0
exit 1
