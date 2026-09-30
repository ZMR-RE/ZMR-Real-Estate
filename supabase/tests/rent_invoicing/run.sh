#!/bin/bash
# usage: run.sh <repo>  -> fresh disposable DB (127.0.0.1:55434), fictional
# fixtures, then every check file. Exits 0 only if every check PASSES and the
# number of PASS lines equals the number of checks written (a check that
# silently didn't run counts as a failure). SELF_TEST=1 adds one intentional
# failure to prove detection (see selftest.sh).
set -u
D=$(cd "$(dirname "$0")" && pwd)
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql -h 127.0.0.1 -p 55434 -U postgres -d zmr -X -t"
FILES="tests.sql storage.sql old_client.sql owner_only.sql"
$D/build.sh "$1" || { echo "RESULT: build failed"; exit 2; }
$PSQL -v ON_ERROR_STOP=1 -q -f $D/setup.sql >/dev/null || { echo "RESULT: setup failed"; exit 2; }
EXPECTED=0
for f in $FILES; do EXPECTED=$((EXPECTED + $(grep -cE "^select (t|a)\(" $D/$f))); done
EXTRA=""
if [ "${SELF_TEST:-0}" = "1" ]; then
  EXTRA="select a('SELF-TEST intentional failure', 'false');"
  EXPECTED=$((EXPECTED + 1))
fi
OUT=$( { for f in $FILES; do $PSQL -q -f $D/$f; done; [ -n "$EXTRA" ] && $PSQL -q -c "set role authenticated; $EXTRA"; } 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +//' | grep -vE '^\s*$')
echo "$OUT" | grep -vE '^PASS'
PASS=$(echo "$OUT" | grep -cE '^PASS')
FAIL=$(echo "$OUT" | grep -cE '^FAIL')
echo "RESULT: $PASS passed, $FAIL failed, $EXPECTED expected"
[ "$FAIL" -eq 0 ] && [ "$PASS" -eq "$EXPECTED" ] && exit 0
exit 1
